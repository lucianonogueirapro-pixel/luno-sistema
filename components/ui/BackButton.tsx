'use client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface Props {
  href: string
  label?: string
}

export function BackButton({ href, label = 'Voltar' }: Props) {
  const router = useRouter()
  const cls = 'inline-flex items-center gap-2 px-3.5 py-2 bg-[#4f46e5] text-white text-[11px] font-semibold rounded-lg hover:bg-[#374151] transition-colors shadow-sm'

  function handleClick(e: React.MouseEvent) {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      e.preventDefault()
      router.back()
    }
  }

  return (
    <Link href={href} onClick={handleClick} className={cls}>
      <ArrowLeft size={12} strokeWidth={2.5} />
      {label}
    </Link>
  )
}
