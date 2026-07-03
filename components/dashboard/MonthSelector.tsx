'use client'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

function shift(mes: string, n: number): string {
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function label(mes: string): string {
  const [y, m] = mes.split('-').map(Number)
  return new Date(y, m - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export function MonthSelector({ mes }: { mes: string }) {
  const router = useRouter()
  const now = new Date().toISOString().slice(0, 7)
  const isCurrent = mes === now

  return (
    <div className="flex items-center gap-0.5 bg-white border border-[#e2e8f0] rounded-lg px-1 h-8">
      <button
        onClick={() => router.push(`/dashboard?mes=${shift(mes, -1)}`)}
        className="w-6 h-6 rounded flex items-center justify-center text-[#64748b] hover:bg-[#f1f5f9] transition-colors"
      >
        <ChevronLeft size={13} />
      </button>
      <span className="text-[12px] font-semibold text-[#0f172a] px-2 min-w-[130px] text-center capitalize select-none">
        {label(mes)}
      </span>
      <button
        onClick={() => router.push(`/dashboard?mes=${shift(mes, 1)}`)}
        disabled={isCurrent}
        className="w-6 h-6 rounded flex items-center justify-center text-[#64748b] hover:bg-[#f1f5f9] transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
      >
        <ChevronRight size={13} />
      </button>
    </div>
  )
}
