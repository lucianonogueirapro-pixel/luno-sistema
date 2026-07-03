'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Insumo, InsumoTier } from '@/lib/types'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const CATEGORIAS = [
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

export default function InsumoEditor({ insumo }: { insumo: Insumo }) {
  const [nome, setNome] = useState(insumo.nome)
  const [marca, setMarca] = useState(insumo.marca ?? '')
  const [fornecedor, setFornecedor] = useState(insumo.fornecedor ?? '')
  const [categoria, setCategoria] = useState<string>(insumo.categoria ?? '')

  // Campos de compra
  const [precoCompra, setPrecoCompra] = useState(String(insumo.preco_compra ?? ''))
  const [unidadeCompra, setUnidadeCompra] = useState(insumo.unidade_compra ?? '')
  const [rendimento, setRendimento] = useState(String(insumo.qtd_por_unidade_compra ?? ''))

  // Custo por uso: calculado automaticamente se tiver rendimento, senão manual
  const custoCalculado = precoCompra && rendimento
    ? parseFloat(precoCompra) / parseFloat(rendimento)
    : null
  const [custoManual, setCustoManual] = useState(String(insumo.custo_atual))

  const custoFinal = custoCalculado ?? parseFloat(custoManual) ?? 0

  const [estoque, setEstoque] = useState(String(insumo.estoque_atual))
  const [minimo, setMinimo] = useState(String(insumo.estoque_minimo))
  const [tiers, setTiers] = useState<InsumoTier[]>(insumo.tiers)
  const [lote, setLote] = useState(insumo.lote ?? '')
  const [dataValidade, setDataValidade] = useState(insumo.data_validade ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [msg, setMsg] = useState<{ text: string; isError: boolean } | null>(null)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // Helpers de exibição em unidade de compra
  const estoqueEmCx = unidadeCompra && rendimento && parseFloat(rendimento) > 0
    ? (parseFloat(estoque) / parseFloat(rendimento))
    : null
  const minimoEmCx = unidadeCompra && rendimento && parseFloat(rendimento) > 0
    ? (parseFloat(minimo) / parseFloat(rendimento))
    : null

  async function save() {
    setSaving(true)
    const { error } = await supabase.from('insumos').update({
      nome:           nome.trim(),
      marca:          marca.trim() || null,
      fornecedor:     fornecedor.trim() || null,
      categoria:      categoria || 'material',
      preco_compra:              parseFloat(precoCompra) || null,
      unidade_compra:            unidadeCompra.trim() || null,
      qtd_por_unidade_compra:    parseFloat(rendimento) || null,
      custo_atual:               custoCalculado ?? (parseFloat(custoManual) || 0),
      estoque_atual:             parseFloat(estoque) || 0,
      estoque_minimo:            parseFloat(minimo) || 0,
      tiers,
      lote: lote.trim() || null,
      data_validade: dataValidade || null,
    }).eq('id', insumo.id)
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

  function addTier() {
    setTiers([...tiers, { quantidade: 0, preco_unit: 0 }])
  }

  function updateTier(idx: number, field: keyof InsumoTier, val: string) {
    setTiers(tiers.map((t, i) => i === idx ? { ...t, [field]: parseFloat(val) || 0 } : t))
  }

  function removeTier(idx: number) {
    setTiers(tiers.filter((_, i) => i !== idx))
  }

  async function deleteInsumo() {
    setDeleting(true)
    await supabase.from('procedimento_insumos').delete().eq('insumo_id', insumo.id)
    const { error } = await supabase.from('insumos').delete().eq('id', insumo.id)
    setDeleting(false)
    if (error) {
      setMsg({ text: error.message || 'Erro ao excluir', isError: true })
      setConfirmDelete(false)
      setTimeout(() => setMsg(null), 4000)
      return
    }
    router.push('/insumos')
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => router.back()} className="text-[#475569] text-sm hover:underline">
          ← Voltar
        </button>
      </div>
      <h1 className="font-[family-name:var(--font-playfair)] text-xl text-[#0f172a] mb-4">{insumo.nome}</h1>

      {insumo.dysport_conversao && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-xs text-amber-800">
          Dysport — fator de conversão: {insumo.fator_conversao} (custo/UI equiv. = preço × {insumo.fator_conversao})
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 space-y-4">
        {/* Identificação */}
        <div>
          <label htmlFor="nome" className="block text-xs font-bold text-[#475569] uppercase tracking-wider mb-1">Nome</label>
          <input id="nome" type="text" value={nome} onChange={e => setNome(e.target.value)}
            className="border border-[#e2e8f0] rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:border-[#4f46e5]" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="marca" className="block text-xs font-bold text-[#475569] uppercase tracking-wider mb-1">Marca</label>
            <input id="marca" type="text" value={marca} onChange={e => setMarca(e.target.value)}
              className="border border-[#e2e8f0] rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:border-[#4f46e5]" />
          </div>
          <div>
            <label htmlFor="fornecedor" className="block text-xs font-bold text-[#475569] uppercase tracking-wider mb-1">Fornecedor</label>
            <input id="fornecedor" type="text" value={fornecedor} onChange={e => setFornecedor(e.target.value)}
              className="border border-[#e2e8f0] rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:border-[#4f46e5]" />
          </div>
        </div>

        <div>
          <label htmlFor="categoria" className="block text-xs font-bold text-[#475569] uppercase tracking-wider mb-1">
            Categoria <span className="text-[#94a3b8] font-normal normal-case">(opcional)</span>
          </label>
          <select id="categoria" value={categoria} onChange={e => setCategoria(e.target.value)}
            className="border border-[#e2e8f0] rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:border-[#4f46e5] bg-white">
            <option value="">— sem categoria —</option>
            {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        {/* Compra e custo */}
        <div className="border-t border-[#f1f5f9] pt-4">
          <p className="text-xs font-bold text-[#475569] uppercase tracking-wider mb-3">Compra e custo</p>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Unidade de compra</label>
              <input type="text" value={unidadeCompra} onChange={e => setUnidadeCompra(e.target.value)}
                placeholder="frasco, Cx, bg..."
                className="border border-[#e2e8f0] rounded-md px-2 py-1.5 text-sm w-full focus:outline-none focus:border-[#4f46e5]" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Preço de compra</label>
              <input type="number" step="0.01" value={precoCompra} onChange={e => setPrecoCompra(e.target.value)}
                placeholder="0,00"
                className="border border-[#e2e8f0] rounded-md px-2 py-1.5 text-sm w-full focus:outline-none focus:border-[#4f46e5]" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Rendimento ({insumo.unidade})</label>
              <input type="number" value={rendimento} onChange={e => setRendimento(e.target.value)}
                placeholder="ex: 30"
                className="border border-[#e2e8f0] rounded-md px-2 py-1.5 text-sm w-full focus:outline-none focus:border-[#4f46e5]" />
            </div>
          </div>

          <div className="bg-[#f8fafc] rounded-lg px-3 py-2 flex items-center gap-3">
            <span className="text-xs text-gray-500">Custo por {insumo.unidade}:</span>
            {custoCalculado !== null ? (
              <span className="text-sm font-bold text-[#4f46e5]">{fmt(custoCalculado)}</span>
            ) : (
              <div className="flex items-center gap-2">
                <input type="number" step="0.01" value={custoManual} onChange={e => setCustoManual(e.target.value)}
                  className="border border-[#e2e8f0] rounded px-2 py-1 text-sm w-24 focus:outline-none focus:border-[#4f46e5]" />
                <span className="text-xs text-gray-400">(manual — preencha rendimento para calcular)</span>
              </div>
            )}
          </div>
        </div>

        {/* Estoque */}
        <div className="border-t border-[#f1f5f9] pt-4">
          <p className="text-xs font-bold text-[#475569] uppercase tracking-wider mb-3">Estoque</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="estoque" className="block text-xs text-gray-500 mb-1">
                Estoque atual ({insumo.unidade})
                {estoqueEmCx !== null && (
                  <span className="ml-1 text-[#4f46e5]">= {estoqueEmCx.toFixed(1)} {unidadeCompra}</span>
                )}
              </label>
              <input id="estoque" type="number" step="1" value={estoque} onChange={e => setEstoque(e.target.value)}
                className="border border-[#e2e8f0] rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:border-[#4f46e5]" />
            </div>
            <div>
              <label htmlFor="minimo" className="block text-xs text-gray-500 mb-1">
                Mínimo ({insumo.unidade}) — alerta abaixo disso
                {minimoEmCx !== null && (
                  <span className="ml-1 text-[#4f46e5]">= {minimoEmCx.toFixed(1)} {unidadeCompra}</span>
                )}
              </label>
              <input id="minimo" type="number" step="1" value={minimo} onChange={e => setMinimo(e.target.value)}
                className="border border-[#e2e8f0] rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:border-[#4f46e5]" />
            </div>
          </div>
        </div>

        {/* Lote e validade */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="lote" className="block text-xs font-bold text-[#475569] uppercase tracking-wider mb-1">Lote</label>
            <input id="lote" type="text" value={lote} onChange={e => setLote(e.target.value)}
              placeholder="Ex: LOT2024A"
              className="border border-[#e2e8f0] rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:border-[#4f46e5]" />
          </div>
          <div>
            <label htmlFor="validade" className="block text-xs font-bold text-[#475569] uppercase tracking-wider mb-1">Validade</label>
            <input id="validade" type="date" value={dataValidade} onChange={e => setDataValidade(e.target.value)}
              className="border border-[#e2e8f0] rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:border-[#4f46e5]" />
          </div>
        </div>

        {/* Tiers */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-[#475569] uppercase tracking-wider">Preços por quantidade (tiers)</label>
            <button onClick={addTier} className="text-xs bg-[#4f46e5] text-white px-2 py-1 rounded">+ Tier</button>
          </div>
          {tiers.length === 0 && <p className="text-xs text-gray-400">Sem desconto por volume</p>}
          {tiers.map((t, i) => (
            <div key={i} className="flex items-center gap-2 mb-1">
              <span className="text-xs text-gray-500 w-16">A partir de</span>
              <input type="number" value={t.quantidade} onChange={e => updateTier(i, 'quantidade', e.target.value)}
                className="border border-[#e2e8f0] rounded px-2 py-1 text-xs w-16" placeholder="qtd" />
              <span className="text-xs text-gray-500">→ R$</span>
              <input type="number" step="0.01" value={t.preco_unit} onChange={e => updateTier(i, 'preco_unit', e.target.value)}
                className="border border-[#e2e8f0] rounded px-2 py-1 text-xs w-24" placeholder="preço/un" />
              <button onClick={() => removeTier(i)} className="text-red-500 text-xs hover:text-red-700">×</button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            <button onClick={save} disabled={saving}
              className="bg-[#4f46e5] text-white px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            {msg && (
              <span className={`text-sm ${msg.isError ? 'text-red-600' : 'text-green-600'}`}>{msg.text}</span>
            )}
          </div>

          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} className="text-xs text-red-500 hover:text-red-700 font-semibold">
              Excluir insumo
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-600 font-semibold">Tem certeza?</span>
              <button onClick={deleteInsumo} disabled={deleting}
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
  )
}
