'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { VoiceButton } from './VoiceButton'
import { RealtimeSync } from '@/components/RealtimeSync'
import { ImpersonateBanner } from '@/components/admin/ImpersonateBanner'
import { EmpresaProvider } from '@/context/EmpresaContext'

const SECTION_MAP: { prefix: string; bg: string; color: string }[] = [
  { prefix: '/atendimento',   bg: '#ecfdf5', color: '#059669' },
  { prefix: '/dashboard',     bg: '#eff6ff', color: '#2563eb' },
  { prefix: '/relatorios',    bg: '#eff6ff', color: '#2563eb' },
  { prefix: '/notificacoes',  bg: '#eff6ff', color: '#2563eb' },
  { prefix: '/pacientes',     bg: '#ecfeff', color: '#0891b2' },
  { prefix: '/agenda',        bg: '#ecfeff', color: '#0891b2' },
  { prefix: '/insumos',       bg: '#ecfeff', color: '#0891b2' },
  { prefix: '/procedimentos', bg: '#ecfeff', color: '#0891b2' },
  { prefix: '/profissionais', bg: '#ecfeff', color: '#0891b2' },
  { prefix: '/avaliacoes',    bg: '#ecfeff', color: '#0891b2' },
  { prefix: '/comercial',     bg: '#ecfdf5', color: '#059669' },
  { prefix: '/crm',           bg: '#ecfdf5', color: '#059669' },
  { prefix: '/orcamentos',    bg: '#ecfdf5', color: '#059669' },
  { prefix: '/tarefas',        bg: '#f0fdf4', color: '#16a34a' },
  { prefix: '/financeiro',    bg: '#fffbeb', color: '#d97706' },
  { prefix: '/dre',           bg: '#fffbeb', color: '#d97706' },
  { prefix: '/custos',        bg: '#fffbeb', color: '#d97706' },
  { prefix: '/agentes',       bg: '#f5f3ff', color: '#7c3aed' },
  { prefix: '/configuracoes', bg: '#faf5ff', color: '#9333ea' },
  { prefix: '/admin',         bg: '#fdf4ff', color: '#c026d3' },
]

function getSectionStyle(pathname: string): { bg: string; color: string } {
  const match = SECTION_MAP.find(
    s => pathname === s.prefix || pathname.startsWith(s.prefix + '/')
  )
  return { bg: match?.bg ?? '#f1f5f9', color: match?.color ?? '#4f46e5' }
}

export default function Shell({ children, fullWidth }: { children: React.ReactNode; fullWidth?: boolean }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { bg, color } = getSectionStyle(pathname)

  useEffect(() => {
    fetch('/api/notificacoes/gerar', { method: 'POST' }).catch(() => {})
  }, [])

  // Fecha sidebar ao mudar de rota (mobile)
  useEffect(() => { setSidebarOpen(false) }, [pathname])

  const background = [
    `radial-gradient(ellipse 80% 60% at 0% 0%, ${color}40 0%, transparent 60%)`,
    `radial-gradient(ellipse 55% 45% at 100% 100%, ${color}28 0%, transparent 55%)`,
    bg,
  ].join(', ')

  return (
    <EmpresaProvider>
    <div
      className="flex h-[100dvh] overflow-hidden"
      style={{ background, '--sc': color } as React.CSSProperties}
    >
      <ImpersonateBanner />
      <RealtimeSync />

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — fixed no mobile, static no desktop */}
      <div
        className={[
          'fixed inset-y-0 left-0 z-50',
          'md:static md:z-auto',
          'transition-transform duration-300 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        <Sidebar />
      </div>

      <main className={`flex-1 min-w-0 ${fullWidth ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'}`}>
        {/* Header mobile */}
        <div className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-sm border-b border-black/5">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-[#475569] hover:bg-black/5"
          >
            <Menu size={20} />
          </button>
          <span className="text-[18px] font-black text-[#0f172a]">
            Luno<span style={{ color }}>.</span>
          </span>
          <div className="w-9" />
        </div>

        {fullWidth ? (
          <div className="flex flex-col h-full">
            {children}
          </div>
        ) : (
          <div className="max-w-6xl mx-auto p-4 md:p-6">
            {children}
          </div>
        )}
      </main>

      <VoiceButton />
    </div>
    </EmpresaProvider>
  )
}
