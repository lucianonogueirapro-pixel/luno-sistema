'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronLeft, Bell, LogOut } from 'lucide-react'
import { useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function TopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const isDashboard = pathname === '/dashboard'

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-11 bg-[#4f46e5] flex items-center px-5 gap-4 sticky top-0 z-50">
      {!isDashboard ? (
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-[#94a3b8] hover:text-[#f8fafc] transition-colors text-[12px]"
        >
          <ChevronLeft size={14} strokeWidth={2.5} />
          Voltar
        </button>
      ) : (
        <span className="w-[60px]" />
      )}

      <Link href="/dashboard" className="flex-1 flex justify-center">
        <img src="/logo.svg" alt="Luno" className="h-5 w-auto" />
      </Link>

      <div className="flex items-center gap-3 w-[60px] justify-end">
        <Link href="/notificacoes" className="text-[#94a3b8] hover:text-[#f8fafc] transition-colors">
          <Bell size={14} strokeWidth={2} />
        </Link>
        <button onClick={logout} className="text-[#94a3b8] hover:text-[#f8fafc] transition-colors" title="Sair">
          <LogOut size={13} strokeWidth={2} />
        </button>
      </div>
    </header>
  )
}
