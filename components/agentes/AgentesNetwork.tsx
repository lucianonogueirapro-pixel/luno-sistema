'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AGENTES_BY_DEPT, type AgenteDept } from '@/lib/agentes/agents'

const VW = 1600
const VH = 860

// Orquestrador: canto superior-esquerdo
const CHIEF_X = 255
const CHIEF_Y = 330
const CHIEF_R = 130

// Diretores: layout orgânico — posições manuais por tamanho de equipe
const MGR_POSITIONS: Partial<Record<AgenteDept, { x: number; y: number }>> = {
  mkt:        { x: 618,  y: 190 },   // 7 workers — maior equipe, topo esquerdo
  comercial:  { x: 875,  y: 318 },   // 6 workers — centro-alto
  financeiro: { x: 1098, y: 182 },   // 4 workers — topo direito
  admin:      { x: 1298, y: 320 },   // 2 workers — direito-alto
  clinico:    { x: 628,  y: 572 },   // 2 workers — baixo esquerdo
  juridico:   { x: 888,  y: 705 },   // workers pendentes — fundo centro
  rh:         { x: 1102, y: 614 },   // workers pendentes — baixo direito
  sistema:    { x: 1302, y: 498 },   // 2 workers — direito centro
}
const MGR_R     = 34
const WRK_ORBIT = 74
const WRK_R     = 14

const FIXED = [0.17,0.42,0.73,0.08,0.61,0.35,0.89,0.24,0.56,0.91,
               0.13,0.68,0.47,0.82,0.29,0.64,0.05,0.77,0.38,0.93,
               0.21,0.54,0.86,0.11,0.70,0.33,0.58,0.96,0.44,0.15,
               0.79,0.02,0.67,0.31,0.88,0.50,0.19,0.74,0.41,0.63,
               0.07,0.85,0.26,0.53,0.97,0.36,0.72,0.18,0.45,0.80]
function sr(seed: number): number { return FIXED[Math.abs(seed) % FIXED.length] }

const DEPT_COLORS: Record<string, string> = {
  orquestrador: '#22d3ee',
  mkt:          '#a78bfa',
  comercial:    '#34d399',
  financeiro:   '#fbbf24',
  admin:        '#94a3b8',
  clinico:      '#38bdf8',
  juridico:     '#818cf8',
  rh:           '#fb7185',
  sistema:      '#c084fc',
}

const DEPT_LABELS: Record<string, string> = {
  mkt: 'MKT', comercial: 'COMERCIAL', financeiro: 'FINANCEIRO', admin: 'ADMIN',
  clinico: 'CLÍNICO', juridico: 'JURÍDICO', rh: 'RH', sistema: 'SISTEMA',
}

type DeptBrief = {
  headline: string
  metric: { value: string; label: string; trend: 'up' | 'down' | 'flat' }
  wins: string[]
  alerts: string[]
  actions: string[]
}

const DEPT_BRIEFS: Record<string, DeptBrief> = {
  mkt: {
    headline: 'Crescimento +23% esta semana',
    metric: { value: '+847', label: 'novos seguidores', trend: 'up' },
    wins: ['Reels atingiu 4.2k views', 'Engajamento +18% vs semana passada'],
    alerts: ['3 DMs sem resposta'],
    actions: ['Postar stories hoje até 18h', 'Responder comentários pendentes'],
  },
  comercial: {
    headline: '5 leads qualificados hoje',
    metric: { value: '40%', label: 'taxa de conversão', trend: 'up' },
    wins: ['2 orçamentos fechados', 'Luna respondeu 100% das mensagens'],
    alerts: ['1 lead em silêncio há 2 dias'],
    actions: ['Follow-up: Ana F. e Juliana M.', 'Qualificar 3 leads pendentes'],
  },
  financeiro: {
    headline: 'Caixa saudável — dentro da meta',
    metric: { value: 'R$ 12.8k', label: 'saldo atual', trend: 'up' },
    wins: ['DRE +8% vs mês anterior', 'Inadimplência zero'],
    alerts: ['2 contas a pagar vencem amanhã'],
    actions: ['Pagar fornecedor (D+1)', 'Fechar DRE do mês'],
  },
  admin: {
    headline: 'Operacional ok',
    metric: { value: '97%', label: 'tarefas em dia', trend: 'flat' },
    wins: ['Estoque dentro do limite', 'Sarah sem pendências abertas'],
    alerts: ['Ácido hialurônico: estoque baixo'],
    actions: ['Repor insumo até sexta', 'Confirmar agenda da semana'],
  },
  clinico: {
    headline: '8 pacientes agendados hoje',
    metric: { value: '9.2', label: 'NPS médio', trend: 'up' },
    wins: ['Protocolo revisado e aprovado', 'Agenda 100% confirmada'],
    alerts: [],
    actions: ['Coletar NPS pós-procedimento', 'Revisar ficha: Mariana T.'],
  },
  juridico: {
    headline: 'Documentação em dia',
    metric: { value: '2', label: 'TCIs pendentes', trend: 'flat' },
    wins: ['LGPD: conformidade total', 'Contratos atualizados'],
    alerts: ['2 consentimentos aguardam assinatura'],
    actions: ['Enviar termo para Marina C.', 'Renovar declaração anual'],
  },
  rh: {
    headline: 'Equipe estável',
    metric: { value: 'D+2', label: 'próximo pró-labore', trend: 'flat' },
    wins: ['Folha processada sem erros', 'Encargos pagos em dia'],
    alerts: [],
    actions: ['Transferir pró-labore na sexta'],
  },
  sistema: {
    headline: 'Todos os módulos ativos',
    metric: { value: '99.9%', label: 'uptime', trend: 'up' },
    wins: ['Supabase estável', '26 módulos sem erros'],
    alerts: [],
    actions: ['Revisar tokens de API mensalmente'],
  },
}

const DEPT_ACTIVITIES: Record<string, string[]> = {
  orquestrador: [
    'loop integrado ativo — todos os setores sincronizados',
    'mkt → comercial: passagem de leads monitorada',
    'financeiro: caixa e dre em análise',
    'briefing diário em preparação',
  ],
  mkt:        ['pesquisando tendências', 'montando post', 'refinando ganchos', 'campanha ativa'],
  comercial:  ['qualificando leads', 'follow-up d+3', 'analisando objeções', 'nps d+7'],
  financeiro: ['calculando dre', 'contas verificadas', 'obrigações mapeadas'],
  admin:      ['estoque: ok', 'briefing sarah pronto', '4 tarefas'],
  clinico:    ['protocolo revisado', 'agenda confirmada', 'nps coletado'],
  juridico:   ['termos revisados', 'lgpd: ok'],
  rh:         ['folha processada', 'encargos em dia'],
  sistema:    ['26 módulos ativos', 'supabase: online', 'agentes: ok'],
}

type LiveEvent = { id: number; dept: string; text: string; born: number }

// Mock pool — substituir por Supabase Realtime em produção:
// wa_conversas → comercial | financeiro_lancamentos → financeiro
// agendamentos → clinico | webhook Instagram → mkt
const EVENT_POOL: Omit<LiveEvent, 'id' | 'born'>[] = [
  { dept: 'mkt',        text: '+47 curtidas no último post' },
  { dept: 'mkt',        text: '+3 novos seguidores' },
  { dept: 'mkt',        text: '1.2k views no reels de hoje' },
  { dept: 'mkt',        text: '+12 salvamentos no carrossel' },
  { dept: 'mkt',        text: 'Story visto por 340 pessoas' },
  { dept: 'comercial',  text: 'Nova mensagem: Ana Fernandes' },
  { dept: 'comercial',  text: 'Lead qualificado: Juliana M.' },
  { dept: 'comercial',  text: 'Orçamento aceito: R$ 890,00' },
  { dept: 'comercial',  text: 'Luna respondeu em 1min 12s' },
  { dept: 'financeiro', text: 'Entrada registrada: R$ 380,00' },
  { dept: 'financeiro', text: 'Saldo atualizado: R$ 12.840' },
  { dept: 'clinico',    text: 'Consulta confirmada — 14h30' },
  { dept: 'clinico',    text: 'NPS recebido: nota 10' },
  { dept: 'admin',      text: 'Tarefa concluída por Sarah' },
  { dept: 'sistema',    text: 'Todos os módulos: 0 erros' },
]

type NodeDef = {
  slug: string; emoji: string; name: string; dept: string
  isManager: boolean; isChief: boolean; x: number; y: number; r: number; color: string
}
type EdgeDef = { id: string; x1: number; y1: number; x2: number; y2: number; color: string }

function buildGraph(): { nodes: NodeDef[]; edges: EdgeDef[] } {
  const nodes: NodeDef[] = []
  const edges: EdgeDef[] = []

  const chief = AGENTES_BY_DEPT['orquestrador']?.[0]
  if (chief) {
    nodes.push({ ...chief, isManager: true, isChief: true, x: CHIEF_X, y: CHIEF_Y, r: CHIEF_R, color: DEPT_COLORS.orquestrador })
  }

  ;(Object.entries(MGR_POSITIONS) as [AgenteDept, { x: number; y: number }][]).forEach(([dept, pos]) => {
    const { x: mx, y } = pos
    const color = DEPT_COLORS[dept] ?? '#64748b'
    const agentes = AGENTES_BY_DEPT[dept] ?? []
    const [manager, ...workers] = agentes
    if (!manager) return

    nodes.push({ ...manager, isManager: true, isChief: false, x: mx, y, r: MGR_R, color })
    if (chief) edges.push({ id: `chief-${manager.slug}`, x1: CHIEF_X, y1: CHIEF_Y, x2: mx, y2: y, color })

    workers.forEach((w, wi) => {
      const count  = workers.length
      const wAngle = (wi / count) * 2 * Math.PI + Math.PI / 6
      const wx = Math.round(mx + WRK_ORBIT * Math.cos(wAngle))
      const wy = Math.round(y  + WRK_ORBIT * Math.sin(wAngle))
      nodes.push({ ...w, isManager: false, isChief: false, x: wx, y: wy, r: WRK_R, color })
      edges.push({ id: `${manager.slug}-${w.slug}`, x1: mx, y1: y, x2: wx, y2: wy, color })
    })
  })

  return { nodes, edges }
}

function hudBracket(cx: number, cy: number, r: number, corner: 'tl'|'tr'|'bl'|'br', size = 14, gap = 6): string {
  const x  = corner.includes('l') ? cx - r - gap : cx + r + gap
  const y  = corner.includes('t') ? cy - r - gap : cy + r + gap
  const dx = corner.includes('l') ? size : -size
  const dy = corner.includes('t') ? size : -size
  return `M ${x} ${y + dy} L ${x} ${y} L ${x + dx} ${y}`
}

function LatLines({ cx, cy, R, color, rows = 7, ry_ratio = 0.24 }:
  { cx:number; cy:number; R:number; color:string; rows?:number; ry_ratio?:number }) {
  return <>
    {Array.from({ length: rows }, (_, i) => {
      const oy  = ((i - (rows-1)/2) / ((rows-1)/2)) * R * 0.88
      const rx2 = Math.sqrt(Math.max(0, R*R - oy*oy)) * 0.97
      const ry2 = rx2 * ry_ratio
      return (
        <ellipse key={i} cx={cx} cy={cy+oy} rx={rx2} ry={ry2}
          fill="none" stroke={color}
          strokeWidth={Math.abs(oy) < 1 ? 0.9 : 0.45}
          strokeOpacity={Math.abs(oy) < 1 ? 0.55 : 0.22} />
      )
    })}
  </>
}

export function AgentesNetwork() {
  const router = useRouter()
  const { nodes, edges } = useMemo(buildGraph, [])
  const [hovered, setHovered]       = useState<string | null>(null)
  const [selected, setSelected]     = useState<string | null>(null)
  const [actIdx, setActIdx]         = useState<Record<string, number>>({})
  const [now, setNow]               = useState('')
  const [fullscreen, setFullscreen] = useState(false)
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([])

  useEffect(() => {
    const id = setInterval(() => {
      setActIdx(prev => {
        const next = { ...prev }
        Object.keys(DEPT_ACTIVITIES).forEach(k => { next[k] = ((prev[k] ?? 0) + 1) % DEPT_ACTIVITIES[k].length })
        return next
      })
    }, 3200)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const update = () => setNow(new Date().toLocaleTimeString('pt-BR',
      { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Fortaleza' }))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  // Eventos ao vivo — cicla pelo pool a cada 2.4s
  // Em produção: substituir por subscribeEventos() com Supabase Realtime
  useEffect(() => {
    let i = 0
    const id = setInterval(() => {
      const ev   = EVENT_POOL[i % EVENT_POOL.length]
      i++
      const born = Date.now()
      setLiveEvents(prev => [
        ...prev.filter(e => born - e.born < 5200).slice(-5),
        { ...ev, id: born, born },
      ])
    }, 2400)
    return () => clearInterval(id)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) { document.documentElement.requestFullscreen?.(); setFullscreen(true) }
    else { document.exitFullscreen?.(); setFullscreen(false) }
  }, [])

  const chiefNode      = nodes.find(n => n.isChief)
  const chiefAct       = DEPT_ACTIVITIES.orquestrador[actIdx.orquestrador ?? 0] ?? ''
  const hoveredNode    = useMemo(() => nodes.find(n => n.slug === hovered), [nodes, hovered])
  const selectedNode   = useMemo(() => nodes.find(n => n.slug === selected), [nodes, selected])
  const hoveredMgrDept  = (hoveredNode?.isManager && !hoveredNode?.isChief) ? hoveredNode.dept : null
  const selectedMgrDept = (selectedNode?.isManager && !selectedNode?.isChief) ? selectedNode.dept : null
  // hover tem prioridade; seleção mantém o painel aberto mesmo sem hover
  const briefDept = hoveredMgrDept ?? selectedMgrDept

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden ${fullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}`}
      style={{ background: '#04070f' }}>

      <style>{`
        @keyframes notifFall {
          0%   { opacity: 0; transform: translateY(-14px) scale(0.95); }
          12%  { opacity: 1; transform: translateY(0) scale(1); }
          75%  { opacity: 1; transform: translateY(0) scale(1); }
          92%  { opacity: 0.3; }
          100% { opacity: 0; transform: translateY(3px) scale(0.98); }
        }
        @keyframes panelIn {
          from { opacity: 0; transform: translateY(5px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes livePulse {
          0%,100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>

      <button onClick={toggleFullscreen}
        className="absolute top-3 right-3 z-10 transition-colors"
        style={{ color: '#1a2744' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#22d3ee')}
        onMouseLeave={e => (e.currentTarget.style.color = '#1a2744')}
        title="Tela cheia">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          {fullscreen
            ? <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 0 2-2h3M3 16h3a2 2 0 0 0 2 2v3" />
            : <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          }
        </svg>
      </button>

      <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full h-full"
        style={{ display: 'block', aspectRatio: `${VW}/${VH}` }}
        suppressHydrationWarning>
        <defs>
          <pattern id="dots" width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="15" cy="15" r="0.5" fill="#111d36" />
          </pattern>
          <radialGradient id="globe-grad" cx="40%" cy="34%" r="70%">
            <stop offset="0%"   stopColor="#091a3a" />
            <stop offset="45%"  stopColor="#060e1e" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.42" />
          </radialGradient>
          <clipPath id="chief-clip">
            <circle cx={CHIEF_X} cy={CHIEF_Y} r={CHIEF_R - 1} />
          </clipPath>
          {(Object.entries(MGR_POSITIONS) as [string, {x:number;y:number}][]).map(([dept, pos]) => (
            <clipPath key={dept} id={`mgr-clip-${dept}`}>
              <circle cx={pos.x} cy={pos.y} r={MGR_R - 1} />
            </clipPath>
          ))}
          <radialGradient id="aur-chief" gradientUnits="userSpaceOnUse" cx={CHIEF_X} cy={CHIEF_Y} r="520">
            <stop offset="0%"   stopColor="#22d3ee" stopOpacity="0.13" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="aur-indigo" gradientUnits="userSpaceOnUse" cx="160" cy="150" r="480">
            <stop offset="0%"   stopColor="#4f46e5" stopOpacity="0.09" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="aur-right" gradientUnits="userSpaceOnUse" cx="1420" cy="400" r="550">
            <stop offset="0%"   stopColor="#1d4ed8" stopOpacity="0.07" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="aur-violet" gradientUnits="userSpaceOnUse" cx="900" cy="860" r="460">
            <stop offset="0%"   stopColor="#7c3aed" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </radialGradient>
          <filter id="glow-globe" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="30" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-xl" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="45" result="b" />
            <feMerge><feMergeNode in="b" /></feMerge>
          </filter>
          <filter id="glow-md" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="8" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-sm" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-edge" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-core" x="-400%" y="-400%" width="900%" height="900%">
            <feGaussianBlur stdDeviation="7" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect width={VW} height={VH} fill="#04070f" />
        <rect width={VW} height={VH} fill="url(#dots)" opacity="0.9" />
        <rect width={VW} height={VH} fill="url(#aur-chief)" />
        <rect width={VW} height={VH} fill="url(#aur-indigo)" />
        <rect width={VW} height={VH} fill="url(#aur-right)" />
        <rect width={VW} height={VH} fill="url(#aur-violet)" />

        {/* Canvas HUD corners */}
        {(['tl','tr','bl','br'] as const).map(c => {
          const m = 20, s = 32
          const d = c==='tl' ? `M ${m} ${m+s} L ${m} ${m} L ${m+s} ${m}`
                  : c==='tr' ? `M ${VW-m} ${m+s} L ${VW-m} ${m} L ${VW-m-s} ${m}`
                  : c==='bl' ? `M ${m} ${VH-m-s} L ${m} ${VH-m} L ${m+s} ${VH-m}`
                  : `M ${VW-m} ${VH-m-s} L ${VW-m} ${VH-m} L ${VW-m-s} ${VH-m}`
          return <path key={c} d={d} fill="none" stroke="#22d3ee" strokeWidth={1.2} strokeOpacity={0.25} />
        })}

        {/* Header */}
        <text x={58} y={28} fill="#22d3ee" fillOpacity={0.38} fontSize="8.5"
          fontFamily="monospace" letterSpacing="5" fontWeight="600">
          ÉVOR · INTELLIGENCE SYSTEM
        </text>
        <line x1={58} y1={35} x2={360} y2={35} stroke="#22d3ee" strokeOpacity={0.14} strokeWidth={0.6} />
        <circle cx={VW-150} cy={20} r={3.5} fill="#10b981">
          <animate attributeName="opacity" values="1;0.3;1" dur="4s" repeatCount="indefinite" />
        </circle>
        <text x={VW-142} y={24.5} fill="#10b981" fillOpacity={0.65} fontSize="8.5" fontFamily="monospace">ONLINE</text>
        <text x={VW-58} y={24.5} textAnchor="end" fill="#1e3a5f" fontSize="9" fontFamily="monospace">{now}</text>
        <line x1={VW-58} y1={35} x2={VW-360} y2={35} stroke="#22d3ee" strokeOpacity={0.14} strokeWidth={0.6} />

        {/* Sonar rings from chief */}
        {[CHIEF_R+80, CHIEF_R+180, CHIEF_R+310, CHIEF_R+460].map((r, i) => (
          <circle key={r} cx={CHIEF_X} cy={CHIEF_Y} r={r}
            fill="none" stroke="#22d3ee"
            strokeWidth={0.5} strokeOpacity={Math.max(0.01, 0.06-i*0.014)}
            strokeDasharray={i > 1 ? '4 24' : undefined} />
        ))}

        {/* Edges */}
        {edges.map((e, ei) => {
          const path    = `M ${e.x1} ${e.y1} L ${e.x2} ${e.y2}`
          const isChief = e.id.startsWith('chief-')
          const slug0   = e.id.split('-')[0]
          const slug1   = e.id.split('-').slice(1).join('-')
          const isHov   = hovered === slug0 || hovered === slug1
          const isSel   = selected === slug0 || selected === slug1
          const isActive = isHov || isSel
          return (
            <g key={e.id}>
              <path d={path} fill="none" stroke={e.color}
                strokeWidth={isChief ? (isSel ? 1.4 : 0.75) : (isSel ? 0.8 : 0.45)}
                strokeOpacity={isSel ? 0.90 : isHov ? 0.85 : isChief ? 0.14 : 0.09}
                strokeDasharray={isChief && !isSel ? '4 12' : undefined}
                filter={isActive ? 'url(#glow-edge)' : undefined} />

              {/* Partículas: selecionado = vai e volta; normal = uma direção */}
              {isSel && isChief ? (
                <>
                  {[0, -1.6, -3.2].map((off, pi) => (
                    <circle key={pi} r={pi===0 ? 2.5 : 1.6} fill={e.color} fillOpacity={pi===0 ? 1 : 0.55}>
                      <animateMotion dur="5s" begin={`${off}s`} repeatCount="indefinite" path={path}
                        keyPoints="0;1;0" keyTimes="0;0.5;1" calcMode="linear" />
                    </circle>
                  ))}
                </>
              ) : (
                <>
                  <circle r={isChief ? 2 : 1.4} fill={e.color} fillOpacity={isActive ? 1 : 0.7}>
                    <animateMotion dur={`${isChief ? 8+sr(ei)*5 : 3+sr(ei)*2}s`} begin={`${sr(ei+50)*-14}s`} repeatCount="indefinite" path={path} />
                  </circle>
                  {isChief && (
                    <circle r={1.2} fill={e.color} fillOpacity={isActive ? 0.7 : 0.35}>
                      <animateMotion dur={`${12+sr(ei+10)*4}s`} begin={`${sr(ei+80)*-10}s`} repeatCount="indefinite" path={path} />
                    </circle>
                  )}
                </>
              )}
            </g>
          )
        })}

        {/* ══ CHIEF GLOBE — canto superior esquerdo, ultra-tech ══ */}
        {chiefNode && (
          <g style={{ cursor: 'pointer' }}
            onClick={() => router.push(`/agentes/${chiefNode.slug}`)}
            onMouseEnter={() => setHovered(chiefNode.slug)}
            onMouseLeave={() => setHovered(null)}>

            <circle cx={CHIEF_X} cy={CHIEF_Y} r={CHIEF_R+110} fill="#22d3ee" fillOpacity={0.04} filter="url(#glow-xl)" />
            <circle cx={CHIEF_X} cy={CHIEF_Y} r={CHIEF_R+60}  fill="#22d3ee" fillOpacity={0.07} filter="url(#glow-xl)" />

            {/* 5 pulse waves */}
            {([0,-0.72,-1.44,-2.16,-2.88] as const).map((begin, pi) => (
              <circle key={pi} cx={CHIEF_X} cy={CHIEF_Y} r={CHIEF_R} fill="none" stroke="#22d3ee" strokeWidth={2.5} strokeOpacity={0}>
                <animate attributeName="r"              values={`${CHIEF_R};${CHIEF_R+130};${CHIEF_R+200}`} dur="3.6s" begin={`${begin}s`} repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" values="0.90;0.18;0"                                dur="3.6s" begin={`${begin}s`} repeatCount="indefinite" />
                <animate attributeName="stroke-width"   values="3.5;1.2;0.3"                               dur="3.6s" begin={`${begin}s`} repeatCount="indefinite" />
              </circle>
            ))}

            <circle cx={CHIEF_X} cy={CHIEF_Y} r={CHIEF_R}
              fill="url(#globe-grad)" stroke="#22d3ee" strokeWidth={1.8} filter="url(#glow-globe)" />

            {/* Globe internals */}
            <g clipPath="url(#chief-clip)">
              <circle cx={CHIEF_X} cy={CHIEF_Y} r={14} fill="#22d3ee" fillOpacity={0.15} filter="url(#glow-core)">
                <animate attributeName="r" values="10;18;10" dur="2.2s" repeatCount="indefinite" />
                <animate attributeName="fill-opacity" values="0.15;0.50;0.15" dur="2.2s" repeatCount="indefinite" />
              </circle>
              <circle cx={CHIEF_X} cy={CHIEF_Y} r={4} fill="#22d3ee" fillOpacity={0.85}>
                <animate attributeName="fill-opacity" values="0.85;1;0.85" dur="1.1s" repeatCount="indefinite" />
              </circle>
              <LatLines cx={CHIEF_X} cy={CHIEF_Y} R={CHIEF_R} color="#22d3ee" rows={11} ry_ratio={0.22} />
              <g>
                {[0,22.5,45,67.5,90,112.5,135,157.5].map(deg => (
                  <ellipse key={deg} cx={CHIEF_X} cy={CHIEF_Y}
                    rx={CHIEF_R*0.16} ry={CHIEF_R*0.97}
                    fill="none" stroke="#22d3ee" strokeWidth={0.45} strokeOpacity={0.18}
                    transform={`rotate(${deg} ${CHIEF_X} ${CHIEF_Y})`} />
                ))}
                <animateTransform attributeName="transform" type="rotate"
                  from={`0 ${CHIEF_X} ${CHIEF_Y}`} to={`360 ${CHIEF_X} ${CHIEF_Y}`}
                  dur="22s" repeatCount="indefinite" additive="sum" />
              </g>
              <ellipse cx={CHIEF_X} cy={CHIEF_Y} rx={CHIEF_R*0.97} ry={CHIEF_R*0.14}
                fill="#22d3ee" fillOpacity={0.07} stroke="#22d3ee" strokeWidth={0.9} strokeOpacity={0.50}>
                <animateTransform attributeName="transform" type="rotate"
                  from={`0 ${CHIEF_X} ${CHIEF_Y}`} to={`360 ${CHIEF_X} ${CHIEF_Y}`} dur="7s" repeatCount="indefinite" />
              </ellipse>
              <ellipse cx={CHIEF_X} cy={CHIEF_Y} rx={CHIEF_R*0.13} ry={CHIEF_R*0.97}
                fill="#22d3ee" fillOpacity={0.04} stroke="#22d3ee" strokeWidth={0.70} strokeOpacity={0.28}>
                <animateTransform attributeName="transform" type="rotate"
                  from={`90 ${CHIEF_X} ${CHIEF_Y}`} to={`-270 ${CHIEF_X} ${CHIEF_Y}`} dur="11s" repeatCount="indefinite" />
              </ellipse>
              <ellipse cx={CHIEF_X} cy={CHIEF_Y} rx={CHIEF_R*0.97} ry={CHIEF_R*0.10}
                fill="none" stroke="#22d3ee" strokeWidth={0.45} strokeOpacity={0.18}>
                <animateTransform attributeName="transform" type="rotate"
                  from={`45 ${CHIEF_X} ${CHIEF_Y}`} to={`405 ${CHIEF_X} ${CHIEF_Y}`} dur="17s" repeatCount="indefinite" />
              </ellipse>
              <ellipse cx={CHIEF_X-CHIEF_R*0.28} cy={CHIEF_Y-CHIEF_R*0.32}
                rx={CHIEF_R*0.22} ry={CHIEF_R*0.14} fill="#22d3ee" fillOpacity={0.16} />
            </g>

            {/* 6 orbital rings */}
            {([
              [CHIEF_R+12,  1.2, 0.50, '10 14',  8,  true],
              [CHIEF_R+26,  0.75,0.32, '5 18',   14, false],
              [CHIEF_R+44,  0.55,0.20, '4 24',   23, true],
              [CHIEF_R+66,  0.45,0.14, '3 30',   34, false],
              [CHIEF_R+92,  0.35,0.10, '2 38',   50, true],
              [CHIEF_R+122, 0.28,0.07, '1.5 44', 72, false],
            ] as [number,number,number,string,number,boolean][]).map(([r,sw,op,dash,dur,cw], i) => (
              <circle key={i} cx={CHIEF_X} cy={CHIEF_Y} r={r}
                fill="none" stroke="#22d3ee" strokeWidth={sw} strokeOpacity={op} strokeDasharray={dash}>
                <animateTransform attributeName="transform" type="rotate"
                  from={`${cw?0:360} ${CHIEF_X} ${CHIEF_Y}`} to={`${cw?360:0} ${CHIEF_X} ${CHIEF_Y}`}
                  dur={`${dur}s`} repeatCount="indefinite" />
              </circle>
            ))}

            {/* HUD brackets */}
            {(['tl','tr','bl','br'] as const).map(c => (
              <path key={c} d={hudBracket(CHIEF_X, CHIEF_Y, CHIEF_R, c, 20, 10)}
                fill="none" stroke="#22d3ee" strokeWidth={1.5} strokeOpacity={0.60} />
            ))}

            {/* Cardinal dots */}
            {[0,90,180,270].map(deg => {
              const rad = (deg*Math.PI)/180
              return <circle key={deg}
                cx={CHIEF_X+Math.round(Math.cos(rad)*(CHIEF_R+1))}
                cy={CHIEF_Y+Math.round(Math.sin(rad)*(CHIEF_R+1))}
                r={2.5} fill="#22d3ee" fillOpacity={0.80} />
            })}

            {/* Extended crosshairs + tick marks */}
            <line x1={CHIEF_X-CHIEF_R-10} y1={CHIEF_Y} x2={CHIEF_X-CHIEF_R-80} y2={CHIEF_Y} stroke="#22d3ee" strokeWidth={0.8} strokeOpacity={0.32} />
            <line x1={CHIEF_X+CHIEF_R+10} y1={CHIEF_Y} x2={CHIEF_X+CHIEF_R+90} y2={CHIEF_Y} stroke="#22d3ee" strokeWidth={0.8} strokeOpacity={0.32} />
            {[20,40,65].map((d, i) => {
              const tl = i===1?8:4
              return (
                <g key={d}>
                  <line x1={CHIEF_X-CHIEF_R-d} y1={CHIEF_Y-tl} x2={CHIEF_X-CHIEF_R-d} y2={CHIEF_Y+tl} stroke="#22d3ee" strokeWidth={0.7} strokeOpacity={0.38} />
                  <line x1={CHIEF_X+CHIEF_R+d} y1={CHIEF_Y-tl} x2={CHIEF_X+CHIEF_R+d} y2={CHIEF_Y+tl} stroke="#22d3ee" strokeWidth={0.7} strokeOpacity={0.38} />
                </g>
              )
            })}
            <line x1={CHIEF_X} y1={CHIEF_Y-CHIEF_R-10} x2={CHIEF_X} y2={CHIEF_Y-CHIEF_R-70} stroke="#22d3ee" strokeWidth={0.8} strokeOpacity={0.32} />
            <line x1={CHIEF_X} y1={CHIEF_Y+CHIEF_R+10} x2={CHIEF_X} y2={CHIEF_Y+CHIEF_R+70} stroke="#22d3ee" strokeWidth={0.8} strokeOpacity={0.32} />
            {[25,50].map((d, i) => {
              const tl = i===1?8:4
              return (
                <g key={d}>
                  <line x1={CHIEF_X-tl} y1={CHIEF_Y-CHIEF_R-d} x2={CHIEF_X+tl} y2={CHIEF_Y-CHIEF_R-d} stroke="#22d3ee" strokeWidth={0.7} strokeOpacity={0.38} />
                  <line x1={CHIEF_X-tl} y1={CHIEF_Y+CHIEF_R+d} x2={CHIEF_X+tl} y2={CHIEF_Y+CHIEF_R+d} stroke="#22d3ee" strokeWidth={0.7} strokeOpacity={0.38} />
                </g>
              )
            })}

            <text x={CHIEF_X} y={CHIEF_Y+CHIEF_R+26}
              textAnchor="middle" fill="#22d3ee" fontSize={11} fontFamily="monospace" fontWeight="700" letterSpacing="5">
              {chiefNode.name.toUpperCase()}
            </text>
            <rect x={CHIEF_X-155} y={CHIEF_Y+CHIEF_R+33} width={310} height={17} rx={2}
              fill="#22d3ee" fillOpacity={0.06} stroke="#22d3ee" strokeOpacity={0.20} strokeWidth={0.6} />
            <line x1={CHIEF_X-155} y1={CHIEF_Y+CHIEF_R+41} x2={CHIEF_X-144} y2={CHIEF_Y+CHIEF_R+41}
              stroke="#22d3ee" strokeWidth={1.2} strokeOpacity={0.55} />
            <text x={CHIEF_X} y={CHIEF_Y+CHIEF_R+44.5}
              textAnchor="middle" fill="#22d3ee" fillOpacity={0.58} fontSize={7.5} fontFamily="monospace">
              {chiefAct}
            </text>
          </g>
        )}

        {/* ══ MANAGERS + WORKERS ══ */}
        {nodes.filter(n => !n.isChief).map(node => {
          const isHov    = hovered === node.slug
          const dept     = node.dept
          const actList  = DEPT_ACTIVITIES[dept] ?? []
          const activity = actList[actIdx[dept] ?? 0] ?? ''
          const actShort = activity.length > 24 ? activity.slice(0,22)+'…' : activity
          const shortName = node.name.length > 15 ? node.name.slice(0,14)+'…' : node.name

          const isSel = selected === node.slug

          return (
            <g key={node.slug} style={{ cursor: 'pointer' }}
              onClick={() => {
                if (node.isChief) {
                  router.push(`/agentes/${node.slug}`)
                } else if (node.isManager) {
                  setSelected(prev => prev === node.slug ? null : node.slug)
                } else {
                  router.push(`/agentes/${node.slug}`)
                }
              }}
              onMouseEnter={() => setHovered(node.slug)}
              onMouseLeave={() => setHovered(null)}>

              {node.isManager && (
                <>
                  {/* Anel extra quando selecionado */}
                  {isSel && (
                    <circle cx={node.x} cy={node.y} r={node.r+18}
                      fill="none" stroke={node.color} strokeWidth={1.2} strokeOpacity={0.45}
                      strokeDasharray="3 5">
                      <animateTransform attributeName="transform" type="rotate"
                        from={`0 ${node.x} ${node.y}`} to={`360 ${node.x} ${node.y}`}
                        dur="6s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle cx={node.x} cy={node.y} r={node.r+22} fill={node.color} fillOpacity={isSel ? 0.08 : 0.04} filter="url(#glow-sm)" />
                  <circle cx={node.x} cy={node.y} r={node.r} fill="none" stroke={node.color} strokeWidth={1} strokeOpacity={0}>
                    <animate attributeName="r"              values={`${node.r};${node.r+30};${node.r+52}`} dur="4s" begin={`${sr(node.x)*-4}s`} repeatCount="indefinite" />
                    <animate attributeName="stroke-opacity" values="0.55;0.15;0"                           dur="4s" begin={`${sr(node.x)*-4}s`} repeatCount="indefinite" />
                  </circle>
                  <circle cx={node.x} cy={node.y} r={node.r} fill="#07101f"
                    stroke={node.color} strokeWidth={isSel ? 2.5 : isHov ? 2.2 : 1.4}
                    filter={(isHov || isSel) ? 'url(#glow-md)' : undefined} />
                  <g clipPath={`url(#mgr-clip-${dept})`}>
                    <LatLines cx={node.x} cy={node.y} R={node.r} color={node.color} rows={5} ry_ratio={0.26} />
                  </g>
                  <circle cx={node.x} cy={node.y} r={node.r+9}
                    fill="none" stroke={node.color} strokeWidth={0.7} strokeOpacity={0.30} strokeDasharray="5 12">
                    <animateTransform attributeName="transform" type="rotate"
                      from={`0 ${node.x} ${node.y}`} to={`360 ${node.x} ${node.y}`}
                      dur={`${14+sr(node.x)*8}s`} repeatCount="indefinite" />
                  </circle>
                  <text x={node.x} y={node.y} textAnchor="middle" dominantBaseline="central"
                    fontSize={14} fill={node.color} fillOpacity={0.9}>{node.emoji}</text>
                  {isHov && (['tl','tr','bl','br'] as const).map(c => (
                    <path key={c} d={hudBracket(node.x, node.y, node.r, c, 8, 4)}
                      fill="none" stroke={node.color} strokeWidth={1} strokeOpacity={0.60} />
                  ))}
                  <text x={node.x} y={node.y+node.r+14}
                    textAnchor="middle" fill={node.color}
                    fillOpacity={isHov ? 1 : 0.65}
                    fontSize={7.5} fontFamily="monospace" fontWeight="600" letterSpacing="2">
                    {DEPT_LABELS[dept]}
                  </text>
                  {isHov && actShort && (
                    <>
                      <rect x={node.x-54} y={node.y+node.r+18} width={108} height={13} rx={2} fill={node.color} fillOpacity={0.10} />
                      <text x={node.x} y={node.y+node.r+27.5}
                        textAnchor="middle" fill={node.color} fillOpacity={0.70} fontSize={6} fontFamily="monospace">
                        {actShort}
                      </text>
                    </>
                  )}
                </>
              )}

              {!node.isManager && (
                <>
                  {isHov && <circle cx={node.x} cy={node.y} r={node.r+9} fill={node.color} fillOpacity={0.18} filter="url(#glow-sm)" />}
                  <circle cx={node.x} cy={node.y} r={node.r}
                    fill={node.color} fillOpacity={isHov ? 0.28 : 0.10}
                    stroke={node.color} strokeWidth={isHov ? 1.5 : 1.0} strokeOpacity={isHov ? 1 : 0.55} />
                  <circle cx={node.x} cy={node.y} r={3.5}
                    fill={node.color} fillOpacity={isHov ? 1 : 0.68} />
                  {isHov && (
                    <>
                      <rect x={node.x-42} y={node.y+node.r+2} width={84} height={13} rx={2} fill="#04070f" fillOpacity={0.88} />
                      <text x={node.x} y={node.y+node.r+12}
                        textAnchor="middle" fill={node.color} fontSize={7.5} fontFamily="monospace" fontWeight="500">
                        {shortName}
                      </text>
                    </>
                  )}
                </>
              )}
            </g>
          )
        })}

        <text x={58} y={VH-16} fill="#141e33" fontSize="8" fontFamily="monospace">
          {nodes.length} agentes · {edges.length} conexões
        </text>
      </svg>

      {/* ══ LIVE NOTIFICATION FEED — cai de cima, canto direito ══ */}
      <div style={{
        position: 'absolute',
        top: '7%',
        right: '1.5%',
        width: '17%',
        minWidth: 190,
        maxWidth: 260,
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        zIndex: 20,
        pointerEvents: 'none',
      }}>
        {/* Badge LIVE */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          marginBottom: 2,
        }}>
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: '#10b981',
            animation: 'livePulse 1.6s ease-in-out infinite',
          }} />
          <span style={{
            color: '#10b981',
            fontSize: 7,
            fontFamily: 'monospace',
            letterSpacing: '2px',
            fontWeight: 700,
          }}>
            LIVE FEED
          </span>
        </div>

        {liveEvents.slice().reverse().map(ev => {
          const color = DEPT_COLORS[ev.dept] ?? '#22d3ee'
          return (
            <div key={ev.id} style={{
              animation: 'notifFall 5.5s ease-out forwards',
              background: '#050c1acc',
              border: `1px solid ${color}28`,
              borderLeft: `2.5px solid ${color}`,
              borderRadius: 4,
              padding: '6px 10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                <div style={{
                  width: 4, height: 4, borderRadius: '50%',
                  background: color,
                  boxShadow: `0 0 5px ${color}`,
                  flexShrink: 0,
                }} />
                <span style={{
                  color,
                  fontSize: 6.5,
                  fontFamily: 'monospace',
                  letterSpacing: '1.5px',
                  fontWeight: 700,
                  opacity: 0.80,
                }}>
                  {DEPT_LABELS[ev.dept]}
                </span>
              </div>
              <div style={{
                color: '#94a3b8',
                fontSize: 9,
                fontFamily: 'monospace',
                lineHeight: 1.3,
              }}>
                {ev.text}
              </div>
            </div>
          )
        })}
      </div>

      {/* ══ DEPT BRIEF PANEL — hover ou seleção fixa o painel ══ */}
      {briefDept && DEPT_BRIEFS[briefDept] && (() => {
        const brief   = DEPT_BRIEFS[briefDept]
        const pos     = MGR_POSITIONS[briefDept as AgenteDept]
        if (!pos) return null
        const color   = DEPT_COLORS[briefDept]
        const isLocked = selectedMgrDept === briefDept && hoveredMgrDept !== briefDept
        const isTop   = pos.y < VH / 2
        const leftPct = Math.max(2, Math.min(65, (pos.x / VW) * 100 - 7))
        const topPct  = isTop
          ? ((pos.y + MGR_R + 16) / VH) * 100
          : ((pos.y - MGR_R - 16) / VH) * 100 - 22

        return (
          <div key={briefDept} className="absolute pointer-events-none" style={{
            left:   `${leftPct}%`,
            top:    `${Math.max(2, Math.min(76, topPct))}%`,
            width:  '14%',
            minWidth: 190,
            background: '#04070fee',
            border:     `1px solid ${isLocked ? color+'80' : color+'40'}`,
            borderRadius: 7,
            padding: '10px 12px',
            zIndex: 30,
            animation: isLocked ? 'none' : 'panelIn 0.16s ease-out',
            backdropFilter: 'blur(10px)',
            boxShadow: isLocked ? `0 0 18px ${color}18` : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
              <span style={{ color, fontFamily: 'monospace', fontSize: 7.5, letterSpacing: '2px', fontWeight: 700, opacity: 0.65 }}>
                {DEPT_LABELS[briefDept]} · BRIEF
              </span>
              {isLocked && (
                <span style={{ color, fontSize: 6.5, fontFamily: 'monospace', opacity: 0.45, letterSpacing: '1px' }}>
                  · FIXADO
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 5 }}>
              <span style={{ color, fontSize: 22, fontWeight: 700, lineHeight: 1, fontFamily: 'monospace' }}>
                {brief.metric.value}
              </span>
              <span style={{ color, fontSize: 7.5, fontFamily: 'monospace', opacity: 0.50 }}>
                {brief.metric.label}
              </span>
              {brief.metric.trend === 'up'   && <span style={{ color: '#10b981', fontSize: 10 }}>↑</span>}
              {brief.metric.trend === 'down' && <span style={{ color: '#ef4444', fontSize: 10 }}>↓</span>}
            </div>
            <div style={{ color: '#475569', fontSize: 8, fontFamily: 'monospace', marginBottom: 8,
              borderBottom: `1px solid ${color}20`, paddingBottom: 6 }}>
              {brief.headline}
            </div>
            {brief.wins.map((w, i) => (
              <div key={i} style={{ display: 'flex', gap: 5, alignItems: 'flex-start', marginBottom: 3 }}>
                <span style={{ color: '#10b981', fontSize: 7, marginTop: 1, flexShrink: 0 }}>✓</span>
                <span style={{ color: '#475569', fontSize: 7.5, fontFamily: 'monospace' }}>{w}</span>
              </div>
            ))}
            {brief.alerts.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 5, alignItems: 'flex-start', marginBottom: 3, marginTop: brief.wins.length ? 2 : 0 }}>
                <span style={{ color: '#fbbf24', fontSize: 7, marginTop: 1, flexShrink: 0 }}>⚠</span>
                <span style={{ color: '#475569', fontSize: 7.5, fontFamily: 'monospace' }}>{a}</span>
              </div>
            ))}
            {brief.actions.length > 0 && (
              <div style={{ borderTop: `1px solid ${color}20`, paddingTop: 6, marginTop: 6 }}>
                <div style={{ color, fontSize: 6.5, fontFamily: 'monospace', letterSpacing: '1.5px', opacity: 0.45, marginBottom: 4 }}>
                  AÇÕES
                </div>
                {brief.actions.map((ac, i) => (
                  <div key={i} style={{ display: 'flex', gap: 5, alignItems: 'flex-start', marginBottom: 3 }}>
                    <span style={{ color, fontSize: 7, opacity: 0.55, marginTop: 1, flexShrink: 0 }}>→</span>
                    <span style={{ color: '#64748b', fontSize: 7.5, fontFamily: 'monospace' }}>{ac}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
