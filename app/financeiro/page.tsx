'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEmpresaId } from '@/context/EmpresaContext'
import { PageHeader } from '@/components/ui/PageHeader'
import type { CustoConfig } from '@/lib/types'

type FormaPagamentoFin = 'dinheiro' | 'pix' | 'debito' | 'credito'

interface LancamentoEntrada {
  id: string
  mes: string
  tipo: 'entrada'
  descricao: string | null
  valor_previsto: number
  forma_pagamento: FormaPagamentoFin
  pct_maquineta: number | null
  pct_imposto: number
  cliente_id?: string | null
}

interface LancamentoSaida {
  id: string
  mes: string
  tipo: 'saida'
  descricao: string | null
  categoria: 'fixo' | 'variavel' | 'emergencia'
  valor_previsto: number
  valor_pago: number | null
  dia_vencimento: number | null
  status: 'pend' | 'pago'
  ref_id: string | null
  obs: string | null
}

function gerarMeses(): { value: string; label: string }[] {
  const meses = []
  const hoje = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    meses.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) })
  }
  return meses
}

const MESES_OPTS = gerarMeses()
const MESES_LABEL: Record<string, string> = Object.fromEntries(MESES_OPTS.map(m => [m.value, m.label]))

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

const FP_LABELS: Record<string, string> = {
  dinheiro: 'Dinheiro', pix: 'PIX', debito: 'Débito', credito: 'Crédito',
}

function calcE(e: LancamentoEntrada) {
  const b = e.valor_previsto ?? 0
  const pmBase = e.pct_maquineta ?? 0
  const pi = e.pct_imposto ?? 0
  return { bruto: b, maq: b * pmBase / 100, imp: b * pi / 100, liq: b * (1 - pmBase / 100 - pi / 100) }
}

export default function LancamentosPage() {
  const empresaId = useEmpresaId()
  const supabase = useMemo(() => createClient(), [])
  const [mes, setMes] = useState(() => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  })
  const [entradas, setEntradas] = useState<LancamentoEntrada[]>([])
  const [saidas, setSaidas] = useState<LancamentoSaida[]>([])
  const [loading, setLoading] = useState(true)
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const [clientesList, setClientesList] = useState<{ id: string; nome: string }[]>([])
  useEffect(() => {
    supabase.from('clientes').select('id, nome').order('nome').limit(200)
      .then(({ data }) => setClientesList(data ?? []))
  }, [supabase, empresaId])

  // Edição de entradas (bloqueada por PIN)
  const [editingEntradaId, setEditingEntradaId] = useState<string | null>(null)
  const [editPin, setEditPin] = useState<{ targetId: string } | null>(null)
  const [editPinValue, setEditPinValue] = useState('')
  const [editPinError, setEditPinError] = useState('')

  // PIN de exclusão
  const [confirmPin, setConfirmPin] = useState<{ type: 'entrada' | 'saida'; id: string } | null>(null)
  const [pinValue, setPinValue] = useState('')
  const [pinError, setPinError] = useState('')
  const [deletadoPor, setDeletadoPor] = useState<string | null>(null)
  const PINS: Record<string, string> = { '5247': 'Luciano', '2008': 'Sarah' }

  const loadMes = useCallback(async (m: string) => {
    setLoading(true)
    setEditingEntradaId(null)
    const [{ data: lData }, { data: custos }] = await Promise.all([
      supabase.from('lancamentos').select('*').eq('mes', m).order('created_at'),
      supabase.from('custos_config').select('*').eq('ativo', true).order('tipo').order('posicao'),
    ])
    const rows = (lData ?? []) as any[]
    let entradasData = rows.filter(r => r.tipo === 'entrada') as LancamentoEntrada[]
    let saidasData = rows.filter(r => r.tipo === 'saida') as LancamentoSaida[]

    if (custos?.length) {
      const existingRefIds = new Set(saidasData.filter(s => s.ref_id).map(s => s.ref_id))
      const faltando = (custos as CustoConfig[]).filter(c => !existingRefIds.has(c.id))
      if (faltando.length > 0) {
        const novas = faltando.map(c => ({
          empresa_id: empresaId, mes: m, tipo: 'saida', categoria: c.tipo,
          descricao: c.descricao, valor_previsto: c.valor,
          dia_vencimento: c.dia_vencimento, status: 'pend', ref_id: c.id,
          obs: c.estimado ? '! Estimado' : null,
        }))
        const { data: inseridas } = await supabase.from('lancamentos').insert(novas).select()
        if (inseridas) saidasData = [...saidasData, ...(inseridas as LancamentoSaida[])]
      }
    }

    setEntradas(entradasData)
    setSaidas(saidasData)
    setLoading(false)
  }, [supabase, empresaId])

  useEffect(() => { loadMes(mes) }, [mes, loadMes])

  // ── Entradas CRUD ──

  async function addEntrada() {
    const { data } = await supabase.from('lancamentos').insert({
      empresa_id: empresaId, mes, tipo: 'entrada', valor_previsto: 0, forma_pagamento: 'pix',
      pct_imposto: 0, pct_maquineta: 0,
    }).select().single()
    if (data) {
      setEntradas(p => [...p, data as LancamentoEntrada])
      setEditingEntradaId(data.id)
    }
  }

  function updateEntradaLocal(id: string, patch: Partial<LancamentoEntrada>) {
    setEntradas(p => p.map(e => e.id === id ? { ...e, ...patch } : e))
    clearTimeout(saveTimers.current[id])
    saveTimers.current[id] = setTimeout(() => {
      supabase.from('lancamentos').update(patch).eq('id', id)
    }, 700)
  }

  async function deleteEntrada(id: string) {
    await supabase.from('lancamentos').delete().eq('id', id)
    setEntradas(p => p.filter(e => e.id !== id))
    if (editingEntradaId === id) setEditingEntradaId(null)
  }

  // ── Saídas CRUD ──

  async function addSaida(categoria: 'variavel' | 'emergencia') {
    const { data } = await supabase.from('lancamentos').insert({
      empresa_id: empresaId, mes, tipo: 'saida', categoria, valor_previsto: 0, status: 'pend',
    }).select().single()
    if (data) setSaidas(p => [...p, data as LancamentoSaida])
  }

  function updateSaidaLocal(id: string, patch: Partial<LancamentoSaida>) {
    setSaidas(p => p.map(s => s.id === id ? { ...s, ...patch } : s))
    clearTimeout(saveTimers.current[id])
    saveTimers.current[id] = setTimeout(() => {
      supabase.from('lancamentos').update(patch).eq('id', id)
    }, 700)
  }

  async function togglePago(s: LancamentoSaida) {
    const newStatus = s.status === 'pago' ? 'pend' : 'pago'
    const pago = newStatus === 'pago' ? (s.valor_pago ?? s.valor_previsto) : null
    await supabase.from('lancamentos').update({ status: newStatus, valor_pago: pago }).eq('id', s.id)
    setSaidas(p => p.map(x => x.id === s.id ? { ...x, status: newStatus, valor_pago: pago } : x))
  }

  async function deleteSaida(id: string) {
    await supabase.from('lancamentos').delete().eq('id', id)
    setSaidas(p => p.filter(s => s.id !== id))
  }

  function abrirConfirmPin(type: 'entrada' | 'saida', id: string) {
    setConfirmPin({ type, id })
    setPinValue('')
    setPinError('')
  }

  function confirmarExclusao() {
    const usuario = PINS[pinValue]
    if (!usuario) { setPinError('PIN incorreto.'); setPinValue(''); return }
    if (confirmPin!.type === 'entrada') deleteEntrada(confirmPin!.id)
    else deleteSaida(confirmPin!.id)
    setDeletadoPor(usuario)
    setTimeout(() => setDeletadoPor(null), 3000)
    setConfirmPin(null); setPinValue(''); setPinError('')
  }

  function abrirEditPin(id: string) {
    setEditPin({ targetId: id }); setEditPinValue(''); setEditPinError('')
  }

  function confirmarEdit() {
    if (!PINS[editPinValue]) { setEditPinError('PIN incorreto.'); setEditPinValue(''); return }
    setEditingEntradaId(editPin!.targetId)
    setEditPin(null); setEditPinValue(''); setEditPinError('')
  }

  // ── Totais ──
  const totaisEnt = useMemo(() => {
    const tb = entradas.reduce((s, e) => s + (e.valor_previsto ?? 0), 0)
    const tm = entradas.reduce((s, e) => s + calcE(e).maq, 0)
    const ti = entradas.reduce((s, e) => s + calcE(e).imp, 0)
    return { bruto: tb, maq: tm, imp: ti, liq: tb - tm - ti }
  }, [entradas])

  const totaisSai = useMemo(() => {
    const prev = saidas.reduce((s, x) => s + (x.valor_previsto ?? 0), 0)
    const pago = saidas
      .filter(x => x.status === 'pago')
      .reduce((s, x) => s + (x.valor_pago ?? x.valor_previsto ?? 0), 0)
    return { prev, pago, resultado: totaisEnt.liq - pago }
  }, [saidas, totaisEnt.liq])

  const pctReserva = 10
  const valorFE = totaisEnt.liq > 0 ? totaisEnt.liq * pctReserva / 100 : 0
  const feLanc = saidas.find(s => s.obs === 'FE_RESERVA') ?? null

  async function separarFE() {
    if (feLanc) return
    const { data } = await supabase.from('lancamentos').insert({
      empresa_id: empresaId, mes, tipo: 'saida', categoria: 'emergencia',
      descricao: 'Fundo de Emergência',
      valor_previsto: valorFE, valor_pago: valorFE,
      status: 'pago', obs: 'FE_RESERVA',
    }).select().single()
    if (data) setSaidas(p => [...p, data as LancamentoSaida])
  }

  if (loading) return <div className="p-8 text-[#64748b] text-sm">Carregando...</div>

  return (
    <>
    <div className="max-w-5xl">
      <PageHeader title="Lançamentos" subtitle={MESES_LABEL[mes]}>
        <select
          value={mes}
          onChange={e => setMes(e.target.value)}
          className="rounded-lg border border-[#e2e8f0] px-3 py-2 text-[12px] text-[#0f172a] bg-white focus:outline-none focus:border-[#94a3b8]"
        >
          {MESES_OPTS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </PageHeader>


      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Receita Bruta', val: totaisEnt.bruto, color: '#475569' },
          { label: 'Maquineta', val: -totaisEnt.maq, color: '#b45309' },
          { label: 'Impostos', val: -totaisEnt.imp, color: '#8B2A1A' },
          { label: 'Rec. Líquida', val: totaisEnt.liq, color: totaisEnt.liq > 0 ? '#2D6A1A' : '#8B2A1A' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-[#e2e8f0] p-3">
            <div className="text-[10px] text-[#64748b] uppercase tracking-wide mb-1">{k.label}</div>
            <div className="text-[15px] font-bold" style={{ color: k.color }}>{fmt(k.val)}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Saídas Prev.', val: totaisSai.prev, color: '#475569' },
          { label: 'Saídas Pagas', val: totaisSai.pago, color: '#b45309' },
          { label: 'Resultado', val: totaisSai.resultado, color: totaisSai.resultado >= 0 ? '#2D6A1A' : '#8B2A1A' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-[#e2e8f0] p-3">
            <div className="text-[10px] text-[#64748b] uppercase tracking-wide mb-1">{k.label}</div>
            <div className="text-[15px] font-bold" style={{ color: k.color }}>
              {k.label === 'Resultado'
                ? (totaisSai.resultado >= 0 ? '' : '− ') + fmt(Math.abs(totaisSai.resultado))
                : fmt(k.val)}
            </div>
          </div>
        ))}
      </div>

      {/* ── ENTRADAS ── */}
      <div className="mb-1 border-l-4 border-[#475569] bg-[#F5EFE8] px-3 py-2 rounded-r text-[11px] font-bold text-[#0f172a]">
        ENTRADAS — Lançamentos do mês
      </div>
      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[580px]">
            <thead>
              <tr className="bg-[#f8fafc] border-b-2 border-[#e2e8f0]">
                {['Descrição','Valor (R$)','Pagamento','Cliente','Maquineta','Imposto','Líquido',''].map(h => (
                  <th key={h} className="text-[10px] font-bold text-[#0f172a] uppercase tracking-wide px-2 py-2 text-left whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entradas.length === 0 && (
                <tr><td colSpan={8} className="text-center text-[12px] text-[#A08060] py-8">
                  Clique em &quot;+ Serviço&quot; para lançar.
                </td></tr>
              )}
              {entradas.map((e, i) => {
                const c = calcE(e)
                const isEditing = editingEntradaId === e.id
                return (
                  <tr key={e.id} className={`${isEditing ? 'bg-[#FFF8F0]' : i % 2 ? 'bg-[#FBF8F4]' : 'bg-white'}`}>
                    <td className="px-2 py-1.5 border-b border-[#f1f5f9]">
                      {isEditing ? (
                        <input type="text" value={e.descricao ?? ''}
                          onChange={ev => updateEntradaLocal(e.id, { descricao: ev.target.value })}
                          placeholder="Serviço/descrição"
                          className="text-[11px] border border-[#e2e8f0] rounded px-1.5 py-1 w-[160px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8]"
                        />
                      ) : (
                        <span className="text-[11px] font-medium text-[#0f172a]">
                          {e.descricao || <span className="text-[#94a3b8]">—</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 border-b border-[#f1f5f9]">
                      {isEditing ? (
                        <input type="number" value={e.valor_previsto || ''}
                          onChange={ev => updateEntradaLocal(e.id, { valor_previsto: parseFloat(ev.target.value) || 0 })}
                          placeholder="0"
                          className="text-[11px] border border-[#e2e8f0] rounded px-1.5 py-1 w-[80px] text-right text-[#0f172a] focus:outline-none focus:border-[#94a3b8]"
                        />
                      ) : (
                        <span className="text-[11px] font-semibold text-[#0f172a]">
                          {e.valor_previsto ? fmt(e.valor_previsto) : <span className="text-[#94a3b8]">—</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 border-b border-[#f1f5f9]">
                      {isEditing ? (
                        <select value={e.forma_pagamento}
                          onChange={ev => updateEntradaLocal(e.id, { forma_pagamento: ev.target.value as FormaPagamentoFin })}
                          className="text-[11px] border border-[#e2e8f0] rounded px-1.5 py-1 text-[#0f172a] bg-white focus:outline-none focus:border-[#94a3b8]"
                        >
                          {Object.entries(FP_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                        </select>
                      ) : (
                        <span className="text-[11px] text-[#0f172a]">{FP_LABELS[e.forma_pagamento] ?? e.forma_pagamento}</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 border-b border-[#f1f5f9]">
                      {isEditing ? (
                        <select
                          value={e.cliente_id ?? ''}
                          onChange={ev => updateEntradaLocal(e.id, { cliente_id: ev.target.value || null })}
                          className="text-[11px] border border-[#e2e8f0] rounded px-1.5 py-1 w-[130px] text-[#0f172a] bg-white focus:outline-none focus:border-[#94a3b8]"
                        >
                          <option value="">— nenhum —</option>
                          {clientesList.map(c => (
                            <option key={c.id} value={c.id}>{c.nome}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[11px] font-bold text-[#0f172a]">
                          {e.cliente_id
                            ? (clientesList.find(c => c.id === e.cliente_id)?.nome ?? '—')
                            : <span className="text-[#94a3b8] font-normal">—</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 border-b border-[#f1f5f9] text-right">
                      {c.maq > 0 ? (
                        <div className="text-[11px] font-semibold text-[#b45309]">-{fmt(c.maq)}</div>
                      ) : <span className="text-[10px] text-[#cbd5e1]">—</span>}
                    </td>
                    <td className="px-2 py-1.5 border-b border-[#f1f5f9] text-right">
                      {c.imp > 0 ? (
                        <div className="text-[11px] font-semibold text-[#8B2A1A]">-{fmt(c.imp)}</div>
                      ) : (
                        <span className="text-[10px] text-[#cbd5e1]">—</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 border-b border-[#f1f5f9] text-right text-[12px] font-bold text-[#2D6A1A]">
                      {fmt(c.liq)}
                    </td>
                    <td className="px-2 py-1.5 border-b border-[#f1f5f9]">
                      <div className="flex items-center gap-0.5">
                        {isEditing ? (
                          <button onClick={() => setEditingEntradaId(null)}
                            className="text-[#2D6A1A] hover:bg-[#F0F8F0] rounded px-1.5 py-0.5 text-[12px] font-bold"
                            title="Fechar edição"
                          >✓</button>
                        ) : (
                          <button onClick={() => abrirEditPin(e.id)}
                            className="text-[#94a3b8] hover:text-[#475569] hover:bg-[#f1f5f9] rounded px-1.5 py-0.5 text-[12px]"
                            title="Editar (requer PIN)"
                          >✎</button>
                        )}
                        <button onClick={() => abrirConfirmPin('entrada', e.id)}
                          className="text-[#C04040] hover:bg-[#FEF0EE] rounded px-1.5 py-0.5 text-[12px] font-bold"
                        >×</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {entradas.length > 0 && (
                <tr className="bg-[#F5EFE8] border-t-2 border-[#e2e8f0]">
                  <td className="px-2 py-2 text-[11px] font-bold text-[#0f172a]">TOTAL</td>
                  <td className="px-2 py-2 text-right text-[11px] font-bold text-[#475569]">{fmt(totaisEnt.bruto)}</td>
                  <td colSpan={2}></td>
                  <td className="px-2 py-2 text-right text-[11px] font-bold text-[#b45309]">-{fmt(totaisEnt.maq)}</td>
                  <td className="px-2 py-2 text-right text-[11px] font-bold text-[#8B2A1A]">
                    {totaisEnt.imp > 0 ? `-${fmt(totaisEnt.imp)}` : <span className="text-[#94a3b8]">MEI</span>}
                  </td>
                  <td className="px-2 py-2 text-right text-[13px] font-bold text-[#2D6A1A]">{fmt(totaisEnt.liq)}</td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <button onClick={addEntrada}
        className="mb-6 bg-[#0f172a] text-[#E8DECE] text-[11px] font-semibold px-3 py-2 rounded-lg hover:bg-[#475569] transition-colors"
      >
        + Lançamento
      </button>

      {/* ── SAÍDAS ── */}
      <div className="mb-1 border-l-4 border-[#475569] bg-[#FFF8E8] px-3 py-2 rounded-r text-[11px] font-bold text-[#b45309]">
        SAÍDAS — Custos do mês
      </div>
      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="bg-[#f8fafc] border-b-2 border-[#e2e8f0]">
                {['Venc.','Descrição','Categoria','Valor Prev.','Valor Pago','Status','Ação',''].map(h => (
                  <th key={h} className="text-[10px] font-bold text-[#0f172a] uppercase tracking-wide px-2 py-2 text-left whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {saidas.length === 0 && (
                <tr><td colSpan={8} className="text-center text-[12px] text-[#A08060] py-8">
                  Nenhuma saída. Inicialize os custos fixos ou adicione manualmente.
                </td></tr>
              )}
              {saidas
                .sort((a, b) => (a.dia_vencimento ?? 99) - (b.dia_vencimento ?? 99))
                .map((s, i) => {
                  const catLabel = s.categoria === 'fixo' ? 'Fixo' : s.categoria === 'variavel' ? 'Variável' : 'Emergência'
                  const catColor = s.categoria === 'fixo' ? 'bg-[#E8F0FB] text-[#1A4080]' : s.categoria === 'variavel' ? 'bg-[#F0F8F0] text-[#1A5030]' : 'bg-[#FBF0EE] text-[#7A3010]'
                  const hoje = new Date().getDate()
                  const mesAtual = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`
                  const venc = s.dia_vencimento
                  const vencStyle = (() => {
                    if (s.status === 'pago') return 'text-[#94a3b8]'
                    if (!venc || mes !== mesAtual) return 'text-[#0f172a]'
                    const d = venc - hoje
                    if (d < 0) return 'text-red-600 font-bold'
                    if (d <= 3) return 'text-[#b45309] font-bold'
                    return 'text-[#0f172a]'
                  })()
                  const vencBg = (() => {
                    if (s.status === 'pago' || !venc || mes !== mesAtual) return ''
                    const d = venc - hoje
                    if (d < 0) return 'bg-red-50'
                    if (d <= 3) return 'bg-[#FEF3C7]'
                    return ''
                  })()
                  return (
                    <tr key={s.id} className={`${vencBg || (i % 2 ? 'bg-[#FBF8F4]' : 'bg-white')} ${s.status === 'pago' ? 'opacity-60' : ''}`}>
                      <td className={`px-2 py-1.5 border-b border-[#f1f5f9] text-[11px]`}>
                        {s.categoria !== 'fixo' ? (
                          <input type="number"
                            value={s.dia_vencimento ?? ''}
                            onChange={ev => updateSaidaLocal(s.id, { dia_vencimento: ev.target.value ? parseInt(ev.target.value) : null })}
                            placeholder="Dia"
                            min="1" max="31"
                            className={`border border-[#e2e8f0] rounded px-1.5 py-1 w-[55px] text-[11px] focus:outline-none focus:border-[#94a3b8] ${vencStyle}`}
                          />
                        ) : (
                          <span className={vencStyle}>
                            {venc ? `Dia ${venc}` : '—'}
                            {venc && mes === mesAtual && s.status !== 'pago' && venc - hoje < 0 && (
                              <div className="text-[9px] text-red-500 font-normal">vencido</div>
                            )}
                            {venc && mes === mesAtual && s.status !== 'pago' && venc - hoje >= 0 && venc - hoje <= 3 && (
                              <div className="text-[9px] text-[#b45309] font-normal">{venc - hoje === 0 ? 'hoje' : `${venc - hoje}d`}</div>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 border-b border-[#f1f5f9]">
                        {s.categoria !== 'fixo' ? (
                          <input type="text" value={s.descricao ?? ''}
                            onChange={ev => updateSaidaLocal(s.id, { descricao: ev.target.value })}
                            placeholder="Descrição..."
                            className="text-[11px] border border-[#e2e8f0] rounded px-1.5 py-1 w-[170px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8]"
                          />
                        ) : (
                          <span className="text-[11px] font-medium text-[#0f172a]">
                            {s.descricao}
                            {s.obs && <span className="text-[9px] text-[#7A9050] ml-1">{s.obs}</span>}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 border-b border-[#f1f5f9]">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${catColor}`}>{catLabel}</span>
                      </td>
                      <td className="px-2 py-1.5 border-b border-[#f1f5f9] text-right">
                        <input type="number" value={s.valor_previsto || ''}
                          onChange={ev => updateSaidaLocal(s.id, { valor_previsto: parseFloat(ev.target.value) || 0 })}
                          placeholder="0"
                          className="text-[11px] border border-[#e2e8f0] rounded px-1.5 py-1 w-[85px] text-right text-[#0f172a] focus:outline-none focus:border-[#94a3b8]"
                        />
                      </td>
                      <td className="px-2 py-1.5 border-b border-[#f1f5f9] text-right text-[11px] font-semibold text-[#0f172a]">
                        {s.status === 'pago'
                          ? fmt(s.valor_pago ?? s.valor_previsto)
                          : <span className="text-[#cbd5e1]">—</span>}
                      </td>
                      <td className="px-2 py-1.5 border-b border-[#f1f5f9]">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.status === 'pago' ? 'bg-[#EDF5E8] text-[#2D6A1A]' : 'bg-[#FBF0EE] text-[#8B4010]'}`}>
                          {s.status === 'pago' ? 'Pago' : 'Pendente'}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 border-b border-[#f1f5f9]">
                        <button onClick={() => togglePago(s)}
                          className="text-[10px] bg-[#0f172a] text-[#E8DECE] px-2 py-1 rounded hover:bg-[#475569] transition-colors whitespace-nowrap"
                        >
                          {s.status === 'pago' ? 'Desfazer' : 'Pagar'}
                        </button>
                      </td>
                      <td className="px-2 py-1.5 border-b border-[#f1f5f9]">
                        {s.categoria !== 'fixo' && (
                          <button onClick={() => abrirConfirmPin('saida', s.id)}
                            className="text-[#C04040] hover:bg-[#FEF0EE] rounded px-1.5 py-0.5 text-[12px] font-bold"
                          >×</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              {saidas.length > 0 && (
                <tr className="bg-[#F5EFE8] border-t-2 border-[#e2e8f0]">
                  <td colSpan={3} className="px-2 py-2 text-[11px] font-bold text-[#0f172a]">TOTAL</td>
                  <td className="px-2 py-2 text-right text-[11px] font-bold text-[#475569]">{fmt(totaisSai.prev)}</td>
                  <td className="px-2 py-2 text-right text-[11px] font-bold text-[#b45309]">{fmt(totaisSai.pago)}</td>
                  <td colSpan={3}></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Fundo de Emergência ── */}
      {totaisEnt.liq > 0 && (
        <div className="bg-[#FBF8F4] border border-[#d4b898] rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold text-[#5C3D2E] uppercase tracking-wide mb-0.5">
                Fundo de Emergência — {pctReserva}% da Receita Líquida
              </div>
              <div className="text-[16px] font-bold text-[#3D2314]">{fmt(valorFE)}</div>
            </div>
            {!feLanc ? (
              <button onClick={separarFE}
                className="bg-[#5C3D2E] text-[#F5EFE6] text-[11px] font-semibold px-3 py-2 rounded-lg hover:bg-[#3D2314] transition-colors whitespace-nowrap"
              >
                Guardar {pctReserva}% esse mês
              </button>
            ) : (
              <span className="text-[10px] font-semibold bg-[#EDF5E8] text-[#2D6A1A] px-2 py-1 rounded-full whitespace-nowrap">
                Separado
              </span>
            )}
          </div>
          {feLanc && (
            <div className="mt-3 text-[11px] text-[#5C3D2E] bg-[#F5EFE6] border border-[#d4b898] rounded-lg px-3 py-2.5 leading-relaxed">
              Aplique agora {fmt(valorFE)} no CDB Diário com liquidez para aumentar seu Fundo de Emergência.
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => addSaida('variavel')}
          className="bg-[#0f172a] text-[#E8DECE] text-[11px] font-semibold px-3 py-2 rounded-lg hover:bg-[#475569] transition-colors"
        >
          + Custo Variável
        </button>
        <button onClick={() => addSaida('emergencia')}
          className="bg-[#7A3010] text-[#E8DECE] text-[11px] font-semibold px-3 py-2 rounded-lg hover:bg-[#5C2010] transition-colors"
        >
          + Emergência
        </button>
      </div>

      <div className="mt-6 text-[11px] text-[#64748b] bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-3 py-2.5">
        Resultado = Receita Líquida (após maquineta e impostos) − Saídas Pagas.
      </div>
    </div>

    {/* ── Modal PIN exclusão ── */}
    {confirmPin && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl mx-4">
          <div className="text-[15px] font-bold text-[#0f172a] mb-1">Confirmar exclusão</div>
          <p className="text-[12px] text-[#64748b] mb-4">Digite seu PIN para confirmar.</p>
          <input type="password" inputMode="numeric" maxLength={4} value={pinValue}
            onChange={e => { setPinValue(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError('') }}
            onKeyDown={e => e.key === 'Enter' && confirmarExclusao()}
            placeholder="• • • •" autoFocus
            className="w-full border border-[#e2e8f0] rounded-xl px-3 py-3 text-[22px] text-center tracking-[0.6em] focus:outline-none focus:border-[#94a3b8] mb-2"
          />
          {pinError && <p className="text-[11px] text-red-500 text-center mb-2">{pinError}</p>}
          <div className="flex gap-2 mt-3">
            <button onClick={() => { setConfirmPin(null); setPinValue(''); setPinError('') }}
              className="flex-1 py-2.5 rounded-xl border border-[#e2e8f0] text-[13px] text-[#64748b] hover:bg-[#f8fafc]"
            >Cancelar</button>
            <button onClick={confirmarExclusao}
              className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-[13px] font-bold hover:bg-red-700"
            >Excluir</button>
          </div>
        </div>
      </div>
    )}

    {/* ── Modal PIN edição ── */}
    {editPin && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl mx-4">
          <div className="text-[15px] font-bold text-[#0f172a] mb-1">Editar lançamento</div>
          <p className="text-[12px] text-[#64748b] mb-4">Digite seu PIN para desbloquear a edição.</p>
          <input type="password" inputMode="numeric" maxLength={4} value={editPinValue}
            onChange={e => { setEditPinValue(e.target.value.replace(/\D/g, '').slice(0, 4)); setEditPinError('') }}
            onKeyDown={e => e.key === 'Enter' && confirmarEdit()}
            placeholder="• • • •" autoFocus
            className="w-full border border-[#e2e8f0] rounded-xl px-3 py-3 text-[22px] text-center tracking-[0.6em] focus:outline-none focus:border-[#94a3b8] mb-2"
          />
          {editPinError && <p className="text-[11px] text-red-500 text-center mb-2">{editPinError}</p>}
          <div className="flex gap-2 mt-3">
            <button onClick={() => { setEditPin(null); setEditPinValue(''); setEditPinError('') }}
              className="flex-1 py-2.5 rounded-xl border border-[#e2e8f0] text-[13px] text-[#64748b] hover:bg-[#f8fafc]"
            >Cancelar</button>
            <button onClick={confirmarEdit}
              className="flex-1 py-2.5 rounded-xl bg-[#0f172a] text-white text-[13px] font-bold hover:bg-[#475569]"
            >Desbloquear</button>
          </div>
        </div>
      </div>
    )}

    {/* Toast exclusão */}
    {deletadoPor && (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0f172a] text-white text-[12px] font-semibold px-5 py-2.5 rounded-full shadow-lg">
        Excluído por {deletadoPor}
      </div>
    )}
    </>
  )
}
