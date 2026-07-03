'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Insumo, Procedimento } from '@/lib/types'
import { custoUnitario } from '@/lib/calcs'

interface ReceitaItem {
  id: string
  insumo_id: string
  quantidade: number
  insumos: Insumo
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function ReceitaEditor({
  proc, insumos, receita
}: {
  proc: Procedimento
  insumos: Insumo[]
  receita: ReceitaItem[]
}) {
  const [items, setItems] = useState<ReceitaItem[]>(receita)
  const [selectedInsumo, setSelectedInsumo] = useState('')
  const [quantidade, setQuantidade] = useState('1')
  const [preco, setPreco] = useState(String(proc.preco_tabela))
  const [precoMin, setPrecoMin] = useState(String(proc.preco_minimo ?? 0))
  const [tempo, setTempo] = useState(String(proc.tempo_minutos))
  const [disparos, setDisparos] = useState(String(proc.disparos ?? ''))
  const [categoria, setCategoria] = useState(proc.categoria ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [msg, setMsg] = useState<{ text: string; isError: boolean } | null>(null)
  // Ultraformer calculator
  const [ufSessao, setUfSessao] = useState<'6h' | '8-10h' | '12h'>('6h')
  const UF_SESSOES = {
    '6h':    { aluguel: 0,    minDisparos: 500, taxa: 600 },
    '8-10h': { aluguel: 1900, minDisparos: 700, taxa: 600 },
    '12h':   { aluguel: 2000, minDisparos: 700, taxa: 600 },
  }
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const custoTotal = items.reduce((sum, item) =>
    sum + custoUnitario(item.insumos) * item.quantidade, 0)
  const precoNum = parseFloat(preco) || 0
  const precoMinNum = parseFloat(precoMin) || 0
  const margem = precoNum > 0 ? ((precoNum - custoTotal) / precoNum) * 100 : 0
  const margemMin = precoMinNum > 0 ? ((precoMinNum - custoTotal) / precoMinNum) * 100 : null

  const disponiveis = insumos.filter(i => !items.find(it => it.insumo_id === i.id))

  async function addInsumo() {
    if (!selectedInsumo) return
    const ins = insumos.find(i => i.id === selectedInsumo)
    if (!ins) return
    setSaving(true)
    const { data, error } = await supabase.from('procedimento_insumos').insert({
      procedimento_id: proc.id,
      insumo_id: selectedInsumo,
      quantidade: parseFloat(quantidade) || 1,
    }).select('*, insumos(*)').single()
    setSaving(false)
    if (error || !data) {
      setMsg({ text: 'Erro ao adicionar', isError: true })
      setTimeout(() => setMsg(null), 3000)
      return
    }
    setItems([...items, data as ReceitaItem])
    setSelectedInsumo('')
    setQuantidade('1')
  }

  async function removeInsumo(id: string) {
    const { error } = await supabase.from('procedimento_insumos').delete().eq('id', id)
    if (error) {
      setMsg({ text: 'Erro ao remover', isError: true })
      setTimeout(() => setMsg(null), 3000)
      return
    }
    setItems(items.filter(i => i.id !== id))
  }

  // Updates quantity on blur to avoid a write per keystroke
  function handleQtdChange(id: string, qtd: string) {
    const q = parseFloat(qtd) || 1
    setItems(items.map(i => i.id === id ? { ...i, quantidade: q } : i))
  }

  async function commitQtd(id: string, quantidade: number) {
    const { error } = await supabase.from('procedimento_insumos').update({ quantidade }).eq('id', id)
    if (error) {
      setMsg({ text: 'Erro ao atualizar quantidade', isError: true })
      setTimeout(() => setMsg(null), 3000)
    }
  }

  async function deleteProc() {
    setDeleting(true)
    await supabase.from('procedimento_insumos').delete().eq('procedimento_id', proc.id)
    const { error } = await supabase.from('procedimentos').delete().eq('id', proc.id)
    setDeleting(false)
    if (error) {
      setMsg({ text: 'Erro ao excluir', isError: true })
      setConfirmDelete(false)
      setTimeout(() => setMsg(null), 3000)
      return
    }
    router.push('/procedimentos')
  }

  async function saveProc() {
    setSaving(true)
    const { error } = await supabase.from('procedimentos').update({
      preco_tabela: precoNum,
      preco_minimo: parseFloat(precoMin) || 0,
      tempo_minutos: parseInt(tempo) || 60,
      categoria: categoria || null,
      disparos: parseInt(disparos) || null,
    }).eq('id', proc.id)
    setSaving(false)
    if (error) {
      setMsg({ text: error.message || 'Erro ao salvar', isError: true })
      setTimeout(() => setMsg(null), 3000)
      return
    }
    setMsg({ text: 'Salvo!', isError: false })
    setTimeout(() => setMsg(null), 2000)
    router.refresh()
  }

  return (
    <div className="max-w-2xl">
      <button onClick={() => router.back()} className="text-[#475569] text-sm hover:underline mb-3 block">
        ← Voltar
      </button>

      <h1 className="font-[family-name:var(--font-playfair)] text-xl text-[#0f172a] mb-4">{proc.nome}</h1>

      {/* Configurações básicas */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 mb-4">
        <h2 className="text-xs font-bold text-[#475569] uppercase tracking-wider mb-3">Configurações</h2>
        <div className="mb-3">
          <label className="block text-xs text-gray-500 mb-1.5">Categoria</label>
          <div className="flex flex-wrap gap-1.5">
            {['Toxina Botulínica', 'Preenchimento', 'Bioestimulador', 'Fios', 'Skinbooster', 'Ultraformer', 'Lavieen', 'Brindes', 'Outros'].map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoria(cat === categoria ? '' : cat)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                  categoria === cat
                    ? 'bg-[#4f46e5]/10 text-[#4f46e5] border-[#4f46e5]'
                    : 'bg-white text-[#64748b] border-[#e2e8f0] hover:border-[#94a3b8]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label htmlFor="preco" className="block text-xs text-gray-500 mb-1">Preço de tabela</label>
            <input id="preco" type="number" step="0.01" value={preco} onChange={e => setPreco(e.target.value)}
              className="border border-[#e2e8f0] rounded px-2 py-1 text-sm w-32" />
          </div>
          <div>
            <label htmlFor="precoMin" className="block text-xs text-gray-500 mb-1">Preço mínimo</label>
            <input id="precoMin" type="number" step="0.01" value={precoMin} onChange={e => setPrecoMin(e.target.value)}
              className="border border-[#e2e8f0] rounded px-2 py-1 text-sm w-32" />
          </div>
          <div>
            <label htmlFor="tempo" className="block text-xs text-gray-500 mb-1">Tempo (min)</label>
            <input id="tempo" type="number" value={tempo} onChange={e => setTempo(e.target.value)}
              className="border border-[#e2e8f0] rounded px-2 py-1 text-sm w-20" />
          </div>
          <div>
            <label htmlFor="disparos" className="block text-xs text-gray-500 mb-1">Disparos</label>
            <input id="disparos" type="number" value={disparos} onChange={e => setDisparos(e.target.value)}
              placeholder="—" className="border border-[#e2e8f0] rounded px-2 py-1 text-sm w-20" />
          </div>
          <button onClick={saveProc} disabled={saving}
            className="bg-[#4f46e5] text-white px-3 py-1.5 rounded text-xs font-semibold disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
          {msg && (
            <span className={`text-xs ${msg.isError ? 'text-red-600' : 'text-green-600'}`}>{msg.text}</span>
          )}
          <div className="ml-auto">
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} className="text-xs text-red-500 hover:text-red-700 font-semibold">
                Excluir procedimento
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600 font-semibold">Tem certeza?</span>
                <button onClick={deleteProc} disabled={deleting}
                  className="text-xs bg-red-600 text-white px-2 py-1 rounded font-semibold disabled:opacity-50">
                  {deleting ? 'Excluindo...' : 'Sim, excluir'}
                </button>
                <button onClick={() => setConfirmDelete(false)} className="text-xs text-[#64748b] hover:text-[#0f172a]">
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resumo de custos */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-[#f8fafc] rounded-lg p-3">
          <div className="text-xs text-gray-500">Custo insumos</div>
          <div className="text-base font-bold text-[#0f172a]">{fmt(custoTotal)}</div>
        </div>
        <div className="bg-[#f8fafc] rounded-lg p-3">
          <div className="text-xs text-gray-500">Lucro bruto (tabela)</div>
          <div className="text-base font-bold text-[#0f172a]">{fmt(precoNum - custoTotal)}</div>
        </div>
        <div className="bg-[#f8fafc] rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-0.5">Margem — valor cheio</div>
          <div className={`text-base font-bold ${margem >= 50 ? 'text-green-600' : margem >= 30 ? 'text-amber-600' : 'text-red-600'}`}>
            {margem.toFixed(0)}%
          </div>
          <div className="text-[11px] text-gray-400">{fmt(precoNum)}</div>
        </div>
        <div className="bg-[#f8fafc] rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-0.5">Margem — valor mínimo</div>
          {margemMin !== null ? (
            <>
              <div className={`text-base font-bold ${margemMin >= 50 ? 'text-green-600' : margemMin >= 30 ? 'text-amber-600' : 'text-red-600'}`}>
                {margemMin.toFixed(0)}%
              </div>
              <div className="text-[11px] text-gray-400">{fmt(precoMinNum)}</div>
            </>
          ) : (
            <div className="text-base font-bold text-gray-300">—</div>
          )}
        </div>
      </div>

      {/* Receita */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-4">
        <h2 className="text-xs font-bold text-[#475569] uppercase tracking-wider mb-3">
          Insumos necessários ({items.length})
        </h2>

        {items.map(item => (
          <div key={item.id} className="flex items-center gap-2 py-2 border-b border-[#f1f5f9] last:border-0">
            <div className="flex-1">
              <div className="text-sm font-medium">{item.insumos.nome}</div>
              <div className="text-xs text-gray-400">{item.insumos.marca ?? ''} · {fmt(custoUnitario(item.insumos))}/{item.insumos.unidade}</div>
            </div>
            <input
              type="number"
              step="0.001"
              value={item.quantidade}
              onChange={e => handleQtdChange(item.id, e.target.value)}
              onBlur={e => commitQtd(item.id, parseFloat(e.target.value) || 1)}
              className="border border-[#e2e8f0] rounded px-2 py-1 text-xs w-16 text-center"
            />
            <span className="text-xs text-gray-500 w-8">{item.insumos.unidade}</span>
            <span className="text-xs font-semibold w-20 text-right">
              {fmt(custoUnitario(item.insumos) * item.quantidade)}
            </span>
            <button onClick={() => removeInsumo(item.id)} className="text-red-400 hover:text-red-600 text-sm">×</button>
          </div>
        ))}

        {items.length === 0 && (
          <p className="text-xs text-gray-400 py-2">Nenhum insumo na receita ainda.</p>
        )}

        {/* Adicionar insumo */}
        <div className="flex gap-2 mt-3 flex-wrap items-center">
          <select
            value={selectedInsumo}
            onChange={e => setSelectedInsumo(e.target.value)}
            className="border border-[#e2e8f0] rounded px-2 py-1 text-xs flex-1 min-w-48"
          >
            <option value="">Selecionar insumo...</option>
            {disponiveis.map(i => (
              <option key={i.id} value={i.id}>{i.nome} — {i.marca ?? 'sem marca'}</option>
            ))}
          </select>
          <input
            type="number"
            step="0.001"
            value={quantidade}
            onChange={e => setQuantidade(e.target.value)}
            className="border border-[#e2e8f0] rounded px-2 py-1 text-xs w-16"
            placeholder="qtd"
          />
          <button onClick={addInsumo} disabled={!selectedInsumo || saving}
            className="bg-[#4f46e5] text-white px-3 py-1 rounded text-xs font-semibold disabled:opacity-40">
            + Adicionar
          </button>
        </div>
      </div>

      {/* Calculadora Ultraformer */}
      {categoria === 'Ultraformer' && parseInt(disparos) > 0 && (() => {
        const cfg = UF_SESSOES[ufSessao]
        const disps = parseInt(disparos) || 0
        const CUSTO_DISPARO = 2.20

        return (
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 mt-4">
            <h2 className="text-xs font-bold text-[#475569] uppercase tracking-wider mb-3">
              Calculadora de Sessão — Ultraformer MPT
            </h2>

            {/* Seletor de sessão */}
            <div className="flex gap-2 mb-4">
              {(['6h', '8-10h', '12h'] as const).map(s => (
                <button key={s} type="button" onClick={() => setUfSessao(s)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                    ufSessao === s
                      ? 'border-[#4f46e5] bg-[#eef2ff] text-[#4f46e5]'
                      : 'border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc]'
                  }`}>
                  {s}
                  {UF_SESSOES[s].aluguel > 0 && (
                    <span className="ml-1 text-[10px] font-normal">R${UF_SESSOES[s].aluguel.toLocaleString('pt-BR')}</span>
                  )}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
                <span>{disps} disparos neste proc.</span>
                <span>·</span>
                <span>mín. {cfg.minDisparos} disparos/sessão</span>
                {cfg.aluguel === 0 && <span>· sem aluguel fixo</span>}
              </div>
            </div>

            {/* Tabela de cenários */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#e2e8f0]">
                    <th className="text-left pb-2 text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Clientes</th>
                    <th className="text-right pb-2 text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Disparos total</th>
                    <th className="text-right pb-2 text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Taxa extra</th>
                    <th className="text-right pb-2 text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Custo maq/proc</th>
                    <th className="text-right pb-2 text-[10px] text-gray-400 font-semibold uppercase tracking-wide">+ Insumos</th>
                    <th className="text-right pb-2 text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Custo total</th>
                    <th className="text-right pb-2 text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Tabela</th>
                    <th className="text-right pb-2 text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Margem tabela</th>
                    <th className="text-right pb-2 text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Margem mínimo</th>
                  </tr>
                </thead>
                <tbody>
                  {[1,2,3,4,5,6].map(n => {
                    const totalDisparos = n * disps
                    const abaixoMinimo = totalDisparos < cfg.minDisparos
                    const taxaExtra = abaixoMinimo ? cfg.taxa : 0
                    const custoMaqSessao = cfg.aluguel + totalDisparos * CUSTO_DISPARO + taxaExtra
                    const custoMaqPorProc = custoMaqSessao / n
                    const custoTotalProc = custoMaqPorProc + custoTotal
                    const margemTab = precoNum > 0 ? ((precoNum - custoTotalProc) / precoNum) * 100 : 0
                    const margemMinLocal = precoMinNum > 0 ? ((precoMinNum - custoTotalProc) / precoMinNum) * 100 : null
                    const cor = margemTab >= 50 ? 'text-green-600' : margemTab >= 30 ? 'text-amber-600' : 'text-red-600'
                    return (
                      <tr key={n} className={`border-b border-[#f8fafc] hover:bg-[#f8fafc] ${abaixoMinimo ? 'opacity-50' : ''}`}>
                        <td className="py-2 font-semibold text-[#0f172a]">{n} {n === 1 ? 'cliente' : 'clientes'}</td>
                        <td className="py-2 text-right text-gray-500">
                          {totalDisparos} dis.
                          {abaixoMinimo && <span className="ml-1 text-red-400 text-[10px]">⚠ abaixo mín.</span>}
                        </td>
                        <td className={`py-2 text-right font-semibold ${taxaExtra > 0 ? 'text-red-500' : 'text-gray-300'}`}>
                          {taxaExtra > 0 ? `+${fmt(taxaExtra)}` : '—'}
                        </td>
                        <td className="py-2 text-right text-gray-500">{fmt(custoMaqPorProc)}</td>
                        <td className="py-2 text-right text-gray-500">{fmt(custoTotal)}</td>
                        <td className="py-2 text-right font-semibold text-[#0f172a]">{fmt(custoTotalProc)}</td>
                        <td className="py-2 text-right text-[#0f172a]">{fmt(precoNum)}</td>
                        <td className={`py-2 text-right font-bold ${cor}`}>{margemTab.toFixed(0)}%</td>
                        <td className={`py-2 text-right font-bold ${
                          margemMinLocal === null ? 'text-gray-300' :
                          margemMinLocal >= 50 ? 'text-green-600' : margemMinLocal >= 30 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {margemMinLocal !== null ? `${margemMinLocal.toFixed(0)}%` : '—'}
                          {margemMinLocal !== null && <span className="block text-[10px] font-normal text-gray-400">{fmt(precoMinNum)}</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">
              R${CUSTO_DISPARO.toFixed(2)}/disparo · penalidade R${cfg.taxa} se total {'<'} {cfg.minDisparos} disparos
              {cfg.aluguel > 0 && ` · aluguel fixo ${fmt(cfg.aluguel)}`}
            </p>
          </div>
        )
      })()}
    </div>
  )
}
