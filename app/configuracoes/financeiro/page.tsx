'use client'
import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { BackButton } from '@/components/ui/BackButton'
import { Save, AlertCircle, CheckCircle2, Loader2, CreditCard, Receipt, PiggyBank, Landmark } from 'lucide-react'

interface Cfg {
  pct_pix: number
  pct_dinheiro: number
  pct_debito: number
  pct_credito: number
  regime_fiscal: 'mei' | 'simples'
  mei_limite_anual: number
  aliq_simples: number
  reserva_acumulada: number
  fc_inicial: number
  faturamento_ano?: number
}

const DEFAULT: Cfg = {
  pct_pix: 0, pct_dinheiro: 0, pct_debito: 1.5, pct_credito: 2.99,
  regime_fiscal: 'mei', mei_limite_anual: 81000, aliq_simples: 6, reserva_acumulada: 10,
  fc_inicial: 0,
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function ConfigFinanceiroPage() {
  const [cfg, setCfg] = useState<Cfg>(DEFAULT)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  useEffect(() => {
    fetch('/api/financeiro/config')
      .then(r => r.json())
      .then(d => { if (d) setCfg(c => ({ ...c, ...d })) })
      .catch(() => {})
      .finally(() => setCarregando(false))
  }, [])

  const salvar = useCallback(async () => {
    setSalvando(true)
    setMsg(null)
    try {
      const res = await fetch('/api/financeiro/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      })
      const data = await res.json()
      setMsg(data.ok
        ? { tipo: 'ok', texto: 'Configuração salva.' }
        : { tipo: 'erro', texto: data.error ?? 'Erro ao salvar.' })
    } catch {
      setMsg({ tipo: 'erro', texto: 'Falha na requisição.' })
    } finally {
      setSalvando(false)
    }
  }, [cfg])

  const fat = cfg.faturamento_ano ?? 0
  const limite = cfg.mei_limite_anual ?? 81000
  const pctMei = Math.min((fat / limite) * 100, 100)
  const restante = Math.max(limite - fat, 0)
  const corBarra = pctMei >= 90 ? '#ef4444' : pctMei >= 70 ? '#f59e0b' : '#22c55e'

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={20} className="animate-spin text-[#94a3b8]" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Configurações Financeiras"
        subtitle="Maquineta, regime fiscal e reserva"
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
        <div className="max-w-2xl space-y-5">
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

          {/* Maquineta */}
          <section className="bg-white border border-[#e2e8f0] rounded-xl p-5 space-y-4">
            <h2 className="text-[11px] font-semibold text-[#0f172a] uppercase tracking-wide flex items-center gap-2">
              <CreditCard size={13} />
              Taxas de Maquineta
            </h2>
            <p className="text-[10px] text-[#94a3b8]">
              Aplicadas automaticamente conforme a forma de pagamento de cada entrada. Podem ser sobrescritas por lançamento.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {([
                { key: 'pct_pix',      label: 'PIX',     desc: 'Geralmente 0%' },
                { key: 'pct_dinheiro', label: 'Dinheiro', desc: 'Geralmente 0%' },
                { key: 'pct_debito',   label: 'Débito',   desc: 'Geralmente 1,5%' },
                { key: 'pct_credito',  label: 'Crédito',  desc: 'Geralmente 2,99%' },
              ] as { key: keyof Cfg; label: string; desc: string }[]).map(({ key, label, desc }) => (
                <label key={key}>
                  <div className="text-[11px] font-medium text-[#0f172a] mb-1">{label}</div>
                  <div className="text-[9px] text-[#94a3b8] mb-1.5">{desc}</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={10}
                      step={0.01}
                      value={cfg[key] as number}
                      onChange={e => setCfg(p => ({ ...p, [key]: Number(e.target.value) }))}
                      className="w-20 border border-[#e2e8f0] rounded-lg px-3 py-1.5 text-[12px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8]"
                    />
                    <span className="text-[10px] text-[#94a3b8]">%</span>
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* Regime Fiscal */}
          <section className="bg-white border border-[#e2e8f0] rounded-xl p-5 space-y-4">
            <h2 className="text-[11px] font-semibold text-[#0f172a] uppercase tracking-wide flex items-center gap-2">
              <Receipt size={13} />
              Regime Fiscal
            </h2>

            {/* Toggle MEI / Simples */}
            <div className="flex gap-2">
              {(['mei', 'simples'] as const).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setCfg(p => ({ ...p, regime_fiscal: r }))}
                  className={`flex-1 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                    cfg.regime_fiscal === r
                      ? 'border-[#4f46e5] bg-[#eef2ff]'
                      : 'border-[#e2e8f0] hover:bg-[#f8fafc]'
                  }`}
                >
                  <div className="text-[12px] font-semibold text-[#0f172a]">
                    {r === 'mei' ? 'MEI' : 'Simples Nacional'}
                  </div>
                  <div className="text-[10px] text-[#64748b] mt-0.5">
                    {r === 'mei'
                      ? 'Sem imposto até o limite anual'
                      : 'Alíquota aplicada em todas as entradas'}
                  </div>
                </button>
              ))}
            </div>

            {/* MEI: limite + barra de progresso */}
            {cfg.regime_fiscal === 'mei' && (
              <div className="space-y-3">
                <label>
                  <div className="text-[10px] font-semibold text-[#475569] uppercase tracking-wide mb-1.5">
                    Limite anual MEI
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#475569]">R$</span>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={cfg.mei_limite_anual ?? 81000}
                      onChange={e => setCfg(p => ({ ...p, mei_limite_anual: Number(e.target.value) }))}
                      className="w-32 border border-[#e2e8f0] rounded-lg px-3 py-1.5 text-[12px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8]"
                    />
                    <span className="text-[10px] text-[#94a3b8]">por ano (padrão R$ 81.000)</span>
                  </div>
                </label>

                {/* Barra de progresso do ano */}
                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-medium text-[#0f172a]">Faturamento {new Date().getFullYear()}</span>
                    <span className="font-bold" style={{ color: corBarra }}>{pctMei.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-[#e2e8f0] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pctMei}%`, background: corBarra }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#64748b]">
                    <span>{fmt(fat)} faturado</span>
                    <span>{fmt(restante)} restante</span>
                  </div>
                  {pctMei >= 90 && (
                    <div className="flex items-center gap-1.5 text-[10px] text-red-600 font-medium mt-1">
                      <AlertCircle size={12} />
                      Atenção — acima de 90% do limite MEI. Considere planejar a migração para Simples.
                    </div>
                  )}
                  {pctMei >= 70 && pctMei < 90 && (
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-600 font-medium mt-1">
                      <AlertCircle size={12} />
                      Mais da metade do limite MEI utilizado.
                    </div>
                  )}
                </div>

                <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-lg px-4 py-3 text-[11px] text-[#166534] space-y-1">
                  <div className="font-semibold">Enquanto o MEI estiver abaixo de {fmt(limite)}/ano:</div>
                  <div>· Imposto sobre entradas = <strong>0%</strong> (paga só o DAS fixo ~R$ 75/mês)</div>
                  <div>· Após ultrapassar o limite → alíquota Simples abaixo é aplicada automaticamente</div>
                </div>
              </div>
            )}

            {/* Alíquota Simples — sempre visível */}
            <label>
              <div className="text-[10px] font-semibold text-[#475569] uppercase tracking-wide mb-1.5">
                Alíquota Simples Nacional
                {cfg.regime_fiscal === 'mei' && (
                  <span className="ml-2 text-[9px] font-normal text-[#94a3b8] normal-case">
                    — aplicada ao ultrapassar o limite MEI
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={20}
                  step={0.1}
                  value={cfg.aliq_simples}
                  onChange={e => setCfg(p => ({ ...p, aliq_simples: Number(e.target.value) }))}
                  className="w-20 border border-[#e2e8f0] rounded-lg px-3 py-1.5 text-[12px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8]"
                />
                <span className="text-[10px] text-[#94a3b8]">% (Simples Anexo III serviços começa em ~6%)</span>
              </div>
            </label>
          </section>

          {/* Fluxo de Caixa Inicial */}
          <section className="bg-white border border-[#e2e8f0] rounded-xl p-5 space-y-3">
            <h2 className="text-[11px] font-semibold text-[#0f172a] uppercase tracking-wide flex items-center gap-2">
              <Landmark size={13} />
              Fluxo de Caixa
            </h2>
            <p className="text-[10px] text-[#94a3b8]">
              Saldo inicial disponível no caixa antes do primeiro mês de operação. O sistema acumula automaticamente o resultado de cada mês para o próximo.
            </p>
            <label>
              <div className="text-[10px] font-semibold text-[#475569] uppercase tracking-wide mb-1.5">Saldo Inicial</div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#475569]">R$</span>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={cfg.fc_inicial ?? 0}
                  onChange={e => setCfg(p => ({ ...p, fc_inicial: Number(e.target.value) }))}
                  className="w-32 border border-[#e2e8f0] rounded-lg px-3 py-1.5 text-[12px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8]"
                />
                <span className="text-[10px] text-[#94a3b8]">capital inicial ou saldo trazido</span>
              </div>
            </label>
          </section>

          {/* Reserva */}
          <section className="bg-white border border-[#e2e8f0] rounded-xl p-5 space-y-3">
            <h2 className="text-[11px] font-semibold text-[#0f172a] uppercase tracking-wide flex items-center gap-2">
              <PiggyBank size={13} />
              Reserva
            </h2>
            <p className="text-[10px] text-[#94a3b8]">
              Percentual do faturamento líquido separado como reserva de caixa.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={50}
                step={1}
                value={cfg.reserva_acumulada ?? 10}
                onChange={e => setCfg(p => ({ ...p, reserva_acumulada: Number(e.target.value) }))}
                className="w-20 border border-[#e2e8f0] rounded-lg px-3 py-1.5 text-[12px] text-[#0f172a] focus:outline-none focus:border-[#94a3b8]"
              />
              <span className="text-[10px] text-[#94a3b8]">% do líquido</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
