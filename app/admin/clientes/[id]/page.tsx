'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Building2, Key, Save, Trash2,
  ToggleLeft, ToggleRight, Phone, Eye,
} from 'lucide-react'

const PLANO_BASE: Record<string, number> = {
  basic:  119,
  pro:    189,
  pro_ia: 219,
}

interface Empresa {
  id: string
  nome: string
  slug: string
  plano: string
  ativo: boolean
  anthropic_api_key: string | null
  openai_api_key: string | null
  whatsapp: string | null
  valor_mensal: number | null
  dia_vencimento: number | null
  proxima_cobranca: string | null
  observacoes: string | null
  created_at: string
}

export default function EmpresaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [entrando, setEntrando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [desconto, setDesconto] = useState('')

  const [form, setForm] = useState({
    nome: '',
    plano: 'basic',
    ativo: true,
    anthropic_api_key: '',
    whatsapp: '',
    valor_mensal: '',
    dia_vencimento: '10',
    proxima_cobranca: '',
    observacoes: '',
  })

  useEffect(() => {
    fetch(`/api/admin/empresas/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setErro(d.error); return }
        const emp = d.empresa as Empresa
        setEmpresa(emp)
        setForm({
          nome: emp.nome ?? '',
          plano: emp.plano ?? 'basic',
          ativo: emp.ativo ?? true,
          anthropic_api_key: '',
          whatsapp: emp.whatsapp ?? '',
          valor_mensal: emp.valor_mensal != null ? String(emp.valor_mensal) : '',
          dia_vencimento: emp.dia_vencimento != null ? String(emp.dia_vencimento) : '10',
          proxima_cobranca: emp.proxima_cobranca ?? '',
          observacoes: emp.observacoes ?? '',
        })
      })
      .catch(() => setErro('Erro ao carregar'))
      .finally(() => setLoading(false))
  }, [id])

  function set(field: string, value: string | boolean) {
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErro('')
    setSucesso('')

    const payload: Record<string, unknown> = {
      nome: form.nome,
      plano: form.plano,
      ativo: form.ativo,
      whatsapp: form.whatsapp,
      valor_mensal: form.valor_mensal ? Number(form.valor_mensal) : null,
      dia_vencimento: form.dia_vencimento ? Number(form.dia_vencimento) : null,
      proxima_cobranca: form.proxima_cobranca || null,
      observacoes: form.observacoes,
    }
    if (form.anthropic_api_key.trim()) payload.anthropic_api_key = form.anthropic_api_key.trim()

    try {
      const res = await fetch(`/api/admin/empresas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.error) { setErro(data.error); return }
      setSucesso('Salvo com sucesso!')
      setEmpresa(data.empresa)
      setForm(f => ({ ...f, anthropic_api_key: '' }))
    } catch {
      setErro('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Excluir "${empresa?.nome}"? Esta ação não pode ser desfeita.`)) return
    const res = await fetch(`/api/admin/empresas/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.error) { setErro(data.error); return }
    router.push('/admin')
  }

  async function entrarComo() {
    setEntrando(true)
    try {
      await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresa_id: id }),
      })
      router.push('/dashboard')
      router.refresh()
    } catch {
      setEntrando(false)
    }
  }

  if (loading) return <div className="text-[#64748b] text-sm">Carregando...</div>
  if (!empresa && erro) return <div className="text-red-500 text-sm">{erro}</div>

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-[#64748b] hover:text-[#0f172a] transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-black text-[#0f172a]">{empresa?.nome}</h1>
            <p className="text-xs text-[#94a3b8] font-mono">{empresa?.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={entrarComo}
            disabled={entrando}
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#7c3aed] hover:bg-[#6d28d9] px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <Eye size={12} />
            {entrando ? 'Entrando...' : 'Entrar como cliente'}
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#ef4444] hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
          >
            <Trash2 size={13} />
            Excluir
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Dados */}
        <div className="bg-white rounded-2xl border border-[#f1f5f9] p-5 space-y-4">
          <div className="flex items-center gap-2 text-[#475569] font-semibold text-sm pb-1 border-b border-[#f1f5f9]">
            <Building2 size={14} />
            Dados da empresa
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1">Nome</label>
              <input
                type="text"
                value={form.nome}
                onChange={e => set('nome', e.target.value)}
                className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4f46e5]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1">Plano</label>
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
            <div className="flex items-center gap-3 pt-5">
              <div className="flex-1">
                <div className="text-sm font-semibold text-[#0f172a]">Status</div>
                <div className="text-xs text-[#94a3b8]">{form.ativo ? 'Ativa' : 'Inativa'}</div>
              </div>
              <button
                type="button"
                onClick={() => set('ativo', !form.ativo)}
                style={{ color: form.ativo ? '#10b981' : '#94a3b8' }}
              >
                {form.ativo ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
              </button>
            </div>
          </div>
        </div>

        {/* CRM */}
        <div className="bg-white rounded-2xl border border-[#f1f5f9] p-5 space-y-4">
          <div className="flex items-center gap-2 text-[#475569] font-semibold text-sm pb-1 border-b border-[#f1f5f9]">
            <Phone size={14} />
            Contato e Cobrança
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1">WhatsApp</label>
              <input
                type="text"
                value={form.whatsapp}
                onChange={e => set('whatsapp', e.target.value)}
                className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4f46e5]"
                placeholder="(86) 9 9999-9999"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1">Desconto (R$)</label>
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
              <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1">Dia do vencimento</label>
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
              <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1">Próxima cobrança</label>
              <input
                type="date"
                value={form.proxima_cobranca}
                onChange={e => set('proxima_cobranca', e.target.value)}
                className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4f46e5]"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1">Observações internas</label>
              <textarea
                value={form.observacoes}
                onChange={e => set('observacoes', e.target.value)}
                className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4f46e5] resize-none"
                rows={3}
                placeholder="Notas sobre o cliente..."
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
              {empresa?.anthropic_api_key && (
                <p className="text-xs text-[#10b981] mb-1 font-mono">
                  Chave atual: ••••{empresa.anthropic_api_key.slice(-4)}
                </p>
              )}
              <input
                type="password"
                value={form.anthropic_api_key}
                onChange={e => set('anthropic_api_key', e.target.value)}
                className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#4f46e5]"
                placeholder="sk-ant-... (deixe vazio para não alterar)"
              />
            </div>
            <p className="text-xs text-[#94a3b8]">
              O custo de IA é debitado na conta do cliente, não na sua.
            </p>
          </div>
        </div>

        {sucesso && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
            {sucesso}
          </div>
        )}
        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {erro}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-[#4f46e5] text-white hover:bg-[#4338ca] transition-colors disabled:opacity-50"
        >
          <Save size={14} />
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </form>
    </div>
  )
}
