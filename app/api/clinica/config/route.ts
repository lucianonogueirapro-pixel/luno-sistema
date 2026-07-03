import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('empresa_config')
    .select('*')
    .limit(1)
    .single()

  return Response.json(data ?? null)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json() as Record<string, unknown>

  const { data: existing } = await supabase
    .from('empresa_config')
    .select('id')
    .limit(1)
    .single()

  const payload = { ...body, updated_at: new Date().toISOString() }

  let saved
  if (existing?.id) {
    const { data } = await supabase
      .from('empresa_config')
      .update(payload)
      .eq('id', existing.id)
      .select('*')
      .single()
    saved = data
  } else {
    const { data } = await supabase
      .from('empresa_config')
      .insert(payload)
      .select('*')
      .single()
    saved = data
  }

  return Response.json({ ok: true, config: saved })
}
