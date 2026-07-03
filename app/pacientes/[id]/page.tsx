export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { BackButton } from '@/components/ui/BackButton'
import EditPacienteForm from './EditPacienteForm'
import { MessageSquare, Star } from 'lucide-react'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default async function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: cliente },
    { data: agendaData },
    { data: orcamentosData },
    { data: lancamentos },
    { data: empresaCfg },
  ] = await Promise.all([
    supabase.from('clientes').select('*').eq('id', id).single(),
    supabase
      .from('agenda')
      .select('id, data_hora, tipo, valor, status')
      .eq('cliente_id', id)
      .not('valor', 'is', null)
      .order('data_hora', { ascending: false })
      .limit(20),
    supabase
      .from('orcamentos')
      .select('id, titulo, created_at')
      .eq('cliente_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('lancamentos')
      .select('id, descricao, valor_previsto, forma_pagamento, created_at')
      .eq('tipo', 'entrada')
      .eq('cliente_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('empresa_config').select('google_place_id').limit(1).maybeSingle(),
  ])

  if (!cliente) notFound()

  const ag = agendaData ?? []
  const lancs = lancamentos ?? []

  const googlePlaceId = (empresaCfg as any)?.google_place_id ?? null
  const reviewUrl = googlePlaceId
    ? `https://search.google.com/local/writereview?placeid=${googlePlaceId}`
    : null
  const telLimpo = cliente.telefone?.replace(/\D/g, '') ?? ''
  const whatsappReviewHref = reviewUrl
    ? `https://wa.me/55${telLimpo}?text=${encodeURIComponent(`Olá ${cliente.nome.split(' ')[0]}! Ficamos felizes em ter você como cliente. Poderia nos deixar uma avaliação no Google? É rápido e nos ajuda muito: ${reviewUrl}`)}`
    : null

  const totalAgenda = ag.reduce((s: number, a: any) => s + (a.valor ?? 0), 0)
  const totalLancs = lancs.reduce((s: number, l: any) => s + (l.valor_previsto ?? 0), 0)
  const totalPago = totalAgenda + totalLancs
  const totalAtend = ag.length + lancs.length
  const ticketMedio = totalAtend > 0 ? totalPago / totalAtend : 0

  const TIPO_LABEL: Record<string, string> = {
    servico: 'Serviço', avaliacao: 'Avaliação', retorno: 'Retorno', outro: 'Outro',
  }

  return (
    <div>
      <div className="mb-4"><BackButton href="/pacientes" label="Voltar aos Clientes" /></div>
      <PageHeader
        title={cliente.nome}
        subtitle={`Cadastrado em ${new Date(cliente.created_at).toLocaleDateString('pt-BR')}`}
        action={
          <div className="flex gap-2">
            {cliente.telefone && (
              <a
                href={`https://wa.me/55${telLimpo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#25D366] text-white text-[11px] font-semibold hover:bg-[#1ebe5d] transition-colors"
              >
                <MessageSquare size={12} />
                WhatsApp
              </a>
            )}
            {whatsappReviewHref && (
              <a
                href={whatsappReviewHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#e2e8f0] text-[11px] font-semibold text-[#f59e0b] hover:border-[#f59e0b] transition-colors"
              >
                <Star size={12} />
                Pedir avaliação Google
              </a>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <EditPacienteForm paciente={cliente} />
        </div>

        <div className="flex flex-col gap-3">
          <Card>
            <CardBody className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-[#64748b]">Total de compras</span>
                <span className="text-[14px] font-bold text-[#0f172a]">{totalAtend}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-[#64748b]">Receita total</span>
                <span className="text-[14px] font-bold text-[#166534]">{fmt(totalPago)}</span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Financeiro</CardTitle></CardHeader>
            <CardBody className="space-y-3 pb-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <div className="text-[13px] font-bold text-[#166534]">{fmt(totalPago)}</div>
                  <div className="text-[9px] text-[#64748b] uppercase tracking-wide mt-0.5">Total</div>
                </div>
                <div className="text-center border-x border-[#f1f5f9]">
                  <div className="text-[13px] font-bold text-[#0f172a]">{totalAtend}</div>
                  <div className="text-[9px] text-[#64748b] uppercase tracking-wide mt-0.5">Atend.</div>
                </div>
                <div className="text-center">
                  <div className="text-[13px] font-bold text-[#4f46e5]">{fmt(ticketMedio)}</div>
                  <div className="text-[9px] text-[#64748b] uppercase tracking-wide mt-0.5">Ticket</div>
                </div>
              </div>
            </CardBody>
            {ag.length > 0 && (
              <div className="divide-y divide-[#f1f5f9]">
                {ag.slice(0, 5).map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <div className="text-[11px] font-semibold text-[#0f172a]">
                        {TIPO_LABEL[a.tipo] ?? a.tipo}
                      </div>
                      <div className="text-[10px] text-[#94a3b8]">
                        {new Date(a.data_hora).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <span className="text-[12px] font-bold text-[#166534]">{fmt(a.valor)}</span>
                  </div>
                ))}
              </div>
            )}
            {ag.length === 0 && lancs.length === 0 && (
              <div className="px-4 pb-4 text-center text-[11px] text-[#64748b]">
                Nenhum atendimento com valor registrado.
              </div>
            )}
          </Card>

          {(orcamentosData?.length ?? 0) > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Orçamentos</CardTitle>
                  <Link href={`/orcamentos/nova?cliente=${id}`} className="text-[10px] text-[#4f46e5] font-semibold hover:underline">
                    + Novo
                  </Link>
                </div>
              </CardHeader>
              <div className="divide-y divide-[#f1f5f9]">
                {(orcamentosData ?? []).map((o: any) => (
                  <Link
                    key={o.id}
                    href={`/orcamentos/${o.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-[#f8fafc] transition-colors"
                  >
                    <div>
                      <div className="text-[12px] font-semibold text-[#0f172a]">{o.titulo ?? 'Orçamento'}</div>
                      <div className="text-[10px] text-[#94a3b8]">
                        {new Date(o.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-[#4f46e5]">Ver</span>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Histórico de Compras</CardTitle></CardHeader>
            <div className="divide-y divide-[#f1f5f9]">
              {lancs.length === 0 && ag.length === 0 && (
                <div className="px-4 py-6 text-center text-[12px] text-[#64748b]">
                  Nenhuma compra registrada ainda.
                </div>
              )}
              {lancs.map((l: any) => (
                <div key={l.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-[12px] font-semibold text-[#0f172a]">
                      {l.descricao || 'Lançamento'}
                    </div>
                    <div className="text-[10px] text-[#94a3b8]">
                      {new Date(l.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {l.forma_pagamento ? ` · ${l.forma_pagamento}` : ''}
                    </div>
                  </div>
                  <span className="text-[12px] font-bold text-[#166534]">{fmt(l.valor_previsto ?? 0)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
