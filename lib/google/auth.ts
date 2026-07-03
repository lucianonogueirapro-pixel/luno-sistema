import { createClient } from '@/lib/supabase/server'

const STAR_MAP: Record<string, number> = {
  ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5,
}

export function starToNumber(star: string): number {
  return STAR_MAP[star] ?? 0
}

export function buildAuthUrl(): string {
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID!,
    redirect_uri:  process.env.GOOGLE_REDIRECT_URI!,
    response_type: 'code',
    scope:         'https://www.googleapis.com/auth/business.manage',
    access_type:   'offline',
    prompt:        'consent',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function exchangeCode(code: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
}> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri:  process.env.GOOGLE_REDIRECT_URI!,
      grant_type:    'authorization_code',
    }),
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error_description ?? json.error)
  return json
}

export async function getValidToken(): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('google_oauth')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!data) throw new Error('Google não conectado')

  // Token ainda válido por mais de 5 minutos
  if (data.expires_at && new Date(data.expires_at) > new Date(Date.now() + 5 * 60_000)) {
    return data.access_token
  }

  if (!data.refresh_token) throw new Error('Sem refresh_token — reconecte o Google')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: data.refresh_token,
      grant_type:    'refresh_token',
    }),
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error_description ?? json.error)

  const expires_at = new Date(Date.now() + json.expires_in * 1000).toISOString()
  await supabase
    .from('google_oauth')
    .update({ access_token: json.access_token, expires_at, updated_at: new Date().toISOString() })
    .eq('id', data.id)

  return json.access_token
}

export async function getConnection() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('google_oauth')
    .select('account_id, location_id, location_name, expires_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  return data
}
