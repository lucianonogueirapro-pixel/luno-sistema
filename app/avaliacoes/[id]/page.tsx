'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEmpresaId } from '@/context/EmpresaContext'
import { PageHeader } from '@/components/ui/PageHeader'
import { BackButton } from '@/components/ui/BackButton'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Loader2, Plus, Trash2 } from 'lucide-react'

type AvaliacaoStatus = 'rascunho' | 'pendente' | 'em_negociacao' | 'fechado' | 'perdido'

const STATUS_LABEL: Record<AvaliacaoStatus, string> = {
  rascunho: 'Rascunho', pendente: 'Pendente',
  em_negociacao: 'Em Negociação', fechado: 'Fechado', perdido: 'Perdido',
}
const STATUS_BADGE: Record<AvaliacaoStatus, 'gray' | 'amber' | 'blue' | 'green' | 'red'> = {
  rascunho: 'gray', pendente: 'amber', em_negociacao: 'blue', fechado: 'green', perdido: 'red',
}
const TODOS_STATUS = Object.keys(STATUS_LABEL) as AvaliacaoStatus[]

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

interface AvaliacaoOpcao {
  id: string
  titulo: string | null
  descricao: string | null
  preco_negociado: number | null
}

export default function AvaliacaoPage() {
  const empresaId = useEmpresaId()
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [avaliacao, setAvaliacao] = useState<any>(null)
  const [opcoes, setOpcoes] = useState<AvaliacaoOpcao[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [obs, setObs] = useState('')

  useEffect(() => {
    async function load() {
      const [{ data: av }, { data: opts }] = await Promise.all([
        supabase.from('avaliacoes').select('*, clientes(nome, telefone)').eq('id', id).single(),
        supabase.from('avaliacao_opcoes').select('*').eq('avaliacao_id', id).order('created_at'),
      ])
      if (av) { setAvaliacao(av); setObs(av.obs ?? '') }
      setOpcoes(opts ?? [])
      setLoading(false)
    }
    load()
  }, [id, supabase])

  async function updateStatus(status: AvaliacaoStatus) {
    setSaving(true)
    await supabase.from('avaliacoes').update({ status }).eq('id', id)
    setAvaliacao((prev: any) => ({ ...prev, status }))
    setSaving(false)
  }

  async function saveObs() {
    await supabase.from('avaliacoes').update({ obs: obs.trim() || null }).eq('id', id)
  }

  async function addOpcao() {
    const { data } = await supabase
      .from('avaliacao_opcoes')
      .insert({ empresa_id: empresaId, avaliacao_id: id, titulo: 'Nova opção', preco_negociado: 0 })
      .select().single()
    if (data) setOpcoes(p => [...p, data])
  }

  async function updateOpcao(opcId: string, patch: Partial<AvaliacaoOpcao>) {
    setOpcoes(p => p.map(o => o.id === opcId ? { ...o, ...patch } : o))
    await supabase.from('avaliacao_opcoes').update(patch).eq('id', opcId)
  }

  async function deleteOpcao(opcId: string) {
    await supabase.from('avaliacao_opcoes').delete().eq('id', opcId)
    setOpcoes(p => p.filter(o => o.id !== opcId))
  }

  async function excluir() {
    if (!confirm('Excluir esta avaliação?')) return
    await supabase.from('avaliacoes').delete().eq('id', id)
    router.push('/avaliacoes')
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={20} className="animate-spin text-[#94a3b8]" />
    </div>
  )

  if (!avaliacao) return (
    <div className="p-8 text-[#64748b] text-sm">Avaliação não encontrada.</div>
  )

  const melhorPreco = opcoes.length
    ? Math.max(...opcoes.map(o => o.preco_negociado ?? 0))
    : null

  return (
    <div className="max-w-2xl space-y-4">
      <BackButton href="/avaliacoes" label="Voltar às Avaliações" />
      <PageHeader
        title={(avaliacao.clientes as any)?.nome ?? '—'}
        subtitle={(avaliacao.clientes as any)?.telefone ?? ''}
      >
        <Badge variant={STATUS_BADGE[avaliacao.status as AvaliacaoStatus]}>
          {STATUS_LABEL[avaliacao.status as AvaliacaoStatus]}
        </Badge>
      </PageHeader>

      {/* Status */}
      <Card>
        <CardHeader><CardTitle>Status do Pipeline</CardTitle></CardHeader>
        <CardBody>
          <div className="flex flex-wrap gap-2">
            {TODOS_STATUS.map(s => (
              <button key={s} type="button"
                disabled={saving || avaliacao.status === s}
                onClick={() => updateStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all disabled:opacity-50
                  ${avaliacao.status === s
                    ? 'bg-[#4f46e5] text-white border-[#4f46e5]'
                    : 'bg-white text-[#64748b] border-[#e2e8f0] hover:border-[#94a3b8] hover:text-[#0f172a]'}`}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Opções / Propostas */}
      <Card>
        <CardHeader>
          <CardTitle>Propostas</CardTitle>
          {melhorPreco != null && melhorPreco > 0 && (
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              Melhor: {fmt(melhorPreco)}
            </span>
          )}
        </CardHeader>
        <CardBody className="space-y-3">
          {opcoes.length === 0 && (
            <p className="text-[12px] text-[#94a3b8]">Nenhuma proposta. Clique em &quot;+ Proposta&quot; para adicionar.</p>
          )}
          {opcoes.map(o => (
            <div key={o.id} className="border border-[#e2e8f0] rounded-xl p-3 space-y-2">
              <div className="flex items-start gap-2">
                <input
                  type="text"
                  value={o.titulo ?? ''}
                  onChange={e => updateOpcao(o.id, { titulo: e.target.value })}
                  placeholder="Título da proposta"
                  className="flex-1 text-[13px] font-semibold text-[#0f172a] border border-[#e2e8f0] rounded-lg px-2 py-1 focus:outline-none focus:border-[#94a3b8]"
                />
                <button onClick={() => deleteOpcao(o.id)}
                  className="text-[#94a3b8] hover:text-red-500 p-1 rounded transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
              <textarea
                value={o.descricao ?? ''}
                onChange={e => updateOpcao(o.id, { descricao: e.target.value })}
                placeholder="Descrição dos serviços incluídos..."
                rows={2}
                className="w-full text-[12px] text-[#0f172a] border border-[#e2e8f0] rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#94a3b8] placeholder:text-[#94a3b8] resize-none"
              />
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#64748b]">Preço R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={o.preco_negociado ?? ''}
                  onChange={e => updateOpcao(o.id, { preco_negociado: parseFloat(e.target.value) || 0 })}
                  className="w-32 text-[12px] font-semibold text-[#0f172a] border border-[#e2e8f0] rounded-lg px-2 py-1 text-right focus:outline-none focus:border-[#94a3b8]"
                />
              </div>
            </div>
          ))}
          <button onClick={addOpcao}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-[#4f46e5] hover:text-[#374151] transition-colors">
            <Plus size={13} />
            Proposta
          </button>
        </CardBody>
      </Card>

      {/* Observações */}
      <Card>
        <CardHeader><CardTitle>Observações</CardTitle></CardHeader>
        <CardBody>
          <textarea
            value={obs}
            onChange={e => setObs(e.target.value)}
            onBlur={saveObs}
            rows={4}
            placeholder="Notas sobre o cliente, interesse, histórico..."
            className="w-full text-[13px] text-[#0f172a] border border-[#e2e8f0] rounded-xl px-3 py-2 focus:outline-none focus:border-[#94a3b8] placeholder:text-[#94a3b8] resize-none"
          />
          <div className="text-[10px] text-[#94a3b8] mt-1">Salvo automaticamente ao sair do campo.</div>
        </CardBody>
      </Card>

      <div className="flex justify-between pt-2">
        <span className="text-[11px] text-[#94a3b8]">
          Criado em {new Date(avaliacao.created_at).toLocaleDateString('pt-BR')}
        </span>
        <button onClick={excluir}
          className="text-[11px] text-[#94a3b8] hover:text-red-500 transition-colors">
          Excluir avaliação
        </button>
      </div>
    </div>
  )
}
