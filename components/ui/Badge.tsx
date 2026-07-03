type BadgeVariant = 'green' | 'amber' | 'blue' | 'red' | 'gray'

const styles: Record<BadgeVariant, string> = {
  green: 'bg-[#EDF5E8] text-[#2D6A1A]',
  amber: 'bg-[#FFF3DC] text-[#b45309]',
  blue:  'bg-[#EEF4FB] text-[#1A4080]',
  red:   'bg-[#FEF0EE] text-[#8B1A1A]',
  gray:  'bg-[#F3F0ED] text-[#6B5344]',
}

export function Badge({ variant, children }: { variant: BadgeVariant; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${styles[variant]}`}>
      {children}
    </span>
  )
}
