'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface Notificacao {
  id: string
  tipo: string
  titulo: string
  corpo: string | null
  referencia_id: string | null
  referencia_tipo: string | null
  lida: boolean
  created_at: string
}

export default function NotificacoesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [notifs, setNotifs] = useState<Notificacao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('notificacoes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      setNotifs(data ?? [])
      setLoading(false)
    }
    load()
  }, [supabase])

  async function marcarLida(id: string) {
    await supabase.from('notificacoes').update({ lida: true }).eq('id', id)
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n))
  }

  async function marcarTodasLidas() {
    await supabase.from('notificacoes').update({ lida: true }).eq('lida', false)
    setNotifs(prev => prev.map(n => ({ ...n, lida: true })))
  }

  const naoLidas = notifs.filter(n => !n.lida).length

  function linkReferencia(n: Notificacao) {
    if (n.referencia_tipo === 'avaliacao' && n.referencia_id) return `/avaliacoes/${n.referencia_id}`
    return null
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Notificações"
        subtitle={naoLidas > 0 ? `${naoLidas} não lida${naoLidas !== 1 ? 's' : ''}` : 'Tudo em dia'}
      >
        {naoLidas > 0 && (
          <button
            type="button"
            onClick={marcarTodasLidas}
            className="text-[12px] font-semibold text-[#64748b] hover:text-[#0f172a] border border-[#e2e8f0] rounded-lg px-3 py-1.5"
          >
            Marcar todas como lidas
          </button>
        )}
      </PageHeader>

      {loading ? (
        <div className="py-12 text-center text-[13px] text-[#64748b]">Carregando...</div>
      ) : notifs.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-center text-[13px] text-[#64748b] py-8">Nenhuma notificação.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifs.map(n => {
            const href = linkReferencia(n)
            const dataFmt = new Date(n.created_at).toLocaleDateString('pt-BR', {
              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
            })
            return (
              <div
                key={n.id}
                className={`bg-white rounded-xl border px-4 py-3 transition-all ${
                  n.lida ? 'border-[#e2e8f0] opacity-70' : 'border-[#94a3b8] shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {!n.lida && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />}
                      <div className="text-[13px] font-semibold text-[#0f172a]">{n.titulo}</div>
                    </div>
                    {n.corpo && (
                      <div className="text-[12px] text-[#64748b] whitespace-pre-wrap mt-1">{n.corpo}</div>
                    )}
                    <div className="text-[10px] text-[#94a3b8] mt-1.5">{dataFmt}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {n.tipo === 'avaliacao_pronta' && (
                      <Badge variant="amber">Para Comercial</Badge>
                    )}
                    {!n.lida && (
                      <button
                        type="button"
                        onClick={() => marcarLida(n.id)}
                        className="text-[10px] text-[#64748b] hover:text-[#0f172a] font-semibold"
                      >
                        Marcar lida
                      </button>
                    )}
                    {href && (
                      <Link href={href} className="text-[10px] font-semibold text-[#0f172a] hover:underline">
                        Ver avaliação →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
