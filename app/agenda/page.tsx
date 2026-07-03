'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { AgendaStatus, AgendaTipo } from '@/lib/types'

type Visualizacao = 'dia' | 'semana' | 'mes'

const STATUS_BADGE: Record<AgendaStatus, 'amber' | 'blue' | 'green' | 'red' | 'gray'> = {
  agendado: 'amber', confirmado: 'blue', realizado: 'green', cancelado: 'red', faltou: 'gray',
}
const STATUS_LABEL: Record<AgendaStatus, string> = {
  agendado: 'Agendado', confirmado: 'Confirmado', realizado: 'Realizado',
  cancelado: 'Cancelado', faltou: 'Faltou',
}
const TIPO_LABEL: Record<AgendaTipo, string> = {
  consulta: 'Consulta', retorno: 'Retorno', procedimento: 'Procedimento', avaliacao: 'Avaliação',
}
const TIPO_CHIP: Record<AgendaTipo, string> = {
  consulta:     'bg-blue-50 text-blue-700 border-blue-100',
  retorno:      'bg-emerald-50 text-emerald-700 border-emerald-100',
  procedimento: 'bg-purple-50 text-purple-700 border-purple-100',
  avaliacao:    'bg-amber-50 text-amber-700 border-amber-100',
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function startOfDay(d: Date) {
  const r = new Date(d); r.setHours(0,0,0,0); return r
}
function startOfWeek(d: Date) {
  const r = startOfDay(d); r.setDate(r.getDate() - r.getDay()); return r
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function ItemRow({ item }: { item: any }) {
  const cor = item.profissionais?.cor ?? '#94a3b8'
  return (
    <Link
      href={`/agenda/${item.id}`}
      className="flex items-center gap-3 px-3 py-2.5 hover:bg-[#f8fafc] transition-colors rounded-lg"
    >
      <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: cor }} />
      <div className="text-[13px] font-bold text-[#0f172a] min-w-[44px]">{fmtHora(item.data_hora)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[12px] font-semibold text-[#0f172a] truncate">{item.clientes?.nome ?? '—'}</span>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${TIPO_CHIP[item.tipo as AgendaTipo]}`}>
            {TIPO_LABEL[item.tipo as AgendaTipo]}
          </span>
          {false && (
            <span className="text-[9px] font-semibold text-[#4f46e5] bg-[#ede9fe] rounded px-1 py-0.5 flex-shrink-0">↻</span>
          )}
        </div>
        <div className="text-[11px] text-[#64748b]">
          {item.duracao_min}min
          {item.profissionais?.nome && <span className="ml-1">· {item.profissionais.nome.split(' ')[0]}</span>}
        </div>
      </div>
      <Badge variant={STATUS_BADGE[item.status as AgendaStatus]}>
        {STATUS_LABEL[item.status as AgendaStatus]}
      </Badge>
    </Link>
  )
}

interface Profissional { id: string; nome: string; cor: string }

export default function AgendaPage() {
  const supabase = useMemo(() => createClient(), [])
  const [view, setView] = useState<Visualizacao>('semana')
  const [referencia, setReferencia] = useState(() => startOfDay(new Date()))
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [filtroProfissional, setFiltroProfissional] = useState<string>('')

  // Calcular intervalo de busca conforme view
  const { inicio, fim } = useMemo(() => {
    if (view === 'dia') {
      const s = startOfDay(referencia)
      const e = new Date(s); e.setDate(e.getDate() + 1)
      return { inicio: s, fim: e }
    }
    if (view === 'semana') {
      const s = startOfWeek(referencia)
      const e = new Date(s); e.setDate(e.getDate() + 7)
      return { inicio: s, fim: e }
    }
    // mês
    const s = startOfMonth(referencia)
    const e = new Date(s.getFullYear(), s.getMonth() + 1, 1)
    return { inicio: s, fim: e }
  }, [view, referencia])

  useEffect(() => {
    supabase.from('profissionais').select('id, nome, cor').eq('ativo', true).order('nome')
      .then(({ data }) => setProfissionais(data ?? []))
  }, [supabase])

  useEffect(() => {
    async function load() {
      setLoading(true)
      let q = supabase
        .from('agenda')
        .select('id, data_hora, tipo, status, duracao_min, clientes(nome, telefone), profissionais(nome, cor)')
        .gte('data_hora', inicio.toISOString())
        .lt('data_hora', fim.toISOString())
        .order('data_hora', { ascending: true })
      if (filtroProfissional) q = q.eq('profissional_id', filtroProfissional)
      const { data } = await q
      setItems(data ?? [])
      setLoading(false)
    }
    load()
  }, [supabase, inicio, fim, filtroProfissional])

  function navegar(delta: number) {
    setReferencia(prev => {
      const d = new Date(prev)
      if (view === 'dia') d.setDate(d.getDate() + delta)
      else if (view === 'semana') d.setDate(d.getDate() + delta * 7)
      else d.setMonth(d.getMonth() + delta)
      return d
    })
  }

  function irParaHoje() {
    setReferencia(startOfDay(new Date()))
  }

  const tituloNav = useMemo(() => {
    if (view === 'dia') {
      return referencia.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    }
    if (view === 'semana') {
      const fim7 = new Date(startOfWeek(referencia)); fim7.setDate(fim7.getDate() + 6)
      return `${startOfWeek(referencia).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${fim7.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`
    }
    return `${MESES[referencia.getMonth()]} ${referencia.getFullYear()}`
  }, [view, referencia])

  // ── Vista DIA ────────────────────────────────────────────────────────────────
  const VistaDia = () => (
    <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden">
      {items.length === 0 ? (
        <div className="py-12 text-center text-[13px] text-[#64748b]">Nenhum agendamento neste dia.</div>
      ) : (
        <div className="divide-y divide-[#f1f5f9] px-2 py-1">
          {items.map(item => <ItemRow key={item.id} item={item} />)}
        </div>
      )}
    </div>
  )

  // ── Vista SEMANA ─────────────────────────────────────────────────────────────
  const VistaSemana = () => {
    const semStart = startOfWeek(referencia)
    const dias = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(semStart); d.setDate(d.getDate() + i); return d
    })
    return (
      <div className="grid grid-cols-7 gap-1">
        {dias.map((dia, i) => {
          const hoje = isSameDay(dia, new Date())
          const dayItems = items.filter(it => isSameDay(new Date(it.data_hora), dia))
          return (
            <div key={i} className={`rounded-xl border min-h-[120px] ${hoje ? 'border-[#4f46e5]' : 'border-[#e2e8f0]'} bg-white overflow-hidden`}>
              <div className={`px-2 py-1.5 text-center border-b ${hoje ? 'bg-[#4f46e5] border-[#4f46e5]' : 'bg-[#f8fafc] border-[#f1f5f9]'}`}>
                <div className={`text-[10px] font-semibold uppercase tracking-wide ${hoje ? 'text-[#f8fafc]' : 'text-[#64748b]'}`}>{DIAS_SEMANA[dia.getDay()]}</div>
                <div className={`text-[16px] font-bold ${hoje ? 'text-white' : 'text-[#0f172a]'}`}>{dia.getDate()}</div>
              </div>
              <div className="p-1 space-y-1">
                {dayItems.map(item => (
                  <Link key={item.id} href={`/agenda/${item.id}`}>
                    <div className={`rounded px-1.5 py-1 text-[10px] leading-tight cursor-pointer hover:opacity-80 transition-opacity
                      ${item.status === 'realizado' ? 'bg-emerald-100 text-emerald-800' :
                        item.status === 'cancelado' ? 'bg-red-50 text-red-700' :
                        item.status === 'confirmado' ? 'bg-blue-50 text-blue-800' :
                        'bg-[#f8fafc] text-[#0f172a]'}`}>
                      <div className="font-semibold truncate">{fmtHora(item.data_hora)} · {item.clientes?.nome?.split(' ')[0]}</div>
                      <div className={`truncate text-[9px] font-bold mt-0.5 inline-block px-1 rounded ${TIPO_CHIP[item.tipo as AgendaTipo]}`}>{TIPO_LABEL[item.tipo as AgendaTipo]}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ── Vista MÊS ────────────────────────────────────────────────────────────────
  const VistaMes = () => {
    const mesStart = startOfMonth(referencia)
    const gridStart = startOfWeek(mesStart)
    const cells: Date[] = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart); d.setDate(d.getDate() + i); cells.push(d)
    }
    const mesAtual = referencia.getMonth()
    return (
      <div>
        <div className="grid grid-cols-7 mb-1">
          {DIAS_SEMANA.map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-[#64748b] uppercase tracking-wide py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((dia, i) => {
            const noMes = dia.getMonth() === mesAtual
            const hoje = isSameDay(dia, new Date())
            const dayItems = items.filter(it => isSameDay(new Date(it.data_hora), dia))
            return (
              <div key={i} className={`rounded-lg border min-h-[80px] ${hoje ? 'border-[#4f46e5]' : 'border-[#e2e8f0]'} ${noMes ? 'bg-white' : 'bg-[#FAF7F4]'} overflow-hidden`}>
                <div className={`px-2 pt-1.5 pb-1 ${hoje ? 'bg-[#4f46e5]' : ''}`}>
                  <span className={`text-[12px] font-bold ${hoje ? 'text-white' : noMes ? 'text-[#0f172a]' : 'text-[#94a3b8]'}`}>
                    {dia.getDate()}
                  </span>
                </div>
                <div className="px-1 pb-1 space-y-0.5">
                  {dayItems.slice(0, 3).map(item => (
                    <Link key={item.id} href={`/agenda/${item.id}`}>
                      <div className={`rounded px-1 py-0.5 text-[9px] cursor-pointer hover:opacity-80
                        ${item.status === 'realizado' ? 'bg-emerald-100 text-emerald-800' :
                          item.status === 'cancelado' ? 'bg-red-50 text-red-700' :
                          item.status === 'confirmado' ? 'bg-blue-50 text-blue-800' :
                          'bg-[#f8fafc] text-[#0f172a]'}`}>
                        <div className="font-semibold truncate">{fmtHora(item.data_hora)} {item.clientes?.nome?.split(' ')[0]}</div>
                        <span className={`text-[8px] font-bold px-1 rounded ${TIPO_CHIP[item.tipo as AgendaTipo]}`}>{TIPO_LABEL[item.tipo as AgendaTipo]}</span>
                      </div>
                    </Link>
                  ))}
                  {dayItems.length > 3 && (
                    <div className="text-[9px] text-[#64748b] px-1">+{dayItems.length - 3} mais</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Agenda" subtitle={tituloNav}>
        <Link href="/agenda/nova">
          <Button>+ Agendar</Button>
        </Link>
      </PageHeader>

      {/* Filtro por profissional */}
      {profissionais.length > 1 && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <button
            onClick={() => setFiltroProfissional('')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
              !filtroProfissional ? 'bg-[#0f172a] text-white border-[#0f172a]' : 'text-[#64748b] border-[#e2e8f0] hover:border-[#94a3b8]'
            }`}
          >
            Todos
          </button>
          {profissionais.map(p => (
            <button
              key={p.id}
              onClick={() => setFiltroProfissional(filtroProfissional === p.id ? '' : p.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all"
              style={filtroProfissional === p.id
                ? { backgroundColor: p.cor, borderColor: p.cor, color: 'white' }
                : { borderColor: '#e2e8f0', color: '#475569' }
              }
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.cor }} />
              {p.nome.split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      {/* Controles de navegação e visualização */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        {/* Seletor de view */}
        <div className="flex bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
          {(['dia','semana','mes'] as Visualizacao[]).map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`px-4 py-2 text-[12px] font-semibold capitalize transition-all
                ${view === v ? 'bg-[#4f46e5] text-white' : 'text-[#64748b] hover:bg-[#f8fafc]'}`}
            >
              {v === 'mes' ? 'Mês' : v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {/* Navegação */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navegar(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e2e8f0] text-[#64748b] hover:border-[#94a3b8] hover:text-[#0f172a] font-bold text-[14px] transition-all"
          >‹</button>
          <button
            type="button"
            onClick={irParaHoje}
            className="px-3 py-1.5 rounded-lg border border-[#e2e8f0] text-[12px] font-semibold text-[#64748b] hover:border-[#94a3b8] hover:text-[#0f172a] transition-all"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => navegar(1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e2e8f0] text-[#64748b] hover:border-[#94a3b8] hover:text-[#0f172a] font-bold text-[14px] transition-all"
          >›</button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-[13px] text-[#64748b]">Carregando...</div>
      ) : (
        <>
          {view === 'dia' && <VistaDia />}
          {view === 'semana' && <VistaSemana />}
          {view === 'mes' && <VistaMes />}
        </>
      )}
    </div>
  )
}
