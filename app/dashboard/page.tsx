export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { MonthSelector } from '@/components/dashboard/MonthSelector'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface LancamentoEntrada {
  tipo: 'entrada'; mes: string
  valor_previsto: number; pct_maquineta: number | null; pct_imposto: number
}
interface LancamentoSaida {
  tipo: 'saida'; mes: string; status: 'pend' | 'pago'
  valor_previsto: number; valor_pago: number | null
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
const fmtN = (v: number) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(v || 0)

function ultimos12Meses(): string[] {
  const hoje = new Date()
  const meses: string[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return meses
}

function calcLiq(entradas: LancamentoEntrada[]) {
  return entradas.reduce((s, e) => {
    const pm = e.pct_maquineta ?? 0
    const pi = e.pct_imposto ?? 0
    return s + (e.valor_previsto ?? 0) * (1 - pm / 100 - pi / 100)
  }, 0)
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const { mes: mesParam } = await searchParams
  const meAtual = new Date().toISOString().slice(0, 7)
  const mes = /^\d{4}-\d{2}$/.test(mesParam ?? '') ? mesParam! : meAtual

  const [mesY, mesM] = mes.split('-').map(Number)
  const mesInicio = new Date(mesY, mesM - 1, 1).toISOString()
  const mesFim    = new Date(mesY, mesM, 1).toISOString()

  const supabase = await createClient()

  const [
    { data: lancamentos },
    { data: todoLancs },
    { data: clientes },
    { data: produtosBaixosRaw },
    { count: leadsAtivos },
    { data: agendaMes },
    { data: clientesRecentes },
  ] = await Promise.all([
    supabase.from('lancamentos')
      .select('tipo, valor_previsto, valor_pago, status, pct_maquineta, pct_imposto, mes')
      .eq('mes', mes),
    supabase.from('lancamentos')
      .select('mes, tipo, valor_previsto, valor_pago, status, pct_maquineta, pct_imposto'),
    supabase.from('clientes').select('id').lt('created_at', mesFim),
    supabase.from('produtos')
      .select('id, nome, quantidade, quantidade_min, unidade')
      .gt('quantidade_min', 0),
    supabase.from('wa_conversas')
      .select('*', { count: 'exact', head: true })
      .not('status', 'in', '("fechado","perdido")'),
    supabase.from('agenda')
      .select('id, status')
      .gte('data_hora', mesInicio)
      .lt('data_hora', mesFim),
    supabase.from('clientes')
      .select('id, nome, telefone, canal_aquisicao, created_at')
      .order('created_at', { ascending: false })
      .limit(6),
  ])

  const lancs    = (lancamentos ?? []) as unknown as (LancamentoEntrada | LancamentoSaida)[]
  const allLancs = (todoLancs ?? []) as unknown as (LancamentoEntrada | LancamentoSaida)[]

  // ── Financeiro do mês ──
  const mesEntradas  = lancs.filter(l => l.tipo === 'entrada') as LancamentoEntrada[]
  const mesSaidas    = lancs.filter(l => l.tipo === 'saida')   as LancamentoSaida[]
  const entradasBruto = mesEntradas.reduce((s, e) => s + (e.valor_previsto ?? 0), 0)
  const saidasPagas  = mesSaidas.filter(s => s.status === 'pago').reduce((s, l) => s + (l.valor_pago ?? l.valor_previsto ?? 0), 0)
  const aPagar       = mesSaidas.filter(s => s.status === 'pend').reduce((s, l) => s + (l.valor_previsto ?? 0), 0)
  const resultadoMes = entradasBruto - saidasPagas

  // ── YTD ──
  const ytdEntradas = allLancs.filter(l => l.tipo === 'entrada') as LancamentoEntrada[]
  const ytdSaidas   = allLancs.filter(l => l.tipo === 'saida' && (l as LancamentoSaida).status === 'pago') as LancamentoSaida[]
  const ytdBruto    = ytdEntradas.reduce((s, e) => s + (e.valor_previsto ?? 0), 0)
  const ytdLiq      = calcLiq(ytdEntradas)
  const ytdDesp     = ytdSaidas.reduce((s, l) => s + (l.valor_pago ?? l.valor_previsto ?? 0), 0)
  const ytdResult   = ytdLiq - ytdDesp

  // ── Gráfico por mês ──
  const MESES = ultimos12Meses()
  const mesDados = MESES.map(m => {
    const ent = allLancs.filter(l => l.mes === m && l.tipo === 'entrada') as LancamentoEntrada[]
    const sai = allLancs.filter(l => l.mes === m && l.tipo === 'saida' && (l as LancamentoSaida).status === 'pago') as LancamentoSaida[]
    const bruto = ent.reduce((s, e) => s + (e.valor_previsto ?? 0), 0)
    const desp  = sai.reduce((s, l) => s + (l.valor_pago ?? l.valor_previsto ?? 0), 0)
    return { mes: m, bruto, resultado: bruto - desp }
  })
  const maxBruto = Math.max(...mesDados.map(d => d.bruto), 1)

  // ── Agenda mês ──
  const agMes = agendaMes ?? []
  const agendaCounts = {
    agendado:  agMes.filter(a => a.status === 'agendado').length,
    realizado: agMes.filter(a => a.status === 'realizado').length,
    cancelado: agMes.filter(a => a.status === 'cancelado').length,
  }

  const totalClientes   = (clientes ?? []).length
  const alertasEstoque  = (produtosBaixosRaw ?? []).filter(p => p.quantidade <= p.quantidade_min)
  const recentes = clientesRecentes ?? []

  const [mY, mM] = mes.split('-').map(Number)
  const mesNome = new Date(mY, mM - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Visão geral do negócio">
        <MonthSelector mes={mes} />
      </PageHeader>

      {/* Alerta estoque */}
      {alertasEstoque.length > 0 && (
        <div className="mb-4 bg-[#fffbeb] border border-[#f59e0b]/30 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="w-5 h-5 rounded-full bg-[#f59e0b]/20 border border-[#f59e0b]/40 flex items-center justify-center text-[#f59e0b] text-[10px] font-bold flex-shrink-0">!</span>
          <div className="flex-1">
            <div className="text-[12px] font-bold text-[#b45309]">Estoque baixo — {alertasEstoque.length} item(ns)</div>
            <div className="text-[11px] text-[#64748b] mt-0.5">
              {alertasEstoque.slice(0, 3).map((i: any) => `${i.nome} (${i.quantidade} ${i.unidade})`).join(' · ')}
              {alertasEstoque.length > 3 && ` · +${alertasEstoque.length - 3} mais`}
            </div>
          </div>
          <Link href="/insumos" className="text-[11px] font-semibold text-[#b45309] hover:underline whitespace-nowrap">Ver estoque →</Link>
        </div>
      )}

      {/* ── KPIs financeiros do mês ── */}
      <div className="text-[9px] font-semibold uppercase tracking-[.16em] text-[#94a3b8] mb-2 px-0.5">
        Financeiro · {mesNome}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KpiBlock label="Entradas"     value={fmt(entradasBruto)} sub="recebido no mês"    accent="#34d399" trend="up" />
        <KpiBlock label="Saídas Pagas" value={fmt(saidasPagas)}   sub="despesas quitadas"  accent="#f87171" trend="down" />
        <KpiBlock label="A Pagar"      value={fmt(aPagar)}         sub="pendente no mês"    accent="#fbbf24" trend="neutral" />
        <KpiBlock
          label="Resultado"
          value={fmt(resultadoMes)}
          sub={resultadoMes >= 0 ? 'saldo positivo' : 'saldo negativo'}
          accent={resultadoMes >= 0 ? '#34d399' : '#f87171'}
          trend={resultadoMes >= 0 ? 'up' : 'down'}
        />
      </div>

      {/* ── KPIs operacionais ── */}
      <div className="text-[9px] font-semibold uppercase tracking-[.16em] text-[#94a3b8] mb-2 px-0.5">
        Operacional
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KpiBlock label="Clientes"       value={fmtN(totalClientes)}         sub="base total"                              accent="#22d3ee" trend="neutral" />
        <KpiBlock label="Leads ativos"   value={fmtN(leadsAtivos ?? 0)}     sub="no CRM agora"                            accent="#34d399" trend="neutral" />
        <KpiBlock label="Agendamentos"   value={fmtN(agMes.length)}          sub={`no mês · ${agendaCounts.realizado} realizados`} accent="#818cf8" trend="neutral" />
        <KpiBlock label="Cancelamentos"  value={fmtN(agendaCounts.cancelado)} sub="no mês"                                accent="#f87171" trend="neutral" />
      </div>

      {/* ── KPIs acumulado no ano ── */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl px-5 py-4 mb-5">
        <div className="text-[9px] font-semibold uppercase tracking-[.16em] text-[#94a3b8] mb-3">
          Acumulado no Ano
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {([
            ['Faturamento Bruto', fmt(ytdBruto),  '#34d399'],
            ['Receita Líquida',   fmt(ytdLiq),    '#22d3ee'],
            ['Total Despesas',    fmt(ytdDesp),   '#f87171'],
            ['Resultado YTD',     fmt(ytdResult), ytdResult >= 0 ? '#34d399' : '#f87171'],
          ] as [string, string, string][]).map(([label, value, color]) => (
            <div key={label}>
              <div className="text-[20px] font-bold leading-none" style={{ color }}>{value}</div>
              <div className="text-[10px] text-[#94a3b8] mt-1 font-medium">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Corpo principal ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 items-start">

        {/* Coluna esquerda — 2/3 */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Faturamento por mês */}
          <Card>
            <CardHeader><CardTitle>Faturamento por Mês</CardTitle></CardHeader>
            <CardBody className="space-y-3">
              {mesDados.map(d => (
                <div key={d.mes}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-[#475569]">{d.mes.slice(5, 7)}/{d.mes.slice(2, 4)}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-[#94a3b8]">Res: <span className={d.resultado >= 0 ? 'text-emerald-600' : 'text-rose-500'}>{fmt(d.resultado)}</span></span>
                      <span className="text-[12px] font-bold text-[#0f172a]">{fmt(d.bruto)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${(d.bruto / maxBruto) * 100}%`, backgroundColor: d.mes === mes ? 'var(--sc, #4f46e5)' : '#94a3b8' }} />
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

          {/* Clientes recentes */}
          <Card>
            <CardHeader>
              <CardTitle>Clientes Recentes</CardTitle>
              <Link href="/pacientes" className="text-[11px] text-[#64748b] hover:text-[#0f172a] font-semibold">Ver todos →</Link>
            </CardHeader>
            <div className="divide-y divide-[#f1f5f9]">
              {recentes.length === 0 && (
                <div className="py-10 text-center text-[13px] text-[#64748b]">
                  Nenhum cliente ainda.{' '}
                  <Link href="/pacientes/nova" className="text-[#0f172a] font-semibold hover:underline">Cadastrar primeiro →</Link>
                </div>
              )}
              {recentes.map((c: any) => (
                <Link key={c.id} href={`/pacientes/${c.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[#f8fafc] transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#34d399] to-[#059669] flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                    {(c.nome?.[0] ?? '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-[#0f172a] truncate">{c.nome}</div>
                    <div className="text-[10px] text-[#64748b]">
                      {c.telefone} · {new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </div>
                  </div>
                  {c.canal_aquisicao && (
                    <span className="text-[10px] font-semibold text-[#64748b] bg-[#f1f5f9] px-2 py-0.5 rounded-full flex-shrink-0">
                      {c.canal_aquisicao}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </Card>

          {/* Resumo por mês */}
          {mesDados.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Resumo por Mês</CardTitle></CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#f1f5f9]">
                      {['Mês', 'Entradas', 'Despesas', 'Resultado'].map(h => (
                        <th key={h} className="text-left text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wide px-4 py-2.5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f5f9]">
                    {mesDados.map(d => (
                      <tr key={d.mes} className={`transition-colors ${d.mes === mes ? 'bg-[var(--sc,#4f46e5)]/5' : 'hover:bg-[#f8fafc]'}`}>
                        <td className="px-4 py-2.5 text-[11px] font-semibold text-[#475569]">
                          {d.mes.slice(5, 7)}/{d.mes.slice(2, 4)}
                          {d.mes === mes && <span className="ml-1.5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ color: 'var(--sc,#4f46e5)', backgroundColor: 'var(--sc,#4f46e5)18' }}>atual</span>}
                        </td>
                        <td className="px-4 py-2.5 text-[12px] font-semibold text-[#0f172a]">{fmt(d.bruto)}</td>
                        <td className="px-4 py-2.5 text-[12px] text-[#475569]">{fmt(d.bruto - d.resultado)}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[12px] font-bold ${d.resultado >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {fmt(d.resultado)}
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-[#e2e8f0] bg-[#f8fafc]">
                      <td className="px-4 py-2.5 text-[10px] font-bold text-[#94a3b8] uppercase tracking-wide">Total</td>
                      <td className="px-4 py-2.5 text-[13px] font-bold text-[#0f172a]">{fmt(ytdBruto)}</td>
                      <td className="px-4 py-2.5 text-[13px] font-bold text-[#0f172a]">{fmt(ytdDesp)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[13px] font-bold ${ytdResult >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{fmt(ytdResult)}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        {/* Coluna direita — 1/3 */}
        <div className="flex flex-col gap-3">

          {/* Atalhos rápidos */}
          <Card>
            <CardHeader><CardTitle>Atalhos Rápidos</CardTitle></CardHeader>
            <CardBody className="grid grid-cols-2 gap-2">
              {([
                ['/pacientes/nova',   '#22d3ee', 'Novo Cliente'],
                ['/agenda/nova',      '#818cf8', 'Agendar'],
                ['/crm',              '#34d399', 'Abrir CRM'],
                ['/financeiro',       '#fbbf24', 'Lançamentos'],
              ] as [string, string, string][]).map(([href, color, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center justify-center text-center py-3 rounded-xl border border-[#e2e8f0] hover:border-[#94a3b8] transition-colors text-[12px] font-semibold"
                  style={{ color }}
                >
                  {label}
                </Link>
              ))}
            </CardBody>
          </Card>

          {/* Agenda do mês */}
          <Card>
            <CardHeader><CardTitle>Agenda · {mesNome}</CardTitle></CardHeader>
            <CardBody>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ['Agendadas', agendaCounts.agendado,  '#818cf8'],
                  ['Realizadas',agendaCounts.realizado, '#34d399'],
                  ['Canceladas',agendaCounts.cancelado, '#f87171'],
                ] as [string, number, string][]).map(([label, count, color]) => (
                  <div key={label} className="text-center py-3 rounded-xl border border-[#f1f5f9]">
                    <div className="text-[22px] font-bold leading-none" style={{ color }}>{count}</div>
                    <div className="text-[9px] font-semibold text-[#94a3b8] uppercase tracking-wide mt-1">{label}</div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Atividade ao vivo */}
          <Card>
            <CardHeader>
              <CardTitle>Atividade ao Vivo</CardTitle>
              <span className="flex items-center gap-1 text-[10px] text-[#34d399] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34d399]"
                  style={{ animation: 'bar-pulse 1.4s ease-in-out infinite' }} />
                Realtime
              </span>
            </CardHeader>
            <ActivityFeed />
          </Card>

        </div>
      </div>
    </div>
  )
}

function KpiBlock({ label, value, sub, accent, trend }: {
  label: string; value: string; sub: string; accent: string; trend: 'up' | 'down' | 'neutral'
}) {
  return (
    <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(circle at 90% 10%, ${accent}14, transparent 60%)` }} />
      <div className="flex items-start justify-between mb-2">
        <div className="text-[9px] font-semibold uppercase tracking-[.16em] text-[#94a3b8]">{label}</div>
        {trend === 'up'      && <TrendingUp  size={11} className="text-emerald-400 flex-shrink-0" />}
        {trend === 'down'    && <TrendingDown size={11} className="text-rose-400 flex-shrink-0" />}
        {trend === 'neutral' && <Minus        size={11} className="text-[#94a3b8] flex-shrink-0" />}
      </div>
      <div className="text-[22px] font-bold leading-none mb-1" style={{ color: accent }}>{value}</div>
      <div className="text-[10px] text-[#94a3b8]">{sub}</div>
    </div>
  )
}
