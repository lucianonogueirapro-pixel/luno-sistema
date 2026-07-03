'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEmpresaId } from '@/context/EmpresaContext'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCorners, type DragStartEvent, type DragEndEvent,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, X, GripVertical, Calendar, Pencil, Trash2, Bell } from 'lucide-react'

type Status = 'todo' | 'doing' | 'done'
type Prioridade = 'baixa' | 'media' | 'alta' | 'urgente'

type Tarefa = {
  id: string
  titulo: string
  descricao: string | null
  status: Status
  prioridade: Prioridade
  data_limite: string | null
  responsavel: string | null
  created_at: string
}

const COLUMNS: { id: Status; label: string; color: string; bg: string }[] = [
  { id: 'todo',  label: 'A fazer',       color: '#60a5fa', bg: '#eff6ff' },
  { id: 'doing', label: 'Em andamento',  color: '#f59e0b', bg: '#fffbeb' },
  { id: 'done',  label: 'Concluído',     color: '#10b981', bg: '#ecfdf5' },
]

const PRIO: Record<Prioridade, { label: string; color: string; bg: string }> = {
  baixa:   { label: 'Baixa',   color: '#10b981', bg: '#ecfdf5' },
  media:   { label: 'Média',   color: '#f59e0b', bg: '#fffbeb' },
  alta:    { label: 'Alta',    color: '#f97316', bg: '#fff7ed' },
  urgente: { label: 'Urgente', color: '#ef4444', bg: '#fef2f2' },
}

const EMPTY_FORM = {
  titulo: '',
  descricao: '',
  prioridade: 'media' as Prioridade,
  data_limite: '',
  responsavel: '',
}

function PrioBadge({ p }: { p: Prioridade }) {
  const m = PRIO[p]
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ color: m.color, backgroundColor: m.bg }}>
      {m.label}
    </span>
  )
}

function formatDate(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const dDay = new Date(d); dDay.setHours(0, 0, 0, 0)
  const diff = Math.round((dDay.getTime() - today.getTime()) / 86400000)
  const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  const color = diff < 0 ? '#ef4444' : diff === 0 ? '#f59e0b' : diff <= 2 ? '#f97316' : '#64748b'
  return { label, color, overdue: diff < 0, isToday: diff === 0 }
}

function SortableCard({
  tarefa, onEdit, onDelete,
}: {
  tarefa: Tarefa
  onEdit: (t: Tarefa) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: tarefa.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  const dateInfo = formatDate(tarefa.data_limite)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start gap-2 p-3">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 text-[#cbd5e1] hover:text-[#94a3b8] flex-shrink-0 touch-none cursor-grab active:cursor-grabbing"
        >
          <GripVertical size={14} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-[#0f172a] leading-snug mb-1">{tarefa.titulo}</div>
          {tarefa.descricao && (
            <div className="text-[11px] text-[#64748b] mb-1.5 line-clamp-2">{tarefa.descricao}</div>
          )}
          <div className="flex items-center gap-1.5 flex-wrap">
            <PrioBadge p={tarefa.prioridade} />
            {dateInfo && (
              <span className="flex items-center gap-0.5 text-[10px] font-medium" style={{ color: dateInfo.color }}>
                <Calendar size={9} />
                {dateInfo.label}
                {dateInfo.overdue && ' · atrasada'}
                {dateInfo.isToday && ' · hoje'}
              </span>
            )}
            {tarefa.responsavel && (
              <span className="text-[10px] text-[#94a3b8]">@{tarefa.responsavel}</span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => onEdit(tarefa)} className="text-[#94a3b8] hover:text-[#3b82f6]">
            <Pencil size={12} />
          </button>
          <button onClick={() => onDelete(tarefa.id)} className="text-[#94a3b8] hover:text-[#ef4444]">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

function OverlayCard({ tarefa }: { tarefa: Tarefa }) {
  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-2xl p-3 w-[270px] rotate-1 cursor-grabbing">
      <div className="text-[13px] font-medium text-[#0f172a]">{tarefa.titulo}</div>
      <div className="mt-1"><PrioBadge p={tarefa.prioridade} /></div>
    </div>
  )
}

function KanbanColumn({
  col, items, onAdd, onEdit, onDelete,
}: {
  col: typeof COLUMNS[0]
  items: Tarefa[]
  onAdd: () => void
  onEdit: (t: Tarefa) => void
  onDelete: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id })

  return (
    <div
      className="w-[280px] flex-shrink-0 flex flex-col rounded-2xl border transition-colors duration-150"
      style={{
        backgroundColor: isOver ? `${col.color}14` : col.bg,
        borderColor: isOver ? col.color : `${col.color}40`,
      }}
    >
      {/* Cabeçalho da coluna */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
          <span className="text-[12px] font-semibold" style={{ color: col.color }}>{col.label}</span>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: `${col.color}25`, color: col.color }}
          >
            {items.length}
          </span>
        </div>
        <button
          onClick={onAdd}
          className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/60 transition text-[#94a3b8] hover:text-[#475569]"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Área droppable com os cards */}
      <div
        ref={setNodeRef}
        className="flex-1 px-3 pb-3 space-y-2 min-h-[120px] overflow-y-auto"
      >
        <SortableContext items={items.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {items.map(tarefa => (
            <SortableCard key={tarefa.id} tarefa={tarefa} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </SortableContext>

        {items.length === 0 && (
          <div
            className="h-20 flex items-center justify-center rounded-xl border-2 border-dashed text-[11px] transition-colors duration-150"
            style={{
              borderColor: isOver ? col.color : `${col.color}40`,
              color: isOver ? col.color : `${col.color}80`,
            }}
          >
            {isOver ? 'Soltar aqui' : 'Arraste ou clique + para adicionar'}
          </div>
        )}
      </div>
    </div>
  )
}

type ModalProps = {
  initial?: Tarefa | null
  targetStatus?: Status
  onClose: () => void
  onSave: (data: typeof EMPTY_FORM & { id?: string; status: Status }) => void
}

function TaskModal({ initial, targetStatus, onClose, onSave }: ModalProps) {
  const [form, setForm] = useState({
    titulo: initial?.titulo ?? '',
    descricao: initial?.descricao ?? '',
    prioridade: (initial?.prioridade ?? 'media') as Prioridade,
    data_limite: initial?.data_limite ? initial.data_limite.slice(0, 10) : '',
    responsavel: initial?.responsavel ?? '',
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold text-[#0f172a]">
            {initial ? 'Editar tarefa' : 'Nova tarefa'}
          </h2>
          <button onClick={onClose} className="text-[#94a3b8] hover:text-[#475569]">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-[#64748b] block mb-1">Título *</label>
            <input
              className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={form.titulo}
              onChange={e => set('titulo', e.target.value)}
              placeholder="O que precisa ser feito?"
              autoFocus
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-[#64748b] block mb-1">Descrição</label>
            <textarea
              className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
              rows={2}
              value={form.descricao}
              onChange={e => set('descricao', e.target.value)}
              placeholder="Detalhes opcionais…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-[#64748b] block mb-1">Prioridade</label>
              <select
                className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={form.prioridade}
                onChange={e => set('prioridade', e.target.value)}
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-[#64748b] block mb-1">Prazo</label>
              <input
                type="date"
                className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={form.data_limite}
                onChange={e => set('data_limite', e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium text-[#64748b] block mb-1">Responsável</label>
            <input
              className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={form.responsavel}
              onChange={e => set('responsavel', e.target.value)}
              placeholder="Nome ou @usuário"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] text-[#64748b] hover:bg-[#f1f5f9] rounded-lg transition"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (!form.titulo.trim()) return
              onSave({ ...form, id: initial?.id, status: initial?.status ?? targetStatus ?? 'todo' })
            }}
            disabled={!form.titulo.trim()}
            className="px-4 py-2 text-[13px] font-medium text-white bg-[#3b82f6] hover:bg-[#2563eb] rounded-lg transition disabled:opacity-40"
          >
            {initial ? 'Salvar' : 'Criar tarefa'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TarefasPage() {
  const empresaId = useEmpresaId()
  const supabase = useMemo(() => createClient(), [])
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ open: boolean; tarefa?: Tarefa | null; status?: Status }>({ open: false })
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('tarefas')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
    setTarefas((data ?? []) as Tarefa[])
    setLoading(false)
  }, [supabase, empresaId])

  useEffect(() => {
    load()
    const ch = supabase
      .channel('tarefas-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tarefas' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [supabase, load])

  const byStatus = useMemo(() => {
    const map: Record<Status, Tarefa[]> = { todo: [], doing: [], done: [] }
    tarefas.forEach(t => { map[t.status]?.push(t) })
    return map
  }, [tarefas])

  const activeTask = activeId ? (tarefas.find(t => t.id === activeId) ?? null) : null

  async function handleSave(form: typeof EMPTY_FORM & { id?: string; status: Status }) {
    const payload = {
      empresa_id: empresaId,
      titulo: form.titulo.trim(),
      descricao: form.descricao?.trim() || null,
      status: form.status,
      prioridade: form.prioridade,
      data_limite: form.data_limite ? form.data_limite + 'T12:00:00' : null,
      responsavel: form.responsavel?.trim() || null,
    }
    if (form.id) {
      await supabase.from('tarefas').update(payload).eq('id', form.id)
    } else {
      await supabase.from('tarefas').insert(payload)
    }
    setModal({ open: false })
    await load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover esta tarefa?')) return
    await supabase.from('tarefas').delete().eq('id', id)
    await load()
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string)
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (!over || active.id === over.id) return

    const dragged = tarefas.find(t => t.id === active.id)
    if (!dragged) return

    // Descobre a coluna de destino: pode ser o id da coluna (via useDroppable) ou o id de um card
    let targetStatus: Status | null = null
    if (COLUMNS.find(c => c.id === over.id)) {
      targetStatus = over.id as Status
    } else {
      const overTask = tarefas.find(t => t.id === over.id)
      if (overTask) targetStatus = overTask.status
    }

    if (!targetStatus) return

    if (targetStatus !== dragged.status) {
      // Mover para outra coluna
      setTarefas(prev => prev.map(t => t.id === dragged.id ? { ...t, status: targetStatus! } : t))
      await supabase.from('tarefas').update({ status: targetStatus }).eq('id', dragged.id)
    } else {
      // Reordenar dentro da mesma coluna
      const overTask = tarefas.find(t => t.id === over.id)
      if (overTask) {
        setTarefas(prev => {
          const ai = prev.findIndex(t => t.id === active.id)
          const oi = prev.findIndex(t => t.id === over.id)
          return arrayMove(prev, ai, oi)
        })
      }
    }
  }

  const totalAtrasadas = tarefas.filter(t => {
    if (!t.data_limite || t.status === 'done') return false
    return new Date(t.data_limite) < new Date()
  }).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-[#64748b] text-sm">
        Carregando tarefas…
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-[22px] font-black text-[#0f172a] tracking-tight">Tarefas</h1>
          <p className="text-[13px] text-[#64748b] mt-0.5">
            {tarefas.filter(t => t.status !== 'done').length} pendentes
            {totalAtrasadas > 0 && (
              <span className="ml-2 text-red-500 font-medium">
                · {totalAtrasadas} atrasada{totalAtrasadas > 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setModal({ open: true, status: 'todo' })}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#3b82f6] text-white text-[13px] font-medium rounded-xl hover:bg-[#2563eb] transition-colors shadow-sm"
        >
          <Plus size={15} /> Nova tarefa
        </button>
      </div>

      {tarefas.length === 0 && (
        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4 text-[12px] text-[#64748b] flex items-start gap-2 flex-shrink-0">
          <Bell size={14} className="flex-shrink-0 mt-0.5 text-[#94a3b8]" />
          <span>
            Dica: use o microfone e diga <em>"cria tarefa urgente: fechar caixa"</em> para criar tarefas por voz.
          </span>
        </div>
      )}

      {/* Board — scroll horizontal como Trello */}
      <div className="flex-1 overflow-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 pb-4 h-full items-start" style={{ minWidth: 'max-content' }}>
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col.id}
                col={col}
                items={byStatus[col.id]}
                onAdd={() => setModal({ open: true, status: col.id })}
                onEdit={t => setModal({ open: true, tarefa: t })}
                onDelete={handleDelete}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask && <OverlayCard tarefa={activeTask} />}
          </DragOverlay>
        </DndContext>
      </div>

      {modal.open && (
        <TaskModal
          initial={modal.tarefa}
          targetStatus={modal.status}
          onClose={() => setModal({ open: false })}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
