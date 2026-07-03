'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import {
  Wifi, WifiOff, RefreshCw, Loader2, Copy, CheckCircle2,
  AlertCircle, Eye, EyeOff, Save, Webhook, ArrowLeft, Bug, Send,
  Smartphone, LogOut, QrCode,
} from 'lucide-react'

interface Config {
  id?: string
  api_url?: string
  api_key?: string
  instance_name?: string
  webhook_token?: string
  ativo?: boolean
}

const STATUS_LABELS: Record<string, { label: string; cor: string; bg: string }> = {
  open:            { label: 'Conectado',               cor: '#166534', bg: '#DCFCE7' },
  close:           { label: 'Desconectado — escaneie o QR', cor: '#b45309', bg: '#FEF3C7' },
  connecting:      { label: 'Conectando...',            cor: '#1E6B8A', bg: '#E0F2FE' },
  not_configured:  { label: 'Não configurado',          cor: '#475569', bg: '#f8fafc' },
  error:           { label: 'Erro de conexão',          cor: '#8B1A1A', bg: '#FEE2E2' },
}

export default function AtendimentoIntegracaoPage() {
  const [cfg, setCfg] = useState<Config>({ ativo: false })
  const [showKey, setShowKey] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [testando, setTestando] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [diagPhone, setDiagPhone] = useState('')
  const [diagLoading, setDiagLoading] = useState(false)
  const [diagResult, setDiagResult] = useState<Record<string, unknown> | null>(null)
  const [registrandoWh, setRegistrandoWh] = useState(false)
  const [whMsg, setWhMsg] = useState<{ ok: boolean; texto: string } | null>(null)
  const [qrData, setQrData] = useState<{ qr: string | null; state: string; code?: string } | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [qrError, setQrError] = useState<string | null>(null)
  const [desconectando, setDesconectando] = useState(false)
  const qrIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetch('/api/whatsapp/config')
      .then(r => r.json())
      .then(d => { if (d) setCfg(d) })
      .catch(() => {})
  }, [])

  const salvar = useCallback(async () => {
    setSalvando(true)
    setMsg(null)
    try {
      const res = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      })
      const data = await res.json()
      if (data.ok) {
        setMsg({ tipo: 'ok', texto: 'Integração salva.' })
      } else {
        setMsg({ tipo: 'erro', texto: data.error ?? 'Erro ao salvar.' })
      }
    } catch {
      setMsg({ tipo: 'erro', texto: 'Falha na requisição.' })
    } finally {
      setSalvando(false)
    }
  }, [cfg])

  const testar = useCallback(async () => {
    setTestando(true)
    setStatus(null)
    try {
      const res = await fetch('/api/whatsapp/config', { method: 'PUT' })
      const data = await res.json()
      setStatus(data.status ?? 'error')
    } catch {
      setStatus('error')
    } finally {
      setTestando(false)
    }
  }, [])

  const buscarQr = useCallback(async () => {
    setQrLoading(true)
    setQrError(null)
    try {
      const res = await fetch('/api/whatsapp/qrcode')
      const data = await res.json()
      if (data.error) {
        setQrError(data.error)
      } else {
        setQrData(data)
        if (data.state === 'open') {
          if (qrIntervalRef.current) clearInterval(qrIntervalRef.current)
          setStatus('open')
        } else if (!data.qr) {
          setQrError(`Sem QR (estado: ${data.state}). Debug: ${JSON.stringify(data.debug ?? data, null, 2)}`)
        }
      }
    } catch (e) {
      setQrError(String(e))
    } finally {
      setQrLoading(false)
    }
  }, [])

  const iniciarQr = useCallback(() => {
    buscarQr()
    qrIntervalRef.current = setInterval(buscarQr, 20000)
  }, [buscarQr])

  const desconectar = useCallback(async () => {
    setDesconectando(true)
    try {
      await fetch('/api/whatsapp/qrcode', { method: 'DELETE' })
      setQrData(null)
      setStatus(null)
    } finally {
      setDesconectando(false)
    }
  }, [])

  useEffect(() => {
    return () => { if (qrIntervalRef.current) clearInterval(qrIntervalRef.current) }
  }, [])

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/whatsapp/webhook`
    : '/api/whatsapp/webhook'

  function copiar() {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function rodarDiagnostico() {
    setDiagLoading(true)
    setDiagResult(null)
    try {
      const phone = diagPhone.replace(/\D/g, '')
      const res = await fetch(`/api/whatsapp/test-connection${phone ? `?phone=${phone}` : ''}`)
      const data = await res.json()
      setDiagResult(data)
    } catch (e) {
      setDiagResult({ error: String(e) })
    } finally {
      setDiagLoading(false)
    }
  }

  const statusCfg = status ? (STATUS_LABELS[status] ?? STATUS_LABELS.error) : null

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Integração WhatsApp"
        subtitle="Evolution API · Conexão com o WhatsApp da empresa"
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
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-[11px] text-[#94a3b8] hover:text-[#0f172a] transition-colors">
            <ArrowLeft size={12} />
            Voltar ao sistema
          </Link>

          {/* Feedback */}
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

          {/* Status da conexão */}
          {statusCfg && (
            <div
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl border text-[12px] font-medium"
              style={{ color: statusCfg.cor, background: statusCfg.bg, borderColor: statusCfg.bg }}
            >
              {status === 'open'
                ? <Wifi size={15} />
                : status === 'error' || status === 'close'
                ? <WifiOff size={15} />
                : <Loader2 size={15} className="animate-spin" />}
              {statusCfg.label}
            </div>
          )}

          {/* Evolution API */}
          <section className="bg-white border border-[#e2e8f0] rounded-xl p-5 space-y-4">
            <h2 className="text-[11px] font-semibold text-[#0f172a] uppercase tracking-wide">
              Evolution API
            </h2>

            <label className="block">
              <span className="text-[10px] text-[#94a3b8] uppercase tracking-wide">URL da API</span>
              <input
                type="url"
                value={cfg.api_url ?? ''}
                onChange={e => setCfg(p => ({ ...p, api_url: e.target.value }))}
                placeholder="https://sua-vps.com:8080"
                className="mt-1 w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-[13px] text-[#0f172a] placeholder-[#94a3b8]/50 focus:outline-none focus:border-[#94a3b8]"
              />
            </label>

            <label className="block">
              <span className="text-[10px] text-[#94a3b8] uppercase tracking-wide">API Key</span>
              <div className="relative mt-1">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={cfg.api_key ?? ''}
                  onChange={e => setCfg(p => ({ ...p, api_key: e.target.value }))}
                  placeholder="Deixe em branco para manter a atual"
                  className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 pr-10 text-[13px] text-[#0f172a] placeholder-[#94a3b8]/50 focus:outline-none focus:border-[#94a3b8]"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0f172a]"
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </label>

            <label className="block">
              <span className="text-[10px] text-[#94a3b8] uppercase tracking-wide">Nome da instância</span>
              <input
                type="text"
                value={cfg.instance_name ?? ''}
                onChange={e => setCfg(p => ({ ...p, instance_name: e.target.value }))}
                placeholder="minha-empresa"
                className="mt-1 w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-[13px] text-[#0f172a] placeholder-[#94a3b8]/50 focus:outline-none focus:border-[#94a3b8]"
              />
            </label>

            {/* Ativo toggle */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <div className="text-[12px] font-medium text-[#0f172a]">Integração ativa</div>
                <div className="text-[10px] text-[#94a3b8]">Liga a Luna para responder mensagens</div>
              </div>
              <button
                onClick={() => setCfg(p => ({ ...p, ativo: !p.ativo }))}
                className="relative rounded-full transition-colors flex-shrink-0"
                style={{
                  height: '22px', width: '40px',
                  background: cfg.ativo ? '#3730a3' : '#e2e8f0',
                }}
              >
                <span
                  className="absolute top-0.5 rounded-full bg-white shadow transition-all"
                  style={{ width: '18px', height: '18px', transform: cfg.ativo ? 'translateX(20px)' : 'translateX(2px)' }}
                />
              </button>
            </div>

            {/* Testar */}
            <div className="flex items-center gap-3 pt-1 border-t border-[#f8fafc]">
              <button
                onClick={testar}
                disabled={testando || !cfg.api_url}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-[#e2e8f0] rounded-lg text-[11px] text-[#475569] hover:bg-[#f8fafc] disabled:opacity-40 transition-colors"
              >
                {testando ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                Testar conexão
              </button>
              {status && !statusCfg?.label.includes('Não') && (
                <span className="text-[10px] text-[#94a3b8]">
                  Última verificação agora
                </span>
              )}
            </div>
          </section>

          {/* Conexão WhatsApp — QR Code */}
          <section className="bg-white border border-[#e2e8f0] rounded-xl p-5 space-y-4">
            <h2 className="text-[11px] font-semibold text-[#0f172a] uppercase tracking-wide flex items-center gap-2">
              <Smartphone size={13} />
              Conexão WhatsApp
            </h2>

            {qrData?.state === 'open' ? (
              <div className="flex items-center justify-between p-3 bg-[#f0fdf4] border border-[#86EFAC] rounded-lg">
                <div className="flex items-center gap-2 text-[12px] text-[#166534] font-medium">
                  <Wifi size={14} />
                  WhatsApp conectado
                </div>
                <button
                  onClick={desconectar}
                  disabled={desconectando}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 border border-[#fca5a5] rounded-lg text-[10px] text-[#8B1A1A] hover:bg-[#fee2e2] disabled:opacity-50 transition-colors"
                >
                  {desconectando ? <Loader2 size={11} className="animate-spin" /> : <LogOut size={11} />}
                  Desconectar
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[11px] text-[#475569]">
                  Clique em "Gerar QR Code", depois escaneie com o WhatsApp do número que vai ser usado pela Luna.
                </p>

                {qrError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700 break-all">
                    <strong>Erro:</strong> {qrError}
                  </div>
                )}

                {qrData?.qr ? (
                  <div className="flex flex-col items-center gap-3 p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl">
                    <img
                      src={qrData.qr}
                      alt="QR Code WhatsApp"
                      className="w-52 h-52 rounded-lg"
                    />
                    <p className="text-[10px] text-[#94a3b8] text-center">
                      Escaneie com o WhatsApp · atualiza automaticamente a cada 20s
                    </p>
                    <button
                      onClick={iniciarQr}
                      disabled={qrLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-[#e2e8f0] rounded-lg text-[10px] text-[#475569] hover:bg-[#f8fafc] disabled:opacity-40"
                    >
                      {qrLoading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                      Atualizar QR
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={iniciarQr}
                    disabled={qrLoading || !cfg.api_url}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#0f172a] text-white text-[12px] rounded-lg hover:bg-[#374151] disabled:opacity-40 transition-colors"
                  >
                    {qrLoading ? <Loader2 size={13} className="animate-spin" /> : <QrCode size={13} />}
                    Gerar QR Code
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Webhook */}
          <section className="bg-white border border-[#e2e8f0] rounded-xl p-5 space-y-3">
            <h2 className="text-[11px] font-semibold text-[#0f172a] uppercase tracking-wide flex items-center gap-2">
              <Webhook size={13} />
              Webhook
            </h2>
            <p className="text-[11px] text-[#475569]">
              Configure este endereço na Evolution API para receber mensagens:
            </p>
            <div className="flex items-center gap-2 px-3 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg">
              <code className="flex-1 text-[11px] text-[#0f172a] break-all">{webhookUrl}</code>
              <button
                onClick={copiar}
                className="flex items-center gap-1 text-[10px] text-[#94a3b8] hover:text-[#0f172a] whitespace-nowrap transition-colors"
              >
                {copied ? <CheckCircle2 size={12} className="text-green-600" /> : <Copy size={12} />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>

            <div className="flex items-center gap-3 pt-1 border-t border-[#f8fafc]">
              <button
                onClick={async () => {
                  setRegistrandoWh(true)
                  setWhMsg(null)
                  try {
                    const res = await fetch('/api/whatsapp/config', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ webhookUrl }),
                    })
                    const data = await res.json()
                    if (data.ok) {
                      setWhMsg({ ok: true, texto: 'Webhook registrado na Evolution API!' })
                    } else {
                      setWhMsg({ ok: false, texto: data.error ?? 'Erro ao registrar.' })
                    }
                  } catch (e) {
                    setWhMsg({ ok: false, texto: String(e) })
                  } finally {
                    setRegistrandoWh(false)
                  }
                }}
                disabled={registrandoWh || !cfg.api_url}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0f172a] text-white text-[11px] rounded-lg hover:bg-[#374151] disabled:opacity-40 transition-colors"
              >
                {registrandoWh ? <Loader2 size={12} className="animate-spin" /> : <Webhook size={12} />}
                Registrar webhook agora
              </button>
              {whMsg && (
                <span className={`text-[11px] font-medium ${whMsg.ok ? 'text-green-700' : 'text-red-700'}`}>
                  {whMsg.texto}
                </span>
              )}
            </div>

            <label className="block">
              <span className="text-[10px] text-[#94a3b8] uppercase tracking-wide">Token de validação (opcional)</span>
              <input
                type="text"
                value={cfg.webhook_token ?? ''}
                onChange={e => setCfg(p => ({ ...p, webhook_token: e.target.value }))}
                placeholder="Token secreto para validar requisições"
                className="mt-1 w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-[13px] text-[#0f172a] placeholder-[#94a3b8]/50 focus:outline-none focus:border-[#94a3b8]"
              />
            </label>
          </section>

          {/* Diagnóstico de envio */}
          <section className="bg-white border border-[#e2e8f0] rounded-xl p-5 space-y-3">
            <h2 className="text-[11px] font-semibold text-[#0f172a] uppercase tracking-wide flex items-center gap-2">
              <Bug size={13} />
              Diagnóstico de Envio
            </h2>
            <p className="text-[10px] text-[#94a3b8]">
              Testa a conexão e tenta enviar uma mensagem de teste — mostra o erro exato do Evolution API.
              Informe o número com DDI para testar o envio (ex: 5586994361010).
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={diagPhone}
                onChange={e => setDiagPhone(e.target.value)}
                placeholder="5586994361010 (com DDI, sem +)"
                className="flex-1 border border-[#e2e8f0] rounded-lg px-3 py-2 text-[12px] text-[#0f172a] placeholder-[#94a3b8]/50 focus:outline-none focus:border-[#94a3b8]"
              />
              <button
                onClick={rodarDiagnostico}
                disabled={diagLoading}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#0f172a] text-white text-[11px] rounded-lg hover:bg-[#374151] disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {diagLoading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Testar agora
              </button>
            </div>

            {diagResult && (
              <div className="space-y-2">
                {/* Config */}
                <DiagRow
                  label="Config"
                  ok={!!(diagResult.config as any)?.has_key && !!(diagResult.config as any)?.api_url}
                  body={JSON.stringify(diagResult.config, null, 2)}
                />
                {/* Estado da instância */}
                {(() => {
                  const stateBody = (diagResult.state as any)?.body ?? ''
                  const isOpen = typeof stateBody === 'string' && stateBody.includes('"open"')
                  const isConnecting = typeof stateBody === 'string' && stateBody.includes('"connecting"')
                  return (
                    <DiagRow
                      label={`Instância WhatsApp${isConnecting ? ' — CONNECTING (não conectado!)' : ''}`}
                      ok={isOpen}
                      statusCode={(diagResult.state as any)?.status}
                      body={stateBody || JSON.stringify(diagResult.state)}
                    />
                  )
                })()}
                {/* Envio v2.1+ */}
                {!(diagResult.send_v2 as any)?.skipped && (
                  <DiagRow
                    label="Envio formato v2.1+ (text)"
                    ok={(diagResult.send_v2 as any)?.ok === true}
                    statusCode={(diagResult.send_v2 as any)?.status}
                    body={(diagResult.send_v2 as any)?.body ?? JSON.stringify(diagResult.send_v2)}
                  />
                )}
                {/* Envio legado */}
                {!(diagResult.send_legacy as any)?.skipped && (
                  <DiagRow
                    label="Envio formato legado (textMessage.text)"
                    ok={(diagResult.send_legacy as any)?.ok === true}
                    statusCode={(diagResult.send_legacy as any)?.status}
                    body={(diagResult.send_legacy as any)?.body ?? JSON.stringify(diagResult.send_legacy)}
                  />
                )}
                {/* Envio JID */}
                {!(diagResult.send_jid as any)?.skipped && (
                  <DiagRow
                    label={`Envio formato JID (@s.whatsapp.net)`}
                    ok={(diagResult.send_jid as any)?.ok === true}
                    statusCode={(diagResult.send_jid as any)?.status}
                    body={(diagResult.send_jid as any)?.body ?? JSON.stringify(diagResult.send_jid)}
                  />
                )}
                {/* Lista de instâncias */}
                <DiagRow
                  label="Instâncias na VPS"
                  ok={(diagResult.instances as any)?.ok === true}
                  statusCode={(diagResult.instances as any)?.status}
                  body={(diagResult.instances as any)?.body ?? JSON.stringify(diagResult.instances)}
                />
              </div>
            )}
          </section>

          {/* Guia rápido */}
          <section className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-5">
            <h2 className="text-[11px] font-semibold text-[#0f172a] uppercase tracking-wide mb-3">
              Como conectar
            </h2>
            <ol className="space-y-2">
              {[
                'Contrate uma VPS (Hostinger ou DigitalOcean) — Ubuntu 22.04, 2GB RAM',
                'Instale a Evolution API com Docker na VPS',
                'Crie a instância com o nome escolhido acima',
                'Escaneie o QR Code que a Evolution API gera com o WhatsApp da empresa',
                'Preencha os campos acima e clique Salvar',
                'Configure o webhook na Evolution API apontando para a URL acima',
                'Ative a integração e clique Testar conexão',
              ].map((passo, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[11px] text-[#475569]">
                  <span className="w-4 h-4 rounded-full bg-[#4f46e5] text-white text-[8px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {passo}
                </li>
              ))}
            </ol>
          </section>

        </div>
      </div>
    </div>
  )
}

function DiagRow({ label, ok, body, statusCode }: { label: string; ok: boolean; body: string; statusCode?: number }) {
  const [expanded, setExpanded] = useState(!ok)
  return (
    <div className={`rounded-lg border text-[11px] overflow-hidden ${ok ? 'border-[#86EFAC] bg-[#f0fdf4]' : 'border-[#FCA5A5] bg-[#FEF2F2]'}`}>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
      >
        <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[9px] font-bold ${ok ? 'bg-green-600' : 'bg-red-500'}`}>
          {ok ? '✓' : '✗'}
        </span>
        <span className={`flex-1 font-semibold ${ok ? 'text-[#166534]' : 'text-[#8B1A1A]'}`}>{label}</span>
        {statusCode !== undefined && (
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${ok ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
            HTTP {statusCode}
          </span>
        )}
        <span className="text-[9px] text-[#94a3b8] ml-1">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <pre className="px-3 pb-3 text-[10px] text-[#475569] whitespace-pre-wrap break-all border-t border-current/10 pt-2 overflow-x-auto">
          {body}
        </pre>
      )}
    </div>
  )
}
