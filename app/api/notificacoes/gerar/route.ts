import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getEmpresaId } from '@/lib/empresa.server'

function adminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false })

    const empresaId = await getEmpresaId()
    const admin = adminClient()

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const hojeStr = hoje.toISOString().split('T')[0]
    // Limite superior: hoje às 23:59:59 para pegar tarefas vencidas até hoje
    const limiteStr = hojeStr + 'T23:59:59'

    const toInsert: Record<string, unknown>[] = []

    // 1. Notificações de tarefas vencidas ou que vencem hoje
    const { data: tarefas } = await admin
      .from('tarefas')
      .select('id, titulo, data_limite')
      .eq('empresa_id', empresaId)
      .neq('status', 'done')
      .not('data_limite', 'is', null)
      .lte('data_limite', limiteStr)

    for (const t of tarefas ?? []) {
      // Evita duplicar notificação no mesmo dia
      const { data: exists } = await admin
        .from('notificacoes')
        .select('id')
        .eq('tipo', 'tarefa_vencida')
        .eq('referencia_id', t.id)
        .gte('created_at', hojeStr + 'T00:00:00')
        .maybeSingle()

      if (!exists) {
        const dl = new Date(t.data_limite)
        dl.setHours(0, 0, 0, 0)
        const isHoje = dl.getTime() === hoje.getTime()

        toInsert.push({
          empresa_id: empresaId,
          tipo: 'tarefa_vencida',
          titulo: isHoje ? 'Tarefa vence hoje' : 'Tarefa atrasada',
          corpo: t.titulo,
          referencia_id: t.id,
          referencia_tipo: 'tarefa',
          lida: false,
        })
      }
    }

    // 2. Notificações de cobranças próximas (apenas super_admin)
    const role = user.user_metadata?.role ?? user.app_metadata?.role
    if (role === 'super_admin') {
      const em7Dias = new Date(hoje)
      em7Dias.setDate(em7Dias.getDate() + 7)
      const em7DiasStr = em7Dias.toISOString().split('T')[0]

      const { data: empresas } = await admin
        .from('empresas')
        .select('id, nome, proxima_cobranca')
        .not('proxima_cobranca', 'is', null)
        .lte('proxima_cobranca', em7DiasStr)
        .eq('ativo', true)

      for (const emp of empresas ?? []) {
        const { data: exists } = await admin
          .from('notificacoes')
          .select('id')
          .eq('tipo', 'cobranca_proxima')
          .eq('referencia_id', emp.id)
          .gte('created_at', hojeStr + 'T00:00:00')
          .maybeSingle()

        if (!exists) {
          const dl = new Date(emp.proxima_cobranca + 'T00:00:00')
          const diffDias = Math.round((dl.getTime() - hoje.getTime()) / 86400000)
          const vencido = diffDias < 0

          toInsert.push({
            empresa_id: empresaId,
            tipo: 'cobranca_proxima',
            titulo: vencido
              ? `Cobrança vencida: ${emp.nome}`
              : diffDias === 0
                ? `Cobrança vence hoje: ${emp.nome}`
                : `Cobrança em ${diffDias} dia${diffDias !== 1 ? 's' : ''}: ${emp.nome}`,
            corpo: `Próxima cobrança: ${dl.toLocaleDateString('pt-BR')}`,
            referencia_id: emp.id,
            referencia_tipo: 'empresa',
            lida: false,
          })
        }
      }
    }

    if (toInsert.length > 0) {
      await admin.from('notificacoes').insert(toInsert)
    }

    return NextResponse.json({ ok: true, geradas: toInsert.length })
  } catch (err) {
    console.error('[notificacoes/gerar]', err)
    return NextResponse.json({ ok: false })
  }
}
