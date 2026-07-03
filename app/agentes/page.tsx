'use client'
import { useState } from 'react'
import {
  Megaphone, TrendingUp, DollarSign,
  ClipboardCheck, Cpu, Sparkles, Send, X,
} from 'lucide-react'

const VW = 600, VH = 480
const CX = 300, CY = 240
const ORBIT_R = 158
const NODE_R = 36
const HUB_R = 54

interface AgentDef {
  id: string
  name: string
  role: string
  desc: string
  color: string
  icon: React.ElementType
  sugestoes: string[]
  x: number
  y: number
}

const SATELLITES: AgentDef[] = [
  {
    id: 'mkt', name: 'MKT', role: 'Marketing', color: '#f472b6',
    icon: Megaphone, x: CX, y: CY - ORBIT_R,
    desc: 'Sugere campanhas, conteúdos para redes sociais, estratégias de captação e análise de presença digital.',
    sugestoes: [
      'Crie um post de Instagram para divulgar uma promoção',
      'Que tipo de campanha funciona melhor para meus clientes?',
      'Como aumentar minha taxa de indicações?',
    ],
  },
  {
    id: 'comercial', name: 'Comercial', role: 'Vendas & CRM', color: '#34d399',
    icon: TrendingUp, x: CX + ORBIT_R, y: CY,
    desc: 'Analisa o pipeline, sugere ações para converter leads, identifica clientes inativos e oportunidades de reativação.',
    sugestoes: [
      'Quais leads estão prontos para converter?',
      'Quem não compra há mais de 60 dias?',
      'Me ajude a criar uma mensagem de reativação',
    ],
  },
  {
    id: 'financeiro', name: 'Financeiro', role: 'Finanças', color: '#fbbf24',
    icon: DollarSign, x: CX, y: CY + ORBIT_R,
    desc: 'Analisa o fluxo de caixa, compara receitas e despesas, sugere cortes e projeta resultado do mês.',
    sugestoes: [
      'Como está o caixa este mês vs mês passado?',
      'Quais despesas posso reduzir?',
      'Qual meu ticket médio nos últimos 3 meses?',
    ],
  },
  {
    id: 'tarefeiro', name: 'Tarefeiro', role: 'Gestão de Tarefas', color: '#38bdf8',
    icon: ClipboardCheck, x: CX - ORBIT_R, y: CY,
    desc: 'Guarda tarefas, organiza prioridades e acompanha o que está pendente para o negócio.',
    sugestoes: [
      'Adicione uma tarefa: ligar para fornecedor amanhã',
      'O que está pendente esta semana?',
      'Me lembre de revisar a folha de pagamento',
    ],
  },
]

const ORCHESTRATOR: AgentDef = {
  id: 'orquestrador', name: 'Orquestrador', role: 'Hub central', color: '#a78bfa',
  icon: Cpu, x: CX, y: CY,
  desc: 'Centraliza as perguntas e distribui para o agente especialista certo. O ponto de entrada para qualquer dúvida sobre o negócio.',
  sugestoes: [
    'Me dê um resumo geral do meu negócio este mês',
    'Quais são as principais oportunidades agora?',
    'O que eu deveria priorizar esta semana?',
  ],
}

export default function AgentesPage() {
  const [selected, setSelected] = useState<AgentDef | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [msgs, setMsgs] = useState<{ role: 'user' | 'agent'; text: string }[]>([])
  const [loading, setLoading] = useState(false)

  function openAgent(agent: AgentDef) {
    setSelected(agent)
    setMsgs([])
    setPrompt('')
  }

  async function send(text?: string) {
    const q = text ?? prompt.trim()
    if (!q || !selected) return
    setMsgs(m => [...m, { role: 'user', text: q }])
    setPrompt('')
    setLoading(true)
    try {
      const res = await fetch('/api/agentes/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agente: selected.id, mensagem: q, historico: msgs }),
      })
      const data = await res.json()
      setMsgs(m => [...m, { role: 'agent', text: data.resposta ?? 'Erro ao processar.' }])
    } catch {
      setMsgs(m => [...m, { role: 'agent', text: 'Falha na conexão. Tente novamente.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-5">
        <h1 className="text-[20px] font-bold text-[#0f172a]">Equipe de IA</h1>
        <p className="text-[12px] text-[#64748b] mt-0.5">
          Clique em um agente para conversar e obter insights sobre o negócio.
        </p>
      </div>

      {/* Orbital panel */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ paddingBottom: `${(VH / VW) * 100}%`, background: '#060d1f', minHeight: 380 }}
      >
        <div className="absolute inset-0">
          {/* Grid */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: [
                'linear-gradient(rgba(129,140,248,0.05) 1px, transparent 1px)',
                'linear-gradient(90deg, rgba(129,140,248,0.05) 1px, transparent 1px)',
              ].join(','),
              backgroundSize: '32px 32px',
            }}
          />
          {/* Center ambient glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 55% 55% at 50% 50%, rgba(99,102,241,0.09) 0%, transparent 70%)' }}
          />

          {/* SVG: connections, rings, packets */}
          <svg viewBox={`0 0 ${VW} ${VH}`} className="absolute inset-0 w-full h-full">
            <defs>
              {SATELLITES.map(a => (
                <path key={`p-${a.id}`} id={`p-${a.id}`} d={`M ${CX} ${CY} L ${a.x} ${a.y}`} />
              ))}
              {SATELLITES.map(a => (
                <path key={`r-${a.id}`} id={`r-${a.id}`} d={`M ${a.x} ${a.y} L ${CX} ${CY}`} />
              ))}
            </defs>

            {/* Orbit ring */}
            <circle cx={CX} cy={CY} r={ORBIT_R} fill="none" stroke="rgba(129,140,248,0.13)" strokeWidth="1" strokeDasharray="5 9" />

            {/* Connection lines */}
            {SATELLITES.map(a => (
              <line key={`l-${a.id}`} x1={CX} y1={CY} x2={a.x} y2={a.y}
                stroke={a.color} strokeWidth="0.8" strokeOpacity="0.18" />
            ))}

            {/* Outbound packets */}
            {SATELLITES.map((a, i) => (
              <circle key={`pkt-${a.id}`} r="3.5" fill={a.color} opacity="0.9">
                <animateMotion dur={`${2.4 + i * 0.45}s`} repeatCount="indefinite" begin={`${i * 0.85}s`}>
                  <mpath href={`#p-${a.id}`} />
                </animateMotion>
              </circle>
            ))}

            {/* Return packets (dimmer) */}
            {SATELLITES.map((a, i) => (
              <circle key={`rpkt-${a.id}`} r="2.5" fill={a.color} opacity="0.45">
                <animateMotion dur={`${2 + i * 0.35}s`} repeatCount="indefinite" begin={`${1.3 + i * 0.65}s`}>
                  <mpath href={`#r-${a.id}`} />
                </animateMotion>
              </circle>
            ))}

            {/* Satellite pulse rings */}
            {SATELLITES.map((a, i) => (
              <circle key={`ring-${a.id}`} cx={a.x} cy={a.y} r={NODE_R} fill="none" stroke={a.color} strokeWidth="1.5" opacity="0">
                <animate attributeName="r" values={`${NODE_R};${NODE_R + 24}`} dur="3s" begin={`${i * 0.75}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.45;0" dur="3s" begin={`${i * 0.75}s`} repeatCount="indefinite" />
              </circle>
            ))}

            {/* Hub pulse rings */}
            {[0, 1.0].map((delay, i) => (
              <circle key={`hr-${i}`} cx={CX} cy={CY} r={HUB_R} fill="none" stroke="#a78bfa" strokeWidth={i === 0 ? '2' : '1.5'} opacity="0">
                <animate attributeName="r" values={`${HUB_R};${HUB_R + 32}`} dur="2.6s" begin={`${delay}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.55;0" dur="2.6s" begin={`${delay}s`} repeatCount="indefinite" />
              </circle>
            ))}

            {/* Satellite node bg circles */}
            {SATELLITES.map(a => (
              <g key={`nbg-${a.id}`}>
                <circle cx={a.x} cy={a.y} r={NODE_R + 12} fill={a.color} opacity="0.05" />
                <circle cx={a.x} cy={a.y} r={NODE_R} fill="rgba(6,13,31,0.92)" stroke={a.color} strokeWidth="1.5" strokeOpacity="0.65" />
              </g>
            ))}

            {/* Hub bg circle */}
            <circle cx={CX} cy={CY} r={HUB_R + 16} fill="rgba(167,139,250,0.06)" />
            <circle cx={CX} cy={CY} r={HUB_R} fill="rgba(6,13,31,0.95)" stroke="#a78bfa" strokeWidth="2" strokeOpacity="0.75" />
          </svg>

          {/* Interactive overlay */}
          <div className="absolute inset-0">
            {/* Satellite nodes */}
            {SATELLITES.map(a => {
              const Icon = a.icon
              const isH = hoveredId === a.id
              return (
                <button
                  key={a.id}
                  onClick={() => openAgent(a)}
                  onMouseEnter={() => setHoveredId(a.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className="absolute flex flex-col items-center"
                  style={{
                    left: `${(a.x / VW) * 100}%`,
                    top: `${(a.y / VH) * 100}%`,
                    transform: `translate(-50%, -50%) scale(${isH ? 1.13 : 1})`,
                    transition: 'transform 0.2s ease',
                    width: NODE_R * 2 + 16,
                  }}
                >
                  <div
                    className="flex items-center justify-center rounded-full"
                    style={{
                      width: NODE_R * 2,
                      height: NODE_R * 2,
                      boxShadow: isH ? `0 0 22px ${a.color}80, 0 0 44px ${a.color}38` : `0 0 8px ${a.color}28`,
                      transition: 'box-shadow 0.3s',
                    }}
                  >
                    <Icon size={19} style={{ color: a.color }} />
                  </div>
                  <span
                    className="text-[11px] font-bold mt-1.5 leading-none"
                    style={{ color: a.color, textShadow: `0 0 8px ${a.color}60` }}
                  >
                    {a.name}
                  </span>
                  <span className="text-[9px] text-[#475569] uppercase tracking-wider mt-0.5 leading-none whitespace-nowrap">
                    {a.role}
                  </span>
                </button>
              )
            })}

            {/* Orchestrator */}
            {(() => {
              const isH = hoveredId === ORCHESTRATOR.id
              return (
                <button
                  onClick={() => openAgent(ORCHESTRATOR)}
                  onMouseEnter={() => setHoveredId(ORCHESTRATOR.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className="absolute flex flex-col items-center"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: `translate(-50%, -50%) scale(${isH ? 1.07 : 1})`,
                    transition: 'transform 0.2s ease',
                    width: HUB_R * 2 + 16,
                  }}
                >
                  <div
                    className="flex items-center justify-center rounded-full"
                    style={{
                      width: HUB_R * 2,
                      height: HUB_R * 2,
                      boxShadow: isH
                        ? '0 0 32px #a78bfa90, 0 0 64px #a78bfa40'
                        : '0 0 18px #a78bfa38',
                      transition: 'box-shadow 0.3s',
                    }}
                  >
                    <Cpu size={28} style={{ color: '#a78bfa' }} />
                  </div>
                  <span
                    className="text-[12px] font-bold mt-1.5 leading-none"
                    style={{ color: '#a78bfa', textShadow: '0 0 12px #a78bfa70' }}
                  >
                    Orquestrador
                  </span>
                  <span className="text-[9px] text-[#475569] uppercase tracking-wider mt-0.5 leading-none">
                    Hub central
                  </span>
                </button>
              )
            })()}
          </div>

          <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-none">
            <span className="text-[9px] text-[#1e293b] uppercase tracking-[0.2em]">
              clique em um agente para conversar
            </span>
          </div>
        </div>
      </div>

      {/* Chat modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/65 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
          <div
            className="bg-[#0c1428] w-full md:max-w-2xl md:rounded-2xl flex flex-col shadow-2xl border border-[#1e2d4a]"
            style={{ height: '85vh' }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1e2d4a]">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${selected.color}14`, border: `1px solid ${selected.color}40` }}
              >
                <selected.icon size={16} style={{ color: selected.color }} />
              </div>
              <div className="flex-1">
                <div className="text-[14px] font-bold text-white">{selected.name}</div>
                <div className="text-[10px] font-medium" style={{ color: selected.color }}>{selected.role}</div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#475569] hover:text-white hover:bg-[#1e2d4a] transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {msgs.length === 0 && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: `${selected.color}14`, border: `1px solid ${selected.color}40` }}
                    >
                      <selected.icon size={13} style={{ color: selected.color }} />
                    </div>
                    <div className="bg-[#19253d] rounded-xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                      <p className="text-[13px] text-[#e2e8f0]">
                        Olá! Sou o agente <strong style={{ color: selected.color }}>{selected.name}</strong>. {selected.desc}
                      </p>
                      <p className="text-[12px] text-[#64748b] mt-2">Como posso ajudar?</p>
                    </div>
                  </div>
                  <div className="pt-1">
                    <div className="text-[10px] font-semibold text-[#334155] uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Sparkles size={10} />
                      Sugestões
                    </div>
                    <div className="space-y-1.5">
                      {selected.sugestoes.map(s => (
                        <button
                          key={s}
                          onClick={() => send(s)}
                          className="w-full text-left text-[12px] text-[#94a3b8] border border-[#1e2d4a] rounded-xl px-3 py-2 hover:border-[#2d3f5a] hover:text-[#e2e8f0] transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {msgs.map((m, i) => (
                <div key={i} className={`flex items-start gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {m.role === 'agent' && (
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: `${selected.color}14`, border: `1px solid ${selected.color}40` }}
                    >
                      <selected.icon size={13} style={{ color: selected.color }} />
                    </div>
                  )}
                  <div
                    className={`rounded-xl px-4 py-3 max-w-[85%] text-[13px] leading-relaxed whitespace-pre-wrap ${
                      m.role === 'user' ? 'text-white rounded-tr-sm' : 'bg-[#19253d] text-[#e2e8f0] rounded-tl-sm'
                    }`}
                    style={m.role === 'user' ? { backgroundColor: selected.color } : {}}
                  >
                    {m.text}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-start gap-2.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${selected.color}14`, border: `1px solid ${selected.color}40` }}
                  >
                    <selected.icon size={13} style={{ color: selected.color }} />
                  </div>
                  <div className="bg-[#19253d] rounded-xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1">
                      {[0, 1, 2].map(j => (
                        <span
                          key={j}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor: selected.color,
                            animation: `bar-pulse 1.4s ease-in-out ${j * 0.2}s infinite`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-[#1e2d4a]">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                  placeholder={`Pergunte ao ${selected.name}...`}
                  disabled={loading}
                  className="flex-1 rounded-xl border border-[#1e2d4a] bg-[#080f1e] px-4 py-2.5 text-[13px] text-white focus:outline-none focus:border-[#2d4060] placeholder:text-[#334155] disabled:opacity-60"
                />
                <button
                  onClick={() => send()}
                  disabled={!prompt.trim() || loading}
                  className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-40 transition-opacity"
                  style={{ backgroundColor: selected.color }}
                >
                  <Send size={14} className="text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
