import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getEmpresaId } from '@/lib/empresa.server'
import { getInstanceStatus, setWebhook } from '@/lib/whatsapp/evolution'

// Credenciais da Evolution API — centralizadas em env vars, nunca expostas ao cliente
function evolutionCreds() {
  return {
    apiUrl: process.env.EVOLUTION_API_URL ?? '',
    apiKey: process.env.EVOLUTION_API_KEY ?? '',
  }
}

const CONFIG_FIELDS = 'id, empresa_id, instance_name, ativo, auto_responder, followup_delay_horas, followup2_horas, followup3_horas, prompt_laura, webhook_token, creditos_usd, modelo_laura, horario_inicio, horario_fim, sabado_ativo, sabado_inicio, sabado_fim, duracao_avaliacao_min, slots_antecipacao_dias, nome, tag_padrao, slots_manuais'

function adminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(req: NextRequest) {
  const empresaId = await getEmpresaId()
  const admin = adminClient()

  const id = req.nextUrl.searchParams.get('id')

  let data = null
  if (id) {
    const { data: d } = await admin.from('wa_config').select(CONFIG_FIELDS).eq('id', id).eq('empresa_id', empresaId).single()
    data = d
  } else {
    const { data: d } = await admin.from('wa_config').select(CONFIG_FIELDS).eq('empresa_id', empresaId).limit(1).single()
    data = d
  }

  // api_url e api_key nunca são enviados ao cliente — ficam no servidor
  return Response.json(data ?? null)
}

export async function POST(req: NextRequest) {
  const empresaId = await getEmpresaId()
  const admin = adminClient()

  const body = await req.json() as {
    id?: string
    instance_name?: string
    ativo?: boolean
    auto_responder?: boolean
    followup_delay_horas?: number
    followup2_horas?: number | null
    followup3_horas?: number | null
    prompt_laura?: string
    webhook_token?: string
    creditos_usd?: number
    modelo_laura?: string
    horario_inicio?: string
    horario_fim?: string
    sabado_ativo?: boolean
    sabado_inicio?: string
    sabado_fim?: string
    duracao_avaliacao_min?: number
    slots_antecipacao_dias?: number
    nome?: string
    tag_padrao?: string
    slots_manuais?: string[]
  }

  const configId = body.id

  let existing: { id: string } | null = null
  if (configId) {
    const { data } = await admin.from('wa_config').select('id').eq('id', configId).eq('empresa_id', empresaId).single()
    existing = data
  } else {
    const { data } = await admin.from('wa_config').select('id').eq('empresa_id', empresaId).limit(1).single()
    existing = data
  }

  const { id: _id, ...bodyWithoutId } = body

  // Credenciais da Evolution API sempre vêm do servidor — cliente não tem acesso
  const creds = evolutionCreds()
  const payload = {
    ...bodyWithoutId,
    empresa_id: empresaId,
    updated_at: new Date().toISOString(),
    ...(creds.apiUrl ? { api_url: creds.apiUrl } : {}),
    ...(creds.apiKey ? { api_key: creds.apiKey } : {}),
  }

  let saved
  if (existing?.id) {
    const { data, error } = await admin
      .from('wa_config')
      .update(payload)
      .eq('id', existing.id)
      .select('id, empresa_id, instance_name, ativo, auto_responder, followup_delay_horas, followup2_horas, followup3_horas, webhook_token')
      .single()
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 })
    saved = data
  } else {
    const { data, error } = await admin
      .from('wa_config')
      .insert(payload)
      .select('id, empresa_id, instance_name, ativo, auto_responder, followup_delay_horas, followup2_horas, followup3_horas, webhook_token')
      .single()
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 })
    saved = data
  }

  return Response.json({ ok: true, config: saved })
}

// Registra webhook na Evolution API
export async function PATCH(req: NextRequest) {
  const empresaId = await getEmpresaId()
  const supabase = await createClient()

  const { webhookUrl } = await req.json() as { webhookUrl: string }
  const { data: cfg } = await supabase.from('wa_config').select('instance_name').eq('empresa_id', empresaId).limit(1).single()
  if (!cfg?.instance_name) {
    return Response.json({ ok: false, error: 'Instância não configurada.' })
  }

  const creds = evolutionCreds()
  if (!creds.apiUrl || !creds.apiKey) {
    return Response.json({ ok: false, error: 'Evolution API não configurada no servidor.' })
  }

  const result = await setWebhook(
    { apiUrl: creds.apiUrl, apiKey: creds.apiKey, instance: cfg.instance_name },
    webhookUrl,
  )
  return Response.json(result)
}

// Testa conexão com a Evolution API
export async function PUT() {
  const empresaId = await getEmpresaId()
  const supabase = await createClient()

  const { data: cfg } = await supabase.from('wa_config').select('instance_name').eq('empresa_id', empresaId).limit(1).single()
  if (!cfg?.instance_name) {
    return Response.json({ status: 'not_configured' })
  }

  const creds = evolutionCreds()
  if (!creds.apiUrl || !creds.apiKey) {
    return Response.json({ status: 'not_configured' })
  }

  const status = await getInstanceStatus({
    apiUrl: creds.apiUrl,
    apiKey: creds.apiKey,
    instance: cfg.instance_name,
  })

  return Response.json({ status })
}
