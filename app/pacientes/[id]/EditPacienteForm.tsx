'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { CanalAquisicao } from '@/lib/types'

const CANAIS: { value: CanalAquisicao; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'google', label: 'Google' },
  { value: 'anuncios', label: 'Anúncios' },
  { value: 'outros', label: 'Outros' },
]

interface Cliente {
  id: string
  nome: string
  telefone: string
  email: string | null
  data_nascimento: string | null
  canal_aquisicao: CanalAquisicao | null
  obs: string | null
}

export default function EditPacienteForm({ paciente }: { paciente: Cliente }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [confirmExcluir, setConfirmExcluir] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [form, setForm] = useState({
    nome: paciente.nome,
    telefone: paciente.telefone,
    email: paciente.email ?? '',
    data_nascimento: paciente.data_nascimento ?? '',
    canal_aquisicao: (paciente.canal_aquisicao ?? 'outros') as CanalAquisicao,
    obs: paciente.obs ?? '',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim() || !form.telefone.trim()) {
      setError('Nome e telefone são obrigatórios.')
      return
    }
    setSaving(true)
    setSaved(false)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase
      .from('clientes')
      .update({
        nome: form.nome.trim(),
        telefone: form.telefone.trim(),
        email: form.email.trim() || null,
        data_nascimento: form.data_nascimento || null,
        canal_aquisicao: form.canal_aquisicao,
        obs: form.obs.trim() || null,
      })
      .eq('id', paciente.id)
    if (err) {
      setError(err.message)
    } else {
      setSaved(true)
      router.refresh()
    }
    setSaving(false)
  }

  async function excluir() {
    setExcluindo(true)
    const supabase = createClient()
    await supabase.from('agenda').delete().eq('cliente_id', paciente.id)
    await supabase.from('avaliacoes').delete().eq('cliente_id', paciente.id)
    await supabase.from('orcamentos').delete().eq('cliente_id', paciente.id)
    await supabase.from('clientes').delete().eq('id', paciente.id)
    router.push('/pacientes')
  }

  return (
    <Card>
      <CardHeader><CardTitle>Dados do Cliente</CardTitle></CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">Nome completo *</label>
              <input
                type="text"
                value={form.nome}
                onChange={e => set('nome', e.target.value)}
                className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8]"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">WhatsApp / Telefone *</label>
              <input
                type="tel"
                value={form.telefone}
                onChange={e => set('telefone', e.target.value)}
                className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8]"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">Data de Nascimento</label>
              <input
                type="date"
                value={form.data_nascimento}
                onChange={e => set('data_nascimento', e.target.value)}
                className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">Como nos conheceu?</label>
              <select
                value={form.canal_aquisicao}
                onChange={e => set('canal_aquisicao', e.target.value)}
                className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8] bg-white"
              >
                {CANAIS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">Observações</label>
              <textarea
                value={form.obs}
                onChange={e => set('obs', e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-[#e2e8f0] px-3 py-2 text-[13px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8] resize-none"
              />
            </div>
          </div>

          {error && (
            <p className="text-[12px] text-[#8B1A1A] bg-[#FEF0EE] border border-[#FECACA] rounded-lg px-3 py-2">{error}</p>
          )}
          {saved && (
            <p className="text-[12px] text-[#2D6A1A] bg-[#EDF5E8] border border-[#BBF7D0] rounded-lg px-3 py-2">Dados salvos com sucesso.</p>
          )}

          <div className="flex items-center justify-between pt-1">
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
            {confirmExcluir ? (
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-red-600">Confirmar exclusão?</span>
                <button type="button" onClick={excluir} disabled={excluindo}
                  className="text-[11px] font-bold text-red-600 hover:underline disabled:opacity-50">
                  {excluindo ? 'Excluindo...' : 'Sim, excluir'}
                </button>
                <button type="button" onClick={() => setConfirmExcluir(false)}
                  className="text-[11px] text-[#64748b] hover:underline">
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmExcluir(true)}
                className="text-[11px] text-[#94a3b8] hover:text-red-500 transition-colors"
              >
                Excluir cliente
              </button>
            )}
          </div>
        </form>
      </CardBody>
    </Card>
  )
}
