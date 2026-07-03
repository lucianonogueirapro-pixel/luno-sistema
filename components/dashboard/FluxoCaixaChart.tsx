'use client'
import { useState } from 'react'

interface MesFluxo {
  mes: string       // 'YYYY-MM'
  label: string     // 'Jun/26'
  entrada: number
  saida: number
  saldo: number
  isProjecao: boolean
}

interface Props {
  dados: MesFluxo[]
  altura?: number
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

function niceMax(v: number): number {
  if (v <= 0) return 10000
  const magnitude = Math.pow(10, Math.floor(Math.log10(v)))
  return Math.ceil(v / magnitude) * magnitude
}

export function FluxoCaixaChart({ dados, altura = 200 }: Props) {
  const [hover, setHover] = useState<number | null>(null)

  if (!dados.length) return null

  const PL = 56, PR = 12, PT = 20, PB = 36
  const W = 700
  const H = altura
  const chartW = W - PL - PR
  const chartH = H - PT - PB

  const maxEntrada = Math.max(...dados.map(d => d.entrada), 1)
  const maxSaida = Math.max(...dados.map(d => d.saida), 1)
  const maxSaldo = Math.max(...dados.map(d => Math.abs(d.saldo)), 1)
  const maxBar = niceMax(Math.max(maxEntrada, maxSaida))
  const maxLine = niceMax(maxSaldo)

  const n = dados.length
  const barGap = 0.2
  const barGroupW = chartW / n
  const barW = barGroupW * (1 - barGap) / 2

  function xGroup(i: number) { return PL + i * barGroupW + barGroupW / 2 }
  function xEntrada(i: number) { return xGroup(i) - barW - 1 }
  function xSaida(i: number) { return xGroup(i) + 1 }
  function barH(v: number) { return Math.max((v / maxBar) * chartH, 1) }
  function yBar(v: number) { return PT + chartH - barH(v) }

  // Line for saldo (mapped to right scale)
  function ySaldo(v: number) {
    const mid = PT + chartH / 2
    const norm = v / maxLine
    return mid - norm * (chartH / 2) * 0.85
  }

  const linePoints = dados.map((d, i) => `${xGroup(i)},${ySaldo(d.saldo)}`).join(' ')

  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => Math.round(t * maxBar))

  const hoverData = hover !== null ? dados[hover] : null

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full"
        style={{ height: altura }}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="fcEntrada" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id="fcSaida" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f87171" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id="fcEntradaProj" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="fcSaidaProj" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f87171" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {ticks.map((tick, ti) => {
          const y = PT + chartH - (tick / maxBar) * chartH
          return (
            <g key={ti}>
              <line x1={PL} x2={W - PR} y1={y} y2={y} stroke="#f1f5f9" strokeWidth="1" />
              <text x={PL - 4} y={y + 3.5} textAnchor="end" fontSize="9" fill="#94a3b8">
                {tick >= 1000 ? `${(tick / 1000).toFixed(0)}k` : tick}
              </text>
            </g>
          )
        })}

        {/* Saldo zero line */}
        <line
          x1={PL} x2={W - PR}
          y1={ySaldo(0)} y2={ySaldo(0)}
          stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,3"
        />

        {/* Bars */}
        {dados.map((d, i) => {
          const isHover = hover === i
          const gradE = d.isProjecao ? 'url(#fcEntradaProj)' : 'url(#fcEntrada)'
          const gradS = d.isProjecao ? 'url(#fcSaidaProj)' : 'url(#fcSaida)'
          return (
            <g key={i} onMouseEnter={() => setHover(i)} style={{ cursor: 'default' }}>
              {/* invisible hover zone */}
              <rect
                x={PL + i * barGroupW}
                y={PT}
                width={barGroupW}
                height={chartH}
                fill="transparent"
              />
              {/* Entrada bar */}
              {d.entrada > 0 && (
                <rect
                  x={xEntrada(i)}
                  y={yBar(d.entrada)}
                  width={barW}
                  height={barH(d.entrada)}
                  fill={gradE}
                  rx="2"
                  opacity={isHover ? 1 : 0.9}
                />
              )}
              {/* Saida bar */}
              {d.saida > 0 && (
                <rect
                  x={xSaida(i)}
                  y={yBar(d.saida)}
                  width={barW}
                  height={barH(d.saida)}
                  fill={gradS}
                  rx="2"
                  opacity={isHover ? 1 : 0.9}
                />
              )}
              {/* Month label */}
              <text
                x={xGroup(i)}
                y={H - PB + 14}
                textAnchor="middle"
                fontSize="9"
                fill={isHover ? '#0f172a' : '#94a3b8'}
                fontWeight={isHover ? '700' : '400'}
              >
                {d.label}
              </text>
              {d.isProjecao && (
                <text x={xGroup(i)} y={H - PB + 24} textAnchor="middle" fontSize="7.5" fill="#cbd5e1">proj</text>
              )}
            </g>
          )
        })}

        {/* Saldo line */}
        <polyline
          points={linePoints}
          fill="none"
          stroke="#6366f1"
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Saldo dots */}
        {dados.map((d, i) => (
          <circle
            key={i}
            cx={xGroup(i)}
            cy={ySaldo(d.saldo)}
            r={hover === i ? 5 : 3}
            fill={d.saldo >= 0 ? '#6366f1' : '#ef4444'}
            stroke="white"
            strokeWidth="1.5"
            style={{ cursor: 'default' }}
            onMouseEnter={() => setHover(i)}
          />
        ))}

        {/* Hover tooltip */}
        {hoverData !== null && hover !== null && (() => {
          const cx = xGroup(hover)
          const tipW = 140
          const tipH = 72
          const tx = Math.min(Math.max(cx - tipW / 2, PL), W - PR - tipW)
          const ty = PT - 4
          const saldoPos = hoverData.saldo >= 0
          return (
            <g style={{ pointerEvents: 'none' }}>
              <rect x={tx} y={ty} width={tipW} height={tipH} rx="6" fill="white" stroke="#e2e8f0" strokeWidth="1" filter="drop-shadow(0 2px 6px rgba(0,0,0,0.08))" />
              <text x={tx + 8} y={ty + 14} fontSize="10" fontWeight="700" fill="#0f172a">{hoverData.label}{hoverData.isProjecao ? ' · projeção' : ''}</text>
              <text x={tx + 8} y={ty + 28} fontSize="9" fill="#16a34a">E: {hoverData.entrada >= 1000 ? `R$${(hoverData.entrada / 1000).toFixed(1)}k` : fmt(hoverData.entrada)}</text>
              <text x={tx + 8} y={ty + 40} fontSize="9" fill="#dc2626">S: {hoverData.saida >= 1000 ? `R$${(hoverData.saida / 1000).toFixed(1)}k` : fmt(hoverData.saida)}</text>
              <text x={tx + 8} y={ty + 55} fontSize="9" fontWeight="700" fill={saldoPos ? '#6366f1' : '#ef4444'}>
                Saldo: {hoverData.saldo >= 1000 || hoverData.saldo <= -1000 ? `R$${(hoverData.saldo / 1000).toFixed(1)}k` : fmt(hoverData.saldo)}
              </text>
            </g>
          )
        })()}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[#22c55e]" />
          <span className="text-[10px] text-[#64748b]">Entradas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[#f87171]" />
          <span className="text-[10px] text-[#64748b]">Saídas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-0.5 bg-[#6366f1] rounded" />
          <span className="text-[10px] text-[#64748b]">Saldo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-[#22c55e] opacity-35" />
          <span className="text-[10px] text-[#64748b]">Projeção</span>
        </div>
      </div>
    </div>
  )
}
