'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus, Building2, CheckCircle, XCircle, Key, Users,
  Phone, DollarSign, AlertCircle, Clock, Eye,
} from 'lucide-react'

interface Empresa {
  id: string
  nome: string
  slug: string
  plano: string
  ativo: boolean
  anthropic_api_key: string | null
  whatsapp: string | null
  valor_mensal: number | null
  dia_vencimento: number | null
  proxima_cobranca: string | null
  created_at: string
  user_count: number
}

const PLANO_META: Record<string, { label: string; color: string; desc: string }> = {
  basic:  { label: 'Basic',  color: '#64748b', desc: 'Gestão + CRM · R$119/mês' },
  pro:    { label: 'Pro',    color: '#7c3aed', desc: 'Gestão + CRM + Luna IA · R$189/mês' },
  pro_ia: { label: 'Pro IA', color: '#0ea5e9', desc: 'Gestão + CRM + Luna IA + Equipe IA · R$219/mês' },
}

function statusCobranca(proxima: string | null): {
  label: string; color: string; bg: string; icon: React.ReactNode
} {
  if (!proxima) return { label: 'Sem data', color: '#94a3b8', bg: '#f8fafc', icon: <Clock size={11} /> }

  const hoje = new Date()
  const data = new Date(proxima + 'T00:00:00')
  const diff = Math.ceil((data.getTime() - hoje.getTime()) / 86400000)

  if (diff < 0) return { label: `Vencido há ${Math.abs(diff)}d`, color: '#ef4444', bg: '#fef2f2', icon: <AlertCircle size={11} /> }
  if (diff <= 7) return { label: `Vence em ${diff}d`, color: '#d97706', bg: '#fffbeb', icon: <Clock size={11} /> }
  return { label: `Em dia (${data.toLocaleDateString('pt-BR')})`, color: '#10b981', bg: '#f0fdf4', icon: <CheckCircle size={11} /> }
}

export default function AdminPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [entrando, setEntrando] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/admin/empresas')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setErro(d.error); return }
        setEmpresas(d.empresas ?? [])
      })
      .catch(() => setErro('Erro ao carregar'))
      .finally(() => setLoading(false))
  }, [])

  async function entrarComo(e: Empresa) {
    setEntrando(e.id)
    try {
      await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresa_id: e.id }),
      })
      router.push('/dashboard')
      router.refresh()
    } catch {
      setEntrando(null)
    }
  }

  const ativas = empresas.filter(e => e.ativo).length
  const totalUsers = empresas.reduce((s, e) => s + e.user_count, 0)
  const mrr = empresas.filter(e => e.ativo).reduce((s, e) => s + (e.valor_mensal ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#0f172a]">Painel Admin</h1>
          <p className="text-sm text-[#64748b] mt-0.5">Gestão de clientes Luno</p>
        </div>
        <Link
          href="/admin/clientes/novo"
          className="flex items-center gap-2 bg-[#4f46e5] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#4338ca] transition-colors"
        >
          <Plus size={15} />
          Novo cliente
        </Link>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Clientes', value: empresas.length, icon: Building2, color: '#4f46e5' },
          { label: 'Ativos', value: ativas, icon: CheckCircle, color: '#10b981' },
          { label: 'Usuários', value: totalUsers, icon: Users, color: '#0891b2' },
          {
            label: 'MRR',
            value: mrr.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            icon: DollarSign,
            color: '#d97706',
          },
        ].map(m => (
          <div key={m.label} className="bg-white rounded-xl p-4 border border-[#f1f5f9]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: m.color + '18' }}>
                <m.icon size={16} style={{ color: m.color }} />
              </div>
              <div>
                <div className="text-xl font-black text-[#0f172a]">{m.value}</div>
                <div className="text-xs text-[#64748b]">{m.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lista de clientes */}
      <div className="bg-white rounded-2xl border border-[#f1f5f9] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#f1f5f9]">
          <h2 className="font-bold text-[#0f172a]">Clientes</h2>
        </div>

        {loading && <div className="p-8 text-center text-[#64748b] text-sm">Carregando...</div>}
        {erro && <div className="p-8 text-center text-red-500 text-sm">{erro}</div>}
        {!loading && !erro && empresas.length === 0 && (
          <div className="p-8 text-center text-[#64748b] text-sm">Nenhum cliente cadastrado.</div>
        )}

        {!loading && empresas.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#f1f5f9] text-[#94a3b8] text-xs uppercase tracking-wider">
                  <th className="px-5 py-3 text-left font-semibold">Cliente</th>
                  <th className="px-5 py-3 text-left font-semibold">WhatsApp</th>
                  <th className="px-5 py-3 text-left font-semibold">Plano / Valor</th>
                  <th className="px-5 py-3 text-left font-semibold">Próx. cobrança</th>
                  <th className="px-5 py-3 text-left font-semibold">API Key</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                  <th className="px-5 py-3 text-left font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f8fafc]">
                {empresas.map(e => {
                  const cobranca = statusCobranca(e.proxima_cobranca)
                  return (
                    <tr key={e.id} className="hover:bg-[#f8fafc] transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-[#0f172a]">{e.nome}</div>
                        <div className="text-xs text-[#94a3b8] font-mono">{e.slug}</div>
                      </td>

                      <td className="px-5 py-4">
                        {e.whatsapp ? (
                          <a
                            href={`https://wa.me/${e.whatsapp.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-[#10b981] hover:underline text-xs"
                          >
                            <Phone size={11} />
                            {e.whatsapp}
                          </a>
                        ) : (
                          <span className="text-[#94a3b8] text-xs">—</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: (PLANO_META[e.plano]?.color ?? '#64748b') + '18',
                            color: PLANO_META[e.plano]?.color ?? '#64748b',
                          }}
                        >
                          {PLANO_META[e.plano]?.label ?? e.plano}
                        </span>
                        <div className="text-[10px] text-[#94a3b8] mt-0.5">{PLANO_META[e.plano]?.desc}</div>
                        {e.valor_mensal != null && (
                          <div className="text-xs text-[#475569] mt-0.5 font-mono">
                            {e.valor_mensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: cobranca.bg, color: cobranca.color }}
                        >
                          {cobranca.icon}
                          {cobranca.label}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {e.anthropic_api_key ? (
                          <span className="flex items-center gap-1 text-[#10b981] text-xs">
                            <Key size={11} />
                            <span className="font-mono">{e.anthropic_api_key}</span>
                          </span>
                        ) : (
                          <span className="text-[#94a3b8] text-xs">Não configurada</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {e.ativo ? (
                          <span className="flex items-center gap-1 text-[#10b981] text-xs font-semibold">
                            <CheckCircle size={11} /> Ativa
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[#ef4444] text-xs font-semibold">
                            <XCircle size={11} /> Inativa
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => entrarComo(e)}
                            disabled={entrando === e.id}
                            className="flex items-center gap-1 text-xs font-semibold text-[#7c3aed] hover:text-[#6d28d9] disabled:opacity-50 transition-colors"
                          >
                            <Eye size={12} />
                            {entrando === e.id ? 'Entrando...' : 'Entrar como'}
                          </button>
                          <span className="text-[#e2e8f0]">|</span>
                          <Link
                            href={`/admin/clientes/${e.id}`}
                            className="text-[#4f46e5] hover:text-[#4338ca] text-xs font-semibold transition-colors"
                          >
                            Configurar
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
