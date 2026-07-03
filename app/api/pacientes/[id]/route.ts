import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function supabaseService() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id) return Response.json({ error: 'ID obrigatório' }, { status: 400 })

  const supabase = supabaseService()

  const steps = [
    () => supabase.from('orcamentos').delete().eq('cliente_id', id),
    () => supabase.from('agenda').delete().eq('cliente_id', id),
    () => supabase.from('avaliacoes').delete().eq('cliente_id', id),
    () => supabase.from('lancamentos').delete().eq('cliente_id', id),
    () => supabase.from('wa_conversas').delete().eq('cliente_id', id),
    () => supabase.from('clientes').delete().eq('id', id),
  ]

  for (const step of steps) {
    const { error } = await step()
    if (error) {
      console.error('[delete cliente]', error)
      return Response.json({ error: error.message }, { status: 500 })
    }
  }

  return Response.json({ ok: true })
}
