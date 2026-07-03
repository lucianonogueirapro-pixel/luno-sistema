import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { sendText, formatPhone } from '@/lib/whatsapp/evolution'

export const runtime = 'nodejs'

function autorizado(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

function horaAtualBRT(): { hora: number; minuto: number; mes: number; dia: number; ano: number } {
  const agora = new Date()
  const brt = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Fortaleza' }))
  return {
    hora: brt.getHours(),
    minuto: brt.getMinutes(),
    mes: brt.getMonth() + 1,
    dia: brt.getDate(),
    ano: brt.getFullYear(),
  }
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const [{ data: waCfg }, { data: clinicaCfg }, { data: msgConfigs }] = await Promise.all([
    admin.from('wa_config').select('*').limit(1).maybeSingle(),
    admin.from('empresa_config').select('nome').limit(1).maybeSingle(),
    admin.from('mensagens_auto').select('*').eq('ativo', true),
  ])

  if (!waCfg?.api_url || !waCfg?.api_key || !waCfg?.instance_name) {
    return NextResponse.json({ error: 'Evolution API não configurada', enviados: 0 })
  }

  const nomeClinica = clinicaCfg?.nome ?? 'Luno'
  const evoCfg = { apiUrl: waCfg.api_url, apiKey: waCfg.api_key, instance: waCfg.instance_name }
  const { hora: horaAtual, mes, dia, ano } = horaAtualBRT()
  const agora = new Date()

  const resultados: Record<string, { enviados: number; erros: string[] }> = {}

  for (const cfg of (msgConfigs ?? [])) {
    const [cfgHora] = (cfg.horario ?? '10:00').split(':').map(Number)
    if (horaAtual !== cfgHora) continue

    resultados[cfg.tipo] = { enviados: 0, erros: [] }

    // ── Boas-vindas: pacientes criados nas últimas 24h ──────────────────────
    if (cfg.tipo === 'boas_vindas') {
      const limite = new Date(agora.getTime() - 25 * 3600_000).toISOString()
      const { data: clientes } = await admin
        .from('clientes')
        .select('id, nome, telefone')
        .gte('created_at', limite)
        .not('telefone', 'is', null)

      for (const p of (clientes ?? [])) {
        const { data: log } = await admin
          .from('mensagens_auto_log')
          .select('id')
          .eq('cliente_id', p.id)
          .eq('tipo', 'boas_vindas')
          .limit(1)
          .maybeSingle()
        if (log?.id) continue

        const texto = formatTemplate(cfg.template, p.nome, nomeClinica)
        const { error } = await sendText(evoCfg, formatPhone(p.telefone), texto)

        if (error) {
          resultados[cfg.tipo].erros.push(`${p.nome}: ${error}`)
        } else {
          await admin.from('mensagens_auto_log').insert({ tipo: 'boas_vindas', cliente_id: p.id, status: 'enviado' })
          resultados[cfg.tipo].enviados++
        }
      }
    }

    // ── Aniversário: pacientes que fazem aniversário hoje ───────────────────
    if (cfg.tipo === 'aniversario') {
      const { data: clientes } = await admin
        .from('clientes')
        .select('id, nome, telefone, data_nascimento')
        .not('data_nascimento', 'is', null)
        .not('telefone', 'is', null)

      const aniversariantes = (clientes ?? []).filter(p => {
        if (!p.data_nascimento) return false
        const partes = p.data_nascimento.split('-').map(Number)
        return partes[1] === mes && partes[2] === dia
      })

      for (const p of aniversariantes) {
        const { data: log } = await admin
          .from('mensagens_auto_log')
          .select('id')
          .eq('cliente_id', p.id)
          .eq('tipo', 'aniversario')
          .gte('enviado_at', `${ano}-01-01`)
          .limit(1)
          .maybeSingle()
        if (log?.id) continue

        const texto = formatTemplate(cfg.template, p.nome, nomeClinica)
        const { error } = await sendText(evoCfg, formatPhone(p.telefone), texto)

        if (error) {
          resultados[cfg.tipo].erros.push(`${p.nome}: ${error}`)
        } else {
          await admin.from('mensagens_auto_log').insert({ tipo: 'aniversario', cliente_id: p.id, status: 'enviado' })
          resultados[cfg.tipo].enviados++
        }
      }
    }

    // ── Retorno: último atendimento foi há X dias ────────────────────────────
    if (cfg.tipo === 'retorno') {
      const dias = cfg.dias_depois ?? 60
      const inicioJanela = new Date(agora.getTime() - (dias + 1) * 24 * 3600_000).toISOString()
      const fimJanela = new Date(agora.getTime() - dias * 24 * 3600_000).toISOString()

      const { data: agendamentos } = await admin
        .from('agenda')
        .select('cliente_id, clientes(nome, telefone)')
        .gte('data_hora', inicioJanela)
        .lte('data_hora', fimJanela)
        .in('status', ['realizado', 'confirmado', 'agendado'])

      const vistos = new Set<string>()
      for (const ag of (agendamentos ?? [])) {
        const pid = ag.cliente_id
        if (!pid || vistos.has(pid)) continue
        vistos.add(pid)

        const pac = ag.clientes as any
        if (!pac?.telefone) continue

        // Garante que não houve atendimento mais recente
        const { data: maisRecente } = await admin
          .from('agenda')
          .select('id')
          .eq('cliente_id', pid)
          .gt('data_hora', fimJanela)
          .limit(1)
          .maybeSingle()
        if (maisRecente?.id) continue

        // Verifica log recente (evita envio duplicado)
        const logLimite = new Date(agora.getTime() - (dias - 1) * 24 * 3600_000).toISOString()
        const { data: log } = await admin
          .from('mensagens_auto_log')
          .select('id')
          .eq('cliente_id', pid)
          .eq('tipo', 'retorno')
          .gte('enviado_at', logLimite)
          .limit(1)
          .maybeSingle()
        if (log?.id) continue

        const texto = formatTemplate(cfg.template, pac.nome, nomeClinica)
        const { error } = await sendText(evoCfg, formatPhone(pac.telefone), texto)

        if (error) {
          resultados[cfg.tipo].erros.push(`${pac.nome}: ${error}`)
        } else {
          await admin.from('mensagens_auto_log').insert({ tipo: 'retorno', cliente_id: pid, status: 'enviado' })
          resultados[cfg.tipo].enviados++
        }
      }
    }
  }

  return NextResponse.json({ ok: true, resultados })
}

function formatTemplate(template: string, nomeCompleto: string, clinica: string): string {
  const nome = nomeCompleto.split(' ')[0]
  return template
    .replace(/{nome}/g, nome)
    .replace(/{clinica}/g, clinica)
}
