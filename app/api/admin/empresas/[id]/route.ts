import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function requireSuperAdmin(): Promise<boolean> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    const role = user?.user_metadata?.role ?? user?.app_metadata?.role
    return role === 'super_admin'
  } catch {
    return false
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await requireSuperAdmin()) return Response.json({ error: 'Não autorizado' }, { status: 401 })
  const { id } = await params
  const admin = adminClient()

  const { data: empresa } = await admin
    .from('empresas')
    .select('*')
    .eq('id', id)
    .single()

  const { data: users } = await admin
    .from('empresa_users')
    .select('id, role, user_id, created_at')
    .eq('empresa_id', id)

  return Response.json({ empresa, users: users ?? [] })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await requireSuperAdmin()) return Response.json({ error: 'Não autorizado' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const admin = adminClient()

  const updates: Record<string, unknown> = {}
  if ('nome' in body) updates.nome = body.nome
  if ('plano' in body) updates.plano = body.plano
  if ('ativo' in body) updates.ativo = body.ativo
  if ('anthropic_api_key' in body) updates.anthropic_api_key = body.anthropic_api_key || null
  if ('openai_api_key' in body) updates.openai_api_key = body.openai_api_key || null
  if ('whatsapp' in body) updates.whatsapp = body.whatsapp || null
  if ('valor_mensal' in body) updates.valor_mensal = body.valor_mensal ? Number(body.valor_mensal) : null
  if ('dia_vencimento' in body) updates.dia_vencimento = body.dia_vencimento ? Number(body.dia_vencimento) : null
  if ('proxima_cobranca' in body) updates.proxima_cobranca = body.proxima_cobranca || null
  if ('observacoes' in body) updates.observacoes = body.observacoes || null
  updates.updated_at = new Date().toISOString()

  const { data, error } = await admin
    .from('empresas')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ empresa: data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await requireSuperAdmin()) return Response.json({ error: 'Não autorizado' }, { status: 401 })
  const { id } = await params
  const admin = adminClient()
  const { error } = await admin.from('empresas').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ ok: true })
}
