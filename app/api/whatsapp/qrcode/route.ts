import { createClient } from '@supabase/supabase-js'
import { getEmpresaId } from '@/lib/empresa.server'

function supa() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET() {
  const empresaId = await getEmpresaId()
  const supabase = supa()
  const { data: cfg } = await supabase.from('wa_config').select('*').eq('empresa_id', empresaId).limit(1).single()
  if (!cfg) return Response.json({ error: 'wa_config não encontrada' }, { status: 500 })

  const headers = { 'Content-Type': 'application/json', apikey: cfg.api_key }
  const base    = cfg.api_url
  const inst    = cfg.instance_name
  const instEnc = encodeURIComponent(inst)

  try {
    // 1. Verifica estado atual
    const stateRes = await fetch(`${base}/instance/connectionState/${instEnc}`, { headers, signal: AbortSignal.timeout(8000) })
    const stateData = await stateRes.json().catch(() => ({}))
    const state = stateData?.instance?.state ?? stateData?.state ?? 'unknown'

    if (state === 'open') {
      return Response.json({ state: 'open', qr: null })
    }

    // 2. Tenta conectar a instância existente (sem deletar a sessão)
    const connectRes = await fetch(`${base}/instance/connect/${instEnc}`, { headers, signal: AbortSignal.timeout(15000) })
    const connectData = await connectRes.json().catch(() => null)

    const qrBase64 = connectData?.base64 ?? connectData?.qrcode?.base64 ?? null
    const qrCode   = connectData?.code   ?? connectData?.qrcode?.code   ?? null

    if (qrBase64 || qrCode) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
      fetch(`${base}/webhook/set/${inst}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          url: `${appUrl}/api/whatsapp/webhook`,
          webhook_by_events: false,
          webhook_base64: false,
          events: ['MESSAGES_UPSERT'],
        }),
      }).catch(() => {})

      return Response.json({ state: 'close', qr: qrBase64, code: qrCode })
    }

    // 3. Instância não existe — cria do zero
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/whatsapp/webhook`
    const createRes = await fetch(`${base}/instance/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        instanceName: inst,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        webhook: {
          url: webhookUrl,
          byEvents: false,
          base64: false,
          events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'],
        },
      }),
      signal: AbortSignal.timeout(15000),
    })
    const createData = await createRes.json().catch(() => null)

    const base64 = createData?.qrcode?.base64 ?? createData?.hash?.qrcode?.base64 ?? createData?.base64 ?? null
    const code   = createData?.qrcode?.code   ?? createData?.hash?.qrcode?.code   ?? createData?.code   ?? null

    if (base64 || code) {
      fetch(`${base}/webhook/set/${inst}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          url: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/whatsapp/webhook`,
          webhook_by_events: false,
          webhook_base64: false,
          events: ['MESSAGES_UPSERT'],
        }),
      }).catch(() => {})

      return Response.json({ state: 'close', qr: base64, code })
    }

    return Response.json({ state, qr: null, debug: { connect: connectData, create: createData } })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE() {
  const empresaId = await getEmpresaId()
  const supabase = supa()
  const { data: cfg } = await supabase.from('wa_config').select('*').eq('empresa_id', empresaId).limit(1).single()
  if (!cfg) return Response.json({ error: 'wa_config não encontrada' }, { status: 500 })

  try {
    const res = await fetch(
      `${cfg.api_url}/instance/logout/${encodeURIComponent(cfg.instance_name)}`,
      { method: 'DELETE', headers: { apikey: cfg.api_key }, signal: AbortSignal.timeout(8000) },
    )
    const data = await res.json()
    return Response.json({ ok: res.ok, data })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
