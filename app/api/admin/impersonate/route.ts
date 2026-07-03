import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

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

// GET — retorna empresa que está sendo visualizada (ou impersonating: false)
export async function GET(req: NextRequest) {
  if (!await requireSuperAdmin()) {
    return NextResponse.json({ impersonating: false })
  }

  const empresaId = req.cookies.get('luno_impersonate')?.value
  if (!empresaId) return NextResponse.json({ impersonating: false })

  const { data: empresa } = await adminClient()
    .from('empresas')
    .select('id, nome, slug')
    .eq('id', empresaId)
    .single()

  if (!empresa) {
    const res = NextResponse.json({ impersonating: false })
    res.cookies.delete('luno_impersonate')
    return res
  }

  return NextResponse.json({ impersonating: true, empresa })
}

// POST { empresa_id } — inicia visualização como cliente
export async function POST(req: NextRequest) {
  if (!await requireSuperAdmin()) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { empresa_id } = await req.json()
  if (!empresa_id) {
    return NextResponse.json({ error: 'empresa_id obrigatório' }, { status: 400 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('luno_impersonate', empresa_id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  })
  return res
}

// DELETE — sai da visualização como cliente
export async function DELETE() {
  if (!await requireSuperAdmin()) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.delete('luno_impersonate')
  return res
}
