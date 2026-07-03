'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEmpresaId } from '@/context/EmpresaContext'
import { PageHeader } from '@/components/ui/PageHeader'
import { BackButton } from '@/components/ui/BackButton'
import { Save, Loader2, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react'

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

const CORES = [
  '#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b',
]

interface Disponibilidade {
  id?: string
  dia_semana: number
  hora_inicio: string
  hora_fim: string
  ativo: boolean
}

export default function ProfissionalPage() {
  const empresaId = useEmpresaId()
  const { id } = useParams<{ id: string }>()
  const isNovo = id === 'novo'
  const router = useRouter()
  const supabase = createClient()

  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [loading, setLoading] = useState(!isNovo)
  const [confirmExcluir, setConfirmExcluir] = useState(false)

  const [form, setForm] = useState({
    nome: '',
    especialidade: '',
    telefone: '',
    email: '',
    cor: '#4f46e5',
    ativo: true,
    comissao_percentual: 0,
  })

  const [disponibilidades, setDisponibilidades] = useState<Disponibilidade[]>(
    DIAS.map((_, i) => ({ dia_semana: i, hora_inicio: '09:00', hora_fim: '18:00', ativo: i >= 1 && i <= 5 }))
  )

  useEffect(() => {
    if (isNovo) return
    async function load() {
      const [{ data: prof }, { data: disps }] = await Promise.all([
        supabase.from('profissionais').select('*').eq('id', id).single(),
        supabase.from('profissional_disponibilidades').select('*').eq('profissional_id', id),
      ])
      if (prof) {
        setForm({
          nome: prof.nome ?? '',
          especialidade: prof.especialidade ?? '',
          telefone: prof.telefone ?? '',
          email: prof.email ?? '',
          cor: prof.cor ?? '#4f46e5',
          ativo: prof.ativo ?? true,
          comissao_percentual: prof.comissao_percentual ?? 0,
        })
      }
      setDisponibilidades(
        DIAS.map((_, i) => {
          const d = (disps ?? []).find((x: any) => x.dia_semana === i)
          return {
            id: d?.id,
            dia_semana: i,
            hora_inicio: d?.hora_inicio ?? '09:00',
            hora_fim: d?.hora_fim ?? '18:00',
            ativo: !!d,
          }
        })
      )
      setLoading(false)
    }
    load()
  }, [id, isNovo])

  const setD = (dia: number, key: keyof Disponibilidade, val: any) =>
    setDisponibilidades(prev => prev.map(d => d.dia_semana === dia ? { ...d, [key]: val } : d))

  async function salvar() {
    if (!form.nome.trim()) { setMsg({ tipo: 'erro', texto: 'Nome é obrigatório.' }); return }
    setSalvando(true)
    setMsg(null)

    try {
      let profId = id === 'novo' ? null : id

      const payload = {
        empresa_id: empresaId,
        nome: form.nome.trim(),
        especialidade: form.especialidade.trim() || null,
        telefone: form.telefone.trim() || null,
        email: form.email.trim() || null,
        cor: form.cor,
        ativo: form.ativo,
        comissao_percentual: form.comissao_percentual,
      }

      if (isNovo) {
        const { data, error } = await supabase.from('profissionais').insert(payload).select('id').single()
        if (error || !data) throw new Error(error?.message ?? 'Erro ao criar')
        profId = data.id
      } else {
        const { error } = await supabase.from('profissionais').update(payload).eq('id', profId!)
        if (error) throw new Error(error.message)
      }

      // Salvar disponibilidades
      await supabase.from('profissional_disponibilidades').delete().eq('profissional_id', profId!)
      const ativas = disponibilidades.filter(d => d.ativo)
      if (ativas.length > 0) {
        await supabase.from('profissional_disponibilidades').insert(
          ativas.map(d => ({
            profissional_id: profId,
            dia_semana: d.dia_semana,
            hora_inicio: d.hora_inicio,
            hora_fim: d.hora_fim,
          }))
        )
      }

      setMsg({ tipo: 'ok', texto: isNovo ? 'Profissional cadastrado.' : 'Dados salvos.' })
      if (isNovo) setTimeout(() => router.push('/profissionais'), 800)
    } catch (e: any) {
      setMsg({ tipo: 'erro', texto: e.message ?? 'Erro ao salvar.' })
    } finally {
      setSalvando(false)
    }
  }

  async function excluir() {
    setExcluindo(true)
    await supabase.from('profissionais').delete().eq('id', id)
    router.push('/profissionais')
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={20} className="animate-spin text-[#94a3b8]" />
    </div>
  )

  return (
    <div className="max-w-2xl space-y-5">
      <BackButton href="/profissionais" label="Voltar a Profissionais" />
      <PageHeader
        title={isNovo ? 'Novo Profissional' : form.nome || 'Editar Profissional'}
        subtitle="Dados, especialidade e disponibilidade"
        action={
          <button
            onClick={salvar}
            disabled={salvando}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#4f46e5] text-white text-[12px] rounded-lg hover:bg-[#374151] disabled:opacity-50 transition-colors"
          >
            {salvando ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Salvar
          </button>
        }
      />

      {msg && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[12px] border ${
          msg.tipo === 'ok' ? 'bg-[#DCFCE7] border-[#86EFAC] text-[#166534]' : 'bg-[#FEE2E2] border-[#FCA5A5] text-[#8B1A1A]'
        }`}>
          {msg.tipo === 'ok' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {msg.texto}
        </div>
      )}

      {/* Dados */}
      <section className="bg-white border border-[#e2e8f0] rounded-xl p-5 space-y-4">
        <h2 className="text-[11px] font-semibold text-[#0f172a] uppercase tracking-wide">Identificação</h2>

        <Field label="Nome completo *">
          <input type="text" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
            placeholder="ex: Ana Paula Silva" className={inp} />
        </Field>

        <Field label="Especialidade / Função">
          <input type="text" value={form.especialidade}
            onChange={e => setForm(f => ({ ...f, especialidade: e.target.value }))}
            placeholder="Ex: Cabeleireiro, Manicure, Esteticista..."
            className={inp} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Telefone / WhatsApp">
            <input type="text" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
              placeholder="(00) 99999-0000" className={inp} />
          </Field>

          <Field label="E-mail">
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="email@exemplo.com" className={inp} />
          </Field>
        </div>

        {/* Cor */}
        <div>
          <span className="text-[11px] text-[#475569] block mb-2">Cor na agenda</span>
          <div className="flex gap-2 flex-wrap">
            {CORES.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setForm(f => ({ ...f, cor: c }))}
                className="w-7 h-7 rounded-lg border-2 transition-all"
                style={{
                  backgroundColor: c,
                  borderColor: form.cor === c ? '#0f172a' : 'transparent',
                  transform: form.cor === c ? 'scale(1.15)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Comissão */}
        <Field label="Comissão (%)">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={form.comissao_percentual}
              onChange={e => setForm(f => ({ ...f, comissao_percentual: Number(e.target.value) }))}
              className={inp + ' w-24'}
            />
            <span className="text-[11px] text-[#94a3b8]">% sobre o valor do serviço</span>
          </div>
        </Field>

        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[#475569]">Profissional ativo</span>
          <button
            type="button"
            onClick={() => setForm(f => ({ ...f, ativo: !f.ativo }))}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.ativo ? 'bg-[#4f46e5]' : 'bg-[#e2e8f0]'}`}
          >
            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${form.ativo ? 'translate-x-4' : 'translate-x-1'}`} />
          </button>
        </div>
      </section>

      {/* Disponibilidades */}
      <section className="bg-white border border-[#e2e8f0] rounded-xl p-5 space-y-3">
        <div>
          <h2 className="text-[11px] font-semibold text-[#0f172a] uppercase tracking-wide">Disponibilidade</h2>
          <p className="text-[10px] text-[#94a3b8] mt-0.5">Define os dias e horários de atendimento deste profissional.</p>
        </div>
        {disponibilidades.map(d => (
          <div key={d.dia_semana} className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setD(d.dia_semana, 'ativo', !d.ativo)}
              className={`w-16 text-center py-1.5 rounded-lg text-[11px] font-semibold border transition-colors flex-shrink-0 ${
                d.ativo ? 'text-white border-transparent' : 'text-[#94a3b8] border-[#e2e8f0] bg-[#f8fafc]'
              }`}
              style={d.ativo ? { backgroundColor: form.cor, borderColor: form.cor } : {}}
            >
              {DIAS[d.dia_semana].slice(0, 3)}
            </button>
            {d.ativo ? (
              <>
                <input
                  type="time"
                  value={d.hora_inicio}
                  onChange={e => setD(d.dia_semana, 'hora_inicio', e.target.value)}
                  className="border border-[#e2e8f0] rounded-lg px-2 py-1.5 text-[12px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8] w-24"
                />
                <span className="text-[11px] text-[#94a3b8]">até</span>
                <input
                  type="time"
                  value={d.hora_fim}
                  onChange={e => setD(d.dia_semana, 'hora_fim', e.target.value)}
                  className="border border-[#e2e8f0] rounded-lg px-2 py-1.5 text-[12px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8] w-24"
                />
              </>
            ) : (
              <span className="text-[11px] text-[#94a3b8] italic">Folga</span>
            )}
          </div>
        ))}
      </section>

      {/* Excluir */}
      {!isNovo && (
        <div className="flex justify-end">
          {confirmExcluir ? (
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-red-600">Confirmar exclusão?</span>
              <button onClick={excluir} disabled={excluindo}
                className="text-[11px] font-bold text-red-600 hover:underline disabled:opacity-50">
                {excluindo ? 'Excluindo...' : 'Sim, excluir'}
              </button>
              <button onClick={() => setConfirmExcluir(false)} className="text-[11px] text-[#64748b] hover:underline">
                Cancelar
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmExcluir(true)}
              className="flex items-center gap-1.5 text-[11px] text-[#94a3b8] hover:text-red-500 transition-colors">
              <Trash2 size={12} />
              Excluir profissional
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-[11px] text-[#475569] mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const inp = 'w-full border border-[#e2e8f0] rounded-lg px-3 py-1.5 text-[12px] text-[#0f172a] placeholder-[#94a3b8]/50 focus:outline-none focus:border-[#94a3b8]'
