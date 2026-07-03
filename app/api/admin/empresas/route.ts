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

export async function GET() {
  if (!await requireSuperAdmin()) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const admin = adminClient()
  const { data: empresas, error } = await admin
    .from('empresas')
    .select('id, nome, slug, plano, ativo, anthropic_api_key, whatsapp, valor_mensal, dia_vencimento, proxima_cobranca, observacoes, created_at')
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const { data: userLinks } = await admin
    .from('empresa_users')
    .select('empresa_id')

  const countMap: Record<string, number> = {}
  for (const u of userLinks ?? []) {
    countMap[u.empresa_id] = (countMap[u.empresa_id] ?? 0) + 1
  }

  const result = (empresas ?? []).map(e => ({
    ...e,
    anthropic_api_key: e.anthropic_api_key ? '••••' + e.anthropic_api_key.slice(-4) : null,
    user_count: countMap[e.id] ?? 0,
  }))

  return Response.json({ empresas: result })
}

export async function POST(req: NextRequest) {
  if (!await requireSuperAdmin()) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const {
    nome, slug, plano, email, senha,
    anthropic_api_key, openai_api_key,
    whatsapp, valor_mensal, dia_vencimento, proxima_cobranca, observacoes,
  } = body

  if (!nome || !slug) {
    return Response.json({ error: 'Nome e slug são obrigatórios' }, { status: 400 })
  }

  const admin = adminClient()

  const insertData: Record<string, unknown> = {
    nome,
    slug,
    plano: plano ?? 'basic',
    anthropic_api_key: anthropic_api_key || null,
    openai_api_key: openai_api_key || null,
    whatsapp: whatsapp || null,
    valor_mensal: valor_mensal ? Number(valor_mensal) : null,
    dia_vencimento: dia_vencimento ? Number(dia_vencimento) : 10,
    proxima_cobranca: proxima_cobranca || null,
    observacoes: observacoes || null,
  }

  const { data: empresa, error: empresaErr } = await admin
    .from('empresas')
    .insert(insertData)
    .select()
    .single()

  if (empresaErr) return Response.json({ error: empresaErr.message }, { status: 400 })

  if (email && senha) {
    const { data: { user: newUser }, error: userErr } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    })

    if (userErr) {
      await admin.from('empresas').delete().eq('id', empresa.id)
      return Response.json({ error: userErr.message }, { status: 400 })
    }

    await admin.from('empresa_users').insert({
      user_id: newUser!.id,
      empresa_id: empresa.id,
      role: 'owner',
    })
  }

  return Response.json({ empresa })
}
