interface KPICardProps {
  label: string
  value: string
  sub?: string
  accentColor?: string
}

export function KPICard({ label, value, sub, accentColor = '#94a3b8' }: KPICardProps) {
  return (
    <div
      className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-5 relative overflow-hidden"
      style={{
        borderLeftColor: accentColor,
        borderLeftWidth: 3,
        boxShadow: `0 1px 6px rgba(0,0,0,0.3), inset 0 0 40px ${accentColor}08`,
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(circle at 85% 15%, ${accentColor}12, transparent 65%)` }}
      />
      <div className="text-[9px] font-semibold uppercase tracking-[0.18em] mb-3" style={{ color: '#64748b' }}>
        {label}
      </div>
      <div
        className="text-[28px] font-bold leading-none mb-2 font-mono"
        style={{ color: accentColor }}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[10px]" style={{ color: '#475569' }}>
          {sub}
        </div>
      )}
    </div>
  )
}
