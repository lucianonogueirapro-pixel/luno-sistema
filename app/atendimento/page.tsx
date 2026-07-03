export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'

import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { MessageSquare, Settings, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import KanbanAtendimento from '@/components/atendimento/KanbanAtendimento'

export default async function AtendimentoPage() {
  const supabase = await createClient()
  const [{ data: conversas }, { data: colunas }] = await Promise.all([
    supabase
      .from('wa_conversas')
      .select('id, telefone, nome, status, perfil, origem, followup_em, followup_enviado, ultima_mensagem_at, canal, etiquetas, created_at')
      .order('ultima_mensagem_at', { ascending: false, nullsFirst: false })
      .limit(300),
    supabase
      .from('wa_kanban_colunas')
      .select('id, slug, nome, cor, ordem')
      .eq('ativo', true)
      .order('ordem'),
  ])

  // Contadores por status
  const { data: todosStatus } = await supabase
    .from('wa_conversas')
    .select('status')

  const counts: Record<string, number> = {}
  for (const c of todosStatus ?? []) {
    counts[c.status] = (counts[c.status] ?? 0) + 1
  }
  const total = Object.values(counts).reduce((s, v) => s + v, 0)

  const { data: cfgs } = await supabase
    .from('wa_config')
    .select('ativo, instance_name, nome')
    .order('created_at', { ascending: true })
    .limit(5)

  const algumAtivo = cfgs?.some(c => c.ativo)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 pt-5 pb-0">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 bg-[#4f46e5] text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg hover:bg-[#374151] transition-colors">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 10L4 6L8 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Voltar
        </Link>
      </div>

      <PageHeader
        title="Luna · Atendimento"
        subtitle="Agente de atendimento 24/7 via WhatsApp"
        action={
          <Link
            href="/atendimento/configuracoes"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-[#475569] border border-[#e2e8f0] rounded-lg hover:bg-[#f8fafc] transition-colors"
          >
            <Settings size={12} />
            Configurar
          </Link>
        }
      />

      <div className="flex-1 overflow-hidden flex flex-col px-6 pb-4 gap-4">

        {/* Status da integração */}
        <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg border text-[12px] flex-shrink-0 ${
          algumAtivo
            ? 'bg-[#f0fdf4] border-[#bbf7d0] text-[#15803d]'
            : 'bg-[#fffbeb] border-[#fde68a] text-[#92400e]'
        }`}>
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${algumAtivo ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
          {algumAtivo
            ? `Conectado — ${cfgs?.filter(c => c.ativo).map(c => c.nome || c.instance_name).join(', ')}`
            : 'Desconectado — configure a integração para ativar'}
          {!algumAtivo && (
            <Link href="/atendimento/configuracoes" className="ml-auto text-[11px] underline">
              Configurar agora
            </Link>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-3 flex-shrink-0">
          {[
            { label: 'Total',       value: total,                                                                         icon: MessageSquare, color: '#475569' },
            { label: 'Em atend.',   value: counts.em_atendimento ?? 0,                                                    icon: Clock,         color: '#c2410c' },
            { label: 'Agendados',   value: counts.agendado ?? 0,                                                           icon: CheckCircle2,  color: '#15803d' },
            { label: 'Follow-ups',  value: (counts.followup_01 ?? 0) + (counts.followup_02 ?? 0) + (counts.followup_03 ?? 0), icon: AlertCircle,   color: '#92400e' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white border border-[#e2e8f0] rounded-xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
                <Icon size={16} style={{ color }} />
              </div>
              <div>
                <div className="text-xl font-bold text-[#0f172a]">{value}</div>
                <div className="text-[10px] text-[#94a3b8] uppercase tracking-wide">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Kanban */}
        <div className="flex-1 overflow-hidden">
          {!conversas?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#94a3b8]">
              <MessageSquare size={32} strokeWidth={1.5} className="mb-3" />
              <div className="text-[13px] font-medium">Nenhuma conversa encontrada</div>
              <div className="text-[11px] mt-1">As mensagens do WhatsApp aparecerão aqui automaticamente</div>
            </div>
          ) : (
            <KanbanAtendimento conversasIniciais={conversas as any} colunasIniciais={(colunas ?? []) as any} />
          )}
        </div>

      </div>
    </div>
  )
}
