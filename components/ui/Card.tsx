interface CardProps {
  children: React.ReactNode
  className?: string
  accentColor?: string
}

export function Card({ children, className = '', accentColor }: CardProps) {
  return (
    <div
      className={`bg-white border border-[#e2e8f0] rounded-xl shadow-[0_1px_4px_rgba(15,23,42,0.06)] ${className}`}
      style={accentColor ? { borderLeftColor: accentColor, borderLeftWidth: 4 } : undefined}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 border-b border-[#f1f5f9] ${className}`}>
      {children}
    </div>
  )
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[13px] font-bold text-[#0f172a]">{children}</h3>
}

export function CardBody({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-4 py-3 ${className}`}>{children}</div>
}
