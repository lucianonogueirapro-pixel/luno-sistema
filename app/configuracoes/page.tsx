import type React from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { BackButton } from '@/components/ui/BackButton'
import {
  Users, Bell, ChevronRight, Building2,
  Landmark, Receipt, Bot, Plug, SlidersHorizontal,
} from 'lucide-react'

type ConfigItem = {
  href: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  desc: string
  badge?: string
}

const grupos: { titulo: string; itens: ConfigItem[] }[] = [
  {
    titulo: 'Empresa',
    itens: [
      {
        href: '/configuracoes/clinica',
        icon: Building2,
        label: 'Dados da Empresa',
        desc: 'Nome, endereço, redes sociais e contexto para os agentes de IA',
      },
    ],
  },
  {
    titulo: 'WhatsApp & Luna IA',
    itens: [
      {
        href: '/configuracoes/whatsapp',
        icon: Plug,
        label: 'Integração WhatsApp',
        desc: 'Nome da instância, QR Code de conexão e webhook',
      },
      {
        href: '/configuracoes/luna',
        icon: SlidersHorizontal,
        label: 'Configuração da Luna',
        desc: 'Prompt, horários, follow-up automático e modelo de IA',
      },
      {
        href: '/configuracoes/mensagens-auto',
        icon: Bell,
        label: 'Mensagens Automáticas',
        desc: 'Boas-vindas, aniversário e lembrete de retorno via WhatsApp',
      },
    ],
  },
  {
    titulo: 'Financeiro',
    itens: [
      {
        href: '/custos',
        icon: Landmark,
        label: 'Custos Fixos e Variáveis',
        desc: 'Gerencie as saídas recorrentes que se replicam todo mês',
      },
      {
        href: '/configuracoes/financeiro',
        icon: Receipt,
        label: 'Configurações Financeiras',
        desc: 'Taxas de maquineta, regime fiscal (MEI / Simples) e reserva',
      },
    ],
  },
  {
    titulo: 'Sistema',
    itens: [
      {
        href: '/agentes',
        icon: Bot,
        label: 'Equipe de IA',
        desc: 'Acesse os agentes de marketing, comercial, financeiro e tarefas',
      },
      {
        href: '/configuracoes/usuarios',
        icon: Users,
        label: 'Usuários e Permissões',
        desc: 'Defina os papéis (Admin, Profissional, Recepção)',
        badge: 'Em breve',
      },
    ],
  },
]

export default function ConfiguracoesPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <BackButton href="/dashboard" label="Voltar ao Dashboard" />
      </div>
      <PageHeader title="Configurações" subtitle="Personalize o sistema" />

      <div className="space-y-6">
        {grupos.map(grupo => (
          <div key={grupo.titulo}>
            <div className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-[.14em] mb-2">
              {grupo.titulo}
            </div>
            <div className="bg-white border border-[#e2e8f0] rounded-2xl divide-y divide-[#f1f5f9] overflow-hidden">
              {grupo.itens.map(item => {
                const Icon = item.icon
                const desabilitado = !!item.badge
                return desabilitado ? (
                  <div
                    key={item.href}
                    className="flex items-center gap-3 px-5 py-4 opacity-50 cursor-not-allowed"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#f1f5f9] flex items-center justify-center flex-shrink-0">
                      <Icon size={16} className="text-[#64748b]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-[#0f172a]">{item.label}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wide text-[#64748b] bg-[#f1f5f9] px-2 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#64748b] mt-0.5">{item.desc}</div>
                    </div>
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 px-5 py-4 hover:bg-[#f8fafc] transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#f1f5f9] flex items-center justify-center flex-shrink-0">
                      <Icon size={16} className="text-[#64748b]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-[#0f172a]">{item.label}</div>
                      <div className="text-[11px] text-[#64748b] mt-0.5">{item.desc}</div>
                    </div>
                    <ChevronRight size={14} className="text-[#94a3b8] flex-shrink-0" />
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
