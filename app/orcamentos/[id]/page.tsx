'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEmpresaId } from '@/context/EmpresaContext'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Plus, Trash2, Send, ExternalLink, Check } from 'lucide-react'
import type { Orcamento, OrcamentoItem, StatusOrcamento } from '@/lib/types'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

const STATUS_LABEL: Record<StatusOrcamento, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
}

const STATUS_STYLE: Record<StatusOrcamento, string> = {
  rascunho: 'bg-[#f1f5f9] text-[#64748b]',
  enviado:  'bg-sky-50 text-sky-700',
  aprovado: 'bg-emerald-50 text-emerald-700',
  recusado: 'bg-rose-50 text-rose-600',
}

type OrcFull = Orcamento & {
  clientes: { nome: string; telefone: string }
  orcamento_itens: OrcamentoItem[]
}

export default function OrcamentoDetailPage() {
  const empresaId = useEmpresaId()
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [orc, setOrc] = useState<OrcFull | null>(null)
  const [itens, setItens] = useState<OrcamentoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    supabase
      .from('orcamentos')
      .select('*, clientes(nome, telefone), orcamento_itens(*)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          const d = data as OrcFull
          setOrc(d)
          setItens(d.orcamento_itens.sort((a, b) => a.posicao - b.posicao))
        }
        setLoading(false)
      })
  }, [id, supabase])

  const total = itens.reduce((s, i) => s + (i.valor ?? 0), 0)

  async function setStatus(status: StatusOrcamento) {
    if (!orc) return
    setSaving(true)
    await supabase.from('orcamentos').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    setOrc(prev => prev ? { ...prev, status } : prev)
    setSaving(false)
  }

  async function updateItem(item: OrcamentoItem, field: 'descricao' | 'valor', value: string) {
    const newVal = field === 'valor' ? parseFloat(value.replace(',', '.')) || 0 : value
    setItens(prev => prev.map(i => i.id === item.id ? { ...i, [field]: newVal } : i))
    await supabase.from('orcamento_itens').update({ [field]: newVal }).eq('id', item.id)
  }

  async function addItem() {
    if (!orc) return
    const posicao = itens.length
    const { data } = await supabase
      .from('orcamento_itens')
      .insert({ empresa_id: empresaId, orcamento_id: id, descricao: '', valor: 0, posicao })
      .select()
      .single()
    if (data) setItens(prev => [...prev, data as OrcamentoItem])
  }

  async function removeItem(itemId: string) {
    await supabase.from('orcamento_itens').delete().eq('id', itemId)
    setItens(prev => prev.filter(i => i.id !== itemId))
  }

  function publicUrl() {
    return `${window.location.origin}/f/orcamento/${orc?.token}`
  }

  function whatsappHref() {
    if (!orc) return '#'
    const link = publicUrl()
    const msg = encodeURIComponent(
      `Olá ${orc.clientes.nome.split(' ')[0]}! Segue sua proposta personalizada da Luno:\n${link}`
    )
    return `https://wa.me/55${orc.clientes.telefone.replace(/\D/g, '')}?text=${msg}`
  }

  async function copyLink() {
    await navigator.clipboard.writeText(publicUrl())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="p-8 text-[13px] text-[#64748b]">Carregando...</div>
  if (!orc) return <div className="p-8 text-[13px] text-rose-500">Orçamento não encontrado.</div>

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={orc.titulo ?? `Orçamento — ${orc.clientes.nome}`}
        subtitle={`Criado em ${new Date(orc.created_at).toLocaleDateString('pt-BR')} · válido por ${orc.validade_dias} dias`}
        action={
          <div className="flex gap-2">
            <button onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#e2e8f0] text-[11px] font-semibold text-[#64748b] hover:border-[#94a3b8] hover:text-[#0f172a] transition-colors">
              {copied ? <Check size={12} className="text-emerald-600" /> : <ExternalLink size={12} />}
              {copied ? 'Copiado!' : 'Copiar link'}
            </button>
            <a href={whatsappHref()} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#25D366] text-white text-[11px] font-semibold hover:bg-[#1ebe5d] transition-colors">
              <Send size={12} />
              WhatsApp
            </a>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Paciente */}
        <div className="col-span-2 bg-white border border-[#e2e8f0] rounded-2xl p-5">
          <div className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-3">Cliente</div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#4f46e5] flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0">
              {orc.clientes.nome[0].toUpperCase()}
            </div>
            <div>
              <div className="text-[14px] font-semibold text-[#0f172a]">{orc.clientes.nome}</div>
              <div className="text-[12px] text-[#94a3b8]">{orc.clientes.telefone}</div>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5">
          <div className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-3">Status</div>
          <div className="space-y-1.5">
            {(['rascunho', 'enviado', 'aprovado', 'recusado'] as StatusOrcamento[]).map(s => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                disabled={saving}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                  orc.status === s
                    ? STATUS_STYLE[s] + ' ring-1 ring-current ring-offset-1'
                    : 'text-[#94a3b8] hover:bg-[#f1f5f9] hover:text-[#64748b]'
                }`}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Itens */}
      <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wide">Itens da Proposta</div>
          <button onClick={addItem}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-[#64748b] hover:text-[#0f172a] transition-colors">
            <Plus size={12} />
            Adicionar
          </button>
        </div>

        <div className="space-y-2">
          {itens.map(item => (
            <div key={item.id} className="flex gap-2 items-center">
              <input
                type="text"
                defaultValue={item.descricao}
                onBlur={e => updateItem(item, 'descricao', e.target.value)}
                placeholder="Descrição do procedimento"
                className="flex-1 rounded-xl border border-[#e2e8f0] px-3 py-2.5 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8] placeholder:text-[#94a3b8]"
              />
              <div className="relative w-32">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-[#94a3b8]">R$</span>
                <input
                  type="text"
                  defaultValue={item.valor > 0 ? item.valor.toFixed(2).replace('.', ',') : ''}
                  onBlur={e => updateItem(item, 'valor', e.target.value)}
                  placeholder="0,00"
                  className="w-full rounded-xl border border-[#e2e8f0] pl-8 pr-3 py-2.5 text-[13px] text-right text-[#0f172a] focus:outline-none focus:border-[#94a3b8] placeholder:text-[#94a3b8]"
                />
              </div>
              <button onClick={() => removeItem(item.id)}
                className="p-2 text-[#94a3b8] hover:text-rose-500 transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-[#f1f5f9] flex justify-between items-center">
          <span className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide">Total</span>
          <span className="text-[20px] font-bold text-[#0f172a]">{fmt(total)}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => router.push('/orcamentos')}>
          Voltar à lista
        </Button>
      </div>
    </div>
  )
}
