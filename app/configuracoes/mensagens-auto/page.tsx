'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { BackButton } from '@/components/ui/BackButton'
import {
  Save, AlertCircle, CheckCircle2, Loader2,
  Cake, Heart, CalendarClock,
} from 'lucide-react'

type Tipo = 'aniversario' | 'boas_vindas' | 'retorno'

interface MsgConfig {
  id?: string
  tipo: Tipo
  ativo: boolean
  dias_depois?: number | null
  horario: string
  template: string
}

const DEFAULTS: MsgConfig[] = [
  {
    tipo: 'boas_vindas',
    ativo: true,
    horario: '10:00',
    template: 'Olá, {nome}! Seja bem-vinda à {clinica}. Estamos muito felizes em ter você conosco. Qualquer dúvida, é só chamar! 😊',
  },
  {
    tipo: 'aniversario',
    ativo: true,
    horario: '08:00',
    template: 'Feliz aniversário, {nome}! 🎂 Toda a equipe da {clinica} deseja um dia incrível pra você. Você merece ser celebrada! 🌸',
  },
  {
    tipo: 'retorno',
    ativo: true,
    dias_depois: 60,
    horario: '10:00',
    template: 'Olá, {nome}! Aqui é a {clinica}. Sentimos sua falta! Já faz um tempinho desde sua última visita — que tal agendar um retorno? Estamos aqui pra cuidar de você. 😊',
  },
]

const TIPO_INFO: Record<Tipo, { label: string; icon: React.ElementType; desc: string; cor: string }> = {
  boas_vindas: {
    label: 'Boas-vindas',
    icon: Heart,
    desc: 'Enviada automaticamente quando uma nova paciente é cadastrada.',
    cor: '#22c55e',
  },
  aniversario: {
    label: 'Aniversário',
    icon: Cake,
    desc: 'Enviada no dia do aniversário da paciente.',
    cor: '#f59e0b',
  },
  retorno: {
    label: 'Lembrete de Retorno',
    icon: CalendarClock,
    desc: 'Enviada X dias após o último atendimento para incentivar reagendamento.',
    cor: '#4f46e5',
  },
}

export default function MensagensAutoPage() {
  const [configs, setConfigs] = useState<MsgConfig[]>(DEFAULTS)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  useEffect(() => {
    const supabase = createClient()
    async function carregar() {
      try {
        const { data } = await supabase
          .from('mensagens_auto')
          .select('id, tipo, ativo, dias_depois, horario, template')
        if (data && data.length > 0) {
          const merged = DEFAULTS.map(d => {
            const found = data.find((r: any) => r.tipo === d.tipo)
            return found ? { ...d, ...found } : d
          })
          setConfigs(merged)
        }
      } catch {}
      finally { setCarregando(false) }
    }
    carregar()
  }, [])

  function update(tipo: Tipo, patch: Partial<MsgConfig>) {
    setConfigs(prev => prev.map(c => c.tipo === tipo ? { ...c, ...patch } : c))
  }

  const salvar = useCallback(async () => {
    setSalvando(true)
    setMsg(null)
    try {
      const supabase = createClient()
      for (const c of configs) {
        const payload = {
          tipo: c.tipo,
          ativo: c.ativo,
          dias_depois: c.dias_depois ?? null,
          horario: c.horario,
          template: c.template,
        }
        if (c.id) {
          await supabase.from('mensagens_auto').update(payload).eq('id', c.id)
        } else {
          const { data } = await supabase
            .from('mensagens_auto')
            .insert(payload)
            .select('id')
            .single()
          if (data?.id) update(c.tipo, { id: data.id })
        }
      }
      setMsg({ tipo: 'ok', texto: 'Configurações salvas.' })
    } catch {
      setMsg({ tipo: 'erro', texto: 'Erro ao salvar.' })
    } finally {
      setSalvando(false)
    }
  }, [configs])

  if (carregando) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={20} className="animate-spin text-[#94a3b8]" />
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Mensagens Automáticas"
        subtitle="Relacionamento via WhatsApp — boas-vindas, aniversário e retorno"
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

      <div className="flex-1 overflow-auto px-6 py-5">
        <div className="max-w-2xl space-y-4">
          <BackButton href="/configuracoes" label="Voltar às Configurações" />

          {msg && (
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[12px] border ${
              msg.tipo === 'ok'
                ? 'bg-[#DCFCE7] border-[#86EFAC] text-[#166534]'
                : 'bg-[#FEE2E2] border-[#FCA5A5] text-[#8B1A1A]'
            }`}>
              {msg.tipo === 'ok' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {msg.texto}
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-[11px] text-amber-800 space-y-0.5">
            <div className="font-semibold mb-1">Variáveis disponíveis no template</div>
            <div><code className="bg-amber-100 px-1 rounded">{'{nome}'}</code> — primeiro nome da paciente</div>
            <div><code className="bg-amber-100 px-1 rounded">{'{clinica}'}</code> — nome da clínica</div>
          </div>

          {configs.map(c => {
            const info = TIPO_INFO[c.tipo]
            const Icon = info.icon
            return (
              <div key={c.tipo} className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 flex items-start gap-3 border-b border-[#f1f5f9]">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: `${info.cor}18` }}
                  >
                    <Icon size={16} style={{ color: info.cor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-[#0f172a]">{info.label}</div>
                    <div className="text-[11px] text-[#64748b] mt-0.5">{info.desc}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => update(c.tipo, { ativo: !c.ativo })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 mt-1 ${
                      c.ativo ? 'bg-[#4f46e5]' : 'bg-[#e2e8f0]'
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                      c.ativo ? 'translate-x-4' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Configurações (só se ativo) */}
                {c.ativo && (
                  <div className="px-5 py-4 space-y-3">
                    {c.tipo === 'retorno' && (
                      <label className="flex items-center gap-3">
                        <span className="text-[11px] text-[#475569] w-44 shrink-0">Dias após última consulta</span>
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={c.dias_depois ?? 60}
                          onChange={e => update(c.tipo, { dias_depois: Number(e.target.value) })}
                          className="w-20 border border-[#e2e8f0] rounded-lg px-3 py-1.5 text-[12px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8]"
                        />
                        <span className="text-[11px] text-[#94a3b8]">dias</span>
                      </label>
                    )}

                    <label className="flex items-center gap-3">
                      <span className="text-[11px] text-[#475569] w-44 shrink-0">Horário de envio (BRT)</span>
                      <input
                        type="time"
                        value={c.horario}
                        onChange={e => update(c.tipo, { horario: e.target.value })}
                        className="border border-[#e2e8f0] rounded-lg px-3 py-1.5 text-[12px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8]"
                      />
                    </label>

                    <div>
                      <span className="text-[11px] text-[#475569] block mb-1.5">Mensagem</span>
                      <textarea
                        value={c.template}
                        onChange={e => update(c.tipo, { template: e.target.value })}
                        rows={4}
                        className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2.5 text-[12px] text-[#0f172a] placeholder-[#94a3b8]/50 focus:outline-none focus:border-[#94a3b8] resize-y bg-[#f8fafc]"
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
