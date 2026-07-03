export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChatWindow } from '@/components/atendimento/ChatWindow'
import {
  ArrowLeft, Phone, Clock, Tag, User, MessageSquare,
  CalendarCheck, Zap, MoreHorizontal,
} from 'lucide-react'
import { DeleteConversaButton } from '@/components/atendimento/DeleteConversaButton'
import { AssumiButton } from '@/components/atendimento/AssumiButton'

const STATUS_CFG: Record<string, { label: string; cor: string; bg: string }> = {
  novo:            { label: 'Novo',           cor: '#1E6B8A', bg: '#E0F2FE' },
  em_atendimento:  { label: 'Em atendimento', cor: '#b45309', bg: '#FEF3C7' },
  qualificado:     { label: 'Qualificado',    cor: '#4A6FA5', bg: '#EFF4FB' },
  agendado:        { label: 'Agendado',       cor: '#2D6A1A', bg: '#DCFCE7' },
  nao_respondeu:   { label: 'Sem resposta',   cor: '#475569', bg: '#f8fafc' },
  perdido:         { label: 'Perdido',        cor: '#8B1A1A', bg: '#FEE2E2' },
  convertido:      { label: 'Convertido',     cor: '#166534', bg: '#F0FDF4' },
}

const PERFIL_CFG: Record<string, { label: string }> = {
  preventivo: { label: 'Preventivo' },
  corretivo:  { label: 'Corretivo' },
  experiente: { label: 'Experiente' },
}

function fmtTel(t: string) {
  const raw = t.includes('@') ? t.split('@')[0] : t
  const d = raw.replace(/\D/g, '')
  if (d.length === 13) return `+${d.slice(0,2)} (${d.slice(2,4)}) ${d.slice(4,9)}-${d.slice(9)}`
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  if (d.length > 8) return `+${d}`
  return raw
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Fortaleza',
  })
}

export default async function ConversaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()

  const { id } = await params

  const { data: conversa } = await supabase
    .from('wa_conversas')
    .select('*')
    .eq('id', id)
    .single()

  if (!conversa) notFound()

  const { data: mensagens } = await supabase
    .from('wa_mensagens')
    .select('id, direcao, tipo, conteudo, enviado, lido, created_at')
    .eq('conversa_id', id)
    .order('created_at', { ascending: true })
    .limit(200)

  const status = STATUS_CFG[conversa.status] ?? STATUS_CFG.novo
  const perfil = conversa.perfil ? PERFIL_CFG[conversa.perfil] : null

  return (
    <div className="flex h-full">
      {/* Painel lateral — info da conversa */}
      <aside className="w-[240px] flex-shrink-0 border-r border-[#e2e8f0] bg-white flex flex-col">
        <div className="px-4 pt-4 pb-3 border-b border-[#e2e8f0]">
          <Link
            href="/atendimento"
            className="inline-flex items-center gap-1.5 bg-[#4f46e5] text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg hover:bg-[#374151] transition-colors mb-3"
          >
            <ArrowLeft size={12} />
            Voltar
          </Link>

          {/* Avatar + nome */}
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 rounded-full bg-[#4f46e5] flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              {(conversa.nome ?? conversa.telefone)[0]?.toUpperCase()}
            </div>
            <div>
              <div className="text-[13px] font-semibold text-[#0f172a]">
                {conversa.nome ?? 'Sem nome'}
              </div>
              <div className="text-[10px] text-[#94a3b8] flex items-center gap-1">
                <Phone size={9} />
                {fmtTel(conversa.telefone)}
              </div>
            </div>
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium"
              style={{ color: status.cor, background: status.bg }}
            >
              {status.label}
            </span>
            {conversa.canal === 'paciente_modelo' && (
              <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold bg-[#fdf4ff] text-[#7c3aed] border border-[#e9d5ff]">
                Paciente modelo
              </span>
            )}
          </div>
        </div>

        {/* Detalhes */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {perfil && (
            <div>
              <div className="text-[9px] text-[#94a3b8] uppercase tracking-wide mb-1">Perfil</div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#0f172a]">
                <User size={11} />
                {perfil.label}
              </div>
            </div>
          )}

          {conversa.origem && (
            <div>
              <div className="text-[9px] text-[#94a3b8] uppercase tracking-wide mb-1">Origem</div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#0f172a]">
                <Tag size={11} />
                {conversa.origem.replace(/_/g, ' ')}
              </div>
            </div>
          )}

          <div>
            <div className="text-[9px] text-[#94a3b8] uppercase tracking-wide mb-1">Primeiro contato</div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#475569]">
              <Clock size={11} />
              {fmtData(conversa.created_at)}
            </div>
          </div>

          <div>
            <div className="text-[9px] text-[#94a3b8] uppercase tracking-wide mb-1">Última mensagem</div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#475569]">
              <MessageSquare size={11} />
              {fmtData(conversa.ultima_mensagem_at)}
            </div>
          </div>

          {conversa.followup_em && (
            <div>
              <div className="text-[9px] text-[#94a3b8] uppercase tracking-wide mb-1">Follow-up</div>
              <div className={`flex items-center gap-1.5 text-[11px] ${conversa.followup_enviado ? 'text-green-600' : 'text-[#b45309]'}`}>
                <Zap size={11} />
                {conversa.followup_enviado ? 'Enviado' : fmtData(conversa.followup_em)}
              </div>
            </div>
          )}

          {conversa.notas && (
            <div>
              <div className="text-[9px] text-[#94a3b8] uppercase tracking-wide mb-1">Notas</div>
              <p className="text-[11px] text-[#475569] leading-relaxed">{conversa.notas}</p>
            </div>
          )}
        </div>

        {/* Ações rápidas */}
        <div className="px-4 py-3 border-t border-[#e2e8f0] space-y-2">
          <AssumiButton conversaId={id} modoHumano={conversa.modo_humano ?? false} />
          <UpdateStatusForm conversaId={id} statusAtual={conversa.status} />
          <DeleteConversaButton conversaId={id} />
        </div>
      </aside>

      {/* Área do chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header do chat */}
        <div className="px-4 py-3 border-b border-[#e2e8f0] bg-white flex items-center gap-3">
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-[#0f172a]">
              {conversa.nome ?? fmtTel(conversa.telefone)}
            </div>
            <div className="text-[10px] text-[#94a3b8]">
              Agente: Luna · {mensagens?.length ?? 0} mensagens
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <ChatWindow
            conversaId={id}
            mensagensIniciais={mensagens ?? []}
            nomeContato={conversa.nome ?? fmtTel(conversa.telefone)}
          />
        </div>
      </div>
    </div>
  )
}

// Formulário de mudança de status (server action simulado via form POST)
function UpdateStatusForm({ conversaId, statusAtual }: { conversaId: string; statusAtual: string }) {
  const opcoes = [
    { value: 'em_atendimento', label: 'Em atendimento' },
    { value: 'qualificado',    label: 'Qualificado' },
    { value: 'agendado',       label: 'Agendado' },
    { value: 'nao_respondeu',  label: 'Sem resposta' },
    { value: 'perdido',        label: 'Perdido' },
    { value: 'convertido',     label: 'Convertido' },
  ]
  return (
    <form action={`/api/whatsapp/conversas/${conversaId}/status`} method="POST" className="space-y-1.5">
      <label className="text-[9px] text-[#94a3b8] uppercase tracking-wide">Alterar status</label>
      <select
        name="status"
        defaultValue={statusAtual}
        className="w-full text-[11px] border border-[#e2e8f0] rounded-lg px-2.5 py-1.5 text-[#0f172a] bg-white focus:outline-none focus:border-[#94a3b8]"
      >
        {opcoes.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <button
        type="submit"
        className="w-full py-1.5 rounded-lg bg-[#4f46e5] text-white text-[11px] hover:bg-[#374151] transition-colors"
      >
        Atualizar
      </button>
    </form>
  )
}
