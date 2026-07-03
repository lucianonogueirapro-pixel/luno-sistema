import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { sendText, formatPhone } from '@/lib/whatsapp/evolution'

export const runtime = 'nodejs'

function autorizado(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

function fmtDia(d: Date): string {
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
    timeZone: 'America/Fortaleza',
  })
}

function fmtHora(d: Date): string {
  return d.toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Fortaleza',
  })
}

const TIPO_LABEL: Record<string, string> = {
  servico: 'atendimento', retorno: 'retorno',
  avaliacao: 'avaliação', outro: 'consulta',
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const [{ data: cfg }, { data: clinicaCfg }] = await Promise.all([
    admin.from('wa_config').select('*').limit(1).maybeSingle(),
    admin.from('empresa_config').select('nome, endereco, cidade').limit(1).maybeSingle(),
  ])

  if (!cfg?.api_url || !cfg?.api_key || !cfg?.instance_name) {
    return NextResponse.json({ error: 'Evolution API não configurada', enviados: 0 })
  }

  const nomeClinica = clinicaCfg?.nome ?? 'Luno'
  const enderecoClinica = clinicaCfg?.endereco
    ? `${clinicaCfg.endereco}${clinicaCfg.cidade ? ` — ${clinicaCfg.cidade}` : ''}`
    : 'Av. Homero Castelo Branco, 2541 — Sala 07, Ininga, Teresina/PI'

  // Janela de amanhã em BRT (UTC-3)
  const agora = new Date()
  const inicioAmanha = new Date(agora)
  inicioAmanha.setUTCHours(inicioAmanha.getUTCHours() + 24)
  inicioAmanha.setUTCHours(3, 0, 0, 0) // 00:00 BRT = 03:00 UTC

  const fimAmanha = new Date(inicioAmanha.getTime() + 24 * 3600_000 - 1)

  const { data: agendamentos } = await admin
    .from('agenda')
    .select('id, data_hora, tipo, clientes(nome, telefone), profissionais(nome)')
    .gte('data_hora', inicioAmanha.toISOString())
    .lte('data_hora', fimAmanha.toISOString())
    .in('status', ['agendado', 'confirmado'])
    .is('lembrete_enviado_at', null)

  if (!agendamentos?.length) {
    return NextResponse.json({ enviados: 0, msg: 'Nenhum agendamento pendente de lembrete' })
  }

  let enviados = 0
  const erros: string[] = []

  for (const ag of agendamentos) {
    const pac = ag.clientes as any
    if (!pac?.telefone) continue

    const dataHora = new Date(ag.data_hora)
    const tipo = TIPO_LABEL[ag.tipo] ?? 'consulta'
    const profNome = (ag.profissionais as any)?.nome

    const comProf = profNome ? ` com ${profNome}` : ''
    const msg =
      `Olá, ${pac.nome}! Aqui é a ${nomeClinica}.\n\n` +
      `Passando para confirmar sua ${tipo}${comProf} amanhã, ${fmtDia(dataHora)}, às ${fmtHora(dataHora)}.\n\n` +
      `${enderecoClinica}.\n\n` +
      `Por favor, confirme sua presença respondendo *SIM*. Qualquer dúvida, estamos aqui! 😊`

    const { error } = await sendText(
      { apiUrl: cfg.api_url, apiKey: cfg.api_key, instance: cfg.instance_name },
      formatPhone(pac.telefone),
      msg,
    )

    if (error) {
      erros.push(`${pac.nome}: ${error}`)
    } else {
      await admin
        .from('agenda')
        .update({ lembrete_enviado_at: new Date().toISOString() })
        .eq('id', ag.id)
      enviados++
    }
  }

  return NextResponse.json({ enviados, total: agendamentos.length, erros })
}
