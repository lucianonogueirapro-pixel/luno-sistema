import { NextRequest } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getEmpresaId } from '@/lib/empresa.server'

function supabaseService() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const empresaId = await getEmpresaId()
  const supabase = await createClient()

  const { id } = await params
  const body = await req.json()
  const { status, etiquetas, modo_humano } = body

  if (etiquetas !== undefined && !Array.isArray(etiquetas)) {
    return Response.json({ error: 'Etiquetas inválidas' }, { status: 400 })
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (status !== undefined) update.status = status
  if (etiquetas !== undefined) update.etiquetas = etiquetas
  if (modo_humano !== undefined) update.modo_humano = modo_humano

  const { error } = await supabase
    .from('wa_conversas')
    .update(update)
    .eq('id', id)
    .eq('empresa_id', empresaId)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const empresaId = await getEmpresaId()
  const { id } = await params
  const admin = supabaseService()

  await admin.from('wa_mensagens').delete().eq('conversa_id', id)
  const { error } = await admin.from('wa_conversas').delete().eq('id', id).eq('empresa_id', empresaId)

  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
