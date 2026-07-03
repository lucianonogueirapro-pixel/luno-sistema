import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getEmpresaId } from '@/lib/empresa.server'
import { sendText } from '@/lib/whatsapp/evolution'

const MSGS: Record<number, Record<string, string>> = {
  1: {
    qualificado:    `Oi! Aqui é a Laura, da Luno. Passando para saber se você ainda tem alguma dúvida ou se podemos marcar sua avaliação. Quando estiver pronta, é só me chamar. `,
    em_atendimento: `Olá! Aqui é a Laura, da Luno. Ficamos de conversar e não recebi seu retorno. Ainda posso te ajudar a dar o próximo passo — é só me falar quando preferir.`,
    novo:           `Olá! Aqui é a Laura, da Luno. Vi que você entrou em contato. Posso te ajudar com alguma informação?`,
  },
  2: {
    qualificado:    `Oi! Luna da Luno novamente. Queria só deixar a porta aberta — temos agenda disponível e adoraria te conhecer. Uma avaliação presencial muda muito a perspectiva. Quando você puder, me avisa.`,
    em_atendimento: `Olá! Luna da Luno aqui. Passando para verificar se você ainda tem interesse em marcar uma avaliação. Qualquer dúvida, estou aqui.`,
    novo:           `Olá! Aqui é a Laura, da Luno. Passando para verificar se posso te ajudar com alguma informação.`,
  },
  3: {
    qualificado:    `Oi! Luna da Luno. Faz alguns dias que conversamos — não queria deixar você sem retorno. Se quiser marcar uma avaliação ou tiver alguma dúvida, é só me chamar aqui. Com carinho.`,
    em_atendimento: `Olá! Aqui é a Laura, da Luno. Passando para deixar o contato em aberto. Quando você sentir que é o momento certo, estamos aqui.`,
    novo:           `Olá! Luna da Luno aqui. Só deixando o canal aberto caso precise de informações. Estamos à disposição.`,
  },
}

function msgParaEstagio(estagio: number, status: string): string {
  const msgs = MSGS[estagio] ?? MSGS[1]
  return msgs[status] ?? msgs.em_atendimento
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// POST: processa follow-ups de todas as empresas (chamado por cron ou admin)
export async function POST(req: NextRequest) {
  const supabase = adminClient()

  // Busca todas as configs ativas com follow-up configurado
  const { data: configs } = await supabase
    .from('wa_config')
    .select('*')
    .eq('ativo', true)
    .not('empresa_id', 'is', null)

  if (!configs?.length) return Response.json({ enviados: 0 })

  let totalEnviados = 0

  for (const cfg of configs) {
    if (!cfg.api_url || !cfg.api_key || !cfg.instance_name || !cfg.empresa_id) continue

    const { data: pendentes } = await supabase
      .from('wa_conversas')
      .select('id, telefone, nome, status, followup_estagio')
      .eq('empresa_id', cfg.empresa_id)
      .lte('followup_em', new Date().toISOString())
      .eq('followup_enviado', false)
      .not('status', 'in', '("agendado","convertido","perdido")')
      .limit(20)

    if (!pendentes?.length) continue

    for (const c of pendentes) {
      const estagio = c.followup_estagio ?? 1
      const msg = msgParaEstagio(estagio, c.status)

      const { error } = await sendText(
        { apiUrl: cfg.api_url, apiKey: cfg.api_key, instance: cfg.instance_name },
        c.telefone,
        msg,
      )

      if (!error) {
        await supabase.from('wa_mensagens').insert({
          conversa_id: c.id,
          direcao: 'saida',
          tipo: 'texto',
          conteudo: msg,
          enviado: true,
        })

        let proximoEm: string | null = null
        let proximoEstagio: number | null = null

        if (estagio === 1 && cfg.followup2_horas) {
          proximoEm = new Date(Date.now() + cfg.followup2_horas * 3600_000).toISOString()
          proximoEstagio = 2
        } else if (estagio === 2 && cfg.followup3_horas) {
          proximoEm = new Date(Date.now() + cfg.followup3_horas * 3600_000).toISOString()
          proximoEstagio = 3
        }

        await supabase
          .from('wa_conversas')
          .update({
            followup_enviado: proximoEm ? false : true,
            followup_em: proximoEm,
            followup_estagio: proximoEstagio ?? estagio,
            updated_at: new Date().toISOString(),
          })
          .eq('id', c.id)

        totalEnviados++
      }
    }
  }

  return Response.json({ enviados: totalEnviados })
}

// PUT: agenda follow-up para uma conversa específica
export async function PUT(req: NextRequest) {
  const empresaId = await getEmpresaId()
  const supabase = await createServerClient()

  const { conversaId, horas } = await req.json() as { conversaId: string; horas?: number }
  const delay = (horas ?? 24) * 3600_000
  const followupEm = new Date(Date.now() + delay).toISOString()

  await supabase
    .from('wa_conversas')
    .update({ followup_em: followupEm, followup_enviado: false, followup_estagio: 1 })
    .eq('id', conversaId)
    .eq('empresa_id', empresaId)

  return Response.json({ ok: true, followup_em: followupEm })
}
