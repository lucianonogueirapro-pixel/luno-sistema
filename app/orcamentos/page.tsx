'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Send, ChevronRight } from 'lucide-react'
import type { Orcamento, StatusOrcamento } from '@/lib/types'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

const STATUS_LABEL: Record<StatusOrcamento, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
}

const STATUS_STYLE: Record<StatusOrcamento, string> = {
  rascunho: 'bg-[#f1f5f9] text-[#64748b]',
  enviado:  'bg-sky-50 text-sky-700',
  aprovado: 'bg-emerald-50 text-emerald-700',
  recusado: 'bg-rose-50 text-rose-600',
}

type OrcRow = Orcamento & {
  clientes: { nome: string; telefone: string }
  orcamento_itens: { valor: number }[]
}

export default function OrcamentosPage() {
  const router = useRouter()  // usado para navegar ao clicar em um orçamento
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<OrcRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<StatusOrcamento | 'todos'>('todos')

  useEffect(() => {
    supabase
      .from('orcamentos')
      .select('*, clientes(nome, telefone), orcamento_itens(valor)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setRows((data ?? []) as OrcRow[])
        setLoading(false)
      })
  }, [supabase])

  const lista = useMemo(
    () => filtro === 'todos' ? rows : rows.filter(o => o.status === filtro),
    [rows, filtro]
  )

  function totalOrc(o: OrcRow) {
    return o.orcamento_itens.reduce((s, i) => s + (i.valor ?? 0), 0)
  }

  function whatsappHref(o: OrcRow) {
    const link = `${window.location.origin}/f/orcamento/${o.token}`
    const msg = encodeURIComponent(
      `Olá ${o.clientes.nome.split(' ')[0]}! Segue sua proposta personalizada da Luno:\n${link}`
    )
    return `https://wa.me/55${o.clientes.telefone.replace(/\D/g, '')}?text=${msg}`
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    rows.forEach(o => { c[o.status] = (c[o.status] ?? 0) + 1 })
    return c
  }, [rows])

  if (loading) return <div className="p-8 text-[13px] text-[#64748b]">Carregando...</div>

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Orçamentos"
        subtitle="Leads que não fecharam e receberam proposta via WhatsApp"
      />

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {(['todos', 'enviado', 'aprovado', 'recusado'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFiltro(s)}
            className={`text-left px-4 py-3 rounded-xl border transition-all ${
              filtro === s
                ? 'border-[#4f46e5] bg-[#4f46e5] text-white'
                : 'border-[#e2e8f0] bg-white text-[#0f172a] hover:border-[#94a3b8]'
            }`}
          >
            <div className={`text-[20px] font-bold ${filtro === s ? 'text-white' : 'text-[#0f172a]'}`}>
              {s === 'todos' ? rows.length : (counts[s] ?? 0)}
            </div>
            <div className={`text-[10px] font-semibold uppercase tracking-wide mt-0.5 ${
              filtro === s ? 'text-white/70' : 'text-[#94a3b8]'
            }`}>
              {s === 'todos' ? 'Total' : STATUS_LABEL[s]}
            </div>
          </button>
        ))}
      </div>

      {/* Filtros de status */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {(['todos', 'rascunho', 'enviado', 'aprovado', 'recusado'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFiltro(s)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-semibold tracking-wide uppercase transition-all border ${
              filtro === s
                ? 'bg-[#4f46e5] text-white border-[#4f46e5]'
                : 'bg-white text-[#64748b] border-[#e2e8f0] hover:border-[#94a3b8] hover:text-[#0f172a]'
            }`}
          >
            {s === 'todos' ? 'Todos' : STATUS_LABEL[s as StatusOrcamento]}
          </button>
        ))}
      </div>

      {/* Lista */}
      {lista.length === 0 ? (
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-12 text-center">
          <div className="text-[13px] font-semibold text-[#0f172a] mb-1">Nenhum orçamento</div>
          <p className="text-[12px] text-[#64748b]">Os orçamentos enviados via WhatsApp na negociação aparecem aqui automaticamente.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#e2e8f0]">
                <th className="text-left text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wide px-5 py-3">Cliente</th>
                <th className="text-left text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wide px-3 py-3">Título</th>
                <th className="text-left text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wide px-3 py-3">Status</th>
                <th className="text-right text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wide px-3 py-3">Total</th>
                <th className="text-right text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wide px-3 py-3">Data</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {lista.map(o => (
                <tr key={o.id} className="hover:bg-[#f8fafc] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="text-[13px] font-semibold text-[#0f172a]">{o.clientes.nome}</div>
                    <div className="text-[11px] text-[#94a3b8]">{o.clientes.telefone}</div>
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="text-[12px] text-[#475569]">{o.titulo ?? '—'}</div>
                    <div className="text-[10px] text-[#94a3b8]">{o.orcamento_itens.length} item{o.orcamento_itens.length !== 1 ? 's' : ''}</div>
                  </td>
                  <td className="px-3 py-3.5">
                    <span className={`inline-block text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full ${STATUS_STYLE[o.status]}`}>
                      {STATUS_LABEL[o.status]}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-right">
                    <div className="text-[14px] font-bold text-[#0f172a]">{fmt(totalOrc(o))}</div>
                  </td>
                  <td className="px-3 py-3.5 text-right">
                    <div className="text-[11px] text-[#94a3b8]">
                      {new Date(o.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-2 justify-end">
                      <a
                        href={whatsappHref(o)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="p-1.5 rounded-lg bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors"
                        title="Enviar via WhatsApp"
                      >
                        <Send size={12} />
                      </a>
                      <button
                        onClick={() => router.push(`/orcamentos/${o.id}`)}
                        className="p-1.5 rounded-lg border border-[#e2e8f0] text-[#94a3b8] hover:border-[#94a3b8] hover:text-[#0f172a] transition-colors"
                        title="Ver orçamento"
                      >
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
