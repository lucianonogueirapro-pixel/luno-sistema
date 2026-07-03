import { NextRequest, after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { formatPhone, extractMessageText } from '@/lib/whatsapp/evolution'
import { lauraResponde } from '@/lib/whatsapp/laura'
import { sendText } from '@/lib/whatsapp/evolution'
import { calcularSlotsDisponiveis, formatarSlot } from '@/lib/whatsapp/slots'

function supabaseService() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const AGENDAR_RE = /<<AGENDAR:([^:>]+):([^:>]+)(?::([^>]+))??>>/

const MSGS_FILA = [
  'Prezamos pelo atendimento exclusivo. Você é a próxima a ser atendida, nossos atendentes estão finalizando a conversa anterior e seguem com a sua. 😊',
  'Você é a segunda da fila de atendimento. Em instantes chegamos até você! 😊',
  'Você é a terceira da fila. Nosso atendimento é exclusivo e personalizado, já já chegamos! 😊',
]

async function processarAgendamento(
  supabase: ReturnType<typeof supabaseService>,
  dataHoraIso: string,
  nomePaciente: string,
  telefone: string,
  conversaId: string,
  cfg: Record<string, unknown>,
  canal: string | null,
  profissionalId?: string | null,
) {
  try {
    const empresaId = cfg.empresa_id as string
    let pacienteId: string | null = null

    const telLimpo = telefone.replace(/@.*/, '').replace(/\D/g, '')
    const { data: clienteExist } = await supabase
      .from('clientes')
      .select('id')
      .eq('empresa_id', empresaId)
      .or(`telefone.eq.${telLimpo},telefone.eq.+${telLimpo}`)
      .limit(1)
      .single()

    if (clienteExist?.id) {
      pacienteId = clienteExist.id
    } else {
      const { data: novoCliente } = await supabase
        .from('clientes')
        .insert({ empresa_id: empresaId, nome: nomePaciente.trim(), telefone: telLimpo })
        .select('id')
        .single()
      pacienteId = novoCliente?.id ?? null
    }

    if (!pacienteId) return false

    const tagCanal = canal === 'paciente_modelo' ? ' [Paciente Modelo]' : ''

    await supabase.from('agenda').insert({
      empresa_id: empresaId,
      cliente_id: pacienteId,
      profissional_id: profissionalId ?? null,
      data_hora: dataHoraIso,
      duracao_min: cfg.duracao_avaliacao_min ?? 60,
      tipo: 'avaliacao',
      status: 'agendado',
      obs: `Agendado automaticamente pela Luna via WhatsApp (${telefone})${tagCanal}`,
    })

    await supabase
      .from('wa_conversas')
      .update({ status: 'agendado', followup_enviado: true, updated_at: new Date().toISOString() })
      .eq('id', conversaId)

    return true
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (body?.event !== 'messages.upsert') {
      return new Response('ok', { status: 200 })
    }

    const data = body?.data as Record<string, unknown>
    const key = data?.key as Record<string, unknown> | undefined

    if (key?.fromMe) return new Response('ok', { status: 200 })

    const remoteJid = String(key?.remoteJid ?? '')
    if (remoteJid.includes('@g.us')) return new Response('ok', { status: 200 })

    const telefone = formatPhone(remoteJid)
    if (!telefone) return new Response('ok', { status: 200 })

    const texto = extractMessageText(data)
    if (!texto) return new Response('ok', { status: 200 })

    const messageId = String(key?.id ?? '')
    const pushName = String(data?.pushName ?? '').trim() || null
    const supabase = supabaseService()

    // ── Rotear para a empresa certa via instance_name do payload ──
    const instanceName = String(body?.instance ?? '')
    const token = req.nextUrl.searchParams.get('token')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cfg: any = null

    // Prioridade 1: busca por instance_name (multi-tenant)
    if (instanceName) {
      const { data: cfgByInstance } = await supabase
        .from('wa_config')
        .select('*')
        .eq('instance_name', instanceName)
        .maybeSingle()
      cfg = cfgByInstance
    }

    // Prioridade 2: busca por webhook_token (legado / único)
    if (!cfg && token) {
      const { data: cfgByToken } = await supabase
        .from('wa_config')
        .select('*')
        .eq('webhook_token', token)
        .maybeSingle()
      cfg = cfgByToken
    }

    // Fallback: primeiro registro (compatibilidade)
    if (!cfg) {
      const { data: cfgDefault } = await supabase
        .from('wa_config')
        .select('*')
        .limit(1)
        .single()
      cfg = cfgDefault
    }

    const empresaId: string = cfg?.empresa_id ?? ''
    const canalPadrao: string = cfg?.tag_padrao ?? 'organico'

    // ── 1. Buscar ou criar conversa ──────────────────────────────
    const telefoneSemSufixo = telefone.includes('@') ? telefone.split('@')[0] : telefone

    let conversa: { id: string; nome: string | null; status: string; agente_slug: string | null; canal: string | null; modo_humano: boolean | null } | null = null

    const baseQuery = supabase.from('wa_conversas').select('id, nome, status, agente_slug, canal, modo_humano')
    const q1 = empresaId
      ? baseQuery.eq('empresa_id', empresaId).eq('telefone', telefone)
      : baseQuery.eq('telefone', telefone)

    const { data: c1 } = await q1.maybeSingle()
    conversa = c1

    if (!conversa && telefoneSemSufixo !== telefone) {
      const q2 = empresaId
        ? supabase.from('wa_conversas').select('id, nome, status, agente_slug, canal, modo_humano').eq('empresa_id', empresaId).eq('telefone', telefoneSemSufixo)
        : supabase.from('wa_conversas').select('id, nome, status, agente_slug, canal, modo_humano').eq('telefone', telefoneSemSufixo)
      const { data: c2 } = await q2.maybeSingle()
      conversa = c2
    }

    if (!conversa) {
      const insertData: Record<string, unknown> = {
        telefone,
        nome: pushName,
        status: 'novo',
        agente_slug: 'comercial-laura',
        canal: canalPadrao,
      }
      if (empresaId) insertData.empresa_id = empresaId

      const { data: nova } = await supabase
        .from('wa_conversas')
        .insert(insertData)
        .select('id, nome, status, agente_slug, canal, modo_humano')
        .single()
      conversa = nova
    } else if (pushName && !conversa.nome) {
      await supabase.from('wa_conversas').update({ nome: pushName }).eq('id', conversa.id)
      conversa = { ...conversa, nome: pushName }
    }

    if (!conversa) return new Response('error', { status: 500 })

    if (conversa.modo_humano) return new Response('ok', { status: 200 })

    // ── 2. Salvar mensagem recebida (dedup) ───────────────────────
    const { error: dupErr } = await supabase.from('wa_mensagens').insert({
      conversa_id: conversa.id,
      direcao: 'entrada',
      tipo: 'texto',
      conteudo: texto,
      message_id: messageId || null,
    })

    if (dupErr?.code === '23505') return new Response('ok', { status: 200 })

    await supabase
      .from('wa_conversas')
      .update({
        ultima_mensagem_at: new Date().toISOString(),
        status: conversa.status === 'novo' ? 'em_atendimento' : conversa.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversa.id)

    if (!cfg?.ativo || !cfg?.auto_responder) {
      return new Response('ok', { status: 200 })
    }

    const evoCfg = { apiUrl: cfg.api_url as string, apiKey: cfg.api_key as string, instance: cfg.instance_name as string }

    // Busca chave Anthropic da empresa (cobrada na conta do cliente)
    let empresaApiKey: string | null = null
    if (empresaId) {
      const { data: empData } = await supabase
        .from('empresas')
        .select('anthropic_api_key')
        .eq('id', empresaId)
        .maybeSingle()
      empresaApiKey = empData?.anthropic_api_key ?? null
    }

    const { data: jaRespondeu } = await supabase
      .from('wa_mensagens')
      .select('id')
      .eq('conversa_id', conversa.id)
      .eq('direcao', 'saida')
      .in('tipo', ['texto', 'fila'])
      .limit(1)
      .maybeSingle()

    const isPrimeira = !jaRespondeu

    if (isPrimeira) {
      const msgFila = MSGS_FILA[Math.floor(Math.random() * MSGS_FILA.length)]
      await sendText(evoCfg, telefone, msgFila)
      await supabase.from('wa_mensagens').insert({
        conversa_id: conversa.id, direcao: 'saida', tipo: 'fila', conteudo: msgFila, enviado: true,
      })
    }

    const conversaSnap = { ...conversa }
    const chegouEm = new Date().toISOString()
    const delayMs = isPrimeira ? 50_000 : 10_000

    after(async () => {
      await new Promise(r => setTimeout(r, delayMs))

      const { data: msgNova } = await supabase
        .from('wa_mensagens')
        .select('id')
        .eq('conversa_id', conversaSnap.id)
        .eq('direcao', 'entrada')
        .gt('created_at', chegouEm)
        .limit(1)
        .maybeSingle()
      if (msgNova) return

      const { data: historico } = await supabase
        .from('wa_mensagens')
        .select('direcao, conteudo, created_at')
        .eq('conversa_id', conversaSnap.id)
        .neq('tipo', 'fila')
        .order('created_at', { ascending: true })
        .limit(30)

      let slotsDisponiveis: { iso: string; label: string }[] = []
      const manuais = Array.isArray(cfg.slots_manuais) ? cfg.slots_manuais as string[] : []
      if (manuais.length > 0) {
        const agora = new Date()
        const agendaQuery = supabase
          .from('agenda')
          .select('data_hora')
          .gte('data_hora', agora.toISOString())
          .not('status', 'in', '("cancelado","faltou")')
        if (empresaId) agendaQuery.eq('empresa_id', empresaId)
        const { data: agendamentos } = await agendaQuery
        const ocupados = new Set(
          (agendamentos ?? []).map(a => new Date(a.data_hora).toISOString().slice(0, 16))
        )
        slotsDisponiveis = manuais
          .filter(iso => new Date(iso) > agora && !ocupados.has(new Date(iso).toISOString().slice(0, 16)))
          .sort((a, b) => a.localeCompare(b))
          .map(iso => ({ iso, label: formatarSlot(new Date(iso)) }))
      } else if (cfg.horario_inicio && cfg.horario_fim) {
        slotsDisponiveis = await calcularSlotsDisponiveis(
          {
            horario_inicio:         cfg.horario_inicio ?? '09:00',
            horario_fim:            cfg.horario_fim    ?? '18:00',
            sabado_ativo:           cfg.sabado_ativo   ?? true,
            sabado_inicio:          cfg.sabado_inicio  ?? '09:00',
            sabado_fim:             cfg.sabado_fim     ?? '13:00',
            duracao_avaliacao_min:  cfg.duracao_avaliacao_min ?? 60,
            slots_antecipacao_dias: cfg.slots_antecipacao_dias ?? 7,
          },
          supabase,
          20,
          empresaId || undefined,
        )
      }

      const resultado = await lauraResponde({
        telefone,
        nome: conversaSnap.nome,
        historico: historico ?? [],
        customPrompt: cfg.prompt_laura,
        slotsDisponiveis,
        model: cfg.modelo_laura ?? 'claude-haiku-4-5-20251001',
        apiKey: empresaApiKey,
      })

      let resposta = resultado.resposta
      if (!resposta) return

      const match = AGENDAR_RE.exec(resposta)
      if (match) {
        const [, dataHoraIso, nomePaciente, profissionalId] = match
        resposta = resposta.replace(AGENDAR_RE, '').trim()
        await processarAgendamento(supabase, dataHoraIso, nomePaciente, telefone, conversaSnap.id, cfg, conversaSnap.canal, profissionalId ?? null)
      }

      if (resposta.includes('<<QUALIFICADO>>')) {
        resposta = resposta.replace(/<<QUALIFICADO>>/g, '').trim()
        await supabase.from('wa_conversas').update({ status: 'qualificado', updated_at: new Date().toISOString() }).eq('id', conversaSnap.id)
      }

      const agendadoRE = /<<AGENDADO:([^>]+)>>/
      const agendadoMatch = agendadoRE.exec(resposta)
      if (agendadoMatch) {
        const nomePaciente = agendadoMatch[1].trim()
        resposta = resposta.replace(agendadoRE, '').trim()
        await supabase.from('wa_conversas').update({
          status: 'agendado',
          nome: nomePaciente || conversaSnap.nome,
          followup_enviado: true,
          updated_at: new Date().toISOString(),
        }).eq('id', conversaSnap.id)
        const telLimpo = telefone.replace(/@.*/, '').replace(/\D/g, '')
        const clienteQuery = supabase.from('clientes').select('id').or(`telefone.eq.${telLimpo},telefone.eq.+${telLimpo}`)
        if (empresaId) clienteQuery.eq('empresa_id', empresaId)
        const { data: clienteExistente } = await clienteQuery.limit(1).maybeSingle()
        if (!clienteExistente?.id && nomePaciente) {
          const insertCliente: Record<string, unknown> = { nome: nomePaciente, telefone: telLimpo }
          if (empresaId) insertCliente.empresa_id = empresaId
          await supabase.from('clientes').insert(insertCliente).select('id').single()
        }
      }

      const custoUsd =
        (resultado.inputTokens / 1_000_000) * 0.80 +
        (resultado.outputTokens / 1_000_000) * 4.00
      if (resultado.inputTokens > 0 || resultado.outputTokens > 0) {
        await supabase.from('agente_uso').insert({
          agente_slug: 'comercial-laura',
          empresa_id: empresaId || null,
          input_tokens: resultado.inputTokens,
          output_tokens: resultado.outputTokens,
          custo_usd: custoUsd,
        })
      }

      const partes = resposta.includes('||SPLIT||')
        ? resposta.split('||SPLIT||').map((p: string) => p.trim()).filter(Boolean)
        : [resposta]

      let outId: string | undefined
      let sendErr: string | undefined

      for (let i = 0; i < partes.length; i++) {
        if (i > 0) await new Promise(r => setTimeout(r, 2500))
        const res = await sendText(evoCfg, telefone, partes[i])
        if (i === 0) { outId = res.messageId; sendErr = res.error }
        if (res.error) console.error('[webhook] falha ao enviar', { parte: i, erro: res.error })
      }

      await supabase.from('wa_mensagens').insert({
        conversa_id: conversaSnap.id,
        direcao: 'saida',
        tipo: 'texto',
        conteudo: resposta.replace(/\|\|SPLIT\|\|/g, ' '),
        message_id: outId || null,
        enviado: !sendErr,
      })

      if (!conversaSnap.status.includes('agendado') && cfg.followup_delay_horas) {
        const followupEm = new Date(Date.now() + cfg.followup_delay_horas * 3600_000).toISOString()
        await supabase
          .from('wa_conversas')
          .update({ followup_em: followupEm, followup_enviado: false, followup_estagio: 1 })
          .eq('id', conversaSnap.id)
          .is('followup_em', null)
      }
    })

    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error('[webhook]', err)
    return new Response('error', { status: 500 })
  }
}

export async function GET() {
  return new Response('Luno WhatsApp Webhook', { status: 200 })
}
