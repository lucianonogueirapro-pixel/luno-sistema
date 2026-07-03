'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEmpresaId } from '@/context/EmpresaContext'
import { PageHeader } from '@/components/ui/PageHeader'
import { BackButton } from '@/components/ui/BackButton'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'

type AgendaTipo = 'servico' | 'avaliacao' | 'retorno' | 'outro'

const TIPOS: { value: AgendaTipo; label: string }[] = [
  { value: 'servico',   label: 'Serviço' },
  { value: 'avaliacao', label: 'Avaliação' },
  { value: 'retorno',   label: 'Retorno' },
  { value: 'outro',     label: 'Outro' },
]

interface Profissional {
  id: string
  nome: string
  cor: string
  especialidade: string | null
  ativo: boolean
}

interface Cliente {
  id: string
  nome: string
  telefone: string
}

interface Servico {
  id: string
  nome: string
  preco: number
  duracao_min: number
}

export default function NovoAgendamentoPage() {
  const empresaId = useEmpresaId()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [busca, setBusca] = useState('')

  const [form, setForm] = useState({
    cliente_id: '',
    profissional_id: '',
    servico_id: '',
    data: '',
    hora: '09:00',
    duracao_min: '60',
    tipo: 'servico' as AgendaTipo,
    valor: '',
    obs: '',
  })
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    async function load() {
      const [{ data: cls }, { data: profs }, { data: svcs }] = await Promise.all([
        supabase.from('clientes').select('id, nome, telefone').order('nome'),
        supabase.from('profissionais').select('id, nome, cor, especialidade, ativo').eq('ativo', true).order('nome'),
        supabase.from('servicos').select('id, nome, preco, duracao_min').eq('ativo', true).order('nome'),
      ])
      setClientes(cls ?? [])
      const lista = profs ?? []
      setProfissionais(lista)
      if (lista.length > 0) set('profissional_id', lista[0].id)
      setServicos(svcs ?? [])
    }
    load()
  }, [supabase])

  const clientesFiltrados = useMemo(() => {
    if (!busca.trim()) return clientes.slice(0, 6)
    const q = busca.toLowerCase()
    return clientes.filter(c =>
      c.nome.toLowerCase().includes(q) || c.telefone.includes(q)
    ).slice(0, 6)
  }, [busca, clientes])

  const clienteSelecionado = clientes.find(c => c.id === form.cliente_id)

  function selecionarServico(svc: Servico) {
    setForm(f => ({
      ...f,
      servico_id: svc.id,
      duracao_min: String(svc.duracao_min),
      valor: String(svc.preco),
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.cliente_id) { setError('Selecione o cliente'); return }
    if (!form.data || !form.hora) { setError('Data e hora são obrigatórios'); return }

    setSaving(true)
    setError('')

    const dataHora = new Date(`${form.data}T${form.hora}:00`)

    const { error: err } = await supabase
      .from('agenda')
      .insert({
        empresa_id: empresaId,
        cliente_id: form.cliente_id,
        profissional_id: form.profissional_id || null,
        servico_id: form.servico_id || null,
        data_hora: dataHora.toISOString(),
        duracao_min: parseInt(form.duracao_min) || 60,
        tipo: form.tipo,
        status: 'agendado',
        valor: form.valor ? parseFloat(form.valor) : null,
        obs: form.obs.trim() || null,
      })

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    router.push('/agenda')
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-4"><BackButton href="/agenda" label="Voltar à Agenda" /></div>
      <PageHeader title="Novo Agendamento" subtitle="Agendar atendimento" />

      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Profissional */}
            {profissionais.length > 0 && (
              <div>
                <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-2">
                  Profissional
                </label>
                <div className="flex gap-2 flex-wrap">
                  {profissionais.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => set('profissional_id', p.id)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl border text-[12px] font-semibold transition-all"
                      style={form.profissional_id === p.id
                        ? { backgroundColor: p.cor, borderColor: p.cor, color: 'white' }
                        : { borderColor: '#e2e8f0', color: '#475569' }
                      }
                    >
                      <span
                        className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                        style={{ backgroundColor: p.cor, opacity: form.profissional_id === p.id ? 0.7 : 1 }}
                      >
                        {p.nome.charAt(0)}
                      </span>
                      {p.nome.split(' ')[0]} {p.nome.split(' ')[1] ?? ''}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Cliente */}
            <div>
              <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">
                Cliente *
              </label>
              {clienteSelecionado ? (
                <div className="flex items-center gap-3 border border-[#e2e8f0] rounded-lg px-3 py-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#94a3b8] to-[#64748b] flex items-center justify-center text-white text-[10px] font-bold">
                    {clienteSelecionado.nome[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] font-semibold text-[#0f172a]">{clienteSelecionado.nome}</div>
                    <div className="text-[11px] text-[#64748b]">{clienteSelecionado.telefone}</div>
                  </div>
                  <button type="button" onClick={() => set('cliente_id', '')} className="text-[11px] text-[#64748b] hover:text-[#0f172a]">
                    Trocar
                  </button>
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
                      ) : (
                        clientesFiltrados.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => { set('cliente_id', c.id); setBusca('') }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#f8fafc] text-left"
                          >
                            <div className="text-[12px] font-semibold text-[#0f172a]">{c.nome}</div>
                            <div className="text-[11px] text-[#64748b] ml-auto">{c.telefone}</div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Serviço */}
            {servicos.length > 0 && (
              <div>
                <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-2">
                  Serviço
                </label>
                <div className="flex gap-2 flex-wrap">
                  {servicos.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => selecionarServico(s)}
                      className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                        form.servico_id === s.id
                          ? 'bg-[#22d3ee] text-white border-[#22d3ee]'
                          : 'text-[#475569] border-[#e2e8f0] hover:border-[#94a3b8]'
                      }`}
                    >
                      {s.nome}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">Data *</label>
                <input type="date" value={form.data} onChange={e => set('data', e.target.value)}
                  className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8]" required />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">Hora *</label>
                <input type="time" value={form.hora} onChange={e => set('hora', e.target.value)}
                  className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8]" required />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">Duração (min)</label>
                <input type="number" value={form.duracao_min} onChange={e => set('duracao_min', e.target.value)}
                  min="5" step="5"
                  className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8]" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">Tipo</label>
                <select value={form.tipo} onChange={e => set('tipo', e.target.value)}
                  className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-[13px] text-[#0f172a] bg-white focus:outline-none focus:border-[#94a3b8]">
                  {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">Valor (R$)</label>
                <input type="number" min="0" step="0.01" value={form.valor}
                  onChange={e => set('valor', e.target.value)} placeholder="0,00"
                  className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8] placeholder:text-[#94a3b8]" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">Observações</label>
              <textarea value={form.obs} onChange={e => set('obs', e.target.value)} rows={2}
                placeholder="Notas sobre o agendamento..."
                className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8] placeholder:text-[#94a3b8] resize-none" />
            </div>

            {error && (
              <p className="text-[12px] text-[#8B1A1A] bg-[#FEF0EE] border border-[#FECACA] rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Confirmar Agendamento'}</Button>
              <Button type="button" variant="secondary" onClick={() => router.push('/agenda')}>Cancelar</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
