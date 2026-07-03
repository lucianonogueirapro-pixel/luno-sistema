'use client'
import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { BackButton } from '@/components/ui/BackButton'
import {
  Save, AlertCircle, CheckCircle2, Loader2, Plus, Trash2,
  ChevronUp, ChevronDown, GripVertical, Pencil, Check, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const CAMPOS_PADRAO = [
  { secao: 'Dados Pessoais', label: 'CPF', tipo: 'texto' },
  { secao: 'Dados Pessoais', label: 'RG', tipo: 'texto' },
  { secao: 'Dados Pessoais', label: 'Profissão', tipo: 'texto' },
  { secao: 'Dados Pessoais', label: 'Estado Civil', tipo: 'seleção' },
  { secao: 'Dados Pessoais', label: 'Endereço', tipo: 'texto' },
  { secao: 'Dados Pessoais', label: 'Bairro / Cidade / CEP', tipo: 'texto' },
  { secao: 'Informações Relevantes', label: 'Tratamento estético anterior?', tipo: 'sim/não' },
  { secao: 'Informações Relevantes', label: 'Utilização de cosméticos?', tipo: 'sim/não' },
  { secao: 'Informações Relevantes', label: 'Lentes de contato?', tipo: 'sim/não' },
  { secao: 'Informações Relevantes', label: 'Exposição ao sol?', tipo: 'sim/não' },
  { secao: 'Informações Relevantes', label: 'Filtro solar?', tipo: 'sim/não' },
  { secao: 'Informações Relevantes', label: 'Tabagismo?', tipo: 'sim/não' },
  { secao: 'Informações Relevantes', label: 'Bebida alcoólica?', tipo: 'seleção' },
  { secao: 'Informações Relevantes', label: 'Qualidade do sono?', tipo: 'seleção' },
  { secao: 'Informações Relevantes', label: 'Alimentação?', tipo: 'seleção' },
  { secao: 'Informações Relevantes', label: 'Atividade física?', tipo: 'sim/não' },
  { secao: 'Informações Relevantes', label: 'Anticoncepcional?', tipo: 'sim/não' },
  { secao: 'Informações Relevantes', label: 'Última menstruação', tipo: 'texto' },
  { secao: 'Informações Relevantes', label: 'Gestante?', tipo: 'sim/não' },
  { secao: 'Informações Relevantes', label: 'Gestações anteriores?', tipo: 'sim/não' },
  { secao: 'Informações Relevantes', label: 'Funcionamento intestinal?', tipo: 'seleção' },
  { secao: 'Tratamentos Estéticos / Cirúrgicos', label: 'Preenchimento com PMMA?', tipo: 'sim/não' },
  { secao: 'Tratamentos Estéticos / Cirúrgicos', label: 'Implante dentário?', tipo: 'sim/não' },
  { secao: 'Tratamentos Estéticos / Cirúrgicos', label: 'Cirurgia plástica estética?', tipo: 'sim/não' },
  { secao: 'Tratamentos Estéticos / Cirúrgicos', label: 'Cirurgia reparadora?', tipo: 'sim/não' },
  { secao: 'Tratamentos Estéticos / Cirúrgicos', label: 'Tratamento dermatológico / estético?', tipo: 'sim/não' },
  { secao: 'Histórico Clínico', label: 'Tratamento médico atual?', tipo: 'sim/não' },
  { secao: 'Histórico Clínico', label: 'Antecedentes alérgicos?', tipo: 'sim/não' },
  { secao: 'Histórico Clínico', label: 'Portador de marcapasso?', tipo: 'sim/não' },
  { secao: 'Histórico Clínico', label: 'Alterações cardíacas?', tipo: 'sim/não' },
  { secao: 'Histórico Clínico', label: 'Hipo / Hipertensão arterial?', tipo: 'sim/não' },
  { secao: 'Histórico Clínico', label: 'Distúrbio circulatório?', tipo: 'sim/não' },
  { secao: 'Histórico Clínico', label: 'Epilepsia / Convulsões?', tipo: 'sim/não' },
  { secao: 'Histórico Clínico', label: 'Estresse?', tipo: 'sim/não' },
  { secao: 'Histórico Clínico', label: 'Antecedentes oncológicos?', tipo: 'sim/não' },
  { secao: 'Histórico Clínico', label: 'Diabetes?', tipo: 'sim/não' },
  { secao: 'Histórico Clínico', label: 'Alterações psicológicas / psiquiátricas?', tipo: 'sim/não' },
  { secao: 'Histórico Clínico', label: 'Alguma outra doença?', tipo: 'sim/não' },
  { secao: 'Autorizações', label: 'Autoriza registro fotográfico', tipo: 'checkbox' },
  { secao: 'Autorizações', label: 'Autoriza uso para marketing', tipo: 'checkbox' },
]

interface Campo {
  id: string
  label: string
  tipo: string
  secao: string
  obrigatorio?: boolean
}

function uid() { return crypto.randomUUID() }

function secoesDe(campos: Campo[]) {
  const seen = new Set<string>()
  const order: string[] = []
  for (const c of campos) {
    if (!seen.has(c.secao)) { seen.add(c.secao); order.push(c.secao) }
  }
  return order
}

export default function ConfigAnamnesePage() {
  const [campos, setCampos] = useState<Campo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [editandoSecao, setEditandoSecao] = useState<Record<string, string>>({})
  const [confirmDeleteSecao, setConfirmDeleteSecao] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    async function carregar() {
      try {
        const { data } = await supabase.from('anamnese_config').select('campos_extras').limit(1).single()
        const raw = data?.campos_extras
        if (raw && typeof raw === 'object' && !Array.isArray(raw) && (raw as { version?: number }).version === 2) {
          setCampos((raw as { campos: Campo[] }).campos)
        } else if (Array.isArray(raw) && raw.length > 0) {
          const extras = raw as Campo[]
          setCampos([
            ...CAMPOS_PADRAO.map(c => ({ id: uid(), ...c })),
            ...extras,
          ])
        } else {
          setCampos(CAMPOS_PADRAO.map(c => ({ id: uid(), ...c })))
        }
      } catch {
        setCampos(CAMPOS_PADRAO.map(c => ({ id: uid(), ...c })))
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [])

  const salvar = useCallback(async () => {
    setSalvando(true)
    setMsg(null)
    try {
      const supabase = createClient()
      const { data: existing } = await supabase.from('anamnese_config').select('id').limit(1).single()
      const payload = { campos_extras: { version: 2, campos } }
      if (existing?.id) {
        await supabase.from('anamnese_config').update(payload).eq('id', existing.id)
      } else {
        await supabase.from('anamnese_config').insert(payload)
      }
      setMsg({ tipo: 'ok', texto: 'Configuração salva.' })
    } catch {
      setMsg({ tipo: 'erro', texto: 'Erro ao salvar.' })
    } finally {
      setSalvando(false)
    }
  }, [campos])

  // ── operações de campo ──

  function moveField(id: string, dir: -1 | 1) {
    setCampos(prev => {
      const idx = prev.findIndex(c => c.id === id)
      if (idx < 0) return prev
      const target = idx + dir
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }

  function updateField(id: string, patch: Partial<Campo>) {
    setCampos(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
  }

  function deleteField(id: string) {
    setCampos(prev => prev.filter(c => c.id !== id))
  }

  function addField(secao: string) {
    const newField: Campo = { id: uid(), label: '', tipo: 'texto', secao }
    setCampos(prev => {
      const lastIdx = [...prev].reverse().findIndex(c => c.secao === secao)
      if (lastIdx < 0) return [...prev, newField]
      const insertAt = prev.length - lastIdx
      const next = [...prev]
      next.splice(insertAt, 0, newField)
      return next
    })
  }

  function addSecao() {
    const nome = `Nova Seção ${secoesDe(campos).length + 1}`
    setCampos(prev => [...prev, { id: uid(), label: '', tipo: 'texto', secao: nome }])
  }

  // ── operações de seção ──

  function renameSecao(oldName: string, newName: string) {
    if (!newName.trim() || newName === oldName) return
    setCampos(prev => prev.map(c => c.secao === oldName ? { ...c, secao: newName.trim() } : c))
  }

  function deleteSecao(nome: string) {
    setCampos(prev => prev.filter(c => c.secao !== nome))
    setConfirmDeleteSecao(null)
  }

  function moveSecao(nome: string, dir: -1 | 1) {
    setCampos(prev => {
      const secoes = secoesDe(prev)
      const si = secoes.indexOf(nome)
      const ti = si + dir
      if (ti < 0 || ti >= secoes.length) return prev
      const target = secoes[ti]
      // Extrair campos de cada seção na nova ordem
      const blocos: Record<string, Campo[]> = {}
      for (const s of secoes) blocos[s] = prev.filter(c => c.secao === s)
      const newOrder = [...secoes]
      ;[newOrder[si], newOrder[ti]] = [newOrder[ti], newOrder[si]]
      return newOrder.flatMap(s => blocos[s])
    })
  }

  if (carregando) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={20} className="animate-spin text-[#94a3b8]" />
    </div>
  )

  const secoes = secoesDe(campos)

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Anamnese"
        subtitle={`${campos.length} campos`}
        action={
          <button
            onClick={salvar}
            disabled={salvando}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#4f46e5] text-white text-[12px] rounded-lg hover:bg-[#374151] disabled:opacity-50 transition-colors"
          >
            {salvando ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Salvar
          </button>
        }
      />

      <div className="flex-1 overflow-auto px-6 py-5">
        <div className="max-w-2xl space-y-4">
          <BackButton href="/configuracoes" label="Voltar às Configurações" />

          {msg && (
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[12px] border ${
              msg.tipo === 'ok' ? 'bg-[#DCFCE7] border-[#86EFAC] text-[#166534]' : 'bg-[#FEE2E2] border-[#FCA5A5] text-[#8B1A1A]'
            }`}>
              {msg.tipo === 'ok' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {msg.texto}
            </div>
          )}

          {secoes.map((secao, si) => {
            const camposDaSecao = campos.filter(c => c.secao === secao)
            const editando = editandoSecao[secao] !== undefined
            return (
              <div key={secao} className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
                {/* Header da seção */}
                <div className="bg-[#f8fafc] border-b border-[#e2e8f0] px-4 py-2.5 flex items-center gap-2">
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveSecao(secao, -1)}
                      disabled={si === 0}
                      className="text-[#94a3b8] hover:text-[#475569] disabled:opacity-20 transition-colors"
                    >
                      <ChevronUp size={13} />
                    </button>
                    <button
                      onClick={() => moveSecao(secao, 1)}
                      disabled={si === secoes.length - 1}
                      className="text-[#94a3b8] hover:text-[#475569] disabled:opacity-20 transition-colors"
                    >
                      <ChevronDown size={13} />
                    </button>
                  </div>

                  {editando ? (
                    <div className="flex items-center gap-1.5 flex-1">
                      <input
                        autoFocus
                        type="text"
                        value={editandoSecao[secao]}
                        onChange={e => setEditandoSecao(p => ({ ...p, [secao]: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            renameSecao(secao, editandoSecao[secao])
                            setEditandoSecao(p => { const n = { ...p }; delete n[secao]; return n })
                          }
                          if (e.key === 'Escape') setEditandoSecao(p => { const n = { ...p }; delete n[secao]; return n })
                        }}
                        className="flex-1 text-[12px] font-semibold text-[#0f172a] bg-white border border-[#94a3b8] rounded px-2 py-0.5 focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          renameSecao(secao, editandoSecao[secao])
                          setEditandoSecao(p => { const n = { ...p }; delete n[secao]; return n })
                        }}
                        className="text-[#22c55e] hover:text-[#16a34a]"
                      >
                        <Check size={13} />
                      </button>
                      <button
                        onClick={() => setEditandoSecao(p => { const n = { ...p }; delete n[secao]; return n })}
                        className="text-[#94a3b8] hover:text-[#475569]"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <span className="flex-1 text-[11px] font-bold text-[#475569] uppercase tracking-wide">{secao}</span>
                  )}

                  {!editando && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditandoSecao(p => ({ ...p, [secao]: secao }))}
                        className="text-[#94a3b8] hover:text-[#475569] transition-colors"
                        title="Renomear seção"
                      >
                        <Pencil size={12} />
                      </button>
                      {confirmDeleteSecao === secao ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-red-600">Excluir {camposDaSecao.length} campo(s)?</span>
                          <button onClick={() => deleteSecao(secao)} className="text-[10px] text-red-600 font-bold hover:underline">Sim</button>
                          <button onClick={() => setConfirmDeleteSecao(null)} className="text-[10px] text-[#94a3b8] hover:underline">Não</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteSecao(secao)}
                          className="text-[#94a3b8] hover:text-red-500 transition-colors"
                          title="Excluir seção"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Campos da seção */}
                <div className="divide-y divide-[#f1f5f9]">
                  {camposDaSecao.map(campo => {
                    const globalIdx = campos.findIndex(c => c.id === campo.id)
                    const secaoIdx = camposDaSecao.findIndex(c => c.id === campo.id)
                    return (
                      <div key={campo.id} className="flex items-center gap-2 px-3 py-2">
                        <GripVertical size={13} className="text-[#cbd5e1] flex-shrink-0" />

                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => moveField(campo.id, -1)}
                            disabled={secaoIdx === 0}
                            className="text-[#cbd5e1] hover:text-[#475569] disabled:opacity-20 transition-colors"
                          >
                            <ChevronUp size={11} />
                          </button>
                          <button
                            onClick={() => moveField(campo.id, 1)}
                            disabled={secaoIdx === camposDaSecao.length - 1}
                            className="text-[#cbd5e1] hover:text-[#475569] disabled:opacity-20 transition-colors"
                          >
                            <ChevronDown size={11} />
                          </button>
                        </div>

                        <input
                          type="text"
                          value={campo.label}
                          onChange={e => updateField(campo.id, { label: e.target.value })}
                          placeholder="Nome do campo"
                          className="flex-1 min-w-0 text-[12px] text-[#0f172a] border border-transparent hover:border-[#e2e8f0] focus:border-[#94a3b8] rounded px-2 py-1 focus:outline-none bg-transparent focus:bg-white transition-colors"
                        />

                        <select
                          value={campo.tipo}
                          onChange={e => updateField(campo.id, { tipo: e.target.value })}
                          className="text-[11px] border border-[#e2e8f0] rounded px-1.5 py-1 text-[#475569] bg-white focus:outline-none focus:border-[#94a3b8] flex-shrink-0"
                        >
                          <option value="texto">Texto</option>
                          <option value="texto longo">Texto longo</option>
                          <option value="sim/não">Sim / Não</option>
                          <option value="seleção">Seleção</option>
                          <option value="checkbox">Checkbox</option>
                        </select>

                        <select
                          value={campo.secao}
                          onChange={e => updateField(campo.id, { secao: e.target.value })}
                          className="text-[11px] border border-[#e2e8f0] rounded px-1.5 py-1 text-[#475569] bg-white focus:outline-none focus:border-[#94a3b8] flex-shrink-0 max-w-[120px]"
                        >
                          {secoes.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>

                        <button
                          onClick={() => deleteField(campo.id)}
                          className="text-[#cbd5e1] hover:text-red-500 transition-colors flex-shrink-0"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )
                  })}
                </div>

                {/* Adicionar campo */}
                <div className="px-4 py-2.5 border-t border-[#f1f5f9]">
                  <button
                    onClick={() => addField(secao)}
                    className="flex items-center gap-1 text-[11px] text-[#94a3b8] hover:text-[#475569] transition-colors"
                  >
                    <Plus size={12} />
                    Adicionar campo
                  </button>
                </div>
              </div>
            )
          })}

          {/* Nova seção */}
          <button
            onClick={addSecao}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[#e2e8f0] rounded-xl text-[12px] text-[#94a3b8] hover:border-[#94a3b8] hover:text-[#475569] transition-colors"
          >
            <Plus size={14} />
            Nova seção
          </button>
        </div>
      </div>
    </div>
  )
}
