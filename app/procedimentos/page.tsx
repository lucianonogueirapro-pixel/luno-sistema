export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default async function ServicosPage() {
  const supabase = await createClient()
  const { data: servicos } = await supabase
    .from('servicos')
    .select('*')
    .order('nome')

  const lista = servicos ?? []
  const ativos = lista.filter(s => s.ativo)

  return (
    <div>
      <PageHeader
        title="Serviços"
        subtitle={`${ativos.length} serviço${ativos.length !== 1 ? 's' : ''} ativo${ativos.length !== 1 ? 's' : ''}`}
      >
        <Link href="/procedimentos/nova">
          <Button>+ Novo Serviço</Button>
        </Link>
      </PageHeader>

      <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden">
        {lista.length === 0 ? (
          <div className="py-16 text-center text-[13px] text-[#64748b]">
            Nenhum serviço cadastrado.{' '}
            <Link href="/procedimentos/nova" className="text-[#0f172a] font-semibold hover:underline">
              Cadastrar o primeiro →
            </Link>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#f1f5f9] bg-[#f8fafc]">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#64748b] uppercase tracking-wide">Serviço</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-[#64748b] uppercase tracking-wide hidden sm:table-cell">Preço</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-[#64748b] uppercase tracking-wide hidden md:table-cell">Duração</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-[#64748b] uppercase tracking-wide hidden lg:table-cell">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {lista.map(s => (
                <tr key={s.id} className="hover:bg-[#f8fafc] transition-colors">
                  <td className="px-5 py-3">
                    <div className="font-semibold text-[#0f172a]">{s.nome}</div>
                    {s.descricao && (
                      <div className="text-[11px] text-[#64748b] truncate max-w-xs">{s.descricao}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    <span className="font-semibold text-[#0f172a]">{fmt(s.preco ?? 0)}</span>
                  </td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    <span className="text-[#64748b]">{s.duracao_min ?? 60} min</span>
                  </td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    {s.ativo ? (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Ativo</span>
                    ) : (
                      <span className="text-[10px] font-semibold text-[#94a3b8] bg-[#f1f5f9] px-2 py-0.5 rounded-full border border-[#e2e8f0]">Inativo</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/procedimentos/${s.id}`}
                      className="text-[11px] text-[#64748b] hover:text-[#0f172a] font-semibold"
                    >
                      Editar →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
