'use client'
import { useState, useMemo, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEmpresaId } from '@/context/EmpresaContext'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { KPICard } from '@/components/ui/KPICard'

interface Custo {
  id: string
  tipo: 'fixo' | 'variavel' | 'emergencia'
  descricao: string
  valor: number
  dia_vencimento: number | null
  estimado: boolean
  ativo: boolean
  posicao: number
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const TIPO_LABEL: Record<string, string> = {
  fixo: 'Fixos', variavel: 'Variáveis', emergencia: 'Emergência',
}
const TIPO_ACCENT: Record<string, string> = {
  fixo: '#3730a3', variavel: '#1A4080', emergencia: '#b45309',
}

const mesAtual = new Date().toISOString().slice(0, 7)

export default function CustosClient({ initialCustos }: { initialCustos: Custo[] }) {
  const empresaId = useEmpresaId()
  const initialRef = useRef(initialCustos)
  const [custos, setCustos] = useState<Custo[]>(initialCustos)
  const [editando, setEditando] = useState<string | null>(null)
  const [draft, setDraft] = useState<Partial<Custo>>({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ id: string; ok: boolean } | null>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const ch = supabase
      .channel('custos_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custos_config' }, payload => {
        if (payload.eventType === 'UPDATE')
          setCustos(prev => prev.map(c => c.id === (payload.new as Custo).id ? payload.new as Custo : c))
        else if (payload.eventType === 'INSERT')
          setCustos(prev => prev.some(c => c.id === (payload.new as Custo).id) ? prev : [...prev, payload.new as Custo])
        else if (payload.eventType === 'DELETE')
          setCustos(prev => prev.filter(c => c.id !== (payload.old as Custo).id))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [supabase])

  function startEdit(custo: Custo) {
    setEditando(custo.id)
    setDraft({ descricao: custo.descricao, valor: custo.valor, dia_vencimento: custo.dia_vencimento })
    setMsg(null)
  }

  function cancelEdit() {
    setEditando(null)
    setDraft({})
  }

  // Ao carregar: cria lançamentos pendentes para custos ativos sem lançamento no mês
  useEffect(() => {
    async function syncMes() {
      const { data: existentes } = await supabase
        .from('lancamentos')
        .select('ref_id')
        .eq('mes', mesAtual)
        .not('ref_id', 'is', null)
      const comLanc = new Set((existentes ?? []).map((l: any) => l.ref_id))
      const faltando = initialRef.current.filter(c => c.ativo && c.valor > 0 && !comLanc.has(c.id))
      for (const c of faltando) {
        await supabase.from('lancamentos').insert({
          empresa_id: empresaId, tipo: 'saida', categoria: c.tipo, descricao: c.descricao,
          valor_previsto: c.valor, dia_vencimento: c.dia_vencimento,
          mes: mesAtual, status: 'pend', ref_id: c.id,
          obs: c.estimado ? '! Estimado' : null,
        })
      }
    }
    syncMes()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function salvar(custo: Custo) {
    setSaving(true)
    const updates = {
      descricao: (draft.descricao ?? custo.descricao).trim() || custo.descricao,
      valor: draft.valor ?? custo.valor,
      dia_vencimento: draft.dia_vencimento ?? custo.dia_vencimento,
    }

    const { error } = await supabase
      .from('custos_config')
      .update({ ...updates, ativo: true })
      .eq('id', custo.id)
    if (error) { setSaving(false); setMsg({ id: custo.id, ok: false }); return }

    setCustos(prev => prev.map(c => c.id === custo.id ? { ...c, ...updates, ativo: true } : c))

    // Verifica se já foi pago no mês (não mexe)
    const { data: pago } = await supabase
      .from('lancamentos')
      .select('id')
      .eq('ref_id', custo.id)
      .eq('mes', mesAtual)
      .eq('status', 'pago')
      .limit(1)
      .maybeSingle()

    if (!pago) {
      // Remove todos os pendentes (limpa duplicatas) e recria um único
      await supabase.from('lancamentos').delete()
        .eq('ref_id', custo.id).eq('mes', mesAtual).eq('status', 'pend')
      await supabase.from('lancamentos').insert({
        empresa_id: empresaId, tipo: 'saida', categoria: custo.tipo,
        descricao: updates.descricao, valor_previsto: updates.valor,
        dia_vencimento: updates.dia_vencimento, mes: mesAtual,
        status: 'pend', ref_id: custo.id,
        obs: custo.estimado ? '! Estimado' : null,
      })
    }

    setSaving(false)
    setMsg({ id: custo.id, ok: true })
    setEditando(null)
    setDraft({})
    setTimeout(() => setMsg(null), 2500)
  }

  async function toggleEstimado(custo: Custo) {
    const upd = { estimado: !custo.estimado }
    await supabase.from('custos_config').update(upd).eq('id', custo.id)
    setCustos(prev => prev.map(c => c.id === custo.id ? { ...c, ...upd } : c))
  }

  async function deleteCusto(id: string) {
    if (!confirm('Remover este custo?')) return
    // Remove lançamentos pendentes vinculados (não remove os já pagos — histórico)
    await supabase.from('lancamentos').delete()
      .eq('ref_id', id).eq('status', 'pend')
    await supabase.from('custos_config').delete().eq('id', id)
    setCustos(prev => prev.filter(c => c.id !== id))
  }

  async function addCusto(tipo: 'fixo' | 'variavel' | 'emergencia') {
    const posicao = custos.filter(c => c.tipo === tipo).length
    const { data, error } = await supabase.from('custos_config').insert({
      empresa_id: empresaId, tipo, descricao: 'Novo custo', valor: 0,
      dia_vencimento: null, estimado: true, ativo: true, posicao,
    }).select().single()
    if (!error && data) {
      setCustos(prev => [...prev, data as Custo])
      startEdit(data as Custo)
      // Já cria o lançamento pendente no mês (sem duplicar se já existir)
      const { data: jaExiste } = await supabase
        .from('lancamentos').select('id').eq('ref_id', data.id).eq('mes', mesAtual).limit(1).maybeSingle()
      if (!jaExiste) {
        await supabase.from('lancamentos').insert({
          empresa_id: empresaId, tipo: 'saida', categoria: tipo,
          descricao: 'Novo custo', valor_previsto: 0,
          mes: mesAtual, status: 'pend', ref_id: data.id,
          obs: '! Estimado',
        })
      }
    }
  }

  const fixos      = custos.filter(c => c.tipo === 'fixo')
  const variaveis  = custos.filter(c => c.tipo === 'variavel')
  const emergencias = custos.filter(c => c.tipo === 'emergencia')
  const totalFixo       = fixos.reduce((s, c) => s + (c.valor || 0), 0)
  const totalVariavel   = variaveis.reduce((s, c) => s + (c.valor || 0), 0)
  const totalEmergencia = emergencias.reduce((s, c) => s + (c.valor || 0), 0)
  const totalGeral      = totalFixo + totalVariavel + totalEmergencia

  const inp = 'border border-[#e2e8f0] rounded-lg px-2.5 py-1.5 text-[12px] text-[#0f172a] focus:outline-none focus:border-[#4f46e5]'

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KPICard label="Total Mensal"  value={fmt(totalGeral)}      sub="todos os custos"           accentColor="#3730a3" />
        <KPICard label="Custos Fixos"  value={fmt(totalFixo)}       sub={`${fixos.length} itens`}       accentColor="#3730a3" />
        <KPICard label="Variáveis"     value={fmt(totalVariavel)}   sub={`${variaveis.length} itens`}   accentColor="#1A4080" />
        <KPICard label="Emergência"    value={fmt(totalEmergencia)} sub={`${emergencias.length} itens`} accentColor="#b45309" />
      </div>

      <div className="space-y-5">
        {(['fixo', 'variavel', 'emergencia'] as const).map(tipo => {
          const lista = custos.filter(c => c.tipo === tipo)
          const total = lista.reduce((s, c) => s + (c.valor || 0), 0)
          return (
            <Card key={tipo} accentColor={TIPO_ACCENT[tipo]}>
              <CardHeader>
                <CardTitle>{TIPO_LABEL[tipo]}</CardTitle>
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-bold text-[#0f172a]">{fmt(total)}/mês</span>
                  <button type="button" onClick={() => addCusto(tipo)}
                    className="text-[11px] font-semibold text-[#64748b] border border-[#e2e8f0] rounded-lg px-2.5 py-1 hover:bg-[#f8fafc] transition-colors">
                    + Adicionar
                  </button>
                </div>
              </CardHeader>

              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-[#f1f5f9]">
                      <th className="text-left text-[10px] text-[#94a3b8] uppercase tracking-wide py-2 px-4 font-medium">Descrição</th>
                      <th className="text-right text-[10px] text-[#94a3b8] uppercase tracking-wide py-2 px-3 font-medium w-36">Valor</th>
                      <th className="text-center text-[10px] text-[#94a3b8] uppercase tracking-wide py-2 px-3 font-medium w-24">Vencimento</th>
                      <th className="text-center text-[10px] text-[#94a3b8] uppercase tracking-wide py-2 px-3 font-medium w-24">Estimado</th>
                      <th className="w-36" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f9f4ee]">
                    {lista.length === 0 && (
                      <tr><td colSpan={5} className="py-6 text-center text-[12px] text-[#94a3b8]">Nenhum custo cadastrado.</td></tr>
                    )}
                    {lista.map(custo => {
                      const isEditing = editando === custo.id
                      return (
                        <tr key={custo.id} className={isEditing ? 'bg-[#f8fafc]' : 'hover:bg-[#fafafa]'}>
                          {/* Descrição */}
                          <td className="py-2.5 px-4">
                            {isEditing ? (
                              <input className={inp + ' w-full'} value={draft.descricao ?? ''}
                                onChange={e => setDraft(d => ({ ...d, descricao: e.target.value }))} autoFocus />
                            ) : (
                              <span className="text-[#0f172a] font-medium">{custo.descricao}</span>
                            )}
                          </td>

                          {/* Valor */}
                          <td className="py-2.5 px-3 text-right">
                            {isEditing ? (
                              <input type="number" step="0.01" min="0" className={inp + ' w-28 text-right font-mono'}
                                value={draft.valor ?? 0}
                                onChange={e => setDraft(d => ({ ...d, valor: parseFloat(e.target.value) || 0 }))} />
                            ) : (
                              <span className="font-mono font-semibold text-[#0f172a]">{fmt(custo.valor)}</span>
                            )}
                          </td>

                          {/* Vencimento */}
                          <td className="py-2.5 px-3 text-center">
                            {isEditing ? (
                              <input type="number" min="1" max="31" placeholder="dia" className={inp + ' w-16 text-center'}
                                value={draft.dia_vencimento ?? ''}
                                onChange={e => setDraft(d => ({ ...d, dia_vencimento: parseInt(e.target.value) || null }))} />
                            ) : (
                              <span className="text-[#64748b]">{custo.dia_vencimento ? `dia ${custo.dia_vencimento}` : '—'}</span>
                            )}
                          </td>

                          {/* Estimado */}
                          <td className="py-2.5 px-3 text-center">
                            <button type="button" onClick={() => toggleEstimado(custo)}
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                                custo.estimado
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                              {custo.estimado ? 'Estimado' : 'Confirmado'}
                            </button>
                          </td>

                          {/* Ações */}
                          <td className="py-2.5 px-3 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-2">
                                <button type="button" onClick={cancelEdit}
                                  className="text-[11px] text-[#64748b] hover:text-[#0f172a] transition-colors">
                                  Cancelar
                                </button>
                                <button type="button" onClick={() => salvar(custo)} disabled={saving}
                                  className="text-[11px] font-semibold bg-[#4f46e5] text-white px-3 py-1 rounded-lg disabled:opacity-50 hover:bg-[#4338ca] transition-colors">
                                  {saving ? 'Salvando...' : 'Salvar'}
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-3">
                                {msg?.id === custo.id && (
                                  <span className={`text-[10px] font-semibold ${msg.ok ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {msg.ok ? 'Salvo e lançado!' : 'Erro ao salvar'}
                                  </span>
                                )}
                                <button type="button" onClick={() => startEdit(custo)}
                                  className="text-[11px] font-semibold text-[#4f46e5] hover:text-[#4338ca] transition-colors">
                                  Editar
                                </button>
                                <button type="button" onClick={() => deleteCusto(custo.id)}
                                  className="text-[#94a3b8] hover:text-rose-600 transition-colors text-[16px] leading-none"
                                  title="Remover">
                                  ×
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  {lista.length > 0 && (
                    <tfoot>
                      <tr className="border-t border-[#f1f5f9] bg-[#f8fafc]">
                        <td className="py-2 px-4 text-[11px] font-semibold text-[#64748b]">Subtotal</td>
                        <td className="py-2 px-3 text-right text-[11px] font-bold text-[#0f172a] font-mono">{fmt(total)}</td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
