'use client'
import { useState } from 'react'
import Link from 'next/link'
import { custoUnitario } from '@/lib/calcs'
import type { Insumo } from '@/lib/types'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

type ProcRow = {
  id: string
  nome: string
  categoria: string | null
  tempo_minutos: number
  preco_tabela: number
  preco_minimo: number | null
  procedimento_insumos: { quantidade: number; insumos: Insumo | null }[]
}

function calcCusto(proc: ProcRow) {
  return proc.procedimento_insumos.reduce((sum, pi) => {
    if (!pi.insumos) return sum
    return sum + custoUnitario(pi.insumos) * pi.quantidade
  }, 0)
}

export default function ProcedimentosTable({ procs }: { procs: ProcRow[] }) {
  const [busca, setBusca] = useState('')
  const [cat, setCat] = useState('todas')

  const categorias = [...new Set(procs.map(p => p.categoria).filter(Boolean) as string[])].sort()

  const filtrados = procs.filter(p => {
    const okCat = cat === 'todas' || p.categoria === cat
    const okBusca = p.nome.toLowerCase().includes(busca.toLowerCase())
    return okCat && okBusca
  })

  return (
    <div>
      <div className="flex gap-2 mb-3 flex-wrap">
        <input
          placeholder="Buscar procedimento..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="border border-[#e2e8f0] rounded-lg px-3 py-2 text-[13px] text-[#0f172a] flex-1 min-w-48 focus:outline-none focus:border-[#94a3b8] placeholder:text-[#94a3b8]"
        />
        <select
          value={cat}
          onChange={e => setCat(e.target.value)}
          className="border border-[#e2e8f0] rounded-lg px-3 py-2 text-[13px] text-[#0f172a] bg-white focus:outline-none focus:border-[#94a3b8]"
        >
          <option value="todas">Todas as categorias</option>
          {categorias.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-220px)]">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-[#f1f5f9] bg-[#f8fafc]">
                {['Procedimento', 'Categoria', 'Tempo', 'Preço Tabela', 'Valor Mínimo', 'Custo Insumos', 'Lucro Líq.', 'MC%', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-[#64748b] uppercase tracking-wide whitespace-nowrap bg-[#f8fafc]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {filtrados.map(p => {
                const custo = calcCusto(p)
                const margem = p.preco_tabela > 0 ? ((p.preco_tabela - custo) / p.preco_tabela) * 100 : 0
                const semReceita = !p.procedimento_insumos?.length
                return (
                  <tr key={p.id} className="hover:bg-[#f8fafc] transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#0f172a]">{p.nome}</td>
                    <td className="px-4 py-3 text-[#64748b] text-[12px]">{p.categoria ?? '—'}</td>
                    <td className="px-4 py-3 text-[#64748b]">{p.tempo_minutos}min</td>
                    <td className="px-4 py-3 text-[#0f172a]">{p.preco_tabela > 0 ? fmt(p.preco_tabela) : '—'}</td>
                    <td className="px-4 py-3 text-[#7c3aed]">{p.preco_minimo && p.preco_minimo > 0 ? fmt(p.preco_minimo) : '—'}</td>
                    <td className="px-4 py-3 font-semibold text-[#0f172a]">{custo > 0 ? fmt(custo) : '—'}</td>
                    <td className="px-4 py-3">
                      {p.preco_tabela > 0 && custo > 0 ? (
                        <span className="text-[12px] font-semibold text-[#0f172a]">
                          {fmt(p.preco_tabela - custo)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {p.preco_tabela > 0 && custo > 0 ? (
                        <span
                          className="text-[12px] font-bold"
                          style={{ color: margem >= 50 ? '#166534' : margem >= 30 ? '#b45309' : '#8B1A1A' }}
                        >
                          {margem.toFixed(0)}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {semReceita && (
                        <span className="text-[11px] text-[#b45309] font-semibold mr-3">Sem insumos</span>
                      )}
                      <Link
                        href={`/procedimentos/${p.id}`}
                        className="text-[11px] text-[#64748b] hover:text-[#0f172a] font-semibold"
                      >
                        Editar →
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[13px] text-[#64748b]">
                    Nenhum procedimento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11px] text-[#94a3b8] mt-2">{filtrados.length} procedimento{filtrados.length !== 1 ? 's' : ''}</p>
    </div>
  )
}
