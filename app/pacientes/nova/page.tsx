'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEmpresaId } from '@/context/EmpresaContext'
import { PageHeader } from '@/components/ui/PageHeader'
import { BackButton } from '@/components/ui/BackButton'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import type { CanalAquisicao } from '@/lib/types'

const CANAIS: { value: CanalAquisicao; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'google', label: 'Google' },
  { value: 'anuncios', label: 'Anúncios' },
  { value: 'outros', label: 'Outros' },
]

export default function NovaPacientePage() {
  const empresaId = useEmpresaId()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    nome: '',
    telefone: '',
    canal_aquisicao: 'outros' as CanalAquisicao,
    obs: '',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim() || !form.telefone.trim()) {
      setError('Nome e telefone são obrigatórios.')
      return
    }
    setSaving(true)
    setError('')
    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('clientes')
      .insert({
        empresa_id: empresaId,
        nome: form.nome.trim(),
        telefone: form.telefone.trim(),
        canal_aquisicao: form.canal_aquisicao,
        obs: form.obs.trim() || null,
      })
      .select('id')
      .single()
    if (err || !data) {
      setError(err?.message ?? 'Erro ao salvar.')
      setSaving(false)
      return
    }
    router.push(`/pacientes/${data.id}`)
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-4"><BackButton href="/pacientes" label="Voltar aos Clientes" /></div>
      <PageHeader title="Novo Cliente" subtitle="Cadastro de novo cliente" />

      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">
                  Nome completo *
                </label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => set('nome', e.target.value)}
                  placeholder="Ex: Maria Silva"
                  className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8] placeholder:text-[#94a3b8]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">
                  WhatsApp / Telefone *
                </label>
                <input
                  type="tel"
                  value={form.telefone}
                  onChange={e => set('telefone', e.target.value)}
                  placeholder="(86) 99999-9999"
                  className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8] placeholder:text-[#94a3b8]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">
                  Como nos conheceu?
                </label>
                <select
                  value={form.canal_aquisicao}
                  onChange={e => set('canal_aquisicao', e.target.value)}
                  className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8] bg-white"
                >
                  {CANAIS.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">
                  Observações
                </label>
                <textarea
                  value={form.obs}
                  onChange={e => set('obs', e.target.value)}
                  rows={3}
                  placeholder="Anotações internas sobre o cliente..."
                  className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8] placeholder:text-[#94a3b8] resize-none"
                />
              </div>
            </div>

            {error && (
              <p className="text-[12px] text-[#8B1A1A] bg-[#FEF0EE] border border-[#FECACA] rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Cadastrar Cliente'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push('/pacientes')}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
