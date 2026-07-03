export interface EvolutionConfig {
  apiUrl:   string
  apiKey:   string
  instance: string
}

interface SendTextResult {
  messageId?: string
  error?: string
}

export async function sendText(
  cfg: EvolutionConfig,
  to: string,
  text: string,
): Promise<SendTextResult> {
  const url = `${cfg.apiUrl}/message/sendText/${encodeURIComponent(cfg.instance)}`
  const headers = { 'Content-Type': 'application/json', apikey: cfg.apiKey }
  const signal = AbortSignal.timeout(15000)

  // Normaliza número: @lid preserva como está; demais usa só dígitos
  const number = to.endsWith('@lid') ? to : to.replace('@s.whatsapp.net', '').replace(/\D/g, '')

  // Tenta formato v2.1+ primeiro (campo "text" flat)
  try {
    const r1 = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ number, text }),
      signal,
    })
    if (r1.ok) {
      const d = await r1.json()
      return { messageId: d?.key?.id ?? d?.id }
    }
    const body1 = await r1.text()

    // Fallback: formato legado (textMessage.text)
    const r2 = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ number, textMessage: { text } }),
      signal: AbortSignal.timeout(15000),
    })
    if (r2.ok) {
      const d = await r2.json()
      return { messageId: d?.key?.id ?? d?.id }
    }
    const body2 = await r2.text()
    return { error: `v2.1 ${r1.status}: ${body1} | legado ${r2.status}: ${body2}` }
  } catch (e) {
    return { error: String(e) }
  }
}

export async function setWebhook(cfg: EvolutionConfig, webhookUrl: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${cfg.apiUrl}/webhook/set/${encodeURIComponent(cfg.instance)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: cfg.apiKey },
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: webhookUrl,
          webhook_by_events: false,
          webhook_base64: false,
          events: ['MESSAGES_UPSERT'],
        },
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (res.ok) return { ok: true }
    const body = await res.text()
    return { ok: false, error: `HTTP ${res.status}: ${body}` }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

export async function getInstanceStatus(cfg: EvolutionConfig): Promise<string> {
  try {
    const res = await fetch(
      `${cfg.apiUrl}/instance/connectionState/${encodeURIComponent(cfg.instance)}`,
      { headers: { apikey: cfg.apiKey } },
    )
    if (!res.ok) return 'disconnected'
    const data = await res.json()
    return data?.instance?.state ?? 'unknown'
  } catch {
    return 'error'
  }
}

// Formata número para padrão Evolution: 5586999999999 (sem @s.whatsapp.net)
// Para JIDs @lid (novo protocolo de privacidade do WhatsApp), preserva o sufixo
// para que o Evolution API possa rotear a resposta corretamente.
export function formatPhone(raw: string): string {
  if (raw.endsWith('@lid')) return raw
  return raw.replace('@s.whatsapp.net', '').replace(/\D/g, '')
}

// Extrai texto da mensagem no payload do webhook
// Retorna placeholder para mídia (foto, vídeo, áudio) para Luna poder continuar o fluxo
export function extractMessageText(data: Record<string, unknown>): string | null {
  const msg = data?.message as Record<string, unknown> | undefined
  if (!msg) return null

  const texto =
    (msg.conversation as string) ||
    (msg.extendedTextMessage as Record<string, string> | undefined)?.text ||
    null

  if (texto) return texto

  if (msg.imageMessage) return '[a pessoa enviou uma foto]'
  if (msg.videoMessage) return '[a pessoa enviou um vídeo]'
  if (msg.audioMessage) return '[a pessoa enviou um áudio]'
  if (msg.documentMessage) return '[a pessoa enviou um documento]'

  return null
}
