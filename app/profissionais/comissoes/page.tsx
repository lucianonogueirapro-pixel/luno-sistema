'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { BackButton } from '@/components/ui/BackButton'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

interface Agendamento {
  id: string
  data_hora: string
  tipo: string
  valor: number
  status: string
  clientes: { nome: string } | null
  profissional_id: string | null
}

interface Profissional {
  id: string
  nome: string
  cor: string
  comissao_percentual: number
}

const TIPO_LABEL: Record<string, string> = {
  servico: 'Serviço', avaliacao: 'Avaliação',
  retorno: 'Retorno', outro: 'Outro',
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export default function ComissoesPage() {
  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth())
  const [ano, setAno] = useState(hoje.getFullYear())
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [loading, setLoading] = useState(true)
  const [profAberto, setProfAberto] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('profissionais')
      .select('id, nome, cor, comissao_percentual')
      .order('nome')
      .then(({ data }) => setProfissionais(data ?? []))
  }, [])

  useEffect(() => {
    const supabase = createClient()
    setLoading(true)

    const inicio = new Date(ano, mes, 1).toISOString()
    const fim = new Date(ano, mes + 1, 0, 23, 59, 59).toISOString()

    supabase
      .from('agenda')
      .select('id, data_hora, tipo, valor, status, profissional_id, clientes(nome)')
      .gte('data_hora', inicio)
      .lte('data_hora', fim)
      .not('valor', 'is', null)
      .not('profissional_id', 'is', null)
      .order('data_hora', { ascending: false })
      .then(({ data }) => {
        setAgendamentos((data ?? []) as any)
        setLoading(false)
      })
  }, [mes, ano])

  function navMes(dir: -1 | 1) {
    setMes(m => {
      const next = m + dir
      if (next < 0) { setAno(y => y - 1); return 11 }
      if (next > 11) { setAno(y => y + 1); return 0 }
      return next
    })
  }

  const porProfissional = useMemo(() => {
    return profissionais.map(p => {
      const ags = agendamentos.filter(a => a.profissional_id === p.id)
      const totalGerado = ags.reduce((s, a) => s + (a.valor ?? 0), 0)
      const pct = p.comissao_percentual ?? 0
      const valorComissao = totalGerado * pct / 100
      return { ...p, ags, totalGerado, pct, valorComissao }
    }).filter(p => p.ags.length > 0 || p.pct > 0)
  }, [profissionais, agendamentos])

  const totalGeral = porProfissional.reduce((s, p) => s + p.valorComissao, 0)
  const totalGeradoGeral = porProfissional.reduce((s, p) => s + p.totalGerado, 0)

  return (
    <div className="max-w-3xl">
      <BackButton href="/profissionais" label="Voltar a Profissionais" />

      <PageHeader
        title="Comissões"
        subtitle="Repasse por profissional no período selecionado"
      />

      {/* Seletor de mês */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navMes(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e2e8f0] text-[#64748b] hover:border-[#94a3b8] transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-[14px] font-semibold text-[#0f172a] w-36 text-center">
          {MESES[mes]} {ano}
        </span>
        <button
          onClick={() => navMes(1)}
          disabled={mes === hoje.getMonth() && ano === hoje.getFullYear()}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e2e8f0] text-[#64748b] hover:border-[#94a3b8] disabled:opacity-30 transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={20} className="animate-spin text-[#94a3b8]" />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Resumo geral */}
          {porProfissional.length > 1 && (
            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-5 py-4 grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-[13px] font-bold text-[#0f172a]">{fmt(totalGeradoGeral)}</div>
                <div className="text-[9px] text-[#64748b] uppercase tracking-wide mt-0.5">Total gerado</div>
              </div>
              <div className="text-center border-x border-[#e2e8f0]">
                <div className="text-[13px] font-bold text-[#0f172a]">{agendamentos.length}</div>
                <div className="text-[9px] text-[#64748b] uppercase tracking-wide mt-0.5">Atendimentos</div>
              </div>
              <div className="text-center">
                <div className="text-[13px] font-bold text-[#4f46e5]">{fmt(totalGeral)}</div>
                <div className="text-[9px] text-[#64748b] uppercase tracking-wide mt-0.5">Total comissão</div>
              </div>
            </div>
          )}

          {porProfissional.length === 0 && (
            <div className="bg-white border border-[#e2e8f0] rounded-xl py-14 text-center">
              <div className="text-[13px] font-semibold text-[#0f172a] mb-1">Nenhum atendimento com valor neste período</div>
              <div className="text-[11px] text-[#64748b]">Os valores aparecem quando o agendamento tem valor preenchido e está vinculado a um profissional.</div>
            </div>
          )}

          {porProfissional.map(p => (
            <div key={p.id} className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
              {/* Header do profissional */}
              <button
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[#f8fafc] transition-colors text-left"
                onClick={() => setProfAberto(profAberto === p.id ? null : p.id)}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-[13px] flex-shrink-0"
                  style={{ backgroundColor: p.cor }}
                >
                  {p.nome.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-[#0f172a]">{p.nome}</div>
                  <div className="text-[10px] text-[#64748b]">
                    {p.ags.length} atendimento{p.ags.length !== 1 ? 's' : ''} · {p.pct}% de comissão
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-[13px] font-bold text-[#4f46e5]">{fmt(p.valorComissao)}</div>
                  <div className="text-[10px] text-[#94a3b8]">de {fmt(p.totalGerado)}</div>
                </div>
              </button>

              {/* Detalhes */}
              {profAberto === p.id && p.ags.length > 0 && (
                <div className="border-t border-[#f1f5f9] divide-y divide-[#f1f5f9]">
                  {p.ags.map(ag => {
                    const comissaoAg = (ag.valor ?? 0) * p.pct / 100
                    return (
                      <div key={ag.id} className="flex items-center justify-between px-5 py-2.5">
                        <div>
                          <div className="text-[11px] font-semibold text-[#0f172a]">
                            {(ag.clientes as any)?.nome ?? '—'}
                          </div>
                          <div className="text-[10px] text-[#94a3b8]">
                            {new Date(ag.data_hora).toLocaleDateString('pt-BR', {
                              day: '2-digit', month: 'short',
                            })}
                            {' · '}
                            {TIPO_LABEL[ag.tipo] ?? ag.tipo}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] font-semibold text-[#0f172a]">{fmt(ag.valor ?? 0)}</div>
                          <div className="text-[10px] text-[#4f46e5]">+ {fmt(comissaoAg)}</div>
                        </div>
                      </div>
                    )
                  })}

                  <div className="flex items-center justify-between px-5 py-3 bg-[#f8fafc]">
                    <span className="text-[11px] font-semibold text-[#475569]">Total do período</span>
                    <div className="text-right">
                      <span className="text-[12px] font-bold text-[#0f172a]">{fmt(p.totalGerado)}</span>
                      <span className="text-[11px] font-bold text-[#4f46e5] ml-3">→ {fmt(p.valorComissao)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
