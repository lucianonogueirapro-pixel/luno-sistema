'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEmpresaId } from '@/context/EmpresaContext'
import { PageHeader } from '@/components/ui/PageHeader'
import { BackButton } from '@/components/ui/BackButton'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'

type AvaliacaoStatus = 'rascunho' | 'pendente' | 'em_negociacao' | 'fechado' | 'perdido'

const STATUSES: { value: AvaliacaoStatus; label: string }[] = [
  { value: 'rascunho',      label: 'Rascunho' },
  { value: 'pendente',      label: 'Pendente' },
  { value: 'em_negociacao', label: 'Em Negociação' },
]

interface Cliente { id: string; nome: string; telefone: string }

export default function NovaAvaliacaoPage() {
  const empresaId = useEmpresaId()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [busca, setBusca] = useState('')
  const [form, setForm] = useState({
    cliente_id: '',
    status: 'pendente' as AvaliacaoStatus,
    obs: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('clientes').select('id, nome, telefone').order('nome')
      .then(({ data }) => setClientes(data ?? []))
  }, [supabase])

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const clientesFiltrados = useMemo(() => {
    if (!busca.trim()) return clientes.slice(0, 6)
    const q = busca.toLowerCase()
    return clientes.filter(c =>
      c.nome.toLowerCase().includes(q) || c.telefone.includes(q)
    ).slice(0, 6)
  }, [busca, clientes])

  const clienteSelecionado = clientes.find(c => c.id === form.cliente_id)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.cliente_id) { setError('Selecione o cliente'); return }
    setSaving(true)
    setError('')
    const { data, error: err } = await supabase
      .from('avaliacoes')
      .insert({
        empresa_id: empresaId,
        cliente_id: form.cliente_id,
        status: form.status,
        obs: form.obs.trim() || null,
      })
      .select('id')
      .single()
    if (err) { setError(err.message); setSaving(false); return }
    router.push(`/avaliacoes/${data.id}`)
  }

  return (
    <div className="max-w-lg">
      <div className="mb-4"><BackButton href="/avaliacoes" label="Voltar às Avaliações" /></div>
      <PageHeader title="Nova Avaliação" subtitle="Iniciar processo comercial" />
      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">Cliente *</label>
              {clienteSelecionado ? (
                <div className="flex items-center gap-3 border border-[#e2e8f0] rounded-lg px-3 py-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#94a3b8] to-[#64748b] flex items-center justify-center text-white text-[10px] font-bold">
                    {clienteSelecionado.nome[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] font-semibold text-[#0f172a]">{clienteSelecionado.nome}</div>
                    <div className="text-[11px] text-[#64748b]">{clienteSelecionado.telefone}</div>
                  </div>
                  <button type="button" onClick={() => set('cliente_id', '')} className="text-[11px] text-[#64748b] hover:text-[#0f172a]">Trocar</button>
                </div>
              ) : (
                <div>
                  <input
                    type="text"
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    placeholder="Buscar cliente por nome ou telefone..."
                    className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8] placeholder:text-[#94a3b8] mb-1"
                  />
                  {busca && (
                    <div className="border border-[#e2e8f0] rounded-lg divide-y divide-[#f1f5f9] overflow-hidden">
                      {clientesFiltrados.length === 0 ? (
                        <div className="px-3 py-3 text-[12px] text-[#64748b] text-center">Nenhum cliente encontrado.</div>
                      ) : clientesFiltrados.map(c => (
                        <button key={c.id} type="button"
                          onClick={() => { set('cliente_id', c.id); setBusca('') }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#f8fafc] text-left">
                          <div className="text-[12px] font-semibold text-[#0f172a]">{c.nome}</div>
                          <div className="text-[11px] text-[#64748b] ml-auto">{c.telefone}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-[13px] text-[#0f172a] bg-white focus:outline-none focus:border-[#94a3b8]">
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">Observações</label>
              <textarea value={form.obs} onChange={e => set('obs', e.target.value)} rows={3}
                placeholder="Interesse do cliente, serviços de interesse..."
                className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8] placeholder:text-[#94a3b8] resize-none" />
            </div>

            {error && (
              <p className="text-[12px] text-[#8B1A1A] bg-[#FEF0EE] border border-[#FECACA] rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Criar Avaliação'}</Button>
              <Button type="button" variant="secondary" onClick={() => router.push('/avaliacoes')}>Cancelar</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
