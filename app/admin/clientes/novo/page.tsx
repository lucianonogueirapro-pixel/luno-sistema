'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, Key, User, Phone } from 'lucide-react'

const PLANO_BASE: Record<string, number> = {
  basic:  119,
  pro:    189,
  pro_ia: 219,
}

export default function NovaEmpresaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [desconto, setDesconto] = useState('')

  const [form, setForm] = useState({
    nome: '',
    slug: '',
    plano: 'basic',
    anthropic_api_key: '',
    email: '',
    senha: '',
    whatsapp: '',
    valor_mensal: String(PLANO_BASE.basic),
    dia_vencimento: '10',
    proxima_cobranca: '',
    observacoes: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handlePlanoChange(plano: string) {
    const base = PLANO_BASE[plano] ?? 0
    const d = parseFloat(desconto) || 0
    set('plano', plano)
    set('valor_mensal', String(Math.max(0, base - d)))
  }

  function handleDescontoChange(val: string) {
    setDesconto(val)
    const base = PLANO_BASE[form.plano] ?? 0
    const d = parseFloat(val) || 0
    set('valor_mensal', String(Math.max(0, base - d)))
  }

  function gerarSlug(nome: string) {
    return nome.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro('')
    try {
      const res = await fetch('/api/admin/empresas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.error) { setErro(data.error); return }
      router.push('/admin')
    } catch {
      setErro('Erro ao criar cliente')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-[#64748b] hover:text-[#0f172a] transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-black text-[#0f172a]">Novo Cliente</h1>
          <p className="text-sm text-[#64748b]">Cadastrar nova empresa no sistema</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Dados da empresa */}
        <div className="bg-white rounded-2xl border border-[#f1f5f9] p-5 space-y-4">
          <div className="flex items-center gap-2 text-[#475569] font-semibold text-sm pb-1 border-b border-[#f1f5f9]">
            <Building2 size={14} />
            Dados da empresa
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1">
                Nome da empresa *
              </label>
              <input
                type="text"
                value={form.nome}
                onChange={e => {
                  set('nome', e.target.value)
                  if (!form.slug || form.slug === gerarSlug(form.nome)) {
                    set('slug', gerarSlug(e.target.value))
                  }
                }}
                className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4f46e5]"
                placeholder="Ex: Clínica Bella Forma"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1">
                Slug (ID único) *
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={e => set('slug', e.target.value)}
                className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#4f46e5]"
                placeholder="clinica-bella-forma"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1">
                Plano
              </label>
              <select
                value={form.plano}
                onChange={e => handlePlanoChange(e.target.value)}
                className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4f46e5]"
              >
                <option value="basic">Basic — Gestão + CRM (R$119/mês)</option>
                <option value="pro">Pro — Gestão + CRM + Luna IA (R$189/mês)</option>
                <option value="pro_ia">Pro IA — Gestão + CRM + Luna IA + Equipe IA (R$219/mês)</option>
              </select>
            </div>
          </div>
        </div>

        {/* CRM — Comercial */}
        <div className="bg-white rounded-2xl border border-[#f1f5f9] p-5 space-y-4">
          <div className="flex items-center gap-2 text-[#475569] font-semibold text-sm pb-1 border-b border-[#f1f5f9]">
            <Phone size={14} />
            Contato e Cobrança
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1">
                WhatsApp
              </label>
              <input
                type="text"
                value={form.whatsapp}
                onChange={e => set('whatsapp', e.target.value)}
                className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4f46e5]"
                placeholder="(86) 9 9999-9999"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1">
                Desconto (R$)
              </label>
              <input
                type="number"
                value={desconto}
                onChange={e => handleDescontoChange(e.target.value)}
                className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4f46e5]"
                placeholder="0,00"
                step="0.01"
                min="0"
              />
            </div>
            <div className="col-span-2">
              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="text-xs text-[#64748b] space-y-0.5">
                  <div>Plano base: <span className="font-mono font-semibold text-[#0f172a]">R$ {(PLANO_BASE[form.plano] ?? 0).toFixed(2)}</span></div>
                  {(parseFloat(desconto) || 0) > 0 && (
                    <div>Desconto: <span className="font-mono font-semibold text-green-600">- R$ {(parseFloat(desconto) || 0).toFixed(2)}</span></div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[#94a3b8] uppercase tracking-wider mb-0.5">Valor final/mês</div>
                  <div className="text-lg font-black text-[#0f172a] font-mono">
                    R$ {(parseFloat(form.valor_mensal) || 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1">
                Dia do vencimento
              </label>
              <input
                type="number"
                value={form.dia_vencimento}
                onChange={e => set('dia_vencimento', e.target.value)}
                className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4f46e5]"
                min="1"
                max="28"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1">
                Próxima cobrança
              </label>
              <input
                type="date"
                value={form.proxima_cobranca}
                onChange={e => set('proxima_cobranca', e.target.value)}
                className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4f46e5]"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1">
                Observações internas
              </label>
              <textarea
                value={form.observacoes}
                onChange={e => set('observacoes', e.target.value)}
                className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4f46e5] resize-none"
                rows={2}
                placeholder="Notas sobre o cliente, contexto, histórico..."
              />
            </div>
          </div>
        </div>

        {/* API Keys */}
        <div className="bg-white rounded-2xl border border-[#f1f5f9] p-5 space-y-4">
          <div className="flex items-center gap-2 text-[#475569] font-semibold text-sm pb-1 border-b border-[#f1f5f9]">
            <Key size={14} />
            Tokens de IA do cliente
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1">
                Anthropic API Key (Claude)
              </label>
              <input
                type="password"
                value={form.anthropic_api_key}
                onChange={e => set('anthropic_api_key', e.target.value)}
                className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#4f46e5]"
                placeholder="sk-ant-..."
              />
            </div>
            <p className="text-xs text-[#94a3b8]">
              O custo de IA é debitado na conta do cliente, não na sua.
            </p>
          </div>
        </div>

        {/* Acesso do cliente */}
        <div className="bg-white rounded-2xl border border-[#f1f5f9] p-5 space-y-4">
          <div className="flex items-center gap-2 text-[#475569] font-semibold text-sm pb-1 border-b border-[#f1f5f9]">
            <User size={14} />
            Acesso do cliente (opcional)
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1">
                E-mail
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4f46e5]"
                placeholder="cliente@email.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1">
                Senha temporária
              </label>
              <input
                type="text"
                value={form.senha}
                onChange={e => set('senha', e.target.value)}
                className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#4f46e5]"
                placeholder="Mín. 6 caracteres"
              />
            </div>
          </div>
        </div>

        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {erro}
          </div>
        )}

        <div className="flex gap-3">
          <Link
            href="/admin"
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-[#e2e8f0] text-[#475569] text-center hover:bg-[#f8fafc] transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#4f46e5] text-white hover:bg-[#4338ca] transition-colors disabled:opacity-50"
          >
            {loading ? 'Criando...' : 'Criar cliente'}
          </button>
        </div>
      </form>
    </div>
  )
}
