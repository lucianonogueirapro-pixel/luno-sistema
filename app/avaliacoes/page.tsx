export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { AvaliacaoStatus } from '@/lib/types'

const STATUS_LABEL: Record<AvaliacaoStatus, string> = {
  rascunho: 'Rascunho', pendente: 'Pendente',
  em_negociacao: 'Em Negociação', fechado: 'Fechado', perdido: 'Perdido',
}
const STATUS_BADGE: Record<AvaliacaoStatus, 'gray' | 'amber' | 'blue' | 'green' | 'red'> = {
  rascunho: 'gray', pendente: 'amber', em_negociacao: 'blue', fechado: 'green', perdido: 'red',
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default async function AvaliacoesPage() {
  const supabase = await createClient()
  const { data: avaliacoes } = await supabase
    .from('avaliacoes')
    .select('*, clientes(nome, telefone), avaliacao_opcoes(preco_negociado)')
    .order('created_at', { ascending: false })

  const all = avaliacoes ?? []

  const totalFechado = all
    .filter(av => av.status === 'fechado')
    .reduce((sum, av) => {
      const precos = (av.avaliacao_opcoes ?? []).map((o: any) => o.preco_negociado ?? 0)
      return sum + Math.max(...precos, 0)
    }, 0)

  return (
    <div>
      <PageHeader
        title="Avaliações"
        subtitle={`${all.length} avaliação${all.length !== 1 ? 'ões' : ''} · ${fmt(totalFechado)} fechado`}
      >
        <Link href="/avaliacoes/nova">
          <Button>+ Nova Avaliação</Button>
        </Link>
      </PageHeader>

      <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden">
        {all.length === 0 ? (
          <div className="py-16 text-center text-[13px] text-[#64748b]">
            Nenhuma avaliação ainda.{' '}
            <Link href="/avaliacoes/nova" className="text-[#0f172a] font-semibold hover:underline">
              Criar a primeira →
            </Link>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#f1f5f9] bg-[#f8fafc]">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#64748b] uppercase tracking-wide">Cliente</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#64748b] uppercase tracking-wide hidden md:table-cell">Data</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#64748b] uppercase tracking-wide hidden sm:table-cell">Opções</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#64748b] uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {all.map(av => {
                const precos = (av.avaliacao_opcoes ?? []).map((o: any) => o.preco_negociado ?? 0).filter((v: number) => v > 0)
                const melhorPreco = precos.length ? Math.max(...precos) : null
                return (
                  <tr key={av.id} className="hover:bg-[#f8fafc] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#94a3b8] to-[#64748b] flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                          {((av.clientes as any)?.nome?.[0] ?? '?').toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-[#0f172a]">{(av.clientes as any)?.nome ?? '—'}</div>
                          {melhorPreco && (
                            <div className="text-[11px] text-[#64748b]">{fmt(melhorPreco)}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#64748b] hidden md:table-cell">
                      {new Date(av.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-4 py-3 text-[#64748b] hidden sm:table-cell">
                      {(av.avaliacao_opcoes ?? []).length} opção(ões)
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE[av.status as AvaliacaoStatus]}>
                        {STATUS_LABEL[av.status as AvaliacaoStatus]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/avaliacoes/${av.id}`}
                        className="text-[11px] text-[#64748b] hover:text-[#0f172a] font-semibold"
                      >
                        Abrir →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
