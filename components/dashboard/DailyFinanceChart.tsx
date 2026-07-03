'use client'
import { useState } from 'react'

interface DayData {
  dia: number
  valor: number
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const W = 600
const H = 140
const PL = 48
const PR = 12
const PT = 12
const PB = 24
const CW = W - PL - PR
const CH = H - PT - PB

function niceMax(v: number) {
  if (v === 0) return 1000
  const e = Math.pow(10, Math.floor(Math.log10(v)))
  return Math.ceil(v / e) * e
}

export function DailyFinanceChart({
  dados,
  saidas,
  mes,
}: {
  dados: DayData[]
  saidas?: DayData[]
  mes: string
}) {
  const [hoverDia, setHoverDia] = useState<number | null>(null)

  const diasNoMes = new Date(
    Number(mes.slice(0, 4)),
    Number(mes.slice(5, 7)),
    0,
  ).getDate()

  const saidasArr = saidas ?? []
  const maxVal = niceMax(Math.max(
    ...dados.map(d => d.valor),
    ...saidasArr.map(d => d.valor),
    0,
  ))

  const barSlot = CW / diasNoMes
  // Dois grupos por dia: entrada (esquerda) + saída (direita)
  const barW = Math.max(1.5, barSlot * 0.35)
  const gap = 1

  // Acumulado de entradas
  let acumulado = 0
  const acumulados = Array.from({ length: diasNoMes }, (_, i) => {
    const d = dados.find(x => x.dia === i + 1)
    acumulado += d?.valor ?? 0
    return acumulado
  })
  const maxAcum = Math.max(...acumulados, 1)

  const linePath = acumulados
    .map((v, i) => {
      const x = PL + i * barSlot + barSlot / 2
      const y = PT + CH - (v / maxAcum) * CH
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')

  const ticks = [0, 0.25, 0.5, 0.75, 1].map(p => ({ p, v: maxVal * p }))

  const hoverEntrada = hoverDia !== null ? dados.find(d => d.dia === hoverDia) : null
  const hoverSaida   = hoverDia !== null ? saidasArr.find(d => d.dia === hoverDia) : null
  const hoverAcum    = hoverDia !== null ? acumulados[hoverDia - 1] : null

  return (
    <div className="relative select-none">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: H }}
        onMouseLeave={() => setHoverDia(null)}
      >
        <defs>
          <linearGradient id="barGradEnt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a5b4fc" />
          </linearGradient>
          <linearGradient id="barGradSai" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#fca5a5" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid */}
        {ticks.map(({ p, v }) => {
          const y = PT + CH - p * CH
          return (
            <g key={p}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="#f1f5f9" strokeWidth={1} />
              <text x={PL - 4} y={y + 3} textAnchor="end" fontSize={8} fill="#cbd5e1">
                {v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)}
              </text>
            </g>
          )
        })}

        {/* Barras diárias */}
        {Array.from({ length: diasNoMes }, (_, i) => {
          const dia = i + 1
          const entrada = dados.find(x => x.dia === dia)?.valor ?? 0
          const saida   = saidasArr.find(x => x.dia === dia)?.valor ?? 0
          const isH = hoverDia === dia

          const slotCenterX = PL + i * barSlot + barSlot / 2

          // Posições das barras: entrada à esquerda do centro, saída à direita
          const xEnt = slotCenterX - gap / 2 - barW
          const xSai = slotCenterX + gap / 2

          const barHEnt = (entrada / maxVal) * CH
          const barHSai = (saida / maxVal) * CH

          return (
            <g key={dia}>
              {/* Hover zone */}
              <rect
                x={PL + i * barSlot}
                y={PT}
                width={barSlot}
                height={CH}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoverDia(dia)}
              />
              {/* Barra entrada */}
              {entrada > 0 && (
                <rect
                  x={xEnt}
                  y={PT + CH - barHEnt}
                  width={barW}
                  height={Math.max(2, barHEnt)}
                  rx={1.5}
                  fill={isH ? '#4f46e5' : 'url(#barGradEnt)'}
                  opacity={isH ? 1 : 0.85}
                />
              )}
              {/* Barra saída */}
              {saida > 0 && (
                <rect
                  x={xSai}
                  y={PT + CH - barHSai}
                  width={barW}
                  height={Math.max(2, barHSai)}
                  rx={1.5}
                  fill={isH ? '#dc2626' : 'url(#barGradSai)'}
                  opacity={isH ? 1 : 0.85}
                />
              )}
              {/* Linha vertical hover */}
              {isH && (
                <line
                  x1={slotCenterX}
                  y1={PT}
                  x2={slotCenterX}
                  y2={PT + CH}
                  stroke="#64748b"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  opacity={0.3}
                />
              )}
            </g>
          )
        })}

        {/* Área sob a linha de acumulado */}
        <path
          d={`${linePath} L ${(PL + (diasNoMes - 0.5) * barSlot).toFixed(1)} ${PT + CH} L ${(PL + 0.5 * barSlot).toFixed(1)} ${PT + CH} Z`}
          fill="url(#lineGrad)"
        />

        {/* Linha de acumulado */}
        <path
          d={linePath}
          fill="none"
          stroke="#4f46e5"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Eixo X */}
        {Array.from({ length: diasNoMes }, (_, i) => {
          const dia = i + 1
          if (dia !== 1 && dia % 5 !== 0 && dia !== diasNoMes) return null
          return (
            <text
              key={dia}
              x={PL + i * barSlot + barSlot / 2}
              y={H - 6}
              textAnchor="middle"
              fontSize={8}
              fill="#94a3b8"
            >
              {dia}
            </text>
          )
        })}
      </svg>

      {/* Tooltip */}
      {hoverDia !== null && (
        <div className="pointer-events-none absolute top-1 right-2 bg-[#0f172a]/90 text-white rounded-lg px-3 py-2 text-[11px] shadow-xl min-w-[140px]">
          <div className="font-bold mb-1 text-[#94a3b8]">Dia {hoverDia}</div>
          <div className="flex justify-between gap-3">
            <span className="text-[#a5b4fc]">Entradas</span>
            <span className="font-semibold">{fmt(hoverEntrada?.valor ?? 0)}</span>
          </div>
          {saidasArr.length > 0 && (
            <div className="flex justify-between gap-3">
              <span className="text-[#fca5a5]">Saídas</span>
              <span className="font-semibold">{fmt(hoverSaida?.valor ?? 0)}</span>
            </div>
          )}
          <div className="flex justify-between gap-3 mt-1 pt-1 border-t border-white/10">
            <span className="text-[#94a3b8]">Acumulado</span>
            <span className="font-semibold">{fmt(hoverAcum ?? 0)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
