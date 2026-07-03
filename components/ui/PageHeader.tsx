interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children?: React.ReactNode
}

export function PageHeader({ title, subtitle, action, children }: PageHeaderProps) {
  const right = action ?? children
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-[20px] font-bold text-[#0f172a] font-[family-name:var(--font-playfair)]">{title}</h1>
        {subtitle && <p className="text-[11px] text-[#64748b] mt-0.5 tracking-wide">{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  )
}
