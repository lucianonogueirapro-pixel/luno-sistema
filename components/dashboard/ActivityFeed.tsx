'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type FeedItem = {
  id: string
  tipo: string
  titulo: string
  corpo: string | null
  created_at: string
  _new?: boolean
}

const TIPO: Record<string, { dot: string; tag: string }> = {
  crm_lead:          { dot: '#34d399', tag: 'CRM'     },
  crm_qualificado:   { dot: '#38bdf8', tag: 'CRM'     },
  laura_resposta:    { dot: '#22d3ee', tag: 'Luna'    },
  agenda_nova:       { dot: '#818cf8', tag: 'Agenda'  },
  agenda_confirmada: { dot: '#34d399', tag: 'Agenda'  },
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export function ActivityFeed() {
  const supabase = useMemo(() => createClient(), [])
  const [items, setItems] = useState<FeedItem[]>([])
  const [, setTick] = useState(0)

  useEffect(() => {
    supabase
      .from('notificacoes')
      .select('id, tipo, titulo, corpo, created_at')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setItems(data ?? []))

    const ch = supabase
      .channel('activity-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificacoes' },
        ({ new: row }) => {
          setItems(prev => [{ ...(row as FeedItem), _new: true }, ...prev.slice(0, 19)])
          setTimeout(() => setItems(prev => prev.map(i => ({ ...i, _new: false }))), 2000)
        }
      )
      .subscribe()

    const interval = setInterval(() => setTick(t => t + 1), 60000)
    return () => { supabase.removeChannel(ch); clearInterval(interval) }
  }, [supabase])

  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-[12px] text-[#475569]">
        Nenhuma atividade ainda — aguardando eventos...
      </div>
    )
  }

  return (
    <div className="divide-y divide-[#f1f5f9]">
      {items.map(item => {
        const cfg = TIPO[item.tipo] ?? { dot: '#64748b', tag: '—' }
        return (
          <div
            key={item.id}
            className="flex items-start gap-3 px-4 py-2.5 transition-all"
            style={{
              animation: item._new ? 'fade-in-up .25s ease' : undefined,
              backgroundColor: item._new ? `${cfg.dot}0a` : undefined,
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full mt-[5px] flex-shrink-0"
              style={{
                backgroundColor: cfg.dot,
                boxShadow: item._new ? `0 0 8px ${cfg.dot}` : 'none',
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-[#0f172a] font-medium leading-tight truncate">
                {item.titulo}
              </div>
              {item.corpo && (
                <div className="text-[10px] text-[#64748b] truncate mt-0.5">{item.corpo}</div>
              )}
            </div>
            <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
              <span
                className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
                style={{ color: cfg.dot, backgroundColor: `${cfg.dot}18` }}
              >
                {cfg.tag}
              </span>
              <span className="text-[10px] text-[#94a3b8]">{relTime(item.created_at)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
