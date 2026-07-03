'use client'
import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { MessageCircle, ChevronDown, Zap, User, Tag, Settings, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface ColunaBD {
  id: string
  slug: string
  nome: string
  cor: string
  ordem: number
}

interface ColunaDisplay {
  id: string
  label: string
  cor: string
  bg: string
  borda: string
  accent: string
}

function toColunaDisplay(c: ColunaBD): ColunaDisplay {
  return { id: c.slug, label: c.nome, cor: c.cor, accent: c.cor, bg: c.cor + '18', borda: c.cor + '40' }
}

const COLUNAS_PADRAO: ColunaBD[] = [
  { id: 'c1', slug: 'novo',           nome: 'Novo',           cor: '#0369a1', ordem: 0 },
  { id: 'c2', slug: 'em_atendimento', nome: 'Em Atendimento', cor: '#c2410c', ordem: 1 },
  { id: 'c3', slug: 'qualificado',    nome: 'Qualificado',    cor: '#1d4ed8', ordem: 2 },
  { id: 'c4', slug: 'agendado',       nome: 'Agendado',       cor: '#15803d', ordem: 3 },
  { id: 'c5', slug: 'followup_01',    nome: 'Follow-up 1',    cor: '#92400e', ordem: 4 },
  { id: 'c6', slug: 'followup_02',    nome: 'Follow-up 2',    cor: '#7c2d12', ordem: 5 },
  { id: 'c7', slug: 'desinteresse',   nome: 'Desinteresse',   cor: '#475569', ordem: 6 },
]

const CORES_PRESET = [
  '#0369a1', '#c2410c', '#1d4ed8', '#15803d',
  '#92400e', '#7c2d12', '#475569', '#7c3aed',
  '#be185d', '#0f766e',
]

const ETIQUETAS_CONFIG = [
  { id: 'Lead',         cor: '#2563eb', bg: '#dbeafe' },
  { id: 'CRM',          cor: '#7c3aed', bg: '#f3e8ff' },
  { id: 'Cancelamento', cor: '#dc2626', bg: '#fee2e2' },
  { id: 'Financeiro',   cor: '#d97706', bg: '#fef3c7' },
  { id: 'Retorno',      cor: '#059669', bg: '#d1fae5' },
  { id: 'Orçamento',    cor: '#0891b2', bg: '#cffafe' },
  { id: 'Fornecedor',   cor: '#166534', bg: '#dcfce7' },
]

export interface Conversa {
  id: string
  telefone: string
  nome: string | null
  status: string
  perfil: string | null
  origem: string | null
  followup_em: string | null
  followup_enviado: boolean | null
  ultima_mensagem_at: string | null
  canal: string | null
  etiquetas: string[] | null
  created_at: string
}

function toSlug(nome: string) {
  return nome.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '_').replace(/__+/g, '_')
    .replace(/^_|_$/g, '')
}

function fmtTel(t: string) {
  const raw = t.includes('@') ? t.split('@')[0] : t
  const d = raw.replace(/\D/g, '')
  if (d.length === 13) return `+${d.slice(0,2)} (${d.slice(2,4)}) ${d.slice(4,9)}-${d.slice(9)}`
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  return raw
}

function fmtTempo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function getInitials(nome: string) {
  const parts = nome.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return nome.slice(0, 2).toUpperCase()
}

function StatusMenu({ conversa, coluna, todasColunas, onMover, onClose }: {
  conversa: Conversa
  coluna: ColunaDisplay
  todasColunas: ColunaDisplay[]
  onMover: (id: string, status: string) => void
  onClose: () => void
}) {
  return (
    <div className="absolute right-0 top-7 z-50 bg-white border border-[#e2e8f0] rounded-xl shadow-xl py-1.5 min-w-[170px]">
      <div className="px-3 py-1.5 text-[9px] font-semibold text-[#94a3b8] uppercase tracking-wide border-b border-[#f1f5f9] mb-1">
        Mover para
      </div>
      {todasColunas.filter(c => c.id !== coluna.id).map(c => (
        <button
          key={c.id}
          onClick={() => { onMover(conversa.id, c.id); onClose() }}
          className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-[#334155] hover:bg-[#f8fafc] text-left"
        >
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.accent }} />
          {c.label}
        </button>
      ))}
      <div className="my-1 border-t border-[#f1f5f9]" />
      <Link
        href={`/atendimento/${conversa.id}`}
        className="flex items-center gap-2 px-3 py-2 text-[11px] text-[#334155] hover:bg-[#f8fafc]"
        onClick={onClose}
      >
        <User size={11} className="text-[#64748b]" />
        Abrir conversa
      </Link>
      {conversa.telefone && (
        <a
          href={`https://wa.me/55${conversa.telefone.replace(/\D/g, '')}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-3 py-2 text-[11px] text-[#334155] hover:bg-[#f8fafc]"
          onClick={onClose}
        >
          <MessageCircle size={11} className="text-[#16a34a]" />
          Abrir WhatsApp
        </a>
      )}
    </div>
  )
}

function EtiquetaMenu({ conversa, onToggle, onClose }: {
  conversa: Conversa
  onToggle: (id: string, tag: string) => void
  onClose: () => void
}) {
  const ativas = conversa.etiquetas ?? []
  return (
    <div className="absolute right-0 top-7 z-50 bg-white border border-[#e2e8f0] rounded-xl shadow-xl py-1.5 min-w-[150px]">
      <div className="px-3 py-1.5 text-[9px] font-semibold text-[#94a3b8] uppercase tracking-wide border-b border-[#f1f5f9] mb-1">
        Etiquetas
      </div>
      {ETIQUETAS_CONFIG.map(etq => {
        const ativa = ativas.includes(etq.id)
        return (
          <button
            key={etq.id}
            onClick={() => { onToggle(conversa.id, etq.id); onClose() }}
            className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-[#334155] hover:bg-[#f8fafc] text-left"
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: etq.cor }} />
            {etq.id}
            {ativa && <span className="ml-auto text-[#4f46e5] text-[10px] font-bold">✓</span>}
          </button>
        )
      })}
    </div>
  )
}

function ConversaCard({ conversa, coluna, todasColunas, onMover, onToggleEtiqueta }: {
  conversa: Conversa
  coluna: ColunaDisplay
  todasColunas: ColunaDisplay[]
  onMover: (id: string, status: string) => void
  onToggleEtiqueta: (id: string, tag: string) => void
}) {
  const router = useRouter()
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: conversa.id })
  const [menu, setMenu] = useState(false)
  const [etqMenu, setEtqMenu] = useState(false)

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, opacity: isDragging ? 0.3 : 1 }
    : undefined

  const initials = conversa.nome ? getInitials(conversa.nome) : (conversa.telefone[0] ?? 'L').toUpperCase()
  const followupVencido = conversa.followup_em && !conversa.followup_enviado && new Date(conversa.followup_em) <= new Date()
  const isPacienteModelo = conversa.canal === 'paciente_modelo'
  const etiquetas = conversa.etiquetas ?? []

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => { if (!menu && !etqMenu && !isDragging) router.push(`/atendimento/${conversa.id}`) }}
      className={`bg-white rounded-xl border shadow-sm select-none cursor-pointer ${isDragging ? 'shadow-lg opacity-30' : 'hover:shadow-md'} ${followupVencido ? 'border-orange-200' : 'border-[#e8edf3]'}`}
    >
      <div className="h-0.5 rounded-t-xl" style={{ background: coluna.accent }} />

      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
              style={{ background: isPacienteModelo ? '#7c3aed' : coluna.accent }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-[#0f172a] truncate leading-tight">
                {conversa.nome ?? fmtTel(conversa.telefone)}
              </div>
              {conversa.nome && (
                <div className="text-[10px] text-[#94a3b8] truncate">{fmtTel(conversa.telefone)}</div>
              )}
            </div>
          </div>

          <div className="relative flex-shrink-0 flex items-center gap-0.5" onPointerDown={e => e.stopPropagation()}>
            <button
              onClick={(e) => { e.stopPropagation(); setEtqMenu(m => !m); setMenu(false) }}
              className="p-1 rounded-lg hover:bg-[#f1f5f9] text-[#94a3b8] hover:text-[#475569] transition-colors cursor-pointer"
            >
              <Tag size={11} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setMenu(m => !m); setEtqMenu(false) }}
              className="p-1 rounded-lg hover:bg-[#f1f5f9] text-[#94a3b8] hover:text-[#475569] transition-colors cursor-pointer"
            >
              <ChevronDown size={12} />
            </button>
            {etqMenu && <EtiquetaMenu conversa={conversa} onToggle={onToggleEtiqueta} onClose={() => setEtqMenu(false)} />}
            {menu && <StatusMenu conversa={conversa} coluna={coluna} todasColunas={todasColunas} onMover={onMover} onClose={() => setMenu(false)} />}
          </div>
        </div>

        {etiquetas.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {etiquetas.map(tag => {
              const cfg = ETIQUETAS_CONFIG.find(e => e.id === tag)
              return (
                <span
                  key={tag}
                  className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                  style={{ color: cfg?.cor ?? '#475569', background: cfg?.bg ?? '#f1f5f9' }}
                >
                  {tag}
                </span>
              )
            })}
          </div>
        )}

        <div className="flex flex-wrap gap-1 mb-2">
          {conversa.perfil && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#f1f5f9] text-[#64748b] font-medium capitalize">
              {conversa.perfil}
            </span>
          )}
          {conversa.origem && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#f1f5f9] text-[#64748b] font-medium">
              {conversa.origem}
            </span>
          )}
          {isPacienteModelo && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#faf5ff] text-[#7c3aed] border border-[#e9d5ff] font-medium">
              modelo
            </span>
          )}
          {followupVencido && (
            <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-500 border border-orange-200 font-medium">
              <Zap size={8} />
              follow-up
            </span>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#f1f5f9]" onPointerDown={e => e.stopPropagation()}>
          <span className="text-[9px] text-[#94a3b8]">
            {conversa.ultima_mensagem_at ? fmtTempo(conversa.ultima_mensagem_at) : '—'}
          </span>
          <a
            href={`https://wa.me/55${conversa.telefone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1 text-[9px] text-[#16a34a] bg-[#f0fdf4] border border-[#bbf7d0] px-2 py-0.5 rounded-full hover:bg-[#dcfce7] transition-colors font-medium cursor-pointer"
          >
            <MessageCircle size={8} />
            WA
          </a>
        </div>
      </div>
    </div>
  )
}

function Coluna({ coluna, todasColunas, conversas, onMover, onToggleEtiqueta }: {
  coluna: ColunaDisplay
  todasColunas: ColunaDisplay[]
  conversas: Conversa[]
  onMover: (id: string, status: string) => void
  onToggleEtiqueta: (id: string, tag: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: coluna.id })

  return (
    <div className="flex flex-col w-[220px] flex-shrink-0 h-full">
      <div
        className="flex items-center justify-between px-3 py-2.5 rounded-t-xl border border-b-0"
        style={{ background: coluna.bg, borderColor: coluna.borda }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: coluna.accent }} />
          <span className="text-[11px] font-semibold" style={{ color: coluna.cor }}>
            {coluna.label}
          </span>
        </div>
        <span
          className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
          style={{ color: coluna.cor, background: `${coluna.accent}25` }}
        >
          {conversas.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto rounded-b-xl border p-2 space-y-2 transition-all ${
          isOver ? 'bg-[#f0f9ff] border-[#7dd3fc]' : 'bg-[#f8fafc] border-[#e8edf3]'
        }`}
        style={{ borderTop: 'none', minHeight: '360px' }}
      >
        {conversas.map(c => (
          <ConversaCard key={c.id} conversa={c} coluna={coluna} todasColunas={todasColunas} onMover={onMover} onToggleEtiqueta={onToggleEtiqueta} />
        ))}
        {conversas.length === 0 && (
          <div className="flex flex-col items-center justify-center h-20 text-[10px] text-[#cbd5e1] gap-1">
            <div className="w-6 h-6 rounded-full border-2 border-dashed border-[#e2e8f0]" />
            Vazio
          </div>
        )}
      </div>
    </div>
  )
}

function GerenciarColunasModal({ colunasBD, onClose, onChange }: {
  colunasBD: ColunaBD[]
  onClose: () => void
  onChange: (novas: ColunaBD[]) => void
}) {
  const supabase = useMemo(() => createClient(), [])
  const [lista, setLista] = useState(colunasBD)
  const [novoNome, setNovoNome] = useState('')
  const [novaCor, setNovaCor] = useState('#0369a1')
  const [corAberta, setCorAberta] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function renomear(id: string, nome: string) {
    const col = lista.find(c => c.id === id)
    if (!col || col.nome === nome || !nome.trim()) return
    await supabase.from('wa_kanban_colunas').update({ nome: nome.trim() }).eq('id', id)
    const novas = lista.map(c => c.id === id ? { ...c, nome: nome.trim() } : c)
    setLista(novas); onChange(novas)
  }

  async function mudarCor(id: string, cor: string) {
    await supabase.from('wa_kanban_colunas').update({ cor }).eq('id', id)
    const novas = lista.map(c => c.id === id ? { ...c, cor } : c)
    setLista(novas); onChange(novas); setCorAberta(null)
  }

  async function excluir(id: string) {
    await supabase.from('wa_kanban_colunas').delete().eq('id', id)
    const novas = lista.filter(c => c.id !== id)
    setLista(novas); onChange(novas)
  }

  async function adicionar() {
    if (!novoNome.trim() || salvando) return
    setSalvando(true)
    const slug = toSlug(novoNome) + '_' + Date.now().toString(36)
    const { data } = await supabase
      .from('wa_kanban_colunas')
      .insert({ slug, nome: novoNome.trim(), cor: novaCor, ordem: lista.length })
      .select().single()
    if (data) {
      const novas = [...lista, data as ColunaBD]
      setLista(novas); onChange(novas)
    }
    setNovoNome(''); setSalvando(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-[400px] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e2e8f0]">
          <div className="text-[14px] font-bold text-[#0f172a]">Gerenciar Colunas</div>
          <button onClick={onClose}><X size={16} className="text-[#94a3b8]" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {lista.map(col => (
            <div key={col.id} className="flex items-center gap-2 relative">
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setCorAberta(corAberta === col.id ? null : col.id)}
                  className="w-7 h-7 rounded-full border-2 border-white shadow-sm"
                  style={{ background: col.cor }}
                />
                {corAberta === col.id && (
                  <div className="absolute left-0 top-9 z-20 bg-white border border-[#e2e8f0] rounded-xl p-2.5 shadow-lg">
                    <div className="flex flex-wrap gap-1.5 w-[116px]">
                      {CORES_PRESET.map(c => (
                        <button key={c} onClick={() => mudarCor(col.id, c)}
                          className={`w-6 h-6 rounded-full ${col.cor === c ? 'ring-2 ring-[#0f172a] ring-offset-1' : ''}`}
                          style={{ background: c }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <input
                defaultValue={col.nome}
                onBlur={e => renomear(col.id, e.target.value)}
                className="flex-1 border border-[#e2e8f0] rounded-lg px-3 py-1.5 text-[12px] text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
              />
              <button onClick={() => excluir(col.id)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-[#94a3b8] hover:text-[#dc2626] hover:bg-[#fef2f2] flex-shrink-0">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-[#e2e8f0] p-4">
          <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wide mb-2.5">Nova coluna</div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {CORES_PRESET.map(c => (
              <button key={c} onClick={() => setNovaCor(c)}
                className={`w-5 h-5 rounded-full flex-shrink-0 ${novaCor === c ? 'ring-2 ring-[#0f172a] ring-offset-1' : ''}`}
                style={{ background: c }} />
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={novoNome}
              onChange={e => setNovoNome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && adicionar()}
              placeholder="Nome da coluna..."
              className="flex-1 border border-[#e2e8f0] rounded-lg px-3 py-2 text-[12px] text-[#0f172a] focus:outline-none focus:border-[#0f172a]"
            />
            <button onClick={adicionar} disabled={!novoNome.trim() || salvando}
              className="px-3 py-2 bg-[#0f172a] text-white text-[11px] font-semibold rounded-lg hover:bg-[#475569] disabled:opacity-40 flex items-center gap-1.5 transition-colors">
              <Plus size={11} />
              Adicionar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function KanbanAtendimento({
  conversasIniciais,
  colunasIniciais,
}: {
  conversasIniciais: Conversa[]
  colunasIniciais?: ColunaBD[]
}) {
  const [conversas, setConversas] = useState(conversasIniciais)
  const [ativa, setAtiva] = useState<Conversa | null>(null)
  const [colunasBD, setColunasBD] = useState<ColunaBD[]>(colunasIniciais?.length ? colunasIniciais : COLUNAS_PADRAO)
  const [modalAberto, setModalAberto] = useState(false)

  const colunas = useMemo(() => colunasBD.map(toColunaDisplay), [colunasBD])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const porColuna = useCallback(
    (id: string) => conversas.filter(c => c.status === id),
    [conversas],
  )

  function handleDragStart(e: DragStartEvent) {
    setAtiva(conversas.find(c => c.id === e.active.id) ?? null)
  }

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    setAtiva(null)
    if (!over) return
    const novoStatus = String(over.id)
    if (!colunas.find(c => c.id === novoStatus)) return
    if (conversas.find(c => c.id === active.id)?.status === novoStatus) return

    setConversas(prev => prev.map(c =>
      c.id === active.id ? { ...c, status: novoStatus } : c
    ))

    await fetch(`/api/whatsapp/conversas/${active.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: novoStatus }),
    })
  }

  async function moverManual(id: string, status: string) {
    setConversas(prev => prev.map(c => c.id === id ? { ...c, status } : c))
    await fetch(`/api/whatsapp/conversas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
  }

  async function toggleEtiqueta(id: string, tag: string) {
    const conversa = conversas.find(c => c.id === id)
    if (!conversa) return
    const etiquetas = conversa.etiquetas ?? []
    const novas = etiquetas.includes(tag)
      ? etiquetas.filter(e => e !== tag)
      : [...etiquetas, tag]
    setConversas(prev => prev.map(c => c.id === id ? { ...c, etiquetas: novas } : c))
    await fetch(`/api/whatsapp/conversas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ etiquetas: novas }),
    })
  }

  const ativaColuna = ativa ? colunas.find(c => c.id === ativa.status) : null

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <div />
        <button
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-1.5 text-[11px] text-[#64748b] hover:text-[#0f172a] px-2.5 py-1.5 rounded-lg hover:bg-[#f1f5f9] transition-colors"
        >
          <Settings size={12} />
          Gerenciar colunas
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-2 h-full">
          {colunas.map(col => (
            <Coluna
              key={col.id}
              coluna={col}
              todasColunas={colunas}
              conversas={porColuna(col.id)}
              onMover={moverManual}
              onToggleEtiqueta={toggleEtiqueta}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
          {ativa && ativaColuna && (
            <div
              className="bg-white rounded-xl shadow-2xl p-3 rotate-2 opacity-95 w-[220px] border-2"
              style={{ borderColor: ativaColuna.accent }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                  style={{ background: ativaColuna.accent }}
                >
                  {ativa.nome ? getInitials(ativa.nome) : '?'}
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-[#0f172a]">
                    {ativa.nome ?? fmtTel(ativa.telefone)}
                  </div>
                  <div className="text-[10px]" style={{ color: ativaColuna.cor }}>{ativaColuna.label}</div>
                </div>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {modalAberto && (
        <GerenciarColunasModal
          colunasBD={colunasBD}
          onClose={() => setModalAberto(false)}
          onChange={novas => setColunasBD(novas)}
        />
      )}
    </>
  )
}
