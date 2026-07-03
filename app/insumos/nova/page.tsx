'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEmpresaId } from '@/context/EmpresaContext'
import { PageHeader } from '@/components/ui/PageHeader'
import { BackButton } from '@/components/ui/BackButton'
import { Button } from '@/components/ui/Button'

const UNIDADES = ['un', 'ml', 'g', 'kg', 'l', 'cx', 'fr', 'mg']

export default function NovoProdutoPage() {
  const empresaId = useEmpresaId()
  const router = useRouter()
  const [form, setForm] = useState({
    nome: '',
    categoria: '',
    unidade: 'un',
    quantidade: '',
    quantidade_min: '',
    preco_custo: '',
    fornecedor: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) { setError('Nome é obrigatório.'); return }
    setSaving(true)
    setError('')
    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('produtos')
      .insert({
        empresa_id: empresaId,
        nome: form.nome.trim(),
        categoria: form.categoria.trim() || null,
        unidade: form.unidade,
        quantidade: parseFloat(form.quantidade) || 0,
        quantidade_min: parseFloat(form.quantidade_min) || 0,
        preco_custo: parseFloat(form.preco_custo) || 0,
        fornecedor: form.fornecedor.trim() || null,
        ativo: true,
      })
      .select('id')
      .single()
    if (err) { setError(err.message); setSaving(false); return }
    router.push(`/insumos/${data.id}`)
  }

  const inp = 'w-full rounded-lg border border-[#e2e8f0] px-3 py-2.5 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8] placeholder:text-[#94a3b8]'

  return (
    <div className="max-w-lg">
      <div className="mb-4"><BackButton href="/insumos" label="Voltar a Produtos" /></div>
      <PageHeader title="Novo Produto" subtitle="Adicionar produto ao estoque" />

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#e2e8f0] p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1.5">Nome *</label>
            <input type="text" value={form.nome} onChange={e => set('nome', e.target.value)}
              placeholder="Ex: Shampoo Profissional, Tinta Loiro, Acetona..." className={inp} autoFocus />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1.5">Categoria</label>
            <input type="text" value={form.categoria} onChange={e => set('categoria', e.target.value)}
              placeholder="Ex: Cabelo, Unha, Pele..." className={inp} />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1.5">Unidade</label>
            <select value={form.unidade} onChange={e => set('unidade', e.target.value)} className={inp + ' bg-white'}>
              {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1.5">Qtd. em estoque</label>
            <input type="number" min="0" step="0.001" value={form.quantidade} onChange={e => set('quantidade', e.target.value)}
              placeholder="0" className={inp} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1.5">Qtd. mínima</label>
            <input type="number" min="0" step="0.001" value={form.quantidade_min} onChange={e => set('quantidade_min', e.target.value)}
              placeholder="0" className={inp} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1.5">Custo (R$)</label>
            <input type="number" min="0" step="0.01" value={form.preco_custo} onChange={e => set('preco_custo', e.target.value)}
              placeholder="0,00" className={inp} />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1.5">Fornecedor</label>
          <input type="text" value={form.fornecedor} onChange={e => set('fornecedor', e.target.value)}
            placeholder="Nome do fornecedor..." className={inp} />
        </div>

        {error && (
          <p className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando...' : 'Adicionar Produto'}
          </Button>
          <button type="button" onClick={() => router.back()} className="text-[12px] text-[#64748b] hover:text-[#0f172a]">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
