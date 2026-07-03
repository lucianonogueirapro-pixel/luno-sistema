import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getEmpresaId } from '@/lib/empresa.server'

const STATUS_VALIDOS = ['novo','em_atendimento','qualificado','agendado','nao_respondeu','perdido','convertido']

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const empresaId = await getEmpresaId()
  const supabase = await createClient()

  const { id } = await params
  const formData = await req.formData()
  const status = String(formData.get('status') ?? '')

  if (!STATUS_VALIDOS.includes(status)) {
    return new Response('Status inválido', { status: 400 })
  }

  await supabase
    .from('wa_conversas')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('empresa_id', empresaId)

  return Response.redirect(new URL(`/atendimento/${id}`, req.url), 303)
}
