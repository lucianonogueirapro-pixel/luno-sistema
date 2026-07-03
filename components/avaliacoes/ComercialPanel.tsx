'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { calcularCustoOpcao } from '@/lib/calcs'
import { PageHeader } from '@/components/ui/PageHeader'
import { BackButton } from '@/components/ui/BackButton'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import type { Avaliacao, AvaliacaoStatus, Insumo, FormaPagamento, NivelProtocolo } from '@/lib/types'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const STATUS_LABEL: Record<AvaliacaoStatus, string> = {
  rascunho: 'Rascunho', pendente: 'Pendente',
  em_negociacao: 'Em Negociação', fechado: 'Fechado', perdido: 'Perdido',
}
const STATUS_BADGE: Record<AvaliacaoStatus, 'gray' | 'amber' | 'blue' | 'green' | 'red'> = {
  rascunho: 'gray', pendente: 'amber', em_negociacao: 'blue', fechado: 'green', perdido: 'red',
}

const FORMAS_PAGAMENTO: { value: FormaPagamento; label: string }[] = [
  { value: 'pix', label: 'Pix' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'parcelado', label: 'Parcelado' },
]

export default function ComercialPanel({
  avaliacao,
  insumos,
}: {
  avaliacao: Avaliacao & { pacientes: { nome: string; telefone: string } }
  insumos: Insumo[]
}) {
  const [av, setAv] = useState(avaliacao)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  async function updateStatus(status: AvaliacaoStatus) {
    setSaving(true)
    const { error: e } = await supabase.from('avaliacoes').update({ status }).eq('id', av.id)
    setSaving(false)
    if (e) { setError('Erro ao atualizar status'); return }
    setAv({ ...av, status })
    router.refresh()
  }

  async function updatePreco(opcaoId: string, preco: string) {
    const parsed = parseFloat(preco)
    const val = preco.trim() !== '' && !isNaN(parsed) ? parsed : null
    const { error: e } = await supabase.from('avaliacao_opcoes').update({ preco_negociado: val }).eq('id', opcaoId)
    if (e) { setError('Erro ao atualizar preço'); return }
    setAv({ ...av, opcoes: av.opcoes?.map(o => o.id === opcaoId ? { ...o, preco_negociado: val } : o) })
  }

  async function updateFormaPagamento(opcaoId: string, forma: FormaPagamento) {
    const { error: e } = await supabase.from('avaliacao_opcoes').update({ forma_pagamento: forma }).eq('id', opcaoId)
    if (e) { setError('Erro ao atualizar forma de pagamento'); return }
    setAv({ ...av, opcoes: av.opcoes?.map(o => o.id === opcaoId ? { ...o, forma_pagamento: forma } : o) })
  }

  async function addBrinde(opcaoId: string, insumoId: string, qtd: number) {
    if (!insumoId) return
    const { data, error: e } = await supabase
      .from('opcao_brindes')
      .insert({ opcao_id: opcaoId, insumo_id: insumoId, quantidade: qtd })
      .select('*, insumos(*)')
      .single()
    if (e || !data) { setError('Erro ao adicionar brinde'); return }
    setAv({
      ...av,
      opcoes: av.opcoes?.map(o => o.id === opcaoId ? { ...o, brindes: [...(o.brindes ?? []), data as any] } : o),
    })
  }

  async function removeBrinde(opcaoId: string, brindeId: string) {
    const { error: e } = await supabase.from('opcao_brindes').delete().eq('id', brindeId)
    if (e) { setError('Erro ao remover brinde'); return }
    setAv({
      ...av,
      opcoes: av.opcoes?.map(o => o.id === opcaoId ? { ...o, brindes: o.brindes?.filter(b => b.id !== brindeId) } : o),
    })
  }

  async function updateNivel(opcaoId: string, nivel: NivelProtocolo | null) {
    const { error: e } = await supabase.from('avaliacao_opcoes').update({ nivel }).eq('id', opcaoId)
    if (e) { setError('Erro ao atualizar nível'); return }
    setAv({ ...av, opcoes: av.opcoes?.map(o => o.id === opcaoId ? { ...o, nivel } : o) })
  }

  async function toggleRecomendado(opcaoId: string) {
    const opcao = av.opcoes?.find(o => o.id === opcaoId)
    if (!opcao) return
    const novoValor = !opcao.recomendado
    const { error: e } = await supabase.from('avaliacao_opcoes').update({ recomendado: novoValor }).eq('id', opcaoId)
    if (e) { setError('Erro ao atualizar recomendação'); return }
    setAv({ ...av, opcoes: av.opcoes?.map(o => o.id === opcaoId ? { ...o, recomendado: novoValor } : o) })
  }

  async function enviarParaComercial() {
    setSaving(true)
    const opcoes = av.opcoes ?? []
    const resumoOpcoes = opcoes.map(o => {
      const custo = calcularCustoOpcao(o as any)
      const nivel = o.nivel ? { completo: 'Completo', intermediario: 'Intermediário', basico: 'Básico' }[o.nivel] : `Opção ${o.numero_opcao}`
      return `${nivel}${o.recomendado ? ' ★ Recomendado' : ''}: ${fmt(o.preco_negociado ?? custo.preco_tabela)} (tabela: ${fmt(custo.preco_tabela)})`
    }).join('\n')

    await supabase.from('notificacoes').insert({
      para_role: 'comercial',
      tipo: 'avaliacao_pronta',
      titulo: `Avaliação pronta — ${(avaliacao.pacientes as any)?.nome}`,
      corpo: `${(avaliacao.pacientes as any)?.nome} tem ${opcoes.length} protocolo(s) aguardando negociação:\n\n${resumoOpcoes}`,
      referencia_id: av.id,
      referencia_tipo: 'avaliacao',
    })
    setSaving(false)
    await updateStatus('pendente')
  }

  async function fecharAvaliacao(opcaoId: string, formaPagamento: FormaPagamento | null) {
    setSaving(true)
    setError('')
    const opcao = av.opcoes?.find(o => o.id === opcaoId)
    if (opcao) {
      const movs: Array<{
        insumo_id: string; tipo: string; quantidade: number
        referencia_id: string; referencia_tipo: string; obs: string
      }> = []

      for (const op of opcao.procedimentos ?? []) {
        const proc = op.procedimento as any
        for (const pi of proc?.insumos ?? []) {
          movs.push({
            insumo_id: pi.insumo_id, tipo: 'saida', quantidade: pi.quantidade,
            referencia_id: av.id, referencia_tipo: 'avaliacao',
            obs: `Fechamento ${avaliacao.pacientes?.nome}`,
          })
        }
      }
      for (const b of opcao.brindes ?? []) {
        movs.push({
          insumo_id: b.insumo_id, tipo: 'saida', quantidade: b.quantidade,
          referencia_id: av.id, referencia_tipo: 'brinde',
          obs: `Brinde ${avaliacao.pacientes?.nome}`,
        })
      }
      if (movs.length) {
        const { error: em } = await supabase.from('movimentacoes_estoque').insert(movs)
        if (em) { setError('Erro ao registrar movimentação de estoque'); setSaving(false); return }
      }

      if (formaPagamento) {
        await supabase.from('avaliacao_opcoes').update({ forma_pagamento: formaPagamento }).eq('id', opcaoId)
      }
    }

    const { error: eav } = await supabase.from('avaliacoes').update({ status: 'fechado' }).eq('id', av.id)
    if (eav) { setError('Erro ao fechar avaliação'); setSaving(false); return }
    setAv({ ...av, status: 'fechado' })
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-4"><BackButton href="/avaliacoes" label="Voltar às Avaliações" /></div>
      <PageHeader
        title={(avaliacao.pacientes as any)?.nome ?? '—'}
        subtitle={(avaliacao.pacientes as any)?.telefone ?? ''}
      >
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_BADGE[av.status]}>
            {STATUS_LABEL[av.status]}
          </Badge>
          {av.status === 'rascunho' && (
            <Button size="sm" onClick={enviarParaComercial} disabled={saving}>
              {saving ? 'Enviando...' : 'Enviar para Comercial'}
            </Button>
          )}
          {av.status === 'pendente' && (
            <Button size="sm" onClick={() => updateStatus('em_negociacao')} disabled={saving}>
              Iniciar Negociação
            </Button>
          )}
          {av.status !== 'fechado' && av.status !== 'perdido' && (
            <Button size="sm" variant="ghost" onClick={() => updateStatus('perdido')} disabled={saving}>
              Marcar Perdido
            </Button>
          )}
        </div>
      </PageHeader>

      {error && (
        <p className="text-[12px] text-[#8B1A1A] bg-[#FEF0EE] border border-[#FECACA] rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {(av.opcoes ?? []).sort((a, b) => a.numero_opcao - b.numero_opcao).map(opcao => {
        const custo = calcularCustoOpcao(opcao as any)
        const precoNeg = opcao.preco_negociado ?? custo.preco_tabela
        const margemNeg = precoNeg > 0 ? ((precoNeg - custo.custo_total) / precoNeg) * 100 : 0
        const precoMin = (opcao.procedimentos ?? []).reduce((sum, op) => sum + ((op.procedimento as any)?.preco_minimo ?? 0), 0)
        const procs = opcao.procedimentos ?? []
        const brindes = opcao.brindes ?? []

        return (
          <Card key={opcao.id} className="mb-4">
            <CardHeader>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle>Opção {opcao.numero_opcao}</CardTitle>
                {/* Nível do protocolo */}
                {(['completo','intermediario','basico'] as NivelProtocolo[]).map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => updateNivel(opcao.id, opcao.nivel === n ? null : n)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all
                      ${opcao.nivel === n
                        ? n === 'completo' ? 'bg-[#2D6A1A] text-white border-[#2D6A1A]'
                          : n === 'intermediario' ? 'bg-[#1A4080] text-white border-[#1A4080]'
                          : 'bg-[#64748b] text-white border-[#64748b]'
                        : 'bg-white text-[#64748b] border-[#e2e8f0] hover:border-[#94a3b8]'}`}
                  >
                    {n === 'completo' ? 'Completo' : n === 'intermediario' ? 'Intermediário' : 'Básico'}
                  </button>
                ))}
                {/* Recomendado */}
                <button
                  type="button"
                  onClick={() => toggleRecomendado(opcao.id)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all
                    ${opcao.recomendado
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-[#64748b] border-[#e2e8f0] hover:border-amber-400'}`}
                >
                  {opcao.recomendado ? '★ Recomendado' : '☆ Recomendar'}
                </button>
              </div>
              <span className="text-[11px] text-[#64748b]">
                {procs.length} procedimento{procs.length !== 1 ? 's' : ''}
                {brindes.length > 0 && ` · ${brindes.length} brinde${brindes.length !== 1 ? 's' : ''}`}
              </span>
            </CardHeader>
            <CardBody className="space-y-3">
              {/* Procedimentos */}
              <div className="divide-y divide-[#f1f5f9]">
                {procs.map(op => (
                  <div key={op.id} className="flex items-center justify-between py-2">
                    <span className="text-[13px] text-[#0f172a] font-medium">{(op.procedimento as any)?.nome}</span>
                    {(op.procedimento as any)?.preco_tabela > 0 && (
                      <span className="text-[12px] text-[#64748b]">{fmt((op.procedimento as any).preco_tabela)}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Brindes */}
              {brindes.length > 0 && (
                <div className="bg-[#f8fafc] rounded-lg p-3">
                  <p className="text-[11px] font-bold text-[#64748b] uppercase tracking-wide mb-2">Brindes</p>
                  {brindes.map(b => (
                    <div key={b.id} className="flex items-center gap-2 text-[12px] py-1">
                      <span className="flex-1 text-[#0f172a]">{(b.insumo as any)?.nome} × {b.quantidade}</span>
                      <span className="text-[#64748b]">
                        {fmt(((b.insumo as any)?.dysport_conversao
                          ? (b.insumo as any).custo_atual * (b.insumo as any).fator_conversao
                          : (b.insumo as any)?.custo_atual ?? 0) * b.quantidade)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeBrinde(opcao.id, b.id)}
                        aria-label="Remover brinde"
                        className="text-[#94a3b8] hover:text-[#8B1A1A] text-lg leading-none"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <AddBrindeRow insumos={insumos} onAdd={(insId, qtd) => addBrinde(opcao.id, insId, qtd)} />

              {/* Resumo financeiro */}
              <div className="grid grid-cols-5 gap-2 pt-1">
                {([
                  ['Custo Clínica', fmt(custo.custo_total), '#8B1A1A'],
                  ['Tabela', fmt(custo.preco_tabela), '#0f172a'],
                  ['Piso Neg.', precoMin > 0 ? fmt(precoMin) : '—', '#7c3aed'],
                  ['Negociado', fmt(precoNeg), '#1A4080'],
                  ['Margem', `${margemNeg.toFixed(0)}%`, margemNeg >= 50 ? '#2D6A1A' : margemNeg >= 30 ? '#b45309' : '#8B1A1A'],
                ] as [string, string, string][]).map(([l, v, c]) => (
                  <div key={l} className="bg-[#f8fafc] rounded-xl p-2.5 text-center border border-[#f1f5f9]">
                    <div className="text-[10px] text-[#64748b] mb-0.5">{l}</div>
                    <div className="text-[13px] font-bold" style={{ color: c }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Preço negociado + forma de pagamento + fechar */}
              <div className="flex items-end gap-3 flex-wrap pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">
                    Preço negociado
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={opcao.preco_negociado ?? ''}
                    onBlur={e => updatePreco(opcao.id, e.target.value)}
                    className="border border-[#e2e8f0] rounded-lg px-3 py-2 text-[13px] text-[#0f172a] w-36 focus:outline-none focus:border-[#94a3b8]"
                    placeholder={fmt(custo.preco_tabela)}
                  />
                  {precoMin > 0 && (
                    <p className="text-[10px] text-[#7c3aed] mt-1 font-semibold">
                      Piso: {fmt(precoMin)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">
                    Forma de pagamento
                  </label>
                  <select
                    value={(opcao as any).forma_pagamento ?? ''}
                    onChange={e => updateFormaPagamento(opcao.id, e.target.value as FormaPagamento)}
                    className="border border-[#e2e8f0] rounded-lg px-3 py-2 text-[13px] text-[#0f172a] bg-white focus:outline-none focus:border-[#94a3b8]"
                  >
                    <option value="">Selecionar...</option>
                    {FORMAS_PAGAMENTO.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>

                {av.status !== 'fechado' && av.status !== 'perdido' && (
                  <Button
                    onClick={() => fecharAvaliacao(opcao.id, (opcao as any).forma_pagamento)}
                    disabled={saving}
                    className="ml-auto"
                  >
                    {saving ? 'Fechando...' : `Fechar Opção ${opcao.numero_opcao}`}
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        )
      })}
    </div>
  )
}

function AddBrindeRow({ insumos, onAdd }: { insumos: Insumo[]; onAdd: (insId: string, qtd: number) => void }) {
  const [insId, setInsId] = useState('')
  const [qtd, setQtd] = useState('1')

  return (
    <div className="flex gap-2 flex-wrap items-end">
      <div className="flex-1 min-w-40">
        <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">Adicionar brinde</label>
        <select
          value={insId}
          onChange={e => setInsId(e.target.value)}
          className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-[12px] text-[#0f172a] bg-white focus:outline-none focus:border-[#94a3b8]"
        >
          <option value="">Selecionar insumo...</option>
          {insumos.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">Qtd</label>
        <input
          type="number"
          value={qtd}
          onChange={e => setQtd(e.target.value)}
          className="border border-[#e2e8f0] rounded-lg px-3 py-2 text-[12px] text-[#0f172a] w-16 focus:outline-none focus:border-[#94a3b8]"
          min="0.001"
          step="0.001"
        />
      </div>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          if (insId) { onAdd(insId, parseFloat(qtd) || 1); setInsId(''); setQtd('1') }
        }}
      >
        Adicionar
      </Button>
    </div>
  )
}
