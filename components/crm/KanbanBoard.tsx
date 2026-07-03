'use client'
import { useState, useCallback } from 'react'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { Phone, Calendar, MessageCircle, Trash2, MoreVertical, User, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export const ESTAGIOS = [
  { id: 'agendado',          label: 'Agendado',           cor: '#0369a1', bg: '#f0f9ff', borda: '#bae6fd', accent: '#0ea5e9' },
  { id: 'consulta',          label: 'Em Consulta',         cor: '#7c3aed', bg: '#faf5ff', borda: '#e9d5ff', accent: '#a855f7' },
  { id: 'negociacao',        label: 'Negociação',          cor: '#c2410c', bg: '#fff7ed', borda: '#fed7aa', accent: '#f97316' },
  { id: 'orcamento_enviado', label: 'Orçamento enviado',   cor: '#1d4ed8', bg: '#eff6ff', borda: '#bfdbfe', accent: '#3b82f6' },
  { id: 'fechamento',        label: 'Fechamento',          cor: '#15803d', bg: '#f0fdf4', borda: '#bbf7d0', accent: '#22c55e' },
]

export interface Oportunidade {
  id: string
  estagio: string
  canal: string | null
  notas: string | null
  created_at: string
  updated_at: string
  paciente: { id: string; nome: string; telefone: string } | null
  agenda: { id: string; data_hora: string; status: string } | null
  orcamento: { id: string; status: string; titulo: string | null } | null
}

function fmtTel(t: string) {
  const d = t.replace(/\D/g, '')
  if (d.length === 13) return `+${d.slice(0,2)} (${d.slice(2,4)}) ${d.slice(4,9)}-${d.slice(9)}`
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  return t
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Fortaleza',
  })
}

function diasNoEstagio(updatedAt: string) {
  const dias = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86400000)
  if (dias === 0) return 'hoje'
  if (dias === 1) return '1 dia'
  return `${dias} dias`
}

function getInitials(nome: string) {
  const parts = nome.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return nome.slice(0, 2).toUpperCase()
}

function CardMenu({ op, onExcluir, onClose }: { op: Oportunidade; onExcluir: (id: string) => void; onClose: () => void }) {
  return (
    <div className="absolute right-0 top-7 z-50 bg-white border border-[#e2e8f0] rounded-xl shadow-xl py-1.5 min-w-[150px]">
      {op.paciente?.id && (
        <Link
          href={`/pacientes/${op.paciente.id}`}
          className="flex items-center gap-2.5 px-3 py-2 text-[11px] text-[#334155] hover:bg-[#f8fafc]"
          onClick={onClose}
        >
          <User size={12} className="text-[#64748b]" />
          Ver paciente
          <ChevronRight size={10} className="ml-auto text-[#94a3b8]" />
        </Link>
      )}
      {op.paciente?.telefone && (
        <a
          href={`https://wa.me/55${op.paciente.telefone.replace(/\D/g, '')}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2.5 px-3 py-2 text-[11px] text-[#334155] hover:bg-[#f8fafc]"
          onClick={onClose}
        >
          <MessageCircle size={12} className="text-[#16a34a]" />
          Abrir WhatsApp
        </a>
      )}
      <div className="my-1 border-t border-[#f1f5f9]" />
      <button
        onClick={() => { onExcluir(op.id); onClose() }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-red-500 hover:bg-red-50"
      >
        <Trash2 size={12} />
        Remover do CRM
      </button>
    </div>
  )
}

function OportunidadeCard({ op, onExcluir, estagio }: {
  op: Oportunidade
  onExcluir: (id: string) => void
  estagio: typeof ESTAGIOS[0]
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: op.id })
  const [menu, setMenu] = useState(false)

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, opacity: isDragging ? 0.3 : 1, zIndex: isDragging ? 999 : 1 }
    : undefined

  const initials = op.paciente?.nome ? getInitials(op.paciente.nome) : '?'
  const dias = diasNoEstagio(op.updated_at)
  const diasNum = Math.floor((Date.now() - new Date(op.updated_at).getTime()) / 86400000)
  const diaUrgente = diasNum >= 3

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl border shadow-sm select-none transition-shadow ${
        isDragging ? 'shadow-md' : 'hover:shadow-md'
      } ${diaUrgente ? 'border-orange-200' : 'border-[#e8edf3]'}`}
    >
      {/* Topo colorido */}
      <div
        className="h-0.5 rounded-t-xl"
        style={{ background: estagio.accent }}
      />

      <div className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div
            {...attributes}
            {...listeners}
            className="flex items-center gap-2 min-w-0 cursor-grab active:cursor-grabbing"
          >
            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
              style={{ background: estagio.accent }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-[#0f172a] truncate leading-tight">
                {op.paciente?.nome ?? 'Sem nome'}
              </div>
              {op.canal === 'paciente_modelo' && (
                <span className="inline-block text-[9px] px-1.5 py-0.5 rounded-full font-semibold bg-[#faf5ff] text-[#7c3aed] border border-[#e9d5ff] mt-0.5">
                  Paciente modelo
                </span>
              )}
            </div>
          </div>

          <div className="relative flex-shrink-0">
            <button
              onClick={() => setMenu(m => !m)}
              className="p-1 rounded-lg hover:bg-[#f1f5f9] text-[#94a3b8] hover:text-[#475569] transition-colors"
            >
              <MoreVertical size={13} />
            </button>
            {menu && <CardMenu op={op} onExcluir={onExcluir} onClose={() => setMenu(false)} />}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-1.5">
          {op.paciente?.telefone && (
            <div className="flex items-center gap-1.5">
              <Phone size={10} className="text-[#94a3b8] flex-shrink-0" />
              <span className="text-[10px] text-[#64748b]">{fmtTel(op.paciente.telefone)}</span>
            </div>
          )}
          {op.agenda?.data_hora && (
            <div className="flex items-center gap-1.5">
              <Calendar size={10} className="text-[#94a3b8] flex-shrink-0" />
              <span className="text-[10px] text-[#64748b]">{fmtData(op.agenda.data_hora)}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#f1f5f9]">
          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
            diaUrgente
              ? 'bg-orange-50 text-orange-500 border border-orange-200'
              : 'bg-[#f8fafc] text-[#94a3b8] border border-[#e8edf3]'
          }`}>
            {dias} nesta etapa
          </span>

          {op.paciente?.telefone && (
            <a
              href={`https://wa.me/55${op.paciente.telefone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 text-[9px] text-[#16a34a] bg-[#f0fdf4] border border-[#bbf7d0] px-2 py-0.5 rounded-full hover:bg-[#dcfce7] transition-colors font-medium"
            >
              <MessageCircle size={9} />
              WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function Coluna({ estagio, oportunidades, onExcluir }: {
  estagio: typeof ESTAGIOS[0]
  oportunidades: Oportunidade[]
  onExcluir: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: estagio.id })
  const total = oportunidades.length

  return (
    <div className="flex flex-col w-[256px] flex-shrink-0 h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2.5 rounded-t-xl border border-b-0 mb-0"
        style={{ background: estagio.bg, borderColor: estagio.borda }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: estagio.accent }} />
          <span className="text-[11px] font-semibold" style={{ color: estagio.cor }}>
            {estagio.label}
          </span>
        </div>
        <span
          className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
          style={{ color: estagio.cor, background: `${estagio.accent}25` }}
        >
          {total}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto rounded-b-xl border p-2 space-y-2 transition-all ${
          isOver
            ? 'bg-[#f0f9ff] border-[#7dd3fc]'
            : 'bg-[#f8fafc] border-[#e8edf3]'
        }`}
        style={{ borderTop: 'none', minHeight: '400px' }}
      >
        {oportunidades.map(op => (
          <OportunidadeCard key={op.id} op={op} onExcluir={onExcluir} estagio={estagio} />
        ))}
        {total === 0 && (
          <div className="flex flex-col items-center justify-center h-24 text-[10px] text-[#cbd5e1] gap-1">
            <div className="w-6 h-6 rounded-full border-2 border-dashed border-[#e2e8f0]" />
            Vazio
          </div>
        )}
      </div>
    </div>
  )
}

export default function KanbanBoard({ oportunidadesIniciais }: { oportunidadesIniciais: Oportunidade[] }) {
  const [ops, setOps] = useState(oportunidadesIniciais)
  const [ativo, setAtivo] = useState<Oportunidade | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const porEstagio = useCallback((estagio: string) =>
    ops.filter(o => o.estagio === estagio),
  [ops])

  function handleDragStart(e: DragStartEvent) {
    setAtivo(ops.find(o => o.id === e.active.id) ?? null)
  }

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    setAtivo(null)
    if (!over || active.id === over.id) return

    const novoEstagio = String(over.id)
    if (!ESTAGIOS.find(s => s.id === novoEstagio)) return

    setOps(prev => prev.map(o =>
      o.id === active.id ? { ...o, estagio: novoEstagio, updated_at: new Date().toISOString() } : o
    ))

    await fetch(`/api/crm/oportunidades/${active.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estagio: novoEstagio }),
    })
  }

  async function excluir(id: string) {
    if (!confirm('Remover este contato do CRM?')) return
    setOps(prev => prev.filter(o => o.id !== id))
    await fetch(`/api/crm/oportunidades/${id}`, { method: 'DELETE' })
  }

  const ativoEstagio = ativo ? ESTAGIOS.find(s => s.id === ativo.estagio) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-2 h-full">
        {ESTAGIOS.map(estagio => (
          <Coluna
            key={estagio.id}
            estagio={estagio}
            oportunidades={porEstagio(estagio.id)}
            onExcluir={excluir}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
        {ativo && ativoEstagio && (
          <div
            className="bg-white rounded-xl shadow-2xl p-3 rotate-2 opacity-95 w-[256px] border-2"
            style={{ borderColor: ativoEstagio.accent }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                style={{ background: ativoEstagio.accent }}
              >
                {ativo.paciente?.nome ? getInitials(ativo.paciente.nome) : '?'}
              </div>
              <div>
                <div className="text-[12px] font-semibold text-[#0f172a]">
                  {ativo.paciente?.nome ?? 'Sem nome'}
                </div>
                <div className="text-[10px]" style={{ color: ativoEstagio.cor }}>
                  {ativoEstagio.label}
                </div>
              </div>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
