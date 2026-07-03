'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePlano } from '@/context/EmpresaContext'
import {
  LayoutDashboard, Users, CalendarDays,
  Wallet, BarChart2,
  Package, Briefcase, LogOut,
  Calculator, Bell, Settings,
  UserCheck, MessageSquare, Plug, SlidersHorizontal,
  Users2, Bot, ClipboardList, Shield, Lock, X,
} from 'lucide-react'

type NavChild = { href: string; label: string; icon: React.ElementType }
type NavItem  = { href: string; icon: React.ElementType; label: string; children?: NavChild[] }
type Section  = { label: string; color: string; items: NavItem[] }

const sections: Section[] = [
  {
    label: 'Equipe IA',
    color: '#a78bfa',
    items: [
      { href: '/agentes', icon: Bot,           label: 'Agentes' },
      { href: '/tarefas', icon: ClipboardList, label: 'Board de Tarefas' },
    ],
  },
  {
    label: 'Visão Geral',
    color: '#60a5fa',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Negócio',
    color: '#22d3ee',
    items: [
      { href: '/pacientes',     icon: Users,        label: 'Clientes' },
      { href: '/agenda',        icon: CalendarDays, label: 'Agenda' },
      { href: '/profissionais', icon: UserCheck,    label: 'Profissionais' },
      { href: '/procedimentos', icon: Briefcase,    label: 'Serviços' },
      { href: '/insumos',       icon: Package,      label: 'Produtos' },
    ],
  },
  {
    label: 'CRM e Atendimento',
    color: '#34d399',
    items: [
      { href: '/crm', icon: Users2, label: 'Pipeline' },
      {
        href: '/atendimento',
        icon: MessageSquare,
        label: 'Luna IA',
        children: [
          { href: '/atendimento/integracao',    label: 'Integração WhatsApp', icon: Plug },
          { href: '/atendimento/configuracoes', label: 'Configuração Luna',   icon: SlidersHorizontal },
        ],
      },
    ],
  },
  {
    label: 'Financeiro',
    color: '#fbbf24',
    items: [
      { href: '/financeiro', icon: Wallet,     label: 'Lançamentos' },
      { href: '/dre',        icon: BarChart2,  label: 'DRE / Caixa' },
      { href: '/custos',     icon: Calculator, label: 'Custos' },
    ],
  },
  {
    label: 'Sistema',
    color: '#c084fc',
    items: [
      { href: '/configuracoes', icon: Settings, label: 'Configurações' },
    ],
  },
]

// Rotas travadas por plano
const BLOQUEADOS: Record<string, string[]> = {
  basic:  ['/atendimento', '/agentes'],
  pro:    ['/agentes'],
  pro_ia: [],
}

// Plano mínimo para desbloquear
const UPGRADE_PARA: Record<string, string> = {
  '/atendimento': 'Pro',
  '/agentes':     'Pro IA',
}

function hex(color: string, alpha: number) {
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0')
  return `${color}${a}`
}

function PlanoModal({ href, planoAtual, onClose }: { href: string; planoAtual: string; onClose: () => void }) {
  const upgrade = UPGRADE_PARA[href] ?? 'Pro'
  const planoLabel = planoAtual === 'pro_ia' ? 'Pro IA' : planoAtual === 'pro' ? 'Pro' : 'Basic'
  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 bg-[#fef3c7] rounded-xl flex items-center justify-center">
            <Lock size={18} className="text-[#d97706]" />
          </div>
          <button onClick={onClose} className="text-[#94a3b8] hover:text-[#475569]">
            <X size={18} />
          </button>
        </div>
        <h3 className="text-[15px] font-black text-[#0f172a] mb-1">Recurso não disponível</h3>
        <p className="text-[13px] text-[#64748b] mb-4">
          Este recurso faz parte do plano <strong className="text-[#0f172a]">{upgrade}</strong>.
          Seu plano atual é <strong className="text-[#0f172a]">{planoLabel}</strong>.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-[#e2e8f0] rounded-xl text-[13px] font-semibold text-[#64748b] hover:bg-[#f8fafc] transition-colors"
          >
            Fechar
          </button>
          <Link
            href="/configuracoes"
            onClick={onClose}
            className="flex-1 py-2 bg-[#4f46e5] text-white rounded-xl text-[13px] font-semibold text-center hover:bg-[#4338ca] transition-colors"
          >
            Ver planos
          </Link>
        </div>
      </div>
    </div>
  )
}

function NavLink({
  href, icon: Icon, label, color, pathname, pulse, locked, planoAtual,
}: {
  href: string; icon: React.ElementType; label: string
  color: string; pathname: string; pulse?: boolean
  locked?: boolean; planoAtual?: string
}) {
  const [hovered, setHovered] = useState(false)
  const [modal, setModal]     = useState(false)
  const exact  = pathname === href
  const parent = pathname.startsWith(href + '/') && !exact

  if (locked) {
    return (
      <>
        <button
          type="button"
          onClick={() => setModal(true)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            backgroundColor: hovered ? hex('#94a3b8', 0.08) : 'transparent',
            borderLeft: '2px solid transparent',
          }}
          className="w-full flex items-center gap-2.5 mx-2 px-3 py-[7px] rounded-lg text-[12px] font-medium transition-all"
        >
          <Icon size={14} strokeWidth={2} style={{ color: '#94a3b8' }} />
          <span className="flex-1 flex items-center gap-1.5 text-[#94a3b8]">
            {label}
          </span>
          <Lock size={10} className="text-[#cbd5e1] flex-shrink-0" />
        </button>
        {modal && <PlanoModal href={href} planoAtual={planoAtual ?? 'basic'} onClose={() => setModal(false)} />}
      </>
    )
  }

  const bg = exact   ? hex(color, 0.18)
           : parent  ? hex(color, 0.10)
           : hovered ? hex(color, 0.08)
           : 'transparent'

  const textColor  = (exact || parent) ? color : hovered ? '#cbd5e1' : '#475569'
  const borderColor = exact ? color : 'transparent'

  return (
    <Link
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ backgroundColor: bg, color: textColor, borderLeft: `2px solid ${borderColor}` }}
      className="flex items-center gap-2.5 mx-2 px-3 py-[7px] rounded-lg text-[12px] font-medium transition-all"
    >
      <Icon
        size={14}
        strokeWidth={exact ? 2.5 : 2}
        style={{ color: (exact || parent || hovered) ? color : '#334155' }}
      />
      <span className="flex-1 flex items-center gap-1.5">
        {label}
        {pulse && (
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{
              backgroundColor: color,
              boxShadow: `0 0 5px ${color}`,
              animation: 'bar-pulse 1.4s ease-in-out infinite',
            }}
          />
        )}
      </span>
    </Link>
  )
}

function ChildLink({
  href, label, icon: Icon, color, pathname,
}: {
  href: string; label: string; icon: React.ElementType
  color: string; pathname: string
}) {
  const [hovered, setHovered] = useState(false)
  const active = pathname === href || pathname.startsWith(href + '/')
  return (
    <Link
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: active ? hex(color, 0.18) : hovered ? hex(color, 0.08) : 'transparent',
        color: active ? color : hovered ? '#cbd5e1' : '#475569',
      }}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all"
    >
      <Icon size={10} style={{ color: active ? color : '#334155' }} />
      {label}
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  function sb() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }
  const plano    = usePlano()

  const [notifCount, setNotifCount] = useState(0)
  const [lunaPulse,  setLunaPulse]  = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  const bloqueados = BLOQUEADOS[plano] ?? []

  useEffect(() => {
    const supabase = sb()
    async function loadNotifs() {
      const { count } = await supabase
        .from('notificacoes')
        .select('*', { count: 'exact', head: true })
        .eq('lida', false)
      setNotifCount(count ?? 0)
    }
    loadNotifs()
    const interval = setInterval(loadNotifs, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const supabase = sb()
    async function loadCounts() {
      const { count: em_atendimento } = await supabase
        .from('wa_conversas')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'em_atendimento')
      setLunaPulse((em_atendimento ?? 0) > 0)
    }
    loadCounts()
    const ch = supabase
      .channel('sidebar-wa')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wa_conversas' }, loadCounts)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  useEffect(() => {
    sb().auth.getUser().then(({ data: { user } }) => {
      const role = user?.user_metadata?.role ?? user?.app_metadata?.role
      setIsSuperAdmin(role === 'super_admin')
    })
  }, [])

  async function logout() {
    await sb().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-[220px] bg-[#0f172a] border-r border-[#1e293b] flex flex-col flex-shrink-0 h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-[#1e293b]">
        <div className="text-[22px] font-black tracking-tight text-white leading-none">
          Luno
          <span className="text-[#818cf8]">.</span>
        </div>
        <div className="text-[8px] text-[#334155] tracking-[.14em] mt-1 uppercase font-mono">v0.2 · Gestão + Luna IA</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {sections.map(section => {
          const hasActive = section.items.some(
            item => pathname === item.href || pathname.startsWith(item.href + '/')
          )
          // Seção inteiramente bloqueada se todos os itens estiverem bloqueados
          const sectionAllLocked = section.items.every(item => bloqueados.includes(item.href))

          return (
            <div key={section.label} className="mb-0.5">
              <div
                className="flex items-center gap-1.5 px-5 pt-3 pb-1 relative overflow-hidden rounded-sm transition-all duration-300"
                style={{ color: sectionAllLocked ? hex(section.color, 0.25) : hasActive ? section.color : hex(section.color, 0.40) }}
              >
                {hasActive && !sectionAllLocked && (
                  <span
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: `radial-gradient(ellipse at 0% 50%, ${section.color}22, transparent 70%)` }}
                  />
                )}
                <div
                  className="relative w-1.5 h-1.5 rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: section.color,
                    opacity: sectionAllLocked ? 0.15 : hasActive ? 1 : 0.3,
                    boxShadow: hasActive && !sectionAllLocked ? `0 0 6px ${section.color}` : 'none',
                  }}
                />
                <span className="relative text-[9px] font-semibold uppercase tracking-[.14em] transition-all duration-300">
                  {section.label}
                  {sectionAllLocked && (
                    <Lock size={8} className="inline ml-1 opacity-50" />
                  )}
                </span>
              </div>

              {section.items.map(item => {
                const isLocked    = bloqueados.includes(item.href) && !isSuperAdmin
                const parentActive = !isLocked && (pathname === item.href || pathname.startsWith(item.href + '/'))
                return (
                  <div key={item.href}>
                    <NavLink
                      href={item.href}
                      icon={item.icon}
                      label={item.label}
                      color={section.color}
                      pathname={pathname}
                      pulse={item.href === '/atendimento' && !isLocked}
                      locked={isLocked}
                      planoAtual={plano}
                    />
                    {item.children && !isLocked && (
                      <div
                        className="ml-6 mr-2 mb-0.5 border-l pl-2 space-y-0.5"
                        style={{ borderColor: hex(section.color, 0.25) }}
                      >
                        {item.children.map(child => (
                          <ChildLink
                            key={child.href}
                            href={child.href}
                            label={child.label}
                            icon={child.icon}
                            color={section.color}
                            pathname={pathname}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </nav>

      {isSuperAdmin && (
        <div className="mb-0.5">
          <div
            className="flex items-center gap-1.5 px-5 pt-3 pb-1"
            style={{ color: pathname.startsWith('/admin') ? '#c084fc' : '#c084fc40' }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#c084fc', opacity: pathname.startsWith('/admin') ? 1 : 0.3 }} />
            <span className="text-[9px] font-semibold uppercase tracking-[.14em]">Admin</span>
          </div>
          <NavLink href="/admin" icon={Shield} label="Painel Admin" color="#c084fc" pathname={pathname} />
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-[#1e293b] px-5 py-3 flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-[#4f46e5] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
          L
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-[#e2e8f0] truncate">Luciano</div>
          <div className="text-[9px] text-[#334155] uppercase tracking-wide font-mono">Admin</div>
        </div>
        <Link href="/notificacoes" className="relative text-[#475569] hover:text-[#94a3b8] transition-colors" title="Notificações">
          <Bell size={14} strokeWidth={2} />
          {notifCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5">
              {notifCount > 9 ? '9+' : notifCount}
            </span>
          )}
        </Link>
        <button onClick={logout} className="text-[#475569] hover:text-[#94a3b8] transition-colors" title="Sair">
          <LogOut size={13} strokeWidth={2} />
        </button>
      </div>
    </aside>
  )
}
