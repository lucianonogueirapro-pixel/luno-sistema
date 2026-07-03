'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/PageHeader'
import type { EmprestimoParcela } from '@/lib/types'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

const TOTAL_PARCELAS = 96
const VALOR_PARCELA = 1682.58
const TOTAL_PAGAR = TOTAL_PARCELAS * VALOR_PARCELA
const TOTAL_JUROS = TOTAL_PAGAR - 80000

export default function EmprestimoPage() {
  const supabase = useMemo(() => createClient(), [])
  const [parcelas, setParcelas] = useState<EmprestimoParcela[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<number | null>(null)

  useEffect(() => {
    supabase.from('emprestimo_parcelas').select('*').order('numero').then(({ data }) => {
      if (data) setParcelas(data as EmprestimoParcela[])
      setLoading(false)
    })
  }, [supabase])

  async function togglePago(parcela: EmprestimoParcela) {
    setToggling(parcela.numero)
    const newPago = !parcela.pago
    await supabase.from('emprestimo_parcelas').update({ pago: newPago }).eq('numero', parcela.numero)
    setParcelas(p => p.map(x => x.numero === parcela.numero ? { ...x, pago: newPago } : x))
    setToggling(null)
  }

  const pagas = parcelas.filter(p => p.pago).length
  const totalPago = pagas * VALOR_PARCELA
  const devedor = TOTAL_PAGAR - totalPago

  if (loading) return <div className="p-8 text-[#64748b] text-sm">Carregando...</div>

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Controle do Empréstimo"
        subtitle="R$80.000 · 96 parcelas · 1ª vencimento 15/05/2026"
      />

      <div className="mb-4 text-[11px] bg-[#EEF4FB] border border-[#BDDDFB] text-[#1A4080] rounded-lg px-3 py-2.5 flex gap-2">
        <span className="font-bold">i</span>
        Valor contratado: R$80.000 · Total a pagar: {fmt(TOTAL_PAGAR)} (96× R$1.682,58) · Juros totais: {fmt(TOTAL_JUROS)} · 1ª parcela: 15/05/2026
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-3">
          <div className="text-[10px] text-[#64748b] uppercase tracking-wide mb-1">Valor Contratado</div>
          <div className="text-[16px] font-bold text-[#475569]">{fmt(80000)}</div>
          <div className="text-[10px] text-[#64748b]">empréstimo recebido</div>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-3">
          <div className="text-[10px] text-[#64748b] uppercase tracking-wide mb-1">Total a Pagar</div>
          <div className="text-[16px] font-bold text-[#475569]">{fmt(TOTAL_PAGAR)}</div>
          <div className="text-[10px] text-[#64748b]">96× R$1.682,58</div>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-3">
          <div className="text-[10px] text-[#64748b] uppercase tracking-wide mb-1">Parcelas Pagas</div>
          <div className="text-[16px] font-bold text-[#2D6A1A]">{pagas} / {TOTAL_PARCELAS}</div>
          <div className="text-[10px] text-[#64748b]">{fmt(totalPago)} pago</div>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-3">
          <div className="text-[10px] text-[#64748b] uppercase tracking-wide mb-1">Saldo Devedor</div>
          <div className="text-[16px] font-bold text-[#8B2A1A]">{fmt(devedor)}</div>
          <div className="text-[10px] text-[#64748b]">{TOTAL_PARCELAS - pagas} parcelas restantes</div>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 mb-5">
        <div className="flex justify-between text-[11px] text-[#0f172a] mb-2">
          <span className="font-semibold">Progresso do pagamento</span>
          <span className="text-[#2D6A1A] font-bold">{((pagas / TOTAL_PARCELAS) * 100).toFixed(1)}%</span>
        </div>
        <div className="h-3 bg-[#E8DECE] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#2D6A1A] rounded-full transition-all duration-500"
            style={{ width: `${(pagas / TOTAL_PARCELAS) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-[#64748b] mt-1">
          <span>{fmt(totalPago)} pagos</span>
          <span>{fmt(devedor)} restante</span>
        </div>
      </div>

      {/* Tabela de parcelas */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden" style={{ maxHeight: '520px', overflowY: 'auto' }}>
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#f8fafc] border-b-2 border-[#e2e8f0]">
              {['Nº','Vencimento','Valor','Status','Ação'].map(h => (
                <th key={h} className="text-[10px] font-bold text-[#0f172a] uppercase tracking-wide px-3 py-2.5 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {parcelas.map((p, i) => (
              <tr key={p.numero} className={`${i % 2 ? 'bg-[#FBF8F4]' : 'bg-white'} ${p.pago ? 'opacity-45' : ''}`}>
                <td className="px-3 py-2 text-[10px] text-[#A08060] border-b border-[#f1f5f9]">{p.numero}</td>
                <td className="px-3 py-2 text-[11px] text-[#0f172a] border-b border-[#f1f5f9]">
                  {new Date(p.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-3 py-2 text-[11px] text-[#0f172a] border-b border-[#f1f5f9]">{fmt(VALOR_PARCELA)}</td>
                <td className="px-3 py-2 border-b border-[#f1f5f9]">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p.pago ? 'bg-[#EDF5E8] text-[#2D6A1A]' : 'bg-[#FBF0EE] text-[#8B4010]'}`}>
                    {p.pago ? 'Paga' : 'Pendente'}
                  </span>
                </td>
                <td className="px-3 py-2 border-b border-[#f1f5f9]">
                  <button
                    onClick={() => togglePago(p)}
                    disabled={toggling === p.numero}
                    className="text-[10px] bg-[#0f172a] text-[#E8DECE] px-2.5 py-1 rounded hover:bg-[#475569] transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {toggling === p.numero ? '...' : p.pago ? 'Desfazer' : 'Marcar paga'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
