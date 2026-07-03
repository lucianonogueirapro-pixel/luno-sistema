import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getEmpresaId } from '@/lib/empresa.server'

export async function GET(req: NextRequest) {
  const empresaId = await getEmpresaId()
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data: cfg } = await supabase.from('wa_config').select('*').eq('empresa_id', empresaId).limit(1).single()
  if (!cfg) return Response.json({ error: 'wa_config não encontrada' }, { status: 500 })

  const stateUrl     = `${cfg.api_url}/instance/connectionState/${cfg.instance_name}`
  const instancesUrl = `${cfg.api_url}/instance/fetchInstances`
  const sendUrl      = `${cfg.api_url}/message/sendText/${cfg.instance_name}`
  const testPhone    = req.nextUrl.searchParams.get('phone') ?? ''
  const headers      = { 'Content-Type': 'application/json', apikey: cfg.api_key }

  // 1. Status da instância
  let stateResult: Record<string, unknown> = {}
  try {
    const r = await fetch(stateUrl, { headers, signal: AbortSignal.timeout(8000) })
    const body = await r.text()
    stateResult = { status: r.status, ok: r.ok, body: body.slice(0, 600) }
  } catch (e) { stateResult = { error: String(e) } }

  // 2. Lista todas as instâncias (confirma nome e status)
  let instancesList: Record<string, unknown> = {}
  try {
    const r = await fetch(instancesUrl, { headers, signal: AbortSignal.timeout(8000) })
    const body = await r.text()
    instancesList = { status: r.status, ok: r.ok, body: body.slice(0, 800) }
  } catch (e) { instancesList = { error: String(e) } }

  // 3. Teste envio formato v2.1+ (text flat)
  let sendV2: Record<string, unknown> = { skipped: !testPhone }
  if (testPhone) {
    try {
      const r = await fetch(sendUrl, {
        method: 'POST', headers,
        body: JSON.stringify({ number: testPhone, text: 'Teste Luno — pode ignorar' }),
        signal: AbortSignal.timeout(10000),
      })
      const body = await r.text()
      sendV2 = { format: 'v2.1+ (text flat)', status: r.status, ok: r.ok, body: body.slice(0, 800) }
    } catch (e) { sendV2 = { format: 'v2.1+ (text flat)', error: String(e) } }
  }

  // 4. Teste envio formato legado (textMessage.text)
  let sendLegacy: Record<string, unknown> = { skipped: !testPhone }
  if (testPhone) {
    try {
      const r = await fetch(sendUrl, {
        method: 'POST', headers,
        body: JSON.stringify({ number: testPhone, textMessage: { text: 'Teste Luno legacy — pode ignorar' } }),
        signal: AbortSignal.timeout(10000),
      })
      const body = await r.text()
      sendLegacy = { format: 'legado (textMessage.text)', status: r.status, ok: r.ok, body: body.slice(0, 800) }
    } catch (e) { sendLegacy = { format: 'legado (textMessage.text)', error: String(e) } }
  }

  // 5. Teste com número + @s.whatsapp.net (formato alternativo)
  let sendJid: Record<string, unknown> = { skipped: !testPhone }
  if (testPhone) {
    const jid = `${testPhone}@s.whatsapp.net`
    try {
      const r = await fetch(sendUrl, {
        method: 'POST', headers,
        body: JSON.stringify({ number: jid, text: 'Teste Luno JID — pode ignorar' }),
        signal: AbortSignal.timeout(10000),
      })
      const body = await r.text()
      sendJid = { format: `JID (${jid})`, status: r.status, ok: r.ok, body: body.slice(0, 800) }
    } catch (e) { sendJid = { format: `JID (${jid})`, error: String(e) } }
  }

  return Response.json({
    config: {
      api_url: cfg.api_url,
      instance: cfg.instance_name,
      ativo: cfg.ativo,
      auto_responder: cfg.auto_responder,
      has_key: !!cfg.api_key,
      key_prefix: cfg.api_key ? String(cfg.api_key).slice(0, 6) + '...' : null,
    },
    state: stateResult,
    instances: instancesList,
    send_v2: sendV2,
    send_legacy: sendLegacy,
    send_jid: sendJid,
  })
}
