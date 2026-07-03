import { createClient } from '@/lib/supabase/server'
import { getEmpresaId } from '@/lib/empresa.server'

export async function GET() {
  const empresaId = await getEmpresaId()
  const supabase = await createClient()

  const [
    { count: total },
    { count: novos },
    { count: emAtendimento },
    { count: qualificados },
    { count: agendados },
    { count: followupPendente },
  ] = await Promise.all([
    supabase.from('wa_conversas').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaId),
    supabase.from('wa_conversas').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaId).eq('status', 'novo'),
    supabase.from('wa_conversas').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaId).eq('status', 'em_atendimento'),
    supabase.from('wa_conversas').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaId).eq('status', 'qualificado'),
    supabase.from('wa_conversas').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaId).eq('status', 'agendado'),
    supabase.from('wa_conversas').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaId)
      .lte('followup_em', new Date().toISOString())
      .eq('followup_enviado', false),
  ])

  return Response.json({
    total: total ?? 0,
    novos: novos ?? 0,
    em_atendimento: emAtendimento ?? 0,
    qualificados: qualificados ?? 0,
    agendados: agendados ?? 0,
    followup_pendente: followupPendente ?? 0,
  })
}
