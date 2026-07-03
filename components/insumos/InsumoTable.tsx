'use client'
import { useState } from 'react'
import Link from 'next/link'
import type { Insumo } from '@/lib/types'

const fmt = (v: number) =>
  v > 0
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
    : '—'

const CATEGORIAS: { value: string; label: string }[] = [
  { value: 'toxina',         label: 'Toxina Botulínica' },
  { value: 'preenchedor',    label: 'Preenchedor' },
  { value: 'bioestimulador', label: 'Bioestimulador' },
  { value: 'skinbooster',    label: 'Skinbooster' },
  { value: 'fios',           label: 'Fios PDO' },
  { value: 'anestesico',     label: 'Anestésico' },
  { value: 'seringa',        label: 'Seringa' },
  { value: 'agulha',         label: 'Agulha' },
  { value: 'canula',         label: 'Cânula' },
  { value: 'material',       label: 'Material' },
]

function labelCategoria(value: string | null): string | null {
  if (!value) return null
  return CATEGORIAS.find(c => c.value === value)?.label ?? value
}

const hoje = new Date()
hoje.setHours(0, 0, 0, 0)
const em30 = new Date(hoje.getTime() + 30 * 86_400_000)

function statusValidade(dataValidade: string | null): 'vencido' | 'urgente' | 'ok' | null {
  if (!dataValidade) return null
  const d = new Date(dataValidade + 'T00:00:00')
  if (d <= hoje) return 'vencido'
  if (d <= em30) return 'urgente'
  return 'ok'
}

export default function InsumoTable({ insumos }: { insumos: Insumo[] }) {
  const [busca, setBusca] = useState('')
  const [catFiltro, setCatFiltro] = useState('')

  const filtrados = insumos.filter(i => {
    const texto = i.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (i.marca ?? '').toLowerCase().includes(busca.toLowerCase())
    const cat = !catFiltro || (i.categoria ?? '') === catFiltro
    return texto && cat
  })

  return (
    <div>
      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-3">
        <input
          placeholder="Buscar insumo ou marca..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="border border-[#e2e8f0] rounded-lg px-3 py-2 text-[13px] text-[#0f172a] flex-1 min-w-48 focus:outline-none focus:border-[#94a3b8] placeholder:text-[#94a3b8]"
        />
        <select
          value={catFiltro}
          onChange={e => setCatFiltro(e.target.value)}
          className="border border-[#e2e8f0] rounded-lg px-3 py-2 text-[13px] text-[#0f172a] bg-white focus:outline-none focus:border-[#94a3b8]"
        >
          <option value="">Todas categorias</option>
          {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {/* Desktop: tabela */}
      <div className="hidden md:block bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#f1f5f9] bg-[#f8fafc]">
                {['Insumo', 'Marca', 'Preço', 'Estoque', 'Lote', 'Validade', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-[#64748b] uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {filtrados.map(ins => {
                const baixo = ins.estoque_minimo > 0 && ins.estoque_atual <= ins.estoque_minimo
                const sv = statusValidade(ins.data_validade)
                return (
                  <tr key={ins.id} className="hover:bg-[#f8fafc] transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[#0f172a]">{ins.nome}</div>
                      {ins.categoria && <span className="inline-block mt-0.5 text-[10px] bg-[#f1f5f9] text-[#64748b] px-1.5 py-0.5 rounded">{labelCategoria(ins.categoria)}</span>}
                    </td>
                    <td className="px-4 py-3 text-[#64748b]">{ins.marca ?? '—'}</td>
                    <td className="px-4 py-3 font-semibold text-[#0f172a]">{fmt(ins.custo_atual)}{ins.dysport_conversao && <span className="ml-1 text-[11px] text-[#b45309]">(conv.)</span>}</td>
                    <td className="px-4 py-3"><span className="text-[12px] font-bold" style={{ color: baixo ? '#8B1A1A' : '#0f172a' }}>{ins.estoque_atual} {ins.unidade}</span>{baixo && <span className="ml-1 text-[10px] text-[#8B1A1A] font-semibold">Baixo</span>}</td>
                    <td className="px-4 py-3 text-[11px] text-[#64748b]">{ins.lote ?? '—'}</td>
                    <td className="px-4 py-3">{ins.data_validade ? <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${sv === 'vencido' ? 'bg-red-100 text-red-700' : sv === 'urgente' ? 'bg-amber-100 text-amber-700' : 'text-[#64748b]'}`}>{new Date(ins.data_validade + 'T00:00:00').toLocaleDateString('pt-BR')}</span> : <span className="text-[11px] text-[#94a3b8]">—</span>}</td>
                    <td className="px-4 py-3 text-right"><Link href={`/insumos/${ins.id}`} className="text-[11px] text-[#64748b] hover:text-[#0f172a] font-semibold">Editar</Link></td>
                  </tr>
                )
              })}
              {filtrados.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-[13px] text-[#64748b]">Nenhum insumo encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile/Tablet: cards */}
      <div className="md:hidden space-y-2">
        {filtrados.length === 0 && (
          <div className="py-10 text-center text-[13px] text-[#64748b] bg-white rounded-2xl border border-[#e2e8f0]">
            Nenhum insumo encontrado.
          </div>
        )}
        {filtrados.map(ins => {
          const baixo = ins.estoque_minimo > 0 && ins.estoque_atual <= ins.estoque_minimo
          const sv = statusValidade(ins.data_validade)
          return (
            <div key={ins.id} className="bg-white rounded-xl border border-[#e2e8f0] px-4 py-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="font-semibold text-[14px] text-[#0f172a]">{ins.nome}</div>
                  <div className="text-[11px] text-[#64748b] mt-0.5">
                    {ins.marca ?? ''}
                    {ins.marca && ins.categoria && <span className="mx-1">·</span>}
                    {ins.categoria && <span className="text-[#94a3b8]">{labelCategoria(ins.categoria)}</span>}
                  </div>
                </div>
                <Link href={`/insumos/${ins.id}`} className="text-[11px] text-[#4f46e5] font-semibold shrink-0">Editar</Link>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="font-bold" style={{ color: baixo ? '#8B1A1A' : '#0f172a' }}>{ins.estoque_atual} {ins.unidade}{baixo && ' ⚠ Baixo'}</span>
                <span className="text-[#64748b]">{fmt(ins.custo_atual)}</span>
                {ins.data_validade && (
                  <span className={`font-semibold px-2 py-0.5 rounded-full ${sv === 'vencido' ? 'bg-red-100 text-red-700' : sv === 'urgente' ? 'bg-amber-100 text-amber-700' : 'text-[#64748b]'}`}>
                    Val: {new Date(ins.data_validade + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </span>
                )}
                {ins.lote && <span className="text-[#94a3b8]">Lote: {ins.lote}</span>}
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-[11px] text-[#94a3b8] mt-2">{filtrados.length} insumo{filtrados.length !== 1 ? 's' : ''}</p>
    </div>
  )
}
