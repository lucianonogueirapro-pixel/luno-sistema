'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
type AgendaStatus = 'agendado' | 'confirmado' | 'realizado' | 'cancelado' | 'faltou'
type AgendaTipo = 'servico' | 'avaliacao' | 'retorno' | 'outro'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const STATUS_LABEL: Record<AgendaStatus, string> = {
  agendado: 'Agendado', confirmado: 'Confirmado', realizado: 'Realizado',
  cancelado: 'Cancelado', faltou: 'Faltou',
}
const STATUS_BADGE: Record<AgendaStatus, 'amber' | 'blue' | 'green' | 'red' | 'gray'> = {
  agendado: 'amber', confirmado: 'blue', realizado: 'green', cancelado: 'red', faltou: 'gray',
}
const TIPO_LABEL: Record<AgendaTipo, string> = {
  servico: 'Serviço', avaliacao: 'Avaliação', retorno: 'Retorno', outro: 'Outro',
}
const TODOS_STATUS: AgendaStatus[] = ['agendado', 'confirmado', 'realizado', 'cancelado', 'faltou']

export default function AgendaItemPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [item, setItem] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  function copyText(key: string, text: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('agenda')
        .select('*, clientes(id, nome, telefone)')
        .eq('id', id)
        .single()
      setItem(data)
      setLoading(false)
    }
    load()
  }, [id, supabase])

  async function updateStatus(status: AgendaStatus) {
    setSaving(true)
    await supabase.from('agenda').update({ status }).eq('id', id)
    setItem((prev: any) => ({ ...prev, status }))
    setSaving(false)
  }

  async function excluir() {
    if (!confirm('Excluir este agendamento? Esta ação não pode ser desfeita.')) return
    setExcluindo(true)
    await supabase.from('agenda').delete().eq('id', id)
    router.push('/agenda')
  }

  if (loading) return <div className="p-8 text-[#64748b] text-sm">Carregando...</div>
  if (!item) return <div className="p-8 text-[#64748b] text-sm">Agendamento não encontrado.</div>

  const dataHora = new Date(item.data_hora)
  const nome = item.clientes?.nome?.split(' ')[0] ?? 'Cliente'
  const dataFmt = dataHora.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
  const horaFmt = dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const msgDiaAntes = `Olá, ${nome}! Aqui é a Luna, assistente da Luno.\n\nPassando para confirmar sua avaliação amanhã, ${dataFmt}, às ${horaFmt}.\n\nPor favor, confirme sua presença respondendo esta mensagem. Qualquer dúvida, estamos à disposição.\n\nLuno`

  const msgDiaAtendimento = `Bom dia, ${nome}! Aqui é a Luna, assistente da Luno.\n\nHoje é o dia da sua seu atendimento, às ${horaFmt}.\n\nEndereço: [endereço da empresa]\n\nVenha com a pele limpa, sem maquiagem, para que o profissional possa realizar o atendimento.\n\nAté logo!`

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={item.clientes?.nome ?? '—'}
        subtitle={`${TIPO_LABEL[item.tipo as AgendaTipo] ?? item.tipo} · ${dataHora.toLocaleString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}`}
      >
        <Badge variant={STATUS_BADGE[item.status as AgendaStatus]}>
          {STATUS_LABEL[item.status as AgendaStatus]}
        </Badge>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Detalhes</CardTitle></CardHeader>
          <CardBody className="space-y-2 text-[13px]">
            <div className="flex justify-between">
              <span className="text-[#64748b]">Duração</span>
              <span className="font-semibold text-[#0f172a]">{item.duracao_min} min</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748b]">Tipo</span>
              <span className="font-semibold text-[#0f172a]">{TIPO_LABEL[item.tipo as AgendaTipo] ?? item.tipo}</span>
            </div>
            {item.valor != null && (
              <div className="flex justify-between">
                <span className="text-[#64748b]">Valor</span>
                <span className="font-semibold text-[#2D6A1A]">{fmt(item.valor)}</span>
              </div>
            )}
            {item.obs && (
              <div>
                <div className="text-[#64748b] mb-0.5">Observações</div>
                <div className="text-[#0f172a]">{item.obs}</div>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Cliente</CardTitle></CardHeader>
          <CardBody className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#94a3b8] to-[#64748b] flex items-center justify-center text-white font-bold text-[12px]">
                {item.clientes?.nome?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div>
                <div className="text-[13px] font-semibold text-[#0f172a]">{item.clientes?.nome}</div>
                <div className="text-[11px] text-[#64748b]">{item.clientes?.telefone}</div>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Link href={`/pacientes/${item.clientes?.id}`}>
                <Button size="sm" variant="secondary">Ver ficha →</Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>Atualizar Status</CardTitle></CardHeader>
        <CardBody>
          <div className="flex flex-wrap gap-2">
            {TODOS_STATUS.map(s => (
              <button
                key={s}
                type="button"
                disabled={saving || item.status === s}
                onClick={() => updateStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all disabled:opacity-50
                  ${item.status === s
                    ? 'bg-[#4f46e5] text-white border-[#4f46e5]'
                    : 'bg-white text-[#64748b] border-[#e2e8f0] hover:border-[#94a3b8] hover:text-[#0f172a]'}`}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Templates WhatsApp */}
      <Card className="mt-4">
        <CardHeader><CardTitle>Mensagens WhatsApp</CardTitle></CardHeader>
        <CardBody className="space-y-3">
          <div>
            <div className="text-[11px] font-bold text-[#64748b] uppercase tracking-wide mb-1.5">1 dia antes — Confirmação</div>
            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-3 py-2.5 text-[12px] text-[#0f172a] whitespace-pre-wrap mb-2">
              {msgDiaAntes}
            </div>
            <button
              type="button"
              onClick={() => copyText('antes', msgDiaAntes)}
              className="text-[11px] font-semibold text-[#64748b] hover:text-[#0f172a] border border-[#e2e8f0] rounded-lg px-3 py-1.5 transition-colors"
            >
              {copied === 'antes' ? 'Copiado!' : 'Copiar mensagem'}
            </button>
          </div>

          <div className="border-t border-[#f1f5f9] pt-3">
            <div className="text-[11px] font-bold text-[#64748b] uppercase tracking-wide mb-1.5">Dia do atendimento — Endereço + voucher</div>
            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-3 py-2.5 text-[12px] text-[#0f172a] whitespace-pre-wrap mb-2">
              {msgDiaAtendimento}
            </div>
            <button
              type="button"
              onClick={() => copyText('dia', msgDiaAtendimento)}
              className="text-[11px] font-semibold text-[#64748b] hover:text-[#0f172a] border border-[#e2e8f0] rounded-lg px-3 py-1.5 transition-colors"
            >
              {copied === 'dia' ? 'Copiado!' : 'Copiar mensagem'}
            </button>
          </div>
        </CardBody>
      </Card>

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push('/agenda')}
          className="text-[12px] text-[#64748b] hover:text-[#0f172a] font-semibold"
        >
          ← Voltar à Agenda
        </button>
        <button
          type="button"
          onClick={excluir}
          disabled={excluindo}
          className="text-[12px] text-[#8B1A1A] hover:text-red-600 font-semibold border border-[#fca5a5] rounded-lg px-3 py-1.5 hover:bg-[#fee2e2] disabled:opacity-50 transition-colors"
        >
          {excluindo ? 'Excluindo...' : 'Excluir agendamento'}
        </button>
      </div>
    </div>
  )
}
