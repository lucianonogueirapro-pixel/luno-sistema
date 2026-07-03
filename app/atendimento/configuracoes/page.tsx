'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { Save, Zap, AlertCircle, CheckCircle2, Loader2, DollarSign, Clock, CalendarDays, X, Plus, Bot } from 'lucide-react'
import { BackButton } from '@/components/ui/BackButton'

const PROMPT_PRESETS: Record<string, { label: string; prompt: string }[]> = {
  default: [
    {
      label: 'Atendimento geral',
      prompt: `Você é Luna, assistente virtual de atendimento. Você representa a empresa e está aqui para ajudar clientes com informações, dúvidas e agendamentos. Nunca diga que é um robô, IA ou sistema automático. Se perguntarem, você é a responsável pelo primeiro atendimento.

REGRAS:
- Tom acolhedor, humano e próximo
- Faça UMA pergunta por vez
- Mensagens curtas — máximo 3 linhas por resposta
- Nunca use linguagem genérica ou exclamações excessivas
- Sem emojis na maioria das mensagens

MISSÃO: entender a necessidade do cliente e direcioná-lo para o próximo passo (agendamento, orçamento ou atendimento presencial).

FLUXO:
1. Acolher — cumprimente e pergunte o nome com leveza
2. Identificar a necessidade — o que trouxe o cliente até vocês?
3. Qualificar — aprofunde com perguntas simples e diretas
4. Direcionar — proponha o próximo passo claro (agendar, enviar orçamento, visitar)

SOBRE A EMPRESA:
[Preencha aqui: nome, endereço, horários, serviços principais, contato]

TOM: Natural, como uma conversa de WhatsApp. Caloroso e eficiente.`,
    },
  ],
  qualificacao: [
    {
      label: 'Qualificação de leads',
      prompt: `IDENTIDADE
Você é Luna, assistente virtual. Você representa a empresa e faz o primeiro atendimento via WhatsApp. Nunca diga que é IA ou robô.

OBJETIVO
Qualificar leads recebidos (anúncio, indicação, site) — entender a necessidade, criar conexão e converter para uma visita ou agendamento.

REGRAS
- Uma pergunta por vez, nunca agrupe
- Mensagens curtas (2-3 linhas máximo)
- Tom próximo e genuíno, não robótico
- Nunca cite preços sem orientação do responsável
- Nunca use emojis em excesso

FLUXO

[1] BOAS-VINDAS
Olá! Tudo bem?
Meu nome é Luna, faço o atendimento aqui da [NOME DA EMPRESA].
Vi que você entrou em contato — posso te ajudar?

[2] IDENTIFICAR NECESSIDADE
Ótimo! Me conta um pouco mais sobre o que você está buscando.

[3] APROFUNDAR
Há quanto tempo você pensa nisso?

[4] QUALIFICAR
[Nome], com base no que você me contou, acho que conseguimos te ajudar muito bem.
Que tal marcarmos um horário para conversarmos melhor / você conhecer o espaço?

[5] AGENDAMENTO
Que dias ficam melhores para você? Trabalhamos [HORÁRIOS].

[6] CONFIRMAÇÃO
Confirmado para [DIA] às [HORÁRIO]!
Nosso endereço é [ENDEREÇO].
Qualquer dúvida pode falar comigo aqui mesmo.

OBJEÇÕES

"Quanto custa?"
Os valores variam conforme o que for indicado para o seu caso. Consigo te passar mais detalhes quando a gente conversar — garanto que vale.

"Posso ir sem agendar?"
Prefiro garantir um horário exclusivo para você. Assim não fica esperando. Tem preferência de dia?

HORÁRIOS: [preencher]
ENDEREÇO: [preencher]`,
    },
  ],
}

interface Instancia {
  id: string
  nome: string | null
  instance_name: string
  ativo: boolean
  tag_padrao: string | null
}

interface Config {
  id?: string
  nome_agente?: string
  auto_responder?: boolean
  followup_delay_horas?: number
  followup2_horas?: number | null
  followup3_horas?: number | null
  prompt_laura?: string
  creditos_usd?: number
  modelo_laura?: string
  horario_inicio?: string
  horario_fim?: string
  sabado_ativo?: boolean
  sabado_inicio?: string
  sabado_fim?: string
  duracao_avaliacao_min?: number
  slots_antecipacao_dias?: number
  slots_manuais?: string[]
}

function AtendimentoConfigPageInner() {
  const searchParams = useSearchParams()
  const fromConfig = searchParams.get('from') === 'configuracoes'

  const [instancias, setInstancias] = useState<Instancia[]>([])
  const [abaAtiva, setAbaAtiva] = useState<string>('')
  const [cfg, setCfg] = useState<Config>({
    auto_responder: true,
    followup_delay_horas: 4,
    followup2_horas: 24,
    followup3_horas: 168,
    horario_inicio: '09:00',
    horario_fim: '18:00',
    sabado_ativo: true,
    sabado_inicio: '09:00',
    sabado_fim: '13:00',
    duracao_avaliacao_min: 60,
    slots_antecipacao_dias: 7,
  })
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [novoSlotData, setNovoSlotData] = useState('')
  const [novoSlotHora, setNovoSlotHora] = useState('09:00')

  // Carrega lista de instâncias
  useEffect(() => {
    fetch('/api/whatsapp/configs')
      .then(r => r.json())
      .then((lista: Instancia[]) => {
        setInstancias(lista)
        if (lista.length > 0) setAbaAtiva(lista[0].id)
      })
      .catch(() => {})
  }, [])

  // Carrega config da aba ativa
  useEffect(() => {
    if (!abaAtiva) return
    setCarregando(true)
    fetch(`/api/whatsapp/config?id=${abaAtiva}`)
      .then(r => r.json())
      .then(d => { if (d) setCfg(d) })
      .catch(() => {})
      .finally(() => setCarregando(false))
  }, [abaAtiva])

  const salvar = useCallback(async () => {
    setSalvando(true)
    setMsg(null)
    try {
      const res = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...cfg, id: abaAtiva }),
      })
      const data = await res.json()
      if (data.ok) {
        setMsg({ tipo: 'ok', texto: 'Configuração salva.' })
      } else {
        setMsg({ tipo: 'erro', texto: data.error ?? 'Erro ao salvar.' })
      }
    } catch {
      setMsg({ tipo: 'erro', texto: 'Falha na requisição.' })
    } finally {
      setSalvando(false)
    }
  }, [cfg, abaAtiva])

  const instanciaAtiva = instancias.find(i => i.id === abaAtiva)
  const presets = instanciaAtiva?.tag_padrao === 'paciente_modelo'
    ? PROMPT_PRESETS.paciente_modelo
    : PROMPT_PRESETS.default

  const nomeAgente = cfg.nome_agente?.trim() || 'Luna'

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={`Configuração — ${nomeAgente}`}
        subtitle="Comportamento, follow-up e prompt do agente de atendimento"
        action={
          <button
            onClick={salvar}
            disabled={salvando || carregando}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#4f46e5] text-white text-[12px] rounded-lg hover:bg-[#374151] disabled:opacity-50 transition-colors"
          >
            {salvando ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Salvar
          </button>
        }
      />

      <div className="flex-1 overflow-auto px-6 py-5">
        <div className="max-w-2xl space-y-5">
          <BackButton
            href={fromConfig ? '/configuracoes' : '/atendimento'}
            label={fromConfig ? 'Voltar às Configurações' : 'Voltar ao Atendimento'}
          />

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

          {/* Abas por instância */}
          {instancias.length > 1 && (
            <div className="flex gap-2 border-b border-[#e2e8f0] pb-0">
              {instancias.map(inst => (
                <button
                  key={inst.id}
                  onClick={() => { setAbaAtiva(inst.id); setMsg(null) }}
                  className={`px-4 py-2 text-[12px] font-medium border-b-2 transition-colors -mb-px ${
                    abaAtiva === inst.id
                      ? 'border-[#4f46e5] text-[#4f46e5]'
                      : 'border-transparent text-[#64748b] hover:text-[#0f172a]'
                  }`}
                >
                  {inst.nome ?? inst.instance_name}
                  {inst.tag_padrao === 'paciente_modelo' && (
                    <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded-full bg-[#fdf4ff] text-[#7c3aed] border border-[#e9d5ff]">
                      Paciente modelo
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {carregando ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-[#94a3b8]" />
            </div>
          ) : (
            <>
              {/* Identidade */}
              <section className="bg-white border border-[#e2e8f0] rounded-xl p-5 space-y-3">
                <h2 className="text-[11px] font-semibold text-[#0f172a] uppercase tracking-wide flex items-center gap-2">
                  <Bot size={13} />
                  Identidade do Agente
                </h2>
                <label>
                  <div className="text-[10px] font-semibold text-[#475569] uppercase tracking-wide mb-1.5">
                    Nome do agente
                  </div>
                  <input
                    type="text"
                    value={cfg.nome_agente ?? ''}
                    onChange={e => setCfg(p => ({ ...p, nome_agente: e.target.value }))}
                    placeholder="ex: Luna, Laura, Ana..."
                    className="w-48 border border-[#e2e8f0] rounded-lg px-3 py-1.5 text-[12px] text-[#0f172a] placeholder-[#94a3b8]/50 focus:outline-none focus:border-[#94a3b8]"
                  />
                  <p className="text-[10px] text-[#94a3b8] mt-1">
                    Aparece no título da página e pode ser usado no prompt para personalizar a identidade da IA.
                  </p>
                </label>
              </section>

              {/* Comportamento */}
              <section className="bg-white border border-[#e2e8f0] rounded-xl p-5 space-y-4">
                <h2 className="text-[11px] font-semibold text-[#0f172a] uppercase tracking-wide">
                  Comportamento
                </h2>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[12px] font-medium text-[#0f172a]">Resposta automática</div>
                    <div className="text-[10px] text-[#94a3b8]">{nomeAgente} responde automaticamente toda mensagem recebida</div>
                  </div>
                  <button
                    onClick={() => setCfg(p => ({ ...p, auto_responder: !p.auto_responder }))}
                    className="relative rounded-full transition-colors flex-shrink-0"
                    style={{
                      height: '22px', width: '40px',
                      background: cfg.auto_responder ? '#3730a3' : '#e2e8f0',
                    }}
                  >
                    <span
                      className="absolute top-0.5 rounded-full bg-white shadow transition-all"
                      style={{ width: '18px', height: '18px', transform: cfg.auto_responder ? 'translateX(20px)' : 'translateX(2px)' }}
                    />
                  </button>
                </div>

                {/* Modelo */}
                <div>
                  <div className="text-[12px] font-medium text-[#0f172a] mb-1">Modelo de IA</div>
                  <div className="flex gap-2">
                    {[
                      { id: 'claude-haiku-4-5-20251001', label: 'Haiku', desc: 'Rápido · $0,80/M tokens' },
                      { id: 'claude-sonnet-4-6', label: 'Sonnet', desc: 'Inteligente · $3/M tokens' },
                    ].map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setCfg(p => ({ ...p, modelo_laura: m.id }))}
                        className={`flex-1 px-3 py-2 rounded-lg border text-left transition-colors ${
                          (cfg.modelo_laura ?? 'claude-haiku-4-5-20251001') === m.id
                            ? 'border-[#4f46e5] bg-[#f1f5f9]'
                            : 'border-[#e2e8f0] hover:bg-[#f8fafc]'
                        }`}
                      >
                        <div className="text-[12px] font-semibold text-[#0f172a]">{m.label}</div>
                        <div className="text-[10px] text-[#64748b]">{m.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {/* Horários de Atendimento */}
              <section className="bg-white border border-[#e2e8f0] rounded-xl p-5 space-y-4">
                <h2 className="text-[11px] font-semibold text-[#0f172a] uppercase tracking-wide flex items-center gap-2">
                  <Clock size={13} />
                  Horários de Atendimento
                </h2>
                <p className="text-[10px] text-[#94a3b8]">
                  {nomeAgente} usa esses horários para oferecer slots disponíveis e agendar avaliações automaticamente.
                </p>

                <div>
                  <div className="text-[10px] font-semibold text-[#475569] uppercase tracking-wide mb-2">Segunda a Sexta</div>
                  <div className="flex items-center gap-3">
                    <HoraField label="Início" value={cfg.horario_inicio ?? '09:00'} onChange={v => setCfg(p => ({ ...p, horario_inicio: v }))} />
                    <span className="text-[11px] text-[#94a3b8]">até</span>
                    <HoraField label="Fim" value={cfg.horario_fim ?? '18:00'} onChange={v => setCfg(p => ({ ...p, horario_fim: v }))} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] font-semibold text-[#475569] uppercase tracking-wide">Sábado</div>
                    <button
                      type="button"
                      onClick={() => setCfg(p => ({ ...p, sabado_ativo: !p.sabado_ativo }))}
                      className="relative rounded-full transition-colors flex-shrink-0"
                      style={{
                        height: '20px', width: '36px',
                        background: cfg.sabado_ativo ? '#3730a3' : '#e2e8f0',
                      }}
                    >
                      <span
                        className="absolute top-0.5 rounded-full bg-white shadow transition-all"
                        style={{ width: '16px', height: '16px', transform: cfg.sabado_ativo ? 'translateX(18px)' : 'translateX(2px)' }}
                      />
                    </button>
                  </div>
                  {cfg.sabado_ativo && (
                    <div className="flex items-center gap-3">
                      <HoraField label="Início" value={cfg.sabado_inicio ?? '09:00'} onChange={v => setCfg(p => ({ ...p, sabado_inicio: v }))} />
                      <span className="text-[11px] text-[#94a3b8]">até</span>
                      <HoraField label="Fim" value={cfg.sabado_fim ?? '13:00'} onChange={v => setCfg(p => ({ ...p, sabado_fim: v }))} />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <label>
                    <div className="text-[10px] font-semibold text-[#475569] uppercase tracking-wide mb-1">Duração da avaliação</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={15}
                        max={180}
                        step={15}
                        value={cfg.duracao_avaliacao_min ?? 60}
                        onChange={e => setCfg(p => ({ ...p, duracao_avaliacao_min: Number(e.target.value) }))}
                        className="w-20 border border-[#e2e8f0] rounded-lg px-3 py-1.5 text-[12px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8]"
                      />
                      <span className="text-[10px] text-[#94a3b8]">minutos</span>
                    </div>
                  </label>
                  <label>
                    <div className="text-[10px] font-semibold text-[#475569] uppercase tracking-wide mb-1">Slots oferecidos até</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={cfg.slots_antecipacao_dias ?? 7}
                        onChange={e => setCfg(p => ({ ...p, slots_antecipacao_dias: Number(e.target.value) }))}
                        className="w-20 border border-[#e2e8f0] rounded-lg px-3 py-1.5 text-[12px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8]"
                      />
                      <span className="text-[10px] text-[#94a3b8]">dias à frente</span>
                    </div>
                  </label>
                </div>
              </section>

              {/* Slots manuais — só para Paciente Modelo */}
              {instanciaAtiva?.tag_padrao === 'paciente_modelo' && (
                <section className="bg-white border border-[#e9d5ff] rounded-xl p-5 space-y-4">
                  <div>
                    <h2 className="text-[11px] font-semibold text-[#7c3aed] uppercase tracking-wide flex items-center gap-2">
                      <CalendarDays size={13} />
                      Horários disponíveis — Paciente Modelo
                    </h2>
                    <p className="text-[10px] text-[#94a3b8] mt-1">
                      Adicione os horários específicos desta campanha. {nomeAgente} vai oferecer exatamente esses slots e agendar quando confirmado.
                    </p>
                  </div>

                  {/* Lista de slots */}
                  {(cfg.slots_manuais ?? []).length === 0 ? (
                    <p className="text-[11px] text-[#94a3b8] italic">Nenhum horário adicionado. {nomeAgente} usará o expediente padrão.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {(cfg.slots_manuais ?? [])
                        .slice()
                        .sort((a, b) => a.localeCompare(b))
                        .map(iso => {
                          const dt = new Date(iso)
                          const label = dt.toLocaleString('pt-BR', {
                            timeZone: 'America/Fortaleza',
                            weekday: 'short',
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                          const passado = dt < new Date()
                          return (
                            <div key={iso} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-[12px] ${passado ? 'opacity-40 bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#faf5ff] border-[#e9d5ff]'}`}>
                              <span className={passado ? 'text-[#94a3b8] line-through' : 'text-[#4c1d95] font-medium'}>{label}{passado ? ' · passado' : ''}</span>
                              <button
                                type="button"
                                onClick={() => setCfg(p => ({ ...p, slots_manuais: (p.slots_manuais ?? []).filter(s => s !== iso) }))}
                                className="text-[#94a3b8] hover:text-[#7c3aed] transition-colors"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          )
                        })}
                    </div>
                  )}

                  {/* Adicionar slot */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="date"
                      value={novoSlotData}
                      onChange={e => setNovoSlotData(e.target.value)}
                      className="border border-[#e2e8f0] rounded-lg px-2 py-1.5 text-[12px] text-[#0f172a] focus:outline-none focus:border-[#7c3aed]"
                    />
                    <input
                      type="time"
                      value={novoSlotHora}
                      onChange={e => setNovoSlotHora(e.target.value)}
                      step={1800}
                      className="border border-[#e2e8f0] rounded-lg px-2 py-1.5 text-[12px] text-[#0f172a] focus:outline-none focus:border-[#7c3aed]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!novoSlotData || !novoSlotHora) return
                        // Converte hora local de Fortaleza (UTC-3) para ISO UTC
                        const iso = new Date(`${novoSlotData}T${novoSlotHora}:00-03:00`).toISOString()
                        if (!(cfg.slots_manuais ?? []).includes(iso)) {
                          setCfg(p => ({ ...p, slots_manuais: [...(p.slots_manuais ?? []), iso] }))
                        }
                        setNovoSlotData('')
                        setNovoSlotHora('09:00')
                      }}
                      disabled={!novoSlotData}
                      className="flex items-center gap-1 px-3 py-1.5 bg-[#7c3aed] text-white text-[11px] font-medium rounded-lg hover:bg-[#6d28d9] disabled:opacity-40 transition-colors"
                    >
                      <Plus size={12} />
                      Adicionar
                    </button>
                  </div>
                </section>
              )}

              {/* Follow-up */}
              <section className="bg-white border border-[#e2e8f0] rounded-xl p-5 space-y-4">
                <div>
                  <h2 className="text-[11px] font-semibold text-[#0f172a] uppercase tracking-wide">
                    Follow-up automático
                  </h2>
                  <p className="text-[10px] text-[#94a3b8] mt-1">
                    Envios em cascata após o último contato sem agendamento. Deixe em branco para desativar o estágio.
                  </p>
                </div>

                <div className="space-y-3">
                  <FollowupField
                    label="1° Follow-up"
                    sublabel="horas após o último contato"
                    value={cfg.followup_delay_horas}
                    onChange={v => setCfg(p => ({ ...p, followup_delay_horas: v }))}
                    placeholder="ex: 4"
                  />
                  <FollowupField
                    label="2° Follow-up"
                    sublabel="horas após o 1° follow-up"
                    value={cfg.followup2_horas ?? undefined}
                    onChange={v => setCfg(p => ({ ...p, followup2_horas: v ?? null }))}
                    placeholder="ex: 24 (1 dia)"
                    nullable
                  />
                  <FollowupField
                    label="3° Follow-up"
                    sublabel="horas após o 2° follow-up"
                    value={cfg.followup3_horas ?? undefined}
                    onChange={v => setCfg(p => ({ ...p, followup3_horas: v ?? null }))}
                    placeholder="ex: 168 (7 dias)"
                    nullable
                  />
                </div>
              </section>

              {/* Créditos Anthropic — apenas na primeira aba */}
              {instancias[0]?.id === abaAtiva && (
                <section className="bg-white border border-[#e2e8f0] rounded-xl p-5 space-y-3">
                  <h2 className="text-[11px] font-semibold text-[#0f172a] uppercase tracking-wide flex items-center gap-2">
                    <DollarSign size={13} />
                    Créditos Anthropic
                  </h2>
                  <p className="text-[11px] text-[#475569]">
                    Informe o total acumulado de créditos que você adicionou em{' '}
                    <a
                      href="https://console.anthropic.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#0f172a] underline"
                    >
                      console.anthropic.com
                    </a>
                    . O sistema usa isso para calcular o saldo estimado.
                  </p>
                  <label className="flex items-center gap-2">
                    <span className="text-[11px] text-[#475569] w-28 shrink-0">Total adicionado (US$)</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={cfg.creditos_usd ?? ''}
                      onChange={e => setCfg(p => ({ ...p, creditos_usd: e.target.value === '' ? undefined : Number(e.target.value) }))}
                      placeholder="ex: 6.76"
                      className="w-28 border border-[#e2e8f0] rounded-lg px-3 py-1.5 text-[12px] text-[#0f172a] placeholder-[#94a3b8]/50 focus:outline-none focus:border-[#94a3b8]"
                    />
                    <span className="text-[10px] text-[#94a3b8]">Atualize sempre que recarregar</span>
                  </label>
                  <p className="text-[10px] text-[#94a3b8]">
                    Ver saldo estimado e consumo em{' '}
                    <a href="/tokens" className="text-[#0f172a] underline">Sistema → Tokens API</a>
                  </p>
                </section>
              )}

              {/* Prompt do Agente */}
              <section className="bg-white border border-[#e2e8f0] rounded-xl p-5 space-y-3">
                <h2 className="text-[11px] font-semibold text-[#0f172a] uppercase tracking-wide flex items-center gap-2">
                  <Zap size={13} />
                  Prompt — {nomeAgente}
                </h2>

                <div>
                  <div className="text-[10px] text-[#94a3b8] uppercase tracking-wide mb-1.5">Presets</div>
                  <div className="flex flex-wrap gap-2">
                    {presets.map(p => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setCfg(c => ({ ...c, prompt_laura: p.prompt }))}
                        className="px-3 py-1.5 text-[11px] font-medium border border-[#94a3b8] text-[#0f172a] rounded-lg hover:bg-[#f8fafc] transition-colors"
                      >
                        {p.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCfg(c => ({ ...c, prompt_laura: '' }))}
                      className="px-3 py-1.5 text-[11px] font-medium border border-[#e2e8f0] text-[#94a3b8] rounded-lg hover:bg-[#f8fafc] transition-colors"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                <textarea
                  value={cfg.prompt_laura ?? ''}
                  onChange={e => setCfg(p => ({ ...p, prompt_laura: e.target.value }))}
                  rows={14}
                  placeholder="Selecione um preset acima ou escreva um prompt personalizado..."
                  className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2.5 text-[12px] text-[#0f172a] placeholder-[#94a3b8]/50 focus:outline-none focus:border-[#94a3b8] resize-y bg-[#f8fafc] leading-relaxed"
                />
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function HoraField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-[10px] text-[#475569] w-8">{label}</span>
      <input
        type="time"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="border border-[#e2e8f0] rounded-lg px-2 py-1.5 text-[12px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8]"
      />
    </label>
  )
}

function FollowupField({
  label, sublabel, value, onChange, placeholder, nullable,
}: {
  label: string
  sublabel: string
  value?: number
  onChange: (v: number | undefined) => void
  placeholder: string
  nullable?: boolean
}) {
  return (
    <label className="flex items-center gap-3">
      <div className="w-28 shrink-0">
        <div className="text-[11px] font-medium text-[#0f172a]">{label}</div>
      </div>
      <input
        type="number"
        min={1}
        max={720}
        value={value ?? ''}
        onChange={e => {
          const v = e.target.value === '' ? undefined : Number(e.target.value)
          onChange(v)
        }}
        placeholder={placeholder}
        className="w-24 border border-[#e2e8f0] rounded-lg px-3 py-1.5 text-[12px] text-[#0f172a] placeholder-[#94a3b8]/50 focus:outline-none focus:border-[#94a3b8]"
      />
      <span className="text-[10px] text-[#475569]">{sublabel}{nullable ? ' (opcional)' : ''}</span>
    </label>
  )
}

export default function AtendimentoConfigPage() {
  return (
    <Suspense>
      <AtendimentoConfigPageInner />
    </Suspense>
  )
}
