'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { BackButton } from '@/components/ui/BackButton'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import type { Procedimento, Paciente } from '@/lib/types'

type ProcComReceita = Procedimento & {
  procedimento_insumos: Array<{ id: string; quantidade: number; insumos: { custo_atual: number; dysport_conversao: boolean; fator_conversao: number } }>
}

interface ProtocoloTemplate {
  id: string
  nome: string
  preco_tabela: number
  preco_minimo: number
  preco_protocolo: number
  protocolo_template_procs: { procedimento_id: string }[]
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

interface OpcaoLocal {
  numero: 1 | 2 | 3
  modo: 'procedimentos' | 'protocolo'
  procedimento_ids: string[]
  protocolo_id: string | null
}

export default function NovaAvaliacaoForm({
  medicaId,
  procedimentos,
  pacientes,
  pacienteIdInicial,
  protocolos,
}: {
  medicaId: string | null
  procedimentos: ProcComReceita[]
  pacientes: Pick<Paciente, 'id' | 'nome' | 'telefone'>[]
  pacienteIdInicial?: string | null
  protocolos: ProtocoloTemplate[]
}) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const pacienteInicial = pacienteIdInicial
    ? pacientes.find(p => p.id === pacienteIdInicial) ?? null
    : null

  const [pacienteSelecionado, setPacienteSelecionado] = useState<typeof pacienteInicial>(pacienteInicial)
  const [busca, setBusca] = useState('')
  const [novoNome, setNovoNome] = useState('')
  const [novoTel, setNovoTel] = useState('')
  const [modoNovo, setModoNovo] = useState(!pacienteInicial)

  const [opcoes, setOpcoes] = useState<OpcaoLocal[]>([{ numero: 1, modo: 'procedimentos', procedimento_ids: [], protocolo_id: null }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const pacientesFiltrados = useMemo(() => {
    if (!busca.trim()) return pacientes.slice(0, 8)
    const q = busca.toLowerCase()
    return pacientes.filter(p =>
      p.nome.toLowerCase().includes(q) || p.telefone.includes(q)
    ).slice(0, 8)
  }, [busca, pacientes])

  function addOpcao() {
    if (opcoes.length >= 3) return
    const used = opcoes.map(o => o.numero)
    const next = ([1, 2, 3] as const).find(n => !used.includes(n))!
    setOpcoes([...opcoes, { numero: next, modo: 'procedimentos', procedimento_ids: [], protocolo_id: null }])
  }

  function removeOpcao(num: number) {
    setOpcoes(opcoes.filter(o => o.numero !== num))
  }

  function toggleProc(opcaoNum: number, procId: string) {
    setOpcoes(opcoes.map(o => {
      if (o.numero !== opcaoNum) return o
      const has = o.procedimento_ids.includes(procId)
      return { ...o, procedimento_ids: has ? o.procedimento_ids.filter(id => id !== procId) : [...o.procedimento_ids, procId] }
    }))
  }

  function setModo(opcaoNum: number, modo: 'procedimentos' | 'protocolo') {
    setOpcoes(opcoes.map(o =>
      o.numero !== opcaoNum ? o : { ...o, modo, procedimento_ids: [], protocolo_id: null }
    ))
  }

  function selecionarProtocolo(opcaoNum: number, protId: string) {
    const prot = protocolos.find(p => p.id === protId)
    if (!prot) return
    setOpcoes(opcoes.map(o =>
      o.numero !== opcaoNum ? o : {
        ...o,
        protocolo_id: protId,
        procedimento_ids: prot.protocolo_template_procs.map(pp => pp.procedimento_id),
      }
    ))
  }

  function calcOpcaoCusto(opcao: OpcaoLocal) {
    const procs = procedimentos.filter(p => opcao.procedimento_ids.includes(p.id))
    let custo = 0, tabela = 0
    procs.forEach(p => {
      tabela += p.preco_tabela
      p.procedimento_insumos.forEach(pi => {
        const ins = pi.insumos
        const cu = ins.dysport_conversao ? ins.custo_atual * ins.fator_conversao : ins.custo_atual
        custo += cu * pi.quantidade
      })
    })
    return { custo, tabela }
  }

  async function salvar(status: 'rascunho' | 'pendente') {
    setError('')
    const hasContent = opcoes.some(o =>
      o.modo === 'procedimentos' ? o.procedimento_ids.length > 0 : o.protocolo_id !== null
    )
    if (!hasContent) { setError('Selecione ao menos um procedimento ou protocolo'); return }

    setSaving(true)

    let pacienteId: string

    if (pacienteSelecionado) {
      pacienteId = pacienteSelecionado.id
    } else {
      if (!novoNome.trim()) { setError('Nome do paciente é obrigatório'); setSaving(false); return }
      if (!novoTel.trim()) { setError('Telefone é obrigatório'); setSaving(false); return }

      const { data: existing } = await supabase
        .from('pacientes')
        .select('id')
        .eq('telefone', novoTel.trim())
        .maybeSingle()

      if (existing) {
        pacienteId = existing.id
      } else {
        const { data: np, error: epac } = await supabase
          .from('pacientes')
          .insert({ nome: novoNome.trim(), telefone: novoTel.trim() })
          .select('id')
          .single()
        if (epac || !np) { setError('Erro ao criar paciente'); setSaving(false); return }
        pacienteId = np.id
      }
    }

    const { data: av, error: eav } = await supabase
      .from('avaliacoes')
      .insert({ paciente_id: pacienteId, medica_id: medicaId, status })
      .select('id')
      .single()
    if (eav || !av) { setError('Erro ao criar avaliação'); setSaving(false); return }

    for (const op of opcoes) {
      const hasProcs = op.procedimento_ids.length > 0
      const hasProtocolo = op.modo === 'protocolo' && op.protocolo_id !== null
      if (!hasProcs && !hasProtocolo) continue

      const prot = hasProtocolo ? protocolos.find(p => p.id === op.protocolo_id) : null
      const { data: opcao, error: eopc } = await supabase
        .from('avaliacao_opcoes')
        .insert({
          avaliacao_id: av.id,
          numero_opcao: op.numero,
          preco_negociado: prot ? prot.preco_protocolo : null,
        })
        .select('id')
        .single()
      if (eopc || !opcao) continue

      if (op.procedimento_ids.length > 0) {
        await supabase.from('opcao_procedimentos').insert(
          op.procedimento_ids.map(pid => ({ opcao_id: opcao.id, procedimento_id: pid }))
        )
      }
    }

    setSaving(false)
    router.push(`/avaliacoes/${av.id}`)
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-4"><BackButton href="/avaliacoes" label="Voltar às Avaliações" /></div>
      <PageHeader title="Nova Avaliação" subtitle="Selecione a paciente e os procedimentos" />

      {/* Paciente */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Paciente</CardTitle>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setModoNovo(false); setPacienteSelecionado(null) }}
              className={`text-[11px] font-semibold px-2 py-1 rounded-md ${!modoNovo ? 'bg-[#4f46e5] text-white' : 'text-[#64748b] hover:text-[#0f172a]'}`}
            >
              Buscar
            </button>
            <button
              type="button"
              onClick={() => { setModoNovo(true); setPacienteSelecionado(null) }}
              className={`text-[11px] font-semibold px-2 py-1 rounded-md ${modoNovo ? 'bg-[#4f46e5] text-white' : 'text-[#64748b] hover:text-[#0f172a]'}`}
            >
              Nova
            </button>
          </div>
        </CardHeader>
        <CardBody>
          {!modoNovo ? (
            pacienteSelecionado ? (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#94a3b8] to-[#64748b] flex items-center justify-center text-white text-[12px] font-bold">
                  {pacienteSelecionado.nome[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-[#0f172a]">{pacienteSelecionado.nome}</div>
                  <div className="text-[11px] text-[#64748b]">{pacienteSelecionado.telefone}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setPacienteSelecionado(null)}
                  className="text-[11px] text-[#64748b] hover:text-[#0f172a]"
                >
                  Trocar
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  placeholder="Buscar por nome ou telefone..."
                  className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8] placeholder:text-[#94a3b8] mb-2"
                />
                <div className="divide-y divide-[#f1f5f9] border border-[#e2e8f0] rounded-lg overflow-hidden">
                  {pacientesFiltrados.length === 0 ? (
                    <div className="px-3 py-4 text-[12px] text-[#64748b] text-center">
                      Nenhuma paciente encontrada.{' '}
                      <button type="button" onClick={() => setModoNovo(true)} className="text-[#0f172a] font-semibold hover:underline">
                        Cadastrar nova →
                      </button>
                    </div>
                  ) : (
                    pacientesFiltrados.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPacienteSelecionado(p)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#f8fafc] transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#94a3b8] to-[#64748b] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                          {p.nome[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-[12px] font-semibold text-[#0f172a]">{p.nome}</div>
                          <div className="text-[10px] text-[#64748b]">{p.telefone}</div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">Nome *</label>
                <input
                  type="text"
                  value={novoNome}
                  onChange={e => setNovoNome(e.target.value)}
                  placeholder="Nome completo"
                  className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8] placeholder:text-[#94a3b8]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">WhatsApp *</label>
                <input
                  type="tel"
                  value={novoTel}
                  onChange={e => setNovoTel(e.target.value)}
                  placeholder="(86) 99999-9999"
                  className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8] placeholder:text-[#94a3b8]"
                />
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Opções */}
      {opcoes.map(opcao => {
        const protSelecionado = opcao.modo === 'protocolo' && opcao.protocolo_id
          ? protocolos.find(p => p.id === opcao.protocolo_id) ?? null
          : null
        const { custo, tabela } = calcOpcaoCusto(opcao)
        return (
          <Card key={opcao.numero} className="mb-3">
            <CardHeader>
              <CardTitle>Opção {opcao.numero}</CardTitle>
              <div className="flex items-center gap-3">
                {(custo > 0 || protSelecionado) && (
                  <span className="text-[11px] text-[#64748b]">
                    {protSelecionado ? (
                      <>Protocolo: <strong className="text-[#0f172a]">{fmt(protSelecionado.preco_protocolo)}</strong></>
                    ) : (
                      <>
                        Custo: <strong className="text-[#0f172a]">{fmt(custo)}</strong>
                        {tabela > 0 && <> · Tabela: <strong className="text-[#0f172a]">{fmt(tabela)}</strong></>}
                      </>
                    )}
                  </span>
                )}
                {opcoes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeOpcao(opcao.numero)}
                    className="text-[11px] text-[#8B1A1A] hover:underline"
                  >
                    Remover
                  </button>
                )}
              </div>
            </CardHeader>
            <CardBody>
              {/* Toggle de modo */}
              <div className="flex gap-1 mb-3 bg-[#f8fafc] rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setModo(opcao.numero, 'procedimentos')}
                  className={`flex-1 py-1.5 text-[11px] font-semibold rounded-md transition-all ${
                    opcao.modo === 'procedimentos'
                      ? 'bg-white text-[#0f172a] shadow-sm'
                      : 'text-[#64748b] hover:text-[#0f172a]'
                  }`}
                >
                  Procedimentos
                </button>
                {protocolos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setModo(opcao.numero, 'protocolo')}
                    className={`flex-1 py-1.5 text-[11px] font-semibold rounded-md transition-all ${
                      opcao.modo === 'protocolo'
                        ? 'bg-white text-[#0f172a] shadow-sm'
                        : 'text-[#64748b] hover:text-[#0f172a]'
                    }`}
                  >
                    Protocolo
                  </button>
                )}
              </div>

              {opcao.modo === 'procedimentos' ? (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {procedimentos.map(p => (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 py-1.5 px-2 cursor-pointer hover:bg-[#f8fafc] rounded-lg"
                    >
                      <input
                        type="checkbox"
                        checked={opcao.procedimento_ids.includes(p.id)}
                        onChange={() => toggleProc(opcao.numero, p.id)}
                        className="accent-[#3730a3] w-3.5 h-3.5"
                      />
                      <span className="text-[13px] text-[#0f172a] flex-1">{p.nome}</span>
                      {p.preco_tabela > 0 && (
                        <span className="text-[11px] text-[#64748b]">{fmt(p.preco_tabela)}</span>
                      )}
                    </label>
                  ))}
                </div>
              ) : protSelecionado ? (
                <div className="border border-[#e2e8f0] rounded-xl p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-[13px] font-bold text-[#0f172a]">{protSelecionado.nome}</div>
                      <div className="text-[10px] text-[#94a3b8]">
                        {protSelecionado.protocolo_template_procs.length} procedimento(s)
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[15px] font-bold text-[#0f172a]">{fmt(protSelecionado.preco_protocolo)}</div>
                      {protSelecionado.preco_tabela > 0 && (
                        <div className="text-[10px] text-[#94a3b8] line-through">{fmt(protSelecionado.preco_tabela)}</div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1 mb-3">
                    {protSelecionado.protocolo_template_procs.map(pp => {
                      const proc = procedimentos.find(p => p.id === pp.procedimento_id)
                      return proc ? (
                        <div key={pp.procedimento_id} className="flex items-center justify-between px-2 py-1 bg-[#f8fafc] rounded-lg">
                          <span className="text-[11px] text-[#475569]">{proc.nome}</span>
                          {proc.preco_tabela > 0 && <span className="text-[10px] text-[#94a3b8]">{fmt(proc.preco_tabela)}</span>}
                        </div>
                      ) : null
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpcoes(opcoes.map(o => o.numero !== opcao.numero ? o : { ...o, protocolo_id: null, procedimento_ids: [] }))}
                    className="text-[11px] text-[#64748b] hover:text-[#0f172a] underline"
                  >
                    Trocar protocolo
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {protocolos.map(prot => (
                    <button
                      key={prot.id}
                      type="button"
                      onClick={() => selecionarProtocolo(opcao.numero, prot.id)}
                      className="w-full flex items-center justify-between px-3 py-2.5 border border-[#e2e8f0] rounded-xl hover:border-[#94a3b8] hover:bg-[#f8fafc] transition-all text-left"
                    >
                      <div>
                        <div className="text-[12px] font-semibold text-[#0f172a]">{prot.nome}</div>
                        <div className="text-[10px] text-[#94a3b8]">{prot.protocolo_template_procs.length} procedimento(s)</div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-[13px] font-bold text-[#0f172a]">{fmt(prot.preco_protocolo)}</div>
                        {prot.preco_tabela > 0 && (
                          <div className="text-[10px] text-[#94a3b8] line-through">{fmt(prot.preco_tabela)}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        )
      })}

      {opcoes.length < 3 && (
        <button
          type="button"
          onClick={addOpcao}
          className="w-full border-2 border-dashed border-[#e2e8f0] rounded-xl py-3 text-[13px] text-[#64748b] hover:border-[#94a3b8] hover:text-[#0f172a] mb-4 transition-colors"
        >
          + Adicionar Opção {opcoes.length + 1}
        </button>
      )}

      {error && (
        <p className="text-[12px] text-[#8B1A1A] bg-[#FEF0EE] border border-[#FECACA] rounded-lg px-3 py-2 mb-3">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => salvar('rascunho')} disabled={saving}>
          Salvar Rascunho
        </Button>
        <Button onClick={() => salvar('pendente')} disabled={saving}>
          {saving ? 'Salvando...' : 'Enviar para Comercial'}
        </Button>
      </div>
    </div>
  )
}
