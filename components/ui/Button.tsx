import { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const base = 'inline-flex items-center gap-1.5 font-semibold rounded-lg transition-colors cursor-pointer border-0 disabled:opacity-50 disabled:cursor-not-allowed'

const variants: Record<Variant, string> = {
  primary:   'text-white',
  secondary: 'bg-white text-[#0f172a] border border-[#e2e8f0] hover:bg-[#f8fafc]',
  ghost:     'bg-transparent text-[#64748b] border border-[#e2e8f0] hover:bg-[#f8fafc]',
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-[11px]',
  md: 'px-4 py-2 text-[12px]',
}

export function Button({ variant = 'primary', size = 'md', className = '', style, children, ...props }: ButtonProps) {
  const primaryStyle = variant === 'primary'
    ? { backgroundColor: 'var(--sc, #4f46e5)', ...style }
    : style
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      style={primaryStyle}
      {...props}
    >
      {children}
    </button>
  )
}
