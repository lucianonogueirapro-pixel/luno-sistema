'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEmpresaId } from '@/context/EmpresaContext'
import { PageHeader } from '@/components/ui/PageHeader'
import { BackButton } from '@/components/ui/BackButton'
import { Button } from '@/components/ui/Button'

export default function NovoServicoPage() {
  const empresaId = useEmpresaId()
  const router = useRouter()
  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    preco: '',
    duracao_min: '60',
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
      .from('servicos')
      .insert({
        empresa_id: empresaId,
        nome: form.nome.trim(),
        descricao: form.descricao.trim() || null,
        preco: parseFloat(form.preco) || 0,
        duracao_min: parseInt(form.duracao_min) || 60,
        ativo: true,
      })
      .select('id')
      .single()
    if (err) { setError(err.message); setSaving(false); return }
    router.push(`/procedimentos/${data.id}`)
  }

  const inp = 'w-full rounded-lg border border-[#e2e8f0] px-3 py-2.5 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8] placeholder:text-[#94a3b8]'

  return (
    <div className="max-w-lg">
      <div className="mb-4"><BackButton href="/procedimentos" label="Voltar a Serviços" /></div>
      <PageHeader title="Novo Serviço" subtitle="Cadastrar serviço ou procedimento" />

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#e2e8f0] p-6 space-y-5">
        <div>
          <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1.5">Nome *</label>
          <input
            type="text"
            value={form.nome}
            onChange={e => set('nome', e.target.value)}
            placeholder="Ex: Corte Feminino, Manicure, Design de Sobrancelhas..."
            className={inp}
            autoFocus
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1.5">Descrição</label>
          <textarea
            value={form.descricao}
            onChange={e => set('descricao', e.target.value)}
            rows={2}
            placeholder="Detalhes do serviço..."
            className={inp + ' resize-none'}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1.5">Preço (R$)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.preco}
              onChange={e => set('preco', e.target.value)}
              placeholder="0,00"
              className={inp}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1.5">Duração (min)</label>
            <input
              type="number"
              min="5"
              step="5"
              value={form.duracao_min}
              onChange={e => set('duracao_min', e.target.value)}
              className={inp}
            />
          </div>
        </div>

        {error && (
          <p className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando...' : 'Criar Serviço'}
          </Button>
          <button type="button" onClick={() => router.back()} className="text-[12px] text-[#64748b] hover:text-[#0f172a]">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
