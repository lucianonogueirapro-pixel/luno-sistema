export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default async function ProdutosPage() {
  const supabase = await createClient()
  const { data: produtos } = await supabase
    .from('produtos')
    .select('*')
    .order('nome')

  const lista = produtos ?? []
  const estoqueBaixo = lista.filter(p => p.quantidade_min > 0 && p.quantidade <= p.quantidade_min)

  return (
    <div>
      <PageHeader
        title="Produtos"
        subtitle={`${lista.length} produto${lista.length !== 1 ? 's' : ''}${estoqueBaixo.length > 0 ? ` · ${estoqueBaixo.length} abaixo do mínimo` : ''}`}
      >
        <Link href="/insumos/nova">
          <Button>+ Novo Produto</Button>
        </Link>
      </PageHeader>

      {estoqueBaixo.length > 0 && (
        <div className="mb-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <div className="text-[11px] font-semibold text-red-700 uppercase tracking-wide mb-2">
            Estoque baixo
          </div>
          <div className="flex flex-wrap gap-2">
            {estoqueBaixo.map(p => (
              <span key={p.id} className="inline-flex items-center gap-1 bg-white border border-red-200 rounded-lg px-2.5 py-1 text-[11px] text-red-700">
                <span className="font-semibold">{p.nome}</span>
                <span className="text-red-300 mx-0.5">·</span>
                <span>{p.quantidade} {p.unidade}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden">
        {lista.length === 0 ? (
          <div className="py-16 text-center text-[13px] text-[#64748b]">
            Nenhum produto cadastrado.{' '}
            <Link href="/insumos/nova" className="text-[#0f172a] font-semibold hover:underline">
              Cadastrar o primeiro →
            </Link>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#f1f5f9] bg-[#f8fafc]">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#64748b] uppercase tracking-wide">Produto</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-[#64748b] uppercase tracking-wide hidden sm:table-cell">Qtd.</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-[#64748b] uppercase tracking-wide hidden md:table-cell">Custo</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#64748b] uppercase tracking-wide hidden lg:table-cell">Fornecedor</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {lista.map(p => {
                const baixo = p.quantidade_min > 0 && p.quantidade <= p.quantidade_min
                return (
                  <tr key={p.id} className="hover:bg-[#f8fafc] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-semibold text-[#0f172a]">{p.nome}</div>
                          {p.categoria && (
                            <div className="text-[10px] text-[#64748b]">{p.categoria}</div>
                          )}
                        </div>
                        {baixo && (
                          <span className="text-[9px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
                            baixo
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      <span className={`font-semibold ${baixo ? 'text-red-600' : 'text-[#0f172a]'}`}>
                        {p.quantidade ?? 0} {p.unidade}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      <span className="text-[#64748b]">{fmt(p.preco_custo ?? 0)}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-[#64748b]">{p.fornecedor ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/insumos/${p.id}`}
                        className="text-[11px] text-[#64748b] hover:text-[#0f172a] font-semibold"
                      >
                        Editar →
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
