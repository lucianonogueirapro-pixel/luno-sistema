'use client'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEmpresaId } from '@/context/EmpresaContext'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Plus, Trash2, Search } from 'lucide-react'
interface Cliente { id: string; nome: string; telefone: string }
interface Item { descricao: string; valor: string }

function NovoOrcamentoForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const empresaId = useEmpresaId()

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [busca, setBusca] = useState('')
  const [clienteId, setClienteId] = useState(searchParams.get('cliente') ?? '')
  const [titulo, setTitulo] = useState('')
  const [obs, setObs] = useState('')
  const [validade, setValidade] = useState('15')
  const [itens, setItens] = useState<Item[]>([{ descricao: '', valor: '' }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('clientes').select('id, nome, telefone').order('nome')
      .then(({ data }) => setClientes(data ?? []))
  }, [supabase])

  const clientesFiltrados = useMemo(() => {
    if (!busca.trim()) return clientes.slice(0, 8)
    const q = busca.toLowerCase()
    return clientes.filter(p =>
      p.nome.toLowerCase().includes(q) || p.telefone.includes(q)
    ).slice(0, 8)
  }, [busca, clientes])

  const clienteSelecionado = clientes.find(c => c.id === clienteId)

  const total = itens.reduce((s, i) => s + (parseFloat(i.valor.replace(',', '.')) || 0), 0)

  function addItem() {
    setItens(prev => [...prev, { descricao: '', valor: '' }])
  }

  function removeItem(idx: number) {
    setItens(prev => prev.filter((_, i) => i !== idx))
  }

  function updateItem(idx: number, field: keyof Item, value: string) {
    setItens(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clienteId) { setError('Selecione um cliente'); return }
    if (itens.every(i => !i.descricao.trim())) { setError('Adicione ao menos um item'); return }
    setSaving(true)
    setError('')

    const { data: orc, error: errOrc } = await supabase
      .from('orcamentos')
      .insert({
        empresa_id: empresaId,
        cliente_id: clienteId,
        titulo: titulo.trim() || null,
        obs: obs.trim() || null,
        validade_dias: parseInt(validade) || 15,
      })
      .select('id')
      .single()

    if (errOrc || !orc) { setError(errOrc?.message ?? 'Erro ao criar orçamento'); setSaving(false); return }

    const itensFiltrados = itens
      .filter(i => i.descricao.trim())
      .map((i, idx) => ({
        empresa_id: empresaId,
        orcamento_id: orc.id,
        descricao: i.descricao.trim(),
        valor: parseFloat(i.valor.replace(',', '.')) || 0,
        posicao: idx,
      }))

    if (itensFiltrados.length > 0) {
      const { error: errItens } = await supabase.from('orcamento_itens').insert(itensFiltrados)
      if (errItens) { setError(errItens.message); setSaving(false); return }
    }

    router.push(`/orcamentos/${orc.id}`)
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Novo Orçamento" subtitle="Proposta comercial personalizada" />

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Cliente */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5">
          <div className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-3">Cliente</div>
          {clienteSelecionado ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#4f46e5] flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0">
                {clienteSelecionado.nome[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-semibold text-[#0f172a]">{clienteSelecionado.nome}</div>
                <div className="text-[11px] text-[#94a3b8]">{clienteSelecionado.telefone}</div>
              </div>
              <button type="button" onClick={() => setClienteId('')}
                className="text-[11px] text-[#64748b] hover:text-[#0f172a] border border-[#e2e8f0] px-3 py-1.5 rounded-lg hover:border-[#94a3b8] transition-colors">
                Trocar
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
              <input
                type="text"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar cliente por nome ou telefone..."
                className="w-full rounded-xl border border-[#e2e8f0] pl-9 pr-3 py-2.5 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8] placeholder:text-[#94a3b8] mb-1"
              />
              {busca && clientesFiltrados.length > 0 && (
                <div className="border border-[#e2e8f0] rounded-xl overflow-hidden shadow-sm">
                  {clientesFiltrados.map(c => (
                    <button key={c.id} type="button"
                      onClick={() => { setClienteId(c.id); setBusca('') }}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#f8fafc] text-left border-b border-[#f1f5f9] last:border-0 transition-colors">
                      <span className="text-[12px] font-semibold text-[#0f172a]">{c.nome}</span>
                      <span className="text-[11px] text-[#94a3b8]">{c.telefone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dados do orçamento */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 space-y-4">
          <div className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wide">Informações</div>
          <div>
            <label className="block text-[11px] font-semibold text-[#475569] mb-1.5">Título (opcional)</label>
            <input
              type="text"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ex: Harmonização completa — Opção A"
              className="w-full rounded-xl border border-[#e2e8f0] px-3 py-2.5 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8] placeholder:text-[#94a3b8]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#475569] mb-1.5">Validade (dias)</label>
            <input
              type="number"
              value={validade}
              onChange={e => setValidade(e.target.value)}
              min="1"
              max="90"
              className="w-32 rounded-xl border border-[#e2e8f0] px-3 py-2.5 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8]"
            />
          </div>
        </div>

        {/* Itens */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wide">Itens da Proposta</div>
            <button type="button" onClick={addItem}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-[#64748b] hover:text-[#0f172a] transition-colors">
              <Plus size={12} />
              Adicionar item
            </button>
          </div>

          <div className="space-y-2">
            {itens.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={item.descricao}
                  onChange={e => updateItem(idx, 'descricao', e.target.value)}
                  placeholder={`Procedimento ou serviço ${idx + 1}`}
                  className="flex-1 rounded-xl border border-[#e2e8f0] px-3 py-2.5 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8] placeholder:text-[#94a3b8]"
                />
                <div className="relative w-32">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-[#94a3b8]">R$</span>
                  <input
                    type="text"
                    value={item.valor}
                    onChange={e => updateItem(idx, 'valor', e.target.value)}
                    placeholder="0,00"
                    className="w-full rounded-xl border border-[#e2e8f0] pl-8 pr-3 py-2.5 text-[13px] text-right text-[#0f172a] focus:outline-none focus:border-[#94a3b8] placeholder:text-[#94a3b8]"
                  />
                </div>
                {itens.length > 1 && (
                  <button type="button" onClick={() => removeItem(idx)}
                    className="p-2 text-[#94a3b8] hover:text-rose-500 transition-colors">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-[#f1f5f9] flex justify-between items-center">
            <span className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide">Total</span>
            <span className="text-[18px] font-bold text-[#0f172a]">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
            </span>
          </div>
        </div>

        {/* Observações */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5">
          <div className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-3">Observações</div>
          <textarea
            rows={3}
            value={obs}
            onChange={e => setObs(e.target.value)}
            placeholder="Condições especiais, forma de pagamento, informações adicionais..."
            className="w-full rounded-xl border border-[#e2e8f0] px-3 py-2.5 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8] placeholder:text-[#94a3b8] resize-none"
          />
        </div>

        {error && (
          <div className="border border-rose-200 bg-rose-50 rounded-xl px-4 py-3 text-[12px] text-rose-600">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Criando...' : 'Criar Orçamento'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}

export default function NovoOrcamentoPage() {
  return (
    <Suspense fallback={<div className="p-8 text-[13px] text-[#64748b]">Carregando...</div>}>
      <NovoOrcamentoForm />
    </Suspense>
  )
}
