'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { FluxoCaixaChart } from '@/components/dashboard/FluxoCaixaChart'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

interface LancamentoEntrada {
  tipo: 'entrada'; mes: string
  valor_previsto: number; pct_maquineta: number | null; pct_imposto: number
}
interface LancamentoSaida {
  tipo: 'saida'; mes: string; status: 'pend' | 'pago'
  valor_previsto: number; valor_pago: number | null
}

function ultimos12Meses(): string[] {
  const hoje = new Date()
  const meses: string[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return meses
}

function mesLabel(m: string): string {
  const [y, mo] = m.split('-').map(Number)
  return new Date(y, mo - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

function calcE(e: LancamentoEntrada) {
  const b = e.valor_previsto ?? 0
  const pm = e.pct_maquineta ?? 0
  const pi = e.pct_imposto ?? 0
  return { maq: b * pm / 100, imp: b * pi / 100, liq: b * (1 - pm / 100 - pi / 100) }
}

type MesData = {
  mes: string
  entradas: LancamentoEntrada[]
  saidas: LancamentoSaida[]
}

function calcMes(md: MesData) {
  const rb = md.entradas.reduce((s, e) => s + (e.valor_previsto ?? 0), 0)
  const maq = md.entradas.reduce((s, e) => s + calcE(e).maq, 0)
  const imp = md.entradas.reduce((s, e) => s + calcE(e).imp, 0)
  const rl = rb - maq - imp
  const saidas_pagas = md.saidas
    .filter(x => x.status === 'pago')
    .reduce((s, x) => s + (x.valor_pago ?? x.valor_previsto ?? 0), 0)
  const saidas_total = md.saidas
    .reduce((s, x) => s + (x.valor_pago ?? x.valor_previsto ?? 0), 0)
  const saidas_pendentes = md.saidas
    .filter(x => x.status === 'pend')
    .reduce((s, x) => s + (x.valor_previsto ?? 0), 0)
  const resultado = rl - saidas_pagas
  const resultado_competencia = rl - saidas_total
  return { rb, maq, imp, rl, saidas_pagas, saidas_total, saidas_pendentes, resultado, resultado_competencia }
}

const MESES = ultimos12Meses()

type Tab = 'dre' | 'fluxo'

export default function DrePage() {
  const supabase = useMemo(() => createClient(), [])
  const [tab, setTab] = useState<Tab>('dre')
  const [mes, setMes] = useState(() => MESES[MESES.length - 1])
  const [allData, setAllData] = useState<MesData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: lancs } = await supabase
        .from('lancamentos')
        .select('tipo, mes, valor_previsto, valor_pago, pct_maquineta, pct_imposto, status')
        .order('created_at')
      const rows = (lancs ?? []) as (LancamentoEntrada | LancamentoSaida)[]
      const grouped = MESES.map(m => ({
        mes: m,
        entradas: rows.filter(r => r.mes === m && r.tipo === 'entrada') as LancamentoEntrada[],
        saidas: rows.filter(r => r.mes === m && r.tipo === 'saida') as LancamentoSaida[],
      }))
      setAllData(grouped)
      setLoading(false)
    }
    load()
  }, [supabase])

  const curData = useMemo(() => allData.find(d => d.mes === mes) ?? { mes, entradas: [], saidas: [] }, [allData, mes])
  const cur = useMemo(() => calcMes(curData), [curData])

  const reserva10 = cur.resultado > 0 ? cur.resultado * 0.1 : 0
  const disponivel = cur.resultado > 0 ? cur.resultado - reserva10 : cur.resultado

  const fluxoRows = useMemo(() => {
    let saldo = 0
    return MESES.map(m => {
      const md = allData.find(d => d.mes === m) ?? { mes: m, entradas: [], saidas: [] }
      const c = calcMes(md)
      const hasData = md.entradas.length > 0 || md.saidas.some(s => s.status === 'pago')
      const entrada = hasData ? c.rl : 0
      const saida = hasData ? c.saidas_pagas : 0
      const res = entrada - saida
      if (hasData) saldo += res
      const [yy, mm] = m.split('-')
      const mNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
      const label = `${mNames[parseInt(mm) - 1]}/${yy.slice(2)}`
      return { mes: m, label, entrada, saida, res, saldo, hasData, isProjecao: !hasData }
    })
  }, [allData])

  if (loading) return <div className="p-8 text-[#64748b] text-sm">Carregando...</div>

  return (
    <div className="max-w-5xl">
      <PageHeader title="DRE / Fluxo de Caixa" subtitle="Demonstração do resultado e fluxo operacional" />

      <div className="flex gap-0 mb-6 border-b border-[#e2e8f0]">
        {(['dre', 'fluxo'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-[12px] font-semibold border-b-2 transition-colors ${
              tab === t ? 'border-[#94a3b8] text-[#0f172a]' : 'border-transparent text-[#64748b] hover:text-[#0f172a]'
            }`}
          >
            {t === 'dre' ? 'DRE — Demonstração do Resultado' : 'Fluxo de Caixa Operacional'}
          </button>
        ))}
      </div>

      {/* ── DRE TAB ── */}
      {tab === 'dre' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="text-[13px] font-bold text-[#0f172a]">DRE — {mesLabel(mes)}</div>
            <select value={mes} onChange={e => setMes(e.target.value)}
              className="rounded-lg border border-[#e2e8f0] px-3 py-2 text-[12px] text-[#0f172a] bg-white focus:outline-none focus:border-[#94a3b8]">
              {MESES.map(m => <option key={m} value={m}>{mesLabel(m)}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
              <table className="w-full">
                <tbody>
                  <tr><td className="text-[12px] px-4 py-2.5 font-bold text-[#475569]">Receita Bruta de Serviços</td><td className="text-right text-[13px] px-4 py-2.5 font-bold text-[#475569]">{fmt(cur.rb)}</td></tr>
                  <tr><td className="text-[11px] px-4 py-2 pl-8 text-[#b45309]">(−) Taxas de Maquineta</td><td className="text-right text-[11px] px-4 py-2 text-[#b45309]">{fmt(-cur.maq)}</td></tr>
                  <tr><td className="text-[11px] px-4 py-2 pl-8 text-[#8B2A1A]">(−) Impostos</td><td className="text-right text-[11px] px-4 py-2 text-[#8B2A1A]">{fmt(-cur.imp)}</td></tr>
                  <tr className="border-t-2 border-[#e2e8f0]">
                    <td className="text-[12px] px-4 py-2.5 font-bold" style={{ color: cur.rl >= 0 ? '#2D6A1A' : '#8B2A1A' }}>= Receita Operacional Líquida</td>
                    <td className="text-right text-[13px] px-4 py-2.5 font-bold" style={{ color: cur.rl >= 0 ? '#2D6A1A' : '#8B2A1A' }}>{fmt(cur.rl)}</td>
                  </tr>
                  <tr><td colSpan={2} className="px-4 pt-3 pb-1 text-[9px] font-bold text-[#94a3b8] uppercase tracking-widest bg-[#f8fafc] border-t border-[#e2e8f0]">Regime de Caixa (Fluxo Real)</td></tr>
                  <tr><td className="text-[11px] px-4 py-2 pl-8 text-[#475569]">(−) Custos Pagos no Período</td><td className="text-right text-[11px] px-4 py-2 text-[#475569]">{fmt(-cur.saidas_pagas)}</td></tr>
                  <tr className="border-t-2 border-[#e2e8f0]">
                    <td className="text-[12px] px-4 py-2.5 font-bold" style={{ color: cur.resultado >= 0 ? '#2D6A1A' : '#8B2A1A' }}>= Resultado Líquido (Caixa)</td>
                    <td className="text-right text-[13px] px-4 py-2.5 font-bold" style={{ color: cur.resultado >= 0 ? '#2D6A1A' : '#8B2A1A' }}>{fmt(cur.resultado)}</td>
                  </tr>
                  {cur.resultado > 0 && <>
                    <tr><td className="text-[11px] px-4 py-2 pl-8 text-[#b45309]">(−) 10% Reserva de Emergência</td><td className="text-right text-[11px] px-4 py-2 text-[#b45309]">{fmt(-reserva10)}</td></tr>
                    <tr className="border-t-2 border-[#e2e8f0]">
                      <td className="text-[12px] px-4 py-2.5 font-bold text-[#2D6A1A]">= Disponível para Distribuição</td>
                      <td className="text-right text-[13px] px-4 py-2.5 font-bold text-[#2D6A1A]">{fmt(disponivel)}</td>
                    </tr>
                  </>}
                  {cur.saidas_pendentes > 0 && <>
                    <tr><td colSpan={2} className="px-4 pt-3 pb-1 text-[9px] font-bold text-[#94a3b8] uppercase tracking-widest bg-[#f8fafc] border-t border-[#e2e8f0]">Regime de Competência (Contábil)</td></tr>
                    <tr><td className="text-[11px] px-4 py-2 pl-8 text-[#b45309]">(−) Custos Pendentes (a pagar)</td><td className="text-right text-[11px] px-4 py-2 text-[#b45309]">{fmt(-cur.saidas_pendentes)}</td></tr>
                    <tr className="border-t-2 border-[#e2e8f0]">
                      <td className="text-[12px] px-4 py-2.5 font-bold" style={{ color: cur.resultado_competencia >= 0 ? '#2D6A1A' : '#8B2A1A' }}>= Resultado por Competência</td>
                      <td className="text-right text-[13px] px-4 py-2.5 font-bold" style={{ color: cur.resultado_competencia >= 0 ? '#2D6A1A' : '#8B2A1A' }}>{fmt(cur.resultado_competencia)}</td>
                    </tr>
                  </>}
                </tbody>
              </table>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Receita Bruta', val: cur.rb, color: '#475569' },
                  { label: 'Receita Líquida', val: cur.rl, color: cur.rl >= 0 ? '#2D6A1A' : '#8B2A1A' },
                  { label: 'Custos Pagos', val: cur.saidas_pagas, color: '#b45309' },
                  { label: 'Resultado', val: cur.resultado, color: cur.resultado >= 0 ? '#2D6A1A' : '#8B2A1A' },
                ].map(k => (
                  <div key={k.label} className="bg-[#f8fafc] rounded-lg p-3">
                    <div className="text-[10px] text-[#64748b] uppercase tracking-wide mb-1">{k.label}</div>
                    <div className="text-[14px] font-bold" style={{ color: k.color }}>{fmt(k.val)}</div>
                  </div>
                ))}
              </div>
              {cur.rb > 0 && (
                <div className="bg-white rounded-xl border border-[#e2e8f0] p-4">
                  <div className="text-[11px] font-bold text-[#0f172a] mb-3">Margens (sobre Rec. Bruta)</div>
                  {[
                    { label: 'Margem Bruta', pct: cur.rl / cur.rb * 100 },
                    { label: 'Margem Líquida', pct: cur.resultado / cur.rb * 100 },
                  ].map(m => (
                    <div key={m.label} className="mb-2">
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-[#0f172a]">{m.label}</span>
                        <span className="font-semibold" style={{ color: m.pct >= 0 ? '#2D6A1A' : '#8B2A1A' }}>{m.pct.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 bg-[#E8DECE] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${Math.min(Math.abs(m.pct), 100)}%`, background: m.pct >= 0 ? '#2D6A1A' : '#8B2A1A' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* DRE Consolidado */}
          <div className="text-[11px] font-bold text-[#0f172a] uppercase tracking-wide mb-2 mt-4">
            DRE Consolidado — Últimos 12 Meses
          </div>
          <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="bg-[#f8fafc] border-b-2 border-[#e2e8f0]">
                    {['Mês','Rec. Bruta','Maquineta','Impostos','Rec. Líquida','Custos Pagos','Resultado'].map(h => (
                      <th key={h} className="text-[10px] font-bold text-[#0f172a] uppercase tracking-wide px-3 py-2 text-left whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allData.map((md, i) => {
                    const c = calcMes(md)
                    const semDados = md.entradas.length === 0 && md.saidas.filter(s => s.status === 'pago').length === 0
                    const resColor = semDados ? '#94a3b8' : c.resultado >= 0 ? '#2D6A1A' : '#8B2A1A'
                    return (
                      <tr key={md.mes} className={i % 2 ? 'bg-[#FBF8F4]' : 'bg-white'}>
                        <td className="px-3 py-2 text-[11px] font-semibold text-[#0f172a] border-b border-[#f1f5f9]">
                          {mesLabel(md.mes).slice(0, 3)}/{md.mes.slice(2, 4)}
                          {semDados && <span className="ml-1.5 text-[9px] text-[#94a3b8] font-normal">sem dados</span>}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-right border-b border-[#f1f5f9]" style={{ color: semDados ? '#cbd5e1' : '#475569' }}>{fmt(c.rb)}</td>
                        <td className="px-3 py-2 text-[11px] text-right border-b border-[#f1f5f9]" style={{ color: semDados ? '#cbd5e1' : '#b45309' }}>{semDados ? '—' : `-${fmt(c.maq)}`}</td>
                        <td className="px-3 py-2 text-[11px] text-right border-b border-[#f1f5f9]" style={{ color: semDados ? '#cbd5e1' : '#8B2A1A' }}>{semDados ? '—' : `-${fmt(c.imp)}`}</td>
                        <td className="px-3 py-2 text-[11px] text-right font-semibold border-b border-[#f1f5f9]" style={{ color: semDados ? '#cbd5e1' : '#475569' }}>{semDados ? '—' : fmt(c.rl)}</td>
                        <td className="px-3 py-2 text-[11px] text-right border-b border-[#f1f5f9]" style={{ color: semDados ? '#cbd5e1' : '#475569' }}>
                          {semDados ? '—' : (
                            <span>
                              -{fmt(c.saidas_pagas)}
                              {c.saidas_pendentes > 0 && <span className="block text-[9px] text-[#b45309]">+{fmt(c.saidas_pendentes)} pend.</span>}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-[12px] text-right font-bold border-b border-[#f1f5f9]" style={{ color: resColor }}>
                          {semDados ? '—' : fmt(c.resultado)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── FLUXO DE CAIXA TAB ── */}
      {tab === 'fluxo' && (
        <div>
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 mb-4">
            <div className="text-[11px] font-bold text-[#0f172a] mb-3">Fluxo de Caixa — Visão Gráfica</div>
            <FluxoCaixaChart
              dados={fluxoRows.map(r => ({
                mes: r.mes, label: r.label,
                entrada: r.entrada, saida: r.saida,
                saldo: r.saldo, isProjecao: r.isProjecao,
              }))}
              altura={220}
            />
          </div>

          <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#f8fafc] border-b-2 border-[#e2e8f0]">
                    {['Mês','Rec. Líquida','Saídas','Resultado','Saldo Acumulado','Tipo'].map(h => (
                      <th key={h} className="text-[10px] font-bold text-[#0f172a] uppercase tracking-wide px-3 py-2 text-left whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fluxoRows.map((row, i) => {
                    const saldoColor = row.saldo > 0 ? '#2D6A1A' : '#8B2A1A'
                    return (
                      <tr key={row.mes} className={i % 2 ? 'bg-[#FBF8F4]' : 'bg-white'}>
                        <td className="px-3 py-2.5 text-[11px] font-semibold text-[#0f172a] border-b border-[#f1f5f9]">
                          {row.label}
                        </td>
                        <td className="px-3 py-2.5 text-[11px] text-right font-semibold text-[#2D6A1A] border-b border-[#f1f5f9]">{fmt(row.entrada)}</td>
                        <td className="px-3 py-2.5 text-[11px] text-right text-[#475569] border-b border-[#f1f5f9]">{fmt(row.saida)}</td>
                        <td className="px-3 py-2.5 text-[11px] text-right font-semibold border-b border-[#f1f5f9]"
                          style={{ color: row.res >= 0 ? '#2D6A1A' : '#8B2A1A' }}>
                          {fmt(row.res)}
                        </td>
                        <td className="px-3 py-2.5 text-[12px] text-right font-bold border-b border-[#f1f5f9]"
                          style={{ color: saldoColor }}>
                          {fmt(row.saldo)}
                        </td>
                        <td className="px-3 py-2.5 border-b border-[#f1f5f9]">
                          <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${row.hasData ? 'bg-[#EDF5E8] text-[#2D6A1A]' : 'bg-[#FFF3DC] text-[#b45309]'}`}>
                            {row.hasData ? 'Real' : 'Projeção'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
