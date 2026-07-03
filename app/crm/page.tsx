'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEmpresaId } from '@/context/EmpresaContext'
import Link from 'next/link'
import {
  Plus, Phone, MessageSquare, Search, Tag,
  Star, Calendar, TrendingUp, Users, ChevronRight, X, Pencil, Save, Trash2,
} from 'lucide-react'
import {
  DndContext, DragOverlay, closestCorners,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { useDroppable, useDraggable } from '@dnd-kit/core'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

// ── Pipeline de leads ──────────────────────────────────────────────
type LeadStatus = 'novo' | 'contato' | 'proposta' | 'agendado' | 'fechado' | 'perdido'

interface Lead {
  id: string
  status: LeadStatus
  obs: string | null
  created_at: string
  clientes: { id: string; nome: string; telefone: string } | null
  avaliacao_opcoes: { preco_negociado: number | null }[]
  origem: 'avaliacao' | 'whatsapp'
  telefone?: string
  nome?: string
  clienteId?: string
}

const STAGES: { key: LeadStatus; label: string; color: string; bg: string }[] = [
  { key: 'novo',     label: 'Novo',       color: '#64748b', bg: '#f1f5f9' },
  { key: 'contato',  label: 'Em contato', color: '#0ea5e9', bg: '#e0f2fe' },
  { key: 'proposta', label: 'Proposta',   color: '#8b5cf6', bg: '#ede9fe' },
  { key: 'agendado', label: 'Agendado',   color: '#f59e0b', bg: '#fef3c7' },
  { key: 'fechado',  label: 'Fechado',    color: '#10b981', bg: '#d1fae5' },
  { key: 'perdido',  label: 'Perdido',    color: '#ef4444', bg: '#fee2e2' },
]

function mapAvalStatus(s: string): LeadStatus {
  if (s === 'rascunho' || s === 'pendente') return 'contato'
  if (s === 'em_negociacao') return 'proposta'
  if (s === 'fechado') return 'fechado'
  if (s === 'perdido') return 'perdido'
  return 'contato'
}

function mapWaStatus(s: string): LeadStatus {
  if (s === 'novo') return 'novo'
  if (s === 'agendado') return 'agendado'
  if (s === 'fechado') return 'fechado'
  return 'contato'
}

// ── Base de clientes ───────────────────────────────────────────────
interface ClienteCRM {
  id: string
  nome: string
  telefone: string
  email: string | null
  canal_aquisicao: string | null
  data_nascimento: string | null
  obs: string | null
  created_at: string
  totalGasto?: number
  ultimaCompra?: string | null
  totalAtend?: number
  tags?: string[]
}

const CANAL_CORES: Record<string, { color: string; bg: string }> = {
  instagram:  { color: '#ec4899', bg: '#fdf2f8' },
  indicacao:  { color: '#8b5cf6', bg: '#ede9fe' },
  google:     { color: '#0ea5e9', bg: '#e0f2fe' },
  anuncios:   { color: '#f59e0b', bg: '#fef3c7' },
  whatsapp:   { color: '#10b981', bg: '#d1fae5' },
  outros:     { color: '#64748b', bg: '#f1f5f9' },
}

function canalLabel(c: string | null) {
  const labels: Record<string, string> = {
    instagram: 'Instagram', indicacao: 'Indicação', google: 'Google',
    anuncios: 'Anúncios', whatsapp: 'WhatsApp', outros: 'Outros',
  }
  return c ? (labels[c] ?? c) : null
}

// ── Componentes DnD ────────────────────────────────────────────────

function LeadCardPreview({ lead, fmt }: { lead: Lead; fmt: (v: number) => string }) {
  const nome = lead.clientes?.nome ?? lead.nome ?? 'Sem nome'
  const telefone = lead.clientes?.telefone ?? lead.telefone ?? ''
  const precos = lead.avaliacao_opcoes.map(o => o.preco_negociado ?? 0)
  const valor = precos.length ? Math.max(...precos) : 0
  return (
    <div className="bg-white border-2 border-[#4f46e5] rounded-xl p-3 shadow-2xl w-56 opacity-95 rotate-2">
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#94a3b8] to-[#64748b] flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
          {nome[0]?.toUpperCase() ?? '?'}
        </div>
        <span className="text-[12px] font-semibold text-[#0f172a] truncate">{nome}</span>
        {lead.origem === 'whatsapp' && <MessageSquare size={10} className="text-[#25D366] flex-shrink-0" />}
      </div>
      {telefone && (
        <div className="text-[10px] text-[#94a3b8] flex items-center gap-1">
          <Phone size={9} />{telefone}
        </div>
      )}
      {valor > 0 && <div className="text-[11px] font-bold text-[#4f46e5] mt-1">{fmt(valor)}</div>}
    </div>
  )
}

function LeadCard({ lead, fmt }: { lead: Lead; fmt: (v: number) => string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id })
  const nome = lead.clientes?.nome ?? lead.nome ?? 'Sem nome'
  const telefone = lead.clientes?.telefone ?? lead.telefone ?? ''
  const precos = lead.avaliacao_opcoes.map(o => o.preco_negociado ?? 0)
  const valor = precos.length ? Math.max(...precos) : 0
  const rawId = lead.id.replace('av-', '').replace('wa-', '')
  const href = lead.origem === 'avaliacao'
    ? (lead.clienteId ? `/pacientes/${lead.clienteId}` : `/avaliacoes/${rawId}`)
    : `/atendimento`

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
        opacity: isDragging ? 0.3 : 1,
        cursor: 'grab',
      }}
      className="bg-white border border-[#e2e8f0] rounded-xl p-3 shadow-sm touch-none select-none"
    >
      <div className="flex items-start justify-between gap-1.5 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#94a3b8] to-[#64748b] flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
            {nome[0]?.toUpperCase() ?? '?'}
          </div>
          <span className="text-[12px] font-semibold text-[#0f172a] truncate">{nome}</span>
        </div>
        {lead.origem === 'whatsapp' && <MessageSquare size={10} className="text-[#25D366] flex-shrink-0" />}
      </div>
      {telefone && (
        <div className="text-[10px] text-[#94a3b8] flex items-center gap-1 mb-1.5">
          <Phone size={9} />{telefone}
        </div>
      )}
      <div className="flex items-center justify-between gap-1 mt-1">
        {valor > 0 ? <span className="text-[11px] font-bold text-[#4f46e5]">{fmt(valor)}</span> : <span />}
        <Link
          href={href}
          onClick={e => e.stopPropagation()}
          className="text-[#94a3b8] hover:text-[#0f172a]"
          style={{ cursor: 'pointer' }}
          draggable={false}
        >
          <ChevronRight size={13} />
        </Link>
      </div>
    </div>
  )
}

function CrmColumn({
  stage, leads, valor, fmt,
}: {
  stage: typeof STAGES[number]
  leads: Lead[]
  valor: number
  fmt: (v: number) => string
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.key })
  return (
    <div className="w-64 flex-shrink-0 flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 rounded-xl mb-2" style={{ backgroundColor: stage.bg }}>
        <span className="text-[11px] font-bold" style={{ color: stage.color }}>{stage.label}</span>
        <span className="text-[10px] font-semibold" style={{ color: stage.color }}>
          {leads.length}{valor > 0 ? ` · ${fmt(valor)}` : ''}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className="flex flex-col gap-2 flex-1 rounded-xl p-1 min-h-[120px] transition-colors"
        style={{ backgroundColor: isOver ? `${stage.color}15` : 'transparent' }}
      >
        {leads.length === 0 && (
          <div className="border-2 border-dashed rounded-xl py-5 text-center text-[10px] transition-colors"
            style={{
              borderColor: isOver ? stage.color : '#e2e8f0',
              color: isOver ? stage.color : '#94a3b8',
            }}
          >
            solte aqui
          </div>
        )}
        {leads.map(lead => (
          <LeadCard key={lead.id} lead={lead} fmt={fmt} />
        ))}
      </div>
    </div>
  )
}

export default function CrmPage() {
  const empresaId = useEmpresaId()
  const supabase = useMemo(() => createClient(), [])
  const [aba, setAba] = useState<'pipeline' | 'clientes'>('pipeline')

  // Pipeline state
  const [leads, setLeads] = useState<Lead[]>([])
  const [filtroStage, setFiltroStage] = useState<LeadStatus | 'todos'>('todos')
  const [buscaPipeline, setBuscaPipeline] = useState('')
  const [addModal, setAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ nome: '', telefone: '', canal: 'direto', obs: '' })
  const [addSaving, setAddSaving] = useState(false)

  // Edição de cliente
  const [editCliente, setEditCliente] = useState<ClienteCRM | null>(null)
  const [editForm, setEditForm] = useState({ nome: '', telefone: '', email: '', canal_aquisicao: '', data_nascimento: '', obs: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [confirmExcluir, setConfirmExcluir] = useState(false)

  function abrirEdicao(c: ClienteCRM) {
    setEditCliente(c)
    setEditForm({
      nome: c.nome,
      telefone: c.telefone ?? '',
      email: c.email ?? '',
      canal_aquisicao: c.canal_aquisicao ?? 'outros',
      data_nascimento: c.data_nascimento ?? '',
      obs: c.obs ?? '',
    })
    setConfirmExcluir(false)
  }

  async function salvarEdicao() {
    if (!editCliente) return
    setEditSaving(true)
    await supabase.from('clientes').update({
      nome: editForm.nome.trim(),
      telefone: editForm.telefone.trim(),
      email: editForm.email.trim() || null,
      canal_aquisicao: editForm.canal_aquisicao || null,
      data_nascimento: editForm.data_nascimento || null,
      obs: editForm.obs.trim() || null,
    }).eq('id', editCliente.id)
    setEditSaving(false)
    setEditCliente(null)
    loadClientes()
  }

  async function excluirCliente() {
    if (!editCliente) return
    await supabase.from('clientes').delete().eq('id', editCliente.id)
    setEditCliente(null)
    loadClientes()
  }

  // Clientes state
  const [clientes, setClientes] = useState<ClienteCRM[]>([])
  const [buscaClientes, setBuscaClientes] = useState('')
  const [filtroCanal, setFiltroCanal] = useState<string | 'todos'>('todos')
  const [filtroRapido, setFiltroRapido] = useState<'todos' | 'aniversariantes' | 'inativos' | 'semcompra' | 'topltv'>('todos')
  const [sortClientes, setSortClientes] = useState<'recentes' | 'ltv' | 'ultima' | 'nome'>('recentes')
  const [pipelineView, setPipelineView] = useState<'lista' | 'kanban'>('kanban')
  const [activeLead, setActiveLead] = useState<Lead | null>(null)
  const [clientesView, setClientesView] = useState<'lista' | 'ciclo'>('lista')

  const [loading, setLoading] = useState(true)

  const mesAtual = new Date().getMonth() + 1
  const limiteInativo = useMemo(() => new Date(Date.now() - 60 * 24 * 3600_000).toISOString(), [])

  const aniversariantes = useMemo(() =>
    clientes.filter(c => {
      if (!c.data_nascimento) return false
      const mes = new Date(c.data_nascimento + 'T12:00:00').getMonth() + 1
      return mes === mesAtual
    }),
  [clientes, mesAtual])

  const inativos = useMemo(() =>
    clientes.filter(c => (c.totalGasto ?? 0) > 0 && (!c.ultimaCompra || c.ultimaCompra < limiteInativo)),
  [clientes, limiteInativo])

  const semNenhumaCompra = useMemo(() =>
    clientes.filter(c => !c.totalGasto || c.totalGasto === 0),
  [clientes])

  async function loadPipeline() {
    const [{ data: avs }, { data: was }] = await Promise.all([
      supabase
        .from('avaliacoes')
        .select('id, status, obs, created_at, clientes(id, nome, telefone), avaliacao_opcoes(preco_negociado)')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('wa_conversas')
        .select('id, status, nome, telefone, created_at')
        .not('status', 'in', '("fechado","perdido")')
        .order('created_at', { ascending: false })
        .limit(100),
    ])

    const avalLeads: Lead[] = (avs ?? []).map((a: any) => ({
      id: `av-${a.id}`,
      status: mapAvalStatus(a.status),
      obs: a.obs,
      created_at: a.created_at,
      clientes: a.clientes,
      avaliacao_opcoes: a.avaliacao_opcoes ?? [],
      origem: 'avaliacao' as const,
      clienteId: a.clientes?.id,
    }))

    const waLeads: Lead[] = (was ?? []).map((w: any) => ({
      id: `wa-${w.id}`,
      status: mapWaStatus(w.status),
      obs: null,
      created_at: w.created_at,
      clientes: null,
      avaliacao_opcoes: [],
      origem: 'whatsapp' as const,
      telefone: w.telefone,
      nome: w.nome,
    }))

    setLeads([...avalLeads, ...waLeads])
  }

  async function loadClientes() {
    const { data: clis } = await supabase
      .from('clientes')
      .select('id, nome, telefone, email, canal_aquisicao, data_nascimento, obs, created_at')
      .order('created_at', { ascending: false })
      .limit(500)

    if (!clis) { setClientes([]); return }

    // Buscar totais de lançamentos por cliente
    const { data: lancs } = await supabase
      .from('lancamentos')
      .select('cliente_id, valor_previsto, created_at')
      .eq('tipo', 'entrada')
      .not('cliente_id', 'is', null)

    const lancsByCliente: Record<string, { total: number; ultima: string }> = {}
    for (const l of lancs ?? []) {
      if (!l.cliente_id) continue
      const prev = lancsByCliente[l.cliente_id]
      const tot = (prev?.total ?? 0) + (l.valor_previsto ?? 0)
      const ult = !prev?.ultima || l.created_at > prev.ultima ? l.created_at : prev.ultima
      lancsByCliente[l.cliente_id] = { total: tot, ultima: ult }
    }

    setClientes(clis.map((c: any) => ({
      ...c,
      totalGasto: lancsByCliente[c.id]?.total ?? 0,
      ultimaCompra: lancsByCliente[c.id]?.ultima ?? null,
    })))
  }

  async function load() {
    setLoading(true)
    await Promise.all([loadPipeline(), loadClientes()])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Realtime: clientes entram no CRM automaticamente
  useEffect(() => {
    const ch = supabase
      .channel('crm-clientes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, payload => {
        if (payload.eventType === 'INSERT') {
          const c = payload.new as any
          setClientes(prev =>
            prev.some(x => x.id === c.id) ? prev : [{ ...c, totalGasto: 0, ultimaCompra: null }, ...prev]
          )
        } else if (payload.eventType === 'UPDATE') {
          setClientes(prev => prev.map(x => x.id === payload.new.id ? { ...x, ...(payload.new as any) } : x))
        } else if (payload.eventType === 'DELETE') {
          setClientes(prev => prev.filter(x => x.id !== (payload.old as any).id))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [supabase, empresaId])

  async function moverStage(leadId: string, novoStatus: LeadStatus) {
    if (leadId.startsWith('av-')) {
      const avId = leadId.replace('av-', '')
      const avStatus = novoStatus === 'proposta' ? 'em_negociacao'
        : novoStatus === 'fechado' ? 'fechado'
        : novoStatus === 'perdido' ? 'perdido'
        : 'pendente'
      await supabase.from('avaliacoes').update({ status: avStatus }).eq('id', avId)
    } else {
      const waId = leadId.replace('wa-', '')
      const waStatus = novoStatus === 'novo' ? 'novo'
        : novoStatus === 'agendado' ? 'agendado'
        : novoStatus === 'fechado' ? 'fechado'
        : 'em_atendimento'
      await supabase.from('wa_conversas').update({ status: waStatus }).eq('id', waId)
    }
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: novoStatus } : l))
  }

  async function addLead() {
    if (!addForm.nome.trim()) return
    setAddSaving(true)
    const telLimpo = addForm.telefone.replace(/\D/g, '')

    let clienteId: string | null = null
    if (telLimpo) {
      const { data: ex } = await supabase
        .from('clientes').select('id').eq('telefone', telLimpo).maybeSingle()
      clienteId = ex?.id ?? null
    }
    if (!clienteId) {
      const { data: nc } = await supabase
        .from('clientes')
        .insert({ empresa_id: empresaId, nome: addForm.nome.trim(), telefone: telLimpo || addForm.nome, canal_aquisicao: addForm.canal !== 'direto' ? addForm.canal : 'outros' })
        .select('id').single()
      clienteId = nc?.id ?? null
    }
    if (clienteId) {
      await supabase.from('avaliacoes').insert({
        empresa_id: empresaId,
        cliente_id: clienteId,
        status: 'pendente',
        obs: addForm.obs.trim() || null,
      })
    }
    setAddSaving(false)
    setAddModal(false)
    setAddForm({ nome: '', telefone: '', canal: 'direto', obs: '' })
    load()
  }

  const leadsVisiveis = useMemo(() => {
    let lista = leads
    if (filtroStage !== 'todos') lista = lista.filter(l => l.status === filtroStage)
    if (buscaPipeline.trim()) {
      const q = buscaPipeline.toLowerCase()
      lista = lista.filter(l => {
        const nome = l.clientes?.nome ?? l.nome ?? ''
        const tel = l.clientes?.telefone ?? l.telefone ?? ''
        return nome.toLowerCase().includes(q) || tel.includes(q)
      })
    }
    return lista
  }, [leads, filtroStage, buscaPipeline])

  const contagemPorStage = useMemo(() => {
    const m: Record<string, number> = {}
    leads.forEach(l => { m[l.status] = (m[l.status] ?? 0) + 1 })
    return m
  }, [leads])

  const clientesVisiveis = useMemo(() => {
    let lista = clientes
    if (filtroCanal !== 'todos') lista = lista.filter(c => c.canal_aquisicao === filtroCanal)
    if (filtroRapido === 'aniversariantes') lista = lista.filter(c => c.data_nascimento && new Date(c.data_nascimento + 'T12:00:00').getMonth() + 1 === mesAtual)
    else if (filtroRapido === 'inativos') lista = lista.filter(c => (c.totalGasto ?? 0) > 0 && (!c.ultimaCompra || c.ultimaCompra < limiteInativo))
    else if (filtroRapido === 'semcompra') lista = lista.filter(c => !c.totalGasto || c.totalGasto === 0)
    else if (filtroRapido === 'topltv') lista = [...lista].sort((a, b) => (b.totalGasto ?? 0) - (a.totalGasto ?? 0)).slice(0, 20)
    if (buscaClientes.trim()) {
      const q = buscaClientes.toLowerCase()
      lista = lista.filter(c =>
        c.nome.toLowerCase().includes(q) || c.telefone?.includes(q) || c.email?.toLowerCase().includes(q)
      )
    }
    lista = [...lista]
    if (sortClientes === 'ltv') lista.sort((a, b) => (b.totalGasto ?? 0) - (a.totalGasto ?? 0))
    else if (sortClientes === 'ultima') lista.sort((a, b) => !a.ultimaCompra ? 1 : !b.ultimaCompra ? -1 : b.ultimaCompra.localeCompare(a.ultimaCompra))
    else if (sortClientes === 'nome') lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    return lista
  }, [clientes, filtroCanal, filtroRapido, buscaClientes, sortClientes, mesAtual, limiteInativo])

  const canaisDistintos = useMemo(() => {
    const s = new Set(clientes.map(c => c.canal_aquisicao).filter(Boolean) as string[])
    return Array.from(s)
  }, [clientes])

  const CICLO_COLS = [
    { id: 'prospect', label: 'Prospect',  color: '#64748b', bg: '#f1f5f9', desc: 'sem compras ainda' },
    { id: 'ativo',    label: 'Ativo',     color: '#10b981', bg: '#ecfdf5', desc: 'última compra < 60d' },
    { id: 'risco',    label: 'Em risco',  color: '#f59e0b', bg: '#fffbeb', desc: 'última compra 60-120d' },
    { id: 'inativo',  label: 'Inativo',   color: '#ef4444', bg: '#fef2f2', desc: '120+ dias sem comprar' },
  ] as const
  type CicloId = (typeof CICLO_COLS)[number]['id']

  const limiteRisco   = useMemo(() => new Date(Date.now() - 60  * 24 * 3600_000).toISOString(), [])
  const limiteInativo2 = useMemo(() => new Date(Date.now() - 120 * 24 * 3600_000).toISOString(), [])

  function getCiclo(c: ClienteCRM): CicloId {
    if (!c.totalGasto || c.totalGasto === 0) return 'prospect'
    if (!c.ultimaCompra) return 'inativo'
    if (c.ultimaCompra >= limiteRisco) return 'ativo'
    if (c.ultimaCompra >= limiteInativo2) return 'risco'
    return 'inativo'
  }

  const clientesPorCiclo = useMemo(() => {
    const map: Record<CicloId, ClienteCRM[]> = { prospect: [], ativo: [], risco: [], inativo: [] }
    clientes.forEach(c => { map[getCiclo(c)].push(c) })
    return map
  }, [clientes, limiteRisco, limiteInativo2])

  const valorPipeline = leads
    .filter(l => l.status !== 'perdido')
    .reduce((s, l) => {
      const precos = l.avaliacao_opcoes.map(o => o.preco_negociado ?? 0)
      return s + (precos.length ? Math.max(...precos) : 0)
    }, 0)

  const totalLTV = clientes.reduce((s, c) => s + (c.totalGasto ?? 0), 0)

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[20px] font-bold text-[#0f172a]">CRM</h1>
          <p className="text-[12px] text-[#64748b] mt-0.5">Gestão completa de clientes e pipeline de vendas</p>
        </div>
        <button
          onClick={() => setAddModal(true)}
          className="flex items-center gap-1.5 bg-[#0f172a] text-white text-[12px] font-semibold px-3 py-2 rounded-lg hover:bg-[#1e293b] transition-colors"
        >
          <Plus size={13} />
          Novo Lead
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-white border border-[#e2e8f0] rounded-xl px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Users size={11} className="text-[#22d3ee]" />
            <div className="text-[10px] text-[#64748b] uppercase tracking-wide">Base de clientes</div>
          </div>
          <div className="text-[20px] font-bold text-[#0f172a]">{clientes.length}</div>
        </div>
        <div className="bg-white border border-[#e2e8f0] rounded-xl px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={11} className="text-[#34d399]" />
            <div className="text-[10px] text-[#64748b] uppercase tracking-wide">Leads ativos</div>
          </div>
          <div className="text-[20px] font-bold text-[#0f172a]">{leads.filter(l => l.status !== 'perdido').length}</div>
        </div>
        <div className="bg-white border border-[#e2e8f0] rounded-xl px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Star size={11} className="text-[#4f46e5]" />
            <div className="text-[10px] text-[#64748b] uppercase tracking-wide">Pipeline (valor)</div>
          </div>
          <div className="text-[16px] font-bold text-[#4f46e5]">{fmt(valorPipeline)}</div>
        </div>
        <div className="bg-white border border-[#e2e8f0] rounded-xl px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Calendar size={11} className="text-[#10b981]" />
            <div className="text-[10px] text-[#64748b] uppercase tracking-wide">LTV total</div>
          </div>
          <div className="text-[16px] font-bold text-[#10b981]">{fmt(totalLTV)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 mb-5 bg-[#f1f5f9] p-1 rounded-xl w-fit">
        <button
          onClick={() => setAba('pipeline')}
          className={`px-4 py-2 rounded-lg text-[12px] font-semibold transition-all ${
            aba === 'pipeline' ? 'bg-white text-[#0f172a] shadow-sm' : 'text-[#64748b] hover:text-[#0f172a]'
          }`}
        >
          Pipeline de vendas
        </button>
        <button
          onClick={() => setAba('clientes')}
          className={`px-4 py-2 rounded-lg text-[12px] font-semibold transition-all ${
            aba === 'clientes' ? 'bg-white text-[#0f172a] shadow-sm' : 'text-[#64748b] hover:text-[#0f172a]'
          }`}
        >
          Base de clientes
        </button>
      </div>

      {/* ── PIPELINE ── */}
      {aba === 'pipeline' && (
        <>
          <div className="flex items-center gap-2 flex-wrap mb-3">
            {pipelineView === 'lista' && (
              <>
                <button
                  onClick={() => setFiltroStage('todos')}
                  className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                    filtroStage === 'todos' ? 'bg-[#0f172a] text-white border-[#0f172a]' : 'text-[#64748b] border-[#e2e8f0] hover:border-[#94a3b8]'
                  }`}
                >
                  Todos ({leads.length})
                </button>
                {STAGES.map(s => (
                  <button
                    key={s.key}
                    onClick={() => setFiltroStage(s.key)}
                    className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-colors"
                    style={filtroStage === s.key
                      ? { backgroundColor: s.color, color: 'white', borderColor: s.color }
                      : { color: '#64748b', borderColor: '#e2e8f0' }
                    }
                  >
                    {s.label}{contagemPorStage[s.key] ? ` (${contagemPorStage[s.key]})` : ''}
                  </button>
                ))}
              </>
            )}
            <div className="ml-auto flex gap-1 bg-[#f1f5f9] p-0.5 rounded-lg flex-shrink-0">
              <button
                onClick={() => setPipelineView('lista')}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all ${pipelineView === 'lista' ? 'bg-white text-[#0f172a] shadow-sm' : 'text-[#94a3b8]'}`}
              >
                Lista
              </button>
              <button
                onClick={() => setPipelineView('kanban')}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all ${pipelineView === 'kanban' ? 'bg-white text-[#0f172a] shadow-sm' : 'text-[#94a3b8]'}`}
              >
                Kanban
              </button>
            </div>
          </div>

          <div className="relative mb-4">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input
              type="text"
              value={buscaPipeline}
              onChange={e => setBuscaPipeline(e.target.value)}
              placeholder="Buscar por nome ou telefone..."
              className="w-full rounded-xl border border-[#e2e8f0] pl-9 pr-3 py-2.5 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8] placeholder:text-[#94a3b8]"
            />
          </div>

          {loading ? (
            <div className="py-20 text-center text-[13px] text-[#64748b]">Carregando...</div>
          ) : pipelineView === 'kanban' ? (
            /* Kanban board com DnD */
            <DndContext
              collisionDetection={closestCorners}
              onDragStart={(e: DragStartEvent) => {
                const lead = leads.find(l => l.id === e.active.id)
                setActiveLead(lead ?? null)
              }}
              onDragEnd={(e: DragEndEvent) => {
                setActiveLead(null)
                const { active, over } = e
                if (!over) return
                const overId = String(over.id)
                const stageKey = STAGES.find(s => s.key === overId)?.key
                  ?? STAGES.find(s => leads.some(l => l.id === overId && l.status === s.key))?.key
                if (stageKey && stageKey !== leads.find(l => l.id === active.id)?.status) {
                  moverStage(String(active.id), stageKey)
                }
              }}
            >
              <div className="overflow-x-auto pb-4">
                <div className="flex gap-3" style={{ minWidth: `${STAGES.length * 256 + (STAGES.length - 1) * 12}px` }}>
                  {STAGES.map(s => {
                    const colLeads = leads.filter(l => l.status === s.key)
                    const colValor = colLeads.reduce((sum, l) => {
                      const p = l.avaliacao_opcoes.map(o => o.preco_negociado ?? 0)
                      return sum + (p.length ? Math.max(...p) : 0)
                    }, 0)
                    return (
                      <CrmColumn key={s.key} stage={s} leads={colLeads} valor={colValor} fmt={fmt} />
                    )
                  })}
                </div>
              </div>
              <DragOverlay>
                {activeLead && <LeadCardPreview lead={activeLead} fmt={fmt} />}
              </DragOverlay>
            </DndContext>
          ) : leadsVisiveis.length === 0 ? (
            <div className="py-16 text-center bg-white border border-[#e2e8f0] rounded-xl">
              <div className="text-[13px] font-semibold text-[#0f172a] mb-1">Nenhum lead encontrado</div>
              <div className="text-[11px] text-[#64748b]">Adicione um lead manualmente ou conecte o WhatsApp.</div>
            </div>
          ) : (
            <div className="space-y-2">
              {leadsVisiveis.map(lead => {
                const stage = STAGES.find(s => s.key === lead.status)!
                const nome = lead.clientes?.nome ?? lead.nome ?? 'Sem nome'
                const telefone = lead.clientes?.telefone ?? lead.telefone ?? ''
                const precos = lead.avaliacao_opcoes.map(o => o.preco_negociado ?? 0)
                const valor = precos.length ? Math.max(...precos) : 0
                const rawId = lead.id.replace('av-', '').replace('wa-', '')
                const href = lead.origem === 'avaliacao'
                  ? (lead.clienteId ? `/pacientes/${lead.clienteId}` : `/avaliacoes/${rawId}`)
                  : `/atendimento`

                return (
                  <div key={lead.id} className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#94a3b8] to-[#64748b] flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0">
                        {nome[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-semibold text-[#0f172a] truncate">{nome}</span>
                          {lead.origem === 'whatsapp' && (
                            <MessageSquare size={11} className="text-[#25D366] flex-shrink-0" />
                          )}
                        </div>
                        {telefone && (
                          <div className="text-[11px] text-[#64748b] flex items-center gap-1 mt-0.5">
                            <Phone size={10} />
                            {telefone}
                          </div>
                        )}
                      </div>
                      {valor > 0 && (
                        <div className="text-[12px] font-bold text-[#4f46e5] flex-shrink-0">{fmt(valor)}</div>
                      )}
                      <span
                        className="text-[10px] font-bold px-2.5 py-1 rounded-lg flex-shrink-0"
                        style={{ backgroundColor: stage.bg, color: stage.color }}
                      >
                        {stage.label}
                      </span>
                      <select
                        value={lead.status}
                        onChange={e => moverStage(lead.id, e.target.value as LeadStatus)}
                        className="text-[11px] border border-[#e2e8f0] rounded-lg px-2 py-1 text-[#475569] bg-white focus:outline-none cursor-pointer flex-shrink-0"
                        onClick={e => e.stopPropagation()}
                      >
                        {STAGES.map(s => (
                          <option key={s.key} value={s.key}>{s.label}</option>
                        ))}
                      </select>
                      <Link href={href} className="text-[#94a3b8] hover:text-[#0f172a] flex-shrink-0">
                        <ChevronRight size={16} />
                      </Link>
                    </div>
                    {lead.obs && (
                      <div className="px-4 pb-2.5 pt-1 text-[11px] text-[#64748b] border-t border-[#f8fafc]">
                        {lead.obs}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── BASE DE CLIENTES ── */}
      {aba === 'clientes' && (
        <>
          {/* Insights rápidos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <button
              onClick={() => setFiltroRapido(filtroRapido === 'aniversariantes' ? 'todos' : 'aniversariantes')}
              className={`rounded-xl px-3 py-2.5 text-left border transition-all ${filtroRapido === 'aniversariantes' ? 'border-amber-300 bg-amber-50' : 'border-[#e2e8f0] bg-white hover:border-amber-200'}`}
            >
              <div className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">Aniversariantes</div>
              <div className="text-[20px] font-black text-amber-700 leading-tight">{aniversariantes.length}</div>
              <div className="text-[10px] text-amber-500">este mês</div>
            </button>
            <button
              onClick={() => setFiltroRapido(filtroRapido === 'inativos' ? 'todos' : 'inativos')}
              className={`rounded-xl px-3 py-2.5 text-left border transition-all ${filtroRapido === 'inativos' ? 'border-rose-300 bg-rose-50' : 'border-[#e2e8f0] bg-white hover:border-rose-200'}`}
            >
              <div className="text-[10px] font-semibold text-rose-600 uppercase tracking-wide">Inativos</div>
              <div className="text-[20px] font-black text-rose-700 leading-tight">{inativos.length}</div>
              <div className="text-[10px] text-rose-500">60+ dias sem comprar</div>
            </button>
            <button
              onClick={() => setFiltroRapido(filtroRapido === 'semcompra' ? 'todos' : 'semcompra')}
              className={`rounded-xl px-3 py-2.5 text-left border transition-all ${filtroRapido === 'semcompra' ? 'border-slate-400 bg-slate-50' : 'border-[#e2e8f0] bg-white hover:border-slate-300'}`}
            >
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Prospects</div>
              <div className="text-[20px] font-black text-slate-700 leading-tight">{semNenhumaCompra.length}</div>
              <div className="text-[10px] text-slate-400">sem nenhuma compra</div>
            </button>
            <button
              onClick={() => setFiltroRapido(filtroRapido === 'topltv' ? 'todos' : 'topltv')}
              className={`rounded-xl px-3 py-2.5 text-left border transition-all ${filtroRapido === 'topltv' ? 'border-emerald-300 bg-emerald-50' : 'border-[#e2e8f0] bg-white hover:border-emerald-200'}`}
            >
              <div className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">Top LTV</div>
              <div className="text-[13px] font-black text-emerald-700 leading-tight truncate">
                {clientes.slice().sort((a,b) => (b.totalGasto??0)-(a.totalGasto??0))[0]?.nome.split(' ')[0] ?? '—'}
              </div>
              <div className="text-[10px] text-emerald-500">{fmt(clientes.slice().sort((a,b) => (b.totalGasto??0)-(a.totalGasto??0))[0]?.totalGasto ?? 0)}</div>
            </button>
          </div>

          {/* Toggle Lista / Ciclo de Vida */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-0.5 bg-[#f1f5f9] p-0.5 rounded-xl w-fit">
              <button
                onClick={() => setClientesView('lista')}
                className={`px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${clientesView === 'lista' ? 'bg-white text-[#0f172a] shadow-sm' : 'text-[#64748b] hover:text-[#0f172a]'}`}
              >
                Lista
              </button>
              <button
                onClick={() => setClientesView('ciclo')}
                className={`px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${clientesView === 'ciclo' ? 'bg-white text-[#0f172a] shadow-sm' : 'text-[#64748b] hover:text-[#0f172a]'}`}
              >
                Ciclo de vida
              </button>
            </div>
          </div>

          {/* Kanban de ciclo de vida */}
          {clientesView === 'ciclo' && (
            <div className="overflow-x-auto pb-4 mb-2">
              <div className="flex gap-3 min-w-max">
                {CICLO_COLS.map(col => {
                  const items = clientesPorCiclo[col.id]
                  return (
                    <div key={col.id} className="w-64 flex-shrink-0 flex flex-col rounded-2xl border" style={{ backgroundColor: col.bg, borderColor: `${col.color}40` }}>
                      <div className="px-3 pt-3 pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                            <span className="text-[12px] font-bold" style={{ color: col.color }}>{col.label}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${col.color}25`, color: col.color }}>{items.length}</span>
                          </div>
                        </div>
                        <div className="text-[10px] mt-0.5" style={{ color: `${col.color}99` }}>{col.desc}</div>
                      </div>
                      <div className="px-2 pb-3 space-y-2 max-h-[420px] overflow-y-auto">
                        {items.length === 0 && (
                          <div className="py-4 text-center text-[10px]" style={{ color: `${col.color}60` }}>Nenhum cliente aqui</div>
                        )}
                        {items.map(c => {
                          const diasSemCompra = c.ultimaCompra
                            ? Math.floor((Date.now() - new Date(c.ultimaCompra).getTime()) / 86_400_000)
                            : null
                          return (
                            <div key={c.id} className="bg-white rounded-xl border border-[#e2e8f0] p-2.5 shadow-sm">
                              <div className="flex items-center gap-2 mb-1.5">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                                  style={{ background: `linear-gradient(135deg, ${col.color}99, ${col.color})` }}>
                                  {c.nome[0].toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[12px] font-semibold text-[#0f172a] truncate">{c.nome}</div>
                                  {(c.totalGasto ?? 0) > 0 && (
                                    <div className="text-[10px] font-bold text-[#10b981]">{fmt(c.totalGasto ?? 0)}</div>
                                  )}
                                </div>
                              </div>
                              {diasSemCompra !== null && (
                                <div className="text-[10px] mb-2" style={{ color: col.color }}>
                                  {diasSemCompra}d sem comprar
                                </div>
                              )}
                              {!c.ultimaCompra && c.totalGasto === 0 && (
                                <div className="text-[10px] text-[#94a3b8] mb-2">sem compras</div>
                              )}
                              <div className="flex gap-1.5">
                                {c.telefone && (
                                  <a
                                    href={`https://wa.me/55${c.telefone.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-semibold bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors"
                                  >
                                    <MessageSquare size={9} />
                                    WhatsApp
                                  </a>
                                )}
                                <Link href={`/pacientes/${c.id}`}
                                  className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-semibold bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0] transition-colors">
                                  <ChevronRight size={9} />
                                  Perfil
                                </Link>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Filtros por canal + ordenação */}
          {clientesView === 'lista' && <div className="flex items-center gap-2 flex-wrap mb-2">
            <button
              onClick={() => { setFiltroCanal('todos'); setFiltroRapido('todos') }}
              className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                filtroCanal === 'todos' && filtroRapido === 'todos' ? 'bg-[#0f172a] text-white border-[#0f172a]' : 'text-[#64748b] border-[#e2e8f0] hover:border-[#94a3b8]'
              }`}
            >
              <Tag size={10} />
              Todos ({clientes.length})
            </button>
            {canaisDistintos.map(canal => {
              const cor = CANAL_CORES[canal] ?? CANAL_CORES.outros
              const qtd = clientes.filter(c => c.canal_aquisicao === canal).length
              return (
                <button
                  key={canal}
                  onClick={() => { setFiltroCanal(canal); setFiltroRapido('todos') }}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-colors"
                  style={filtroCanal === canal
                    ? { backgroundColor: cor.color, color: 'white', borderColor: cor.color }
                    : { color: '#64748b', borderColor: '#e2e8f0' }
                  }
                >
                  {canalLabel(canal)} ({qtd})
                </button>
              )
            })}
            <div className="ml-auto flex-shrink-0">
              <select
                value={sortClientes}
                onChange={e => setSortClientes(e.target.value as typeof sortClientes)}
                className="text-[11px] font-semibold border border-[#e2e8f0] rounded-lg px-2.5 py-1.5 text-[#64748b] bg-white focus:outline-none cursor-pointer"
              >
                <option value="recentes">Mais recentes</option>
                <option value="ltv">Maior LTV</option>
                <option value="ultima">Última compra</option>
                <option value="nome">Nome A-Z</option>
              </select>
            </div>
          </div>}

          {clientesView === 'lista' && <div className="relative mb-4">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input
              type="text"
              value={buscaClientes}
              onChange={e => setBuscaClientes(e.target.value)}
              placeholder="Buscar por nome, telefone ou e-mail..."
              className="w-full rounded-xl border border-[#e2e8f0] pl-9 pr-3 py-2.5 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8] placeholder:text-[#94a3b8]"
            />
          </div>}

          {clientesView === 'lista' && (loading ? (
            <div className="py-20 text-center text-[13px] text-[#64748b]">Carregando...</div>
          ) : clientesVisiveis.length === 0 ? (
            <div className="py-16 text-center bg-white border border-[#e2e8f0] rounded-xl">
              <div className="text-[13px] font-semibold text-[#0f172a] mb-1">Nenhum cliente encontrado</div>
              <Link href="/pacientes/nova" className="text-[11px] text-[#4f46e5] font-semibold hover:underline">
                Cadastrar primeiro cliente →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {clientesVisiveis.map(c => {
                const cor = CANAL_CORES[c.canal_aquisicao ?? ''] ?? CANAL_CORES.outros
                const label = canalLabel(c.canal_aquisicao)
                const aniversario = c.data_nascimento
                  ? new Date(c.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                  : null
                const isAnivMes = c.data_nascimento && new Date(c.data_nascimento + 'T12:00:00').getMonth() + 1 === mesAtual
                const ultimaCompraFmt = c.ultimaCompra
                  ? new Date(c.ultimaCompra).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })
                  : null
                const diasInativo = c.ultimaCompra
                  ? Math.floor((Date.now() - new Date(c.ultimaCompra).getTime()) / 86_400_000)
                  : null

                return (
                  <div key={c.id} className={`bg-white border rounded-xl overflow-hidden ${isAnivMes ? 'border-amber-200' : 'border-[#e2e8f0]'}`}>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0 relative"
                        style={{ background: `linear-gradient(135deg, ${cor.color}cc, ${cor.color})` }}
                      >
                        {c.nome[0].toUpperCase()}
                        {isAnivMes && (
                          <span className="absolute -top-1 -right-1 text-[10px]">🎂</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-semibold text-[#0f172a]">{c.nome}</span>
                          {label && (
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: cor.bg, color: cor.color }}
                            >
                              {label}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {c.telefone && (
                            <span className="text-[11px] text-[#64748b] flex items-center gap-1">
                              <Phone size={9} />
                              {c.telefone}
                            </span>
                          )}
                          {ultimaCompraFmt && (
                            <span className={`text-[11px] flex items-center gap-1 ${diasInativo && diasInativo > 60 ? 'text-rose-500' : 'text-[#64748b]'}`}>
                              <Calendar size={9} />
                              Últ. compra: {ultimaCompraFmt}
                              {diasInativo && diasInativo > 60 && <span className="font-semibold">({diasInativo}d)</span>}
                            </span>
                          )}
                          {!c.ultimaCompra && (
                            <span className="text-[11px] text-[#94a3b8] italic">sem compras</span>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        {(c.totalGasto ?? 0) > 0 ? (
                          <>
                            <div className="text-[13px] font-bold text-[#10b981]">{fmt(c.totalGasto ?? 0)}</div>
                            <div className="text-[10px] text-[#94a3b8]">LTV total</div>
                          </>
                        ) : (
                          <div className="text-[11px] text-[#94a3b8] italic">prospect</div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {c.telefone && (
                          <a
                            href={`https://wa.me/55${c.telefone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-7 h-7 rounded-lg bg-[#25D366]/10 flex items-center justify-center text-[#25D366] hover:bg-[#25D366]/20 transition-colors"
                            title="Abrir WhatsApp"
                          >
                            <MessageSquare size={13} />
                          </a>
                        )}
                        <button
                          onClick={() => abrirEdicao(c)}
                          className="w-7 h-7 rounded-lg bg-[#f1f5f9] flex items-center justify-center text-[#64748b] hover:text-[#0f172a] hover:bg-[#e2e8f0] transition-colors"
                          title="Editar cliente"
                        >
                          <Pencil size={12} />
                        </button>
                        <Link
                          href={`/pacientes/${c.id}`}
                          className="w-7 h-7 rounded-lg bg-[#f1f5f9] flex items-center justify-center text-[#64748b] hover:text-[#0f172a] transition-colors"
                          title="Ver perfil completo"
                        >
                          <ChevronRight size={14} />
                        </Link>
                      </div>
                    </div>

                    {c.obs && (
                      <div className="px-4 pb-2.5 pt-1 text-[11px] text-[#64748b] border-t border-[#f8fafc] truncate">
                        {c.obs}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </>
      )}

      {/* Modal edição de cliente */}
      {editCliente && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-bold text-[#0f172a]">Editar Cliente</h2>
              <button onClick={() => setEditCliente(null)} className="text-[#94a3b8] hover:text-[#0f172a]">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wide block mb-1">Nome *</label>
                <input type="text" value={editForm.nome}
                  onChange={e => setEditForm(f => ({ ...f, nome: e.target.value }))}
                  className="w-full rounded-xl border border-[#e2e8f0] px-3 py-2.5 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8]" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wide block mb-1">WhatsApp / Telefone</label>
                <input type="tel" value={editForm.telefone}
                  onChange={e => setEditForm(f => ({ ...f, telefone: e.target.value }))}
                  placeholder="(00) 99999-0000"
                  className="w-full rounded-xl border border-[#e2e8f0] px-3 py-2.5 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8]" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wide block mb-1">E-mail</label>
                <input type="email" value={editForm.email}
                  onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                  className="w-full rounded-xl border border-[#e2e8f0] px-3 py-2.5 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8]" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wide block mb-1">Canal de origem</label>
                <select value={editForm.canal_aquisicao}
                  onChange={e => setEditForm(f => ({ ...f, canal_aquisicao: e.target.value }))}
                  className="w-full rounded-xl border border-[#e2e8f0] px-3 py-2.5 text-[13px] text-[#0f172a] bg-white focus:outline-none focus:border-[#94a3b8]">
                  <option value="instagram">Instagram</option>
                  <option value="indicacao">Indicação</option>
                  <option value="google">Google</option>
                  <option value="anuncios">Anúncios</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wide block mb-1">Data de nascimento</label>
                <input type="date" value={editForm.data_nascimento}
                  onChange={e => setEditForm(f => ({ ...f, data_nascimento: e.target.value }))}
                  className="w-full rounded-xl border border-[#e2e8f0] px-3 py-2.5 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8]" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wide block mb-1">Observações / Notas</label>
                <textarea rows={3} value={editForm.obs}
                  onChange={e => setEditForm(f => ({ ...f, obs: e.target.value }))}
                  placeholder="Preferências, histórico, interesses..."
                  className="w-full rounded-xl border border-[#e2e8f0] px-3 py-2.5 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8] resize-none" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={salvarEdicao} disabled={editSaving || !editForm.nome.trim()}
                className="flex-1 flex items-center justify-center gap-1.5 bg-[#0f172a] text-white text-[12px] font-semibold py-2.5 rounded-xl disabled:opacity-50 hover:bg-[#1e293b] transition-colors">
                <Save size={13} />
                {editSaving ? 'Salvando...' : 'Salvar'}
              </button>
              <button onClick={() => setEditCliente(null)}
                className="px-4 text-[12px] font-semibold text-[#64748b] border border-[#e2e8f0] rounded-xl hover:border-[#94a3b8] transition-colors">
                Cancelar
              </button>
            </div>
            <div className="mt-3 pt-3 border-t border-[#f1f5f9] flex justify-between items-center">
              <Link href={`/pacientes/${editCliente.id}`} className="text-[11px] text-[#4f46e5] hover:underline font-medium">
                Ver perfil completo →
              </Link>
              {confirmExcluir ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-red-600">Confirmar?</span>
                  <button onClick={excluirCliente} className="text-[11px] font-bold text-red-600 hover:underline">Excluir</button>
                  <button onClick={() => setConfirmExcluir(false)} className="text-[11px] text-[#64748b] hover:underline">Não</button>
                </div>
              ) : (
                <button onClick={() => setConfirmExcluir(true)}
                  className="flex items-center gap-1 text-[11px] text-[#94a3b8] hover:text-red-500 transition-colors">
                  <Trash2 size={11} />
                  Excluir cliente
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal novo lead */}
      {addModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-bold text-[#0f172a]">Novo Lead</h2>
              <button onClick={() => setAddModal(false)} className="text-[#94a3b8] hover:text-[#0f172a]">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wide block mb-1">Nome *</label>
                <input
                  type="text" value={addForm.nome}
                  onChange={e => setAddForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Nome do cliente / lead"
                  className="w-full rounded-xl border border-[#e2e8f0] px-3 py-2.5 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8]"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wide block mb-1">Telefone / WhatsApp</label>
                <input
                  type="tel" value={addForm.telefone}
                  onChange={e => setAddForm(f => ({ ...f, telefone: e.target.value }))}
                  placeholder="(00) 99999-0000"
                  className="w-full rounded-xl border border-[#e2e8f0] px-3 py-2.5 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8]"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wide block mb-1">Canal de origem</label>
                <select value={addForm.canal} onChange={e => setAddForm(f => ({ ...f, canal: e.target.value }))}
                  className="w-full rounded-xl border border-[#e2e8f0] px-3 py-2.5 text-[13px] text-[#0f172a] bg-white focus:outline-none focus:border-[#94a3b8]">
                  <option value="direto">Direto / Presencial</option>
                  <option value="indicacao">Indicação</option>
                  <option value="instagram">Instagram</option>
                  <option value="google">Google</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wide block mb-1">Observação</label>
                <textarea rows={2} value={addForm.obs}
                  onChange={e => setAddForm(f => ({ ...f, obs: e.target.value }))}
                  placeholder="Interesse, produto, referência..."
                  className="w-full rounded-xl border border-[#e2e8f0] px-3 py-2.5 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8] resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={addLead} disabled={addSaving || !addForm.nome.trim()}
                className="flex-1 bg-[#0f172a] text-white text-[12px] font-semibold py-2.5 rounded-xl disabled:opacity-50 hover:bg-[#1e293b] transition-colors">
                {addSaving ? 'Salvando...' : 'Adicionar'}
              </button>
              <button onClick={() => setAddModal(false)}
                className="px-4 text-[12px] font-semibold text-[#64748b] border border-[#e2e8f0] rounded-xl hover:border-[#94a3b8] transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
