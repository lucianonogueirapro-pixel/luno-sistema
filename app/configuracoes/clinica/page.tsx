'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { BackButton } from '@/components/ui/BackButton'
import Link from 'next/link'
import {
  Save, AlertCircle, CheckCircle2, Loader2,
  Building2, Share2, Code2, UserCheck, Gift, Upload, X,
  Mic, MicOff, Plus, Trash2, Image, ChevronRight,
} from 'lucide-react'

interface Socio { nome: string; cargo: string }
interface RedeExtra { nome: string; url: string }
interface BrandAsset { id: string; tipo: string; nome: string; url: string }

interface ClinicaConfig {
  // Identidade
  nome?: string
  cnpj?: string
  razao_social?: string
  endereco?: string
  cidade?: string
  horario_texto?: string
  whatsapp?: string
  socios?: Socio[]
  // Presença digital
  instagram?: string
  site?: string
  tiktok?: string
  youtube?: string
  linkedin?: string
  redes_extras?: RedeExtra[]
  google_place_id?: string
  // Meta Ads
  pixel_meta?: string
  meta_ads_account?: string
  // Contexto Agentes
  historico_empresa?: string
  contexto_atual?: string
  visao_futuro?: string
  obs_agentes?: string
  // Identidade Visual
  logo_url?: string
  brandbook_url?: string
  brand_assets?: BrandAsset[]
  // Voucher
  voucher_ativo?: boolean
  voucher_bg_cor?: string
  voucher_logo_url?: string
  voucher_logo_tamanho?: 'pequeno' | 'medio' | 'grande'
  voucher_titulo?: string
  voucher_subtitulo?: string
}

function uid() { return crypto.randomUUID() }

export default function ClinicaConfigPage() {
  const [cfg, setCfg] = useState<ClinicaConfig>({
    nome: '',
    instagram: '',
    site: '',
    whatsapp: '',
    endereco: '',
    cidade: '',
    horario_texto: '',
    socios: [],
    redes_extras: [],
    brand_assets: [],
  })
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [uploadandoLogo, setUploadandoLogo] = useState(false)
  const [uploadandoBrand, setUploadandoBrand] = useState<string | null>(null)

  // Audio states — one per context block
  const [gravandoHistorico, setGravandoHistorico] = useState(false)
  const [gravandoAtual, setGravandoAtual] = useState(false)
  const [gravandoVisao, setGravandoVisao] = useState(false)
  const recognitionRefs = useRef<{ historico: any; atual: any; visao: any }>({ historico: null, atual: null, visao: null })

  const fileRef = useRef<HTMLInputElement>(null)
  const brandFileRef = useRef<HTMLInputElement>(null)
  const brandUploadTarget = useRef<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetch('/api/clinica/config')
      .then(r => r.json())
      .then(d => {
        if (d) setCfg(prev => ({
          ...prev,
          ...d,
          socios: d.socios ?? [],
          redes_extras: d.redes_extras ?? [],
          brand_assets: d.brand_assets ?? [],
        }))
      })
      .catch(() => {})
  }, [])

  async function uploadLogo(file: File) {
    setUploadandoLogo(true)
    const ext = file.name.split('.').pop()
    const path = `voucher/logo.${ext}`
    const { error } = await supabase.storage
      .from('fotos-clinicas')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (error) { setMsg({ tipo: 'erro', texto: 'Erro ao fazer upload.' }); setUploadandoLogo(false); return }
    const { data: urlData } = supabase.storage.from('fotos-clinicas').getPublicUrl(path)
    setCfg(p => ({ ...p, voucher_logo_url: urlData.publicUrl }))
    setUploadandoLogo(false)
  }

  async function uploadBrandAsset(file: File, assetId: string) {
    setUploadandoBrand(assetId)
    const ext = file.name.split('.').pop()
    const path = `brand/${assetId}.${ext}`
    const { error } = await supabase.storage
      .from('fotos-clinicas')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (error) { setMsg({ tipo: 'erro', texto: 'Erro ao fazer upload.' }); setUploadandoBrand(null); return }
    const { data: urlData } = supabase.storage.from('fotos-clinicas').getPublicUrl(path)
    setCfg(p => ({
      ...p,
      brand_assets: (p.brand_assets ?? []).map(a =>
        a.id === assetId ? { ...a, url: urlData.publicUrl, nome: file.name } : a
      ),
    }))
    setUploadandoBrand(null)
  }

  function toggleAudio(bloco: 'historico' | 'atual' | 'visao') {
    const gravando = bloco === 'historico' ? gravandoHistorico : bloco === 'atual' ? gravandoAtual : gravandoVisao
    const setGravando = bloco === 'historico' ? setGravandoHistorico : bloco === 'atual' ? setGravandoAtual : setGravandoVisao
    const field = bloco === 'historico' ? 'historico_empresa' : bloco === 'atual' ? 'contexto_atual' : 'visao_futuro'

    if (gravando) {
      recognitionRefs.current[bloco]?.stop()
      setGravando(false)
      return
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setMsg({ tipo: 'erro', texto: 'Transcrição não disponível. Use Chrome ou Safari.' }); return }

    const recognition = new SR()
    recognition.lang = 'pt-BR'
    recognition.continuous = true
    recognition.interimResults = false
    recognition.onresult = (event: any) => {
      let texto = ''
      for (let i = 0; i < event.results.length; i++) {
        texto += event.results[i][0].transcript + ' '
      }
      setCfg(p => ({
        ...p,
        [field]: ((p[field as keyof ClinicaConfig] as string) ?? '').trimEnd() + ' ' + texto.trim(),
      }))
    }
    recognition.onend = () => setGravando(false)
    recognition.onerror = () => setGravando(false)
    recognition.start()
    recognitionRefs.current[bloco] = recognition
    setGravando(true)
  }

  const salvar = useCallback(async () => {
    setSalvando(true)
    setMsg(null)
    try {
      const res = await fetch('/api/clinica/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      })
      const data = await res.json()
      if (data.ok) setMsg({ tipo: 'ok', texto: 'Dados salvos com sucesso.' })
      else setMsg({ tipo: 'erro', texto: 'Erro ao salvar.' })
    } catch {
      setMsg({ tipo: 'erro', texto: 'Falha na requisição.' })
    } finally {
      setSalvando(false)
    }
  }, [cfg])

  // Sócios helpers
  const addSocio = () => setCfg(p => ({ ...p, socios: [...(p.socios ?? []), { nome: '', cargo: '' }] }))
  const removeSocio = (i: number) => setCfg(p => ({ ...p, socios: (p.socios ?? []).filter((_, idx) => idx !== i) }))
  const updateSocio = (i: number, key: 'nome' | 'cargo', val: string) =>
    setCfg(p => ({ ...p, socios: (p.socios ?? []).map((s, idx) => idx === i ? { ...s, [key]: val } : s) }))

  // Redes extras helpers
  const addRede = () => setCfg(p => ({ ...p, redes_extras: [...(p.redes_extras ?? []), { nome: '', url: '' }] }))
  const removeRede = (i: number) => setCfg(p => ({ ...p, redes_extras: (p.redes_extras ?? []).filter((_, idx) => idx !== i) }))
  const updateRede = (i: number, key: 'nome' | 'url', val: string) =>
    setCfg(p => ({ ...p, redes_extras: (p.redes_extras ?? []).map((r, idx) => idx === i ? { ...r, [key]: val } : r) }))

  // Brand assets helpers
  const addBrandAsset = () =>
    setCfg(p => ({ ...p, brand_assets: [...(p.brand_assets ?? []), { id: uid(), tipo: 'Logo', nome: '', url: '' }] }))
  const removeBrandAsset = (id: string) =>
    setCfg(p => ({ ...p, brand_assets: (p.brand_assets ?? []).filter(a => a.id !== id) }))
  const updateBrandAsset = (id: string, key: keyof BrandAsset, val: string) =>
    setCfg(p => ({ ...p, brand_assets: (p.brand_assets ?? []).map(a => a.id === id ? { ...a, [key]: val } : a) }))

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Dados da Empresa"
        subtitle="Informações institucionais usadas pelos agentes e no sistema"
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

          {/* ── Identidade ── */}
          <section className="bg-white border border-[#e2e8f0] rounded-xl p-5 space-y-4">
            <h2 className="text-[11px] font-semibold text-[#0f172a] uppercase tracking-wide flex items-center gap-2">
              <Building2 size={13} />
              Identidade da Empresa
            </h2>
            <Field label="Nome fantasia" value={cfg.nome} onChange={v => setCfg(p => ({ ...p, nome: v }))} placeholder="ex: Meu Negócio" />
            <Field label="Razão Social" value={cfg.razao_social} onChange={v => setCfg(p => ({ ...p, razao_social: v }))} placeholder="ex: Meu Negócio LTDA" />
            <Field label="CNPJ" value={cfg.cnpj} onChange={v => setCfg(p => ({ ...p, cnpj: v }))} placeholder="00.000.000/0001-00" />
            <Field label="Endereço" value={cfg.endereco} onChange={v => setCfg(p => ({ ...p, endereco: v }))} placeholder="ex: Rua das Flores, 123 — Centro" />
            <Field label="Cidade / UF" value={cfg.cidade} onChange={v => setCfg(p => ({ ...p, cidade: v }))} placeholder="ex: Teresina/PI" />
            <Field label="Horário de funcionamento" value={cfg.horario_texto} onChange={v => setCfg(p => ({ ...p, horario_texto: v }))} placeholder="ex: Seg–Sex 9h–18h / Sáb 9h–13h" />
            <Field label="WhatsApp (com DDI)" value={cfg.whatsapp} onChange={v => setCfg(p => ({ ...p, whatsapp: v }))} placeholder="ex: 5586994361010" />

            {/* Sócios */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-[#475569]">Sócios</span>
                <button
                  type="button"
                  onClick={addSocio}
                  className="flex items-center gap-1 text-[10px] text-[#4f46e5] hover:text-[#374151] font-medium"
                >
                  <Plus size={11} /> Adicionar sócio
                </button>
              </div>
              {(cfg.socios ?? []).length === 0 && (
                <p className="text-[11px] text-[#94a3b8] italic">Nenhum sócio cadastrado.</p>
              )}
              <div className="space-y-2">
                {(cfg.socios ?? []).map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={s.nome}
                      onChange={e => updateSocio(i, 'nome', e.target.value)}
                      placeholder="Nome"
                      className={inp}
                    />
                    <input
                      type="text"
                      value={s.cargo}
                      onChange={e => updateSocio(i, 'cargo', e.target.value)}
                      placeholder="Cargo / Papel"
                      className={inp}
                    />
                    <button
                      type="button"
                      onClick={() => removeSocio(i)}
                      className="text-[#94a3b8] hover:text-red-500 flex-shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Presença Digital ── */}
          <section className="bg-white border border-[#e2e8f0] rounded-xl p-5 space-y-4">
            <h2 className="text-[11px] font-semibold text-[#0f172a] uppercase tracking-wide flex items-center gap-2">
              <Share2 size={13} />
              Presença Digital
            </h2>
            <p className="text-[10px] text-[#94a3b8]">Os links completos ficam disponíveis para os agentes de IA como contexto.</p>
            <Field label="Instagram" value={cfg.instagram} onChange={v => setCfg(p => ({ ...p, instagram: v }))} placeholder="https://instagram.com/suaclinica" />
            <Field label="TikTok" value={cfg.tiktok} onChange={v => setCfg(p => ({ ...p, tiktok: v }))} placeholder="https://tiktok.com/@suaclinica" />
            <Field label="YouTube" value={cfg.youtube} onChange={v => setCfg(p => ({ ...p, youtube: v }))} placeholder="https://youtube.com/@suaclinica" />
            <Field label="LinkedIn" value={cfg.linkedin} onChange={v => setCfg(p => ({ ...p, linkedin: v }))} placeholder="https://linkedin.com/company/suaclinica" />
            <Field label="Site" value={cfg.site} onChange={v => setCfg(p => ({ ...p, site: v }))} placeholder="suaclinica.com.br" />
            {/* Google Place ID com link para a página */}
            <div className="flex items-start gap-3">
              <span className="text-[11px] text-[#475569] w-44 shrink-0 pt-1.5">Google Place ID</span>
              <div className="flex-1 space-y-1.5">
                <input
                  type="text"
                  value={cfg.google_place_id ?? ''}
                  onChange={e => setCfg(p => ({ ...p, google_place_id: e.target.value }))}
                  placeholder="ChIJ... (encontrado no Google Meu Negócio)"
                  className="w-full border border-[#e2e8f0] rounded-lg px-3 py-1.5 text-[12px] text-[#0f172a] placeholder-[#94a3b8]/50 focus:outline-none focus:border-[#94a3b8]"
                />
                {cfg.google_place_id && (
                  <Link
                    href="/google"
                    className="inline-flex items-center gap-1 text-[11px] text-[#4f46e5] hover:text-[#374151] font-medium"
                  >
                    Analisar Google Meu Negócio
                    <ChevronRight size={11} />
                  </Link>
                )}
              </div>
            </div>

            {/* Redes extras */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-[#475569]">Outras redes</span>
                <button
                  type="button"
                  onClick={addRede}
                  className="flex items-center gap-1 text-[10px] text-[#4f46e5] hover:text-[#374151] font-medium"
                >
                  <Plus size={11} /> Adicionar rede
                </button>
              </div>
              <div className="space-y-2">
                {(cfg.redes_extras ?? []).map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={r.nome}
                      onChange={e => updateRede(i, 'nome', e.target.value)}
                      placeholder="Nome (ex: Pinterest)"
                      className={`${inp} w-32 flex-shrink-0`}
                    />
                    <input
                      type="text"
                      value={r.url}
                      onChange={e => updateRede(i, 'url', e.target.value)}
                      placeholder="URL"
                      className={inp}
                    />
                    <button
                      type="button"
                      onClick={() => removeRede(i)}
                      className="text-[#94a3b8] hover:text-red-500 flex-shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Meta Ads ── */}
          <section className="bg-white border border-[#e2e8f0] rounded-xl p-5 space-y-4">
            <h2 className="text-[11px] font-semibold text-[#0f172a] uppercase tracking-wide flex items-center gap-2">
              <Code2 size={13} />
              Meta Ads / Pixel
            </h2>
            <p className="text-[10px] text-[#94a3b8]">Disponíveis para os agentes de IA e integração com campanhas.</p>
            <Field label="Pixel Meta (ID)" value={cfg.pixel_meta} onChange={v => setCfg(p => ({ ...p, pixel_meta: v }))} placeholder="ex: 1234567890123456" />
            <Field label="Conta Meta Ads (ID)" value={cfg.meta_ads_account} onChange={v => setCfg(p => ({ ...p, meta_ads_account: v }))} placeholder="ex: act_1234567890" />
          </section>

          {/* ── Contexto Agentes ── */}
          <section className="bg-white border border-[#e2e8f0] rounded-xl p-5 space-y-5">
            <div>
              <h2 className="text-[11px] font-semibold text-[#0f172a] uppercase tracking-wide flex items-center gap-2">
                <UserCheck size={13} />
                Contexto para os Agentes de IA
              </h2>
              <p className="text-[10px] text-[#94a3b8] mt-1">
                Tudo que você registrar aqui é injetado automaticamente no contexto de todos os agentes (Luna, etc.).
                Clique no microfone e fale — a transcrição é automática.
              </p>
            </div>

            {/* Histórico */}
            <ContextoBlock
              titulo="Histórico da Empresa"
              descricao="Como o salão começou, os fundadores, a jornada até hoje, missão e valores."
              placeholder="Ex: A empresa nasceu em [ano] quando [fundadores]..."
              value={cfg.historico_empresa ?? ''}
              onChange={v => setCfg(p => ({ ...p, historico_empresa: v }))}
              gravando={gravandoHistorico}
              onToggleAudio={() => toggleAudio('historico')}
            />

            {/* Contexto atual */}
            <ContextoBlock
              titulo="Contexto Atual"
              descricao="Como está o salão hoje: equipe, posicionamento, diferenciais, público atendido."
              placeholder="Ex: Hoje o Luno é referência em serviços de beleza em Teresina..."
              value={cfg.contexto_atual ?? ''}
              onChange={v => setCfg(p => ({ ...p, contexto_atual: v }))}
              gravando={gravandoAtual}
              onToggleAudio={() => toggleAudio('atual')}
            />

            {/* Visão de futuro */}
            <ContextoBlock
              titulo="Visão e Futuro"
              descricao="Para onde o salão quer ir: objetivos, expansão, metas de curto e longo prazo."
              placeholder="Ex: Nossa meta é nos tornar a principal salão de beleza do Nordeste..."
              value={cfg.visao_futuro ?? ''}
              onChange={v => setCfg(p => ({ ...p, visao_futuro: v }))}
              gravando={gravandoVisao}
              onToggleAudio={() => toggleAudio('visao')}
            />
          </section>

          {/* ── Identidade Visual ── */}
          <section className="bg-white border border-[#e2e8f0] rounded-xl p-5 space-y-4">
            <h2 className="text-[11px] font-semibold text-[#0f172a] uppercase tracking-wide flex items-center gap-2">
              <Image size={13} />
              Identidade Visual
            </h2>
            <p className="text-[10px] text-[#94a3b8]">
              Logomarca, brandbook e aplicações de marca. Os agentes usam para entender a identidade visual da clínica.
            </p>

            {/* Ativos */}
            <div className="space-y-3">
              {(cfg.brand_assets ?? []).map(asset => (
                <div key={asset.id} className="flex items-center gap-2 p-3 bg-[#f8fafc] rounded-lg border border-[#e2e8f0]">
                  <select
                    value={asset.tipo}
                    onChange={e => updateBrandAsset(asset.id, 'tipo', e.target.value)}
                    className="text-[11px] border border-[#e2e8f0] rounded-lg px-2 py-1.5 bg-white text-[#0f172a] focus:outline-none focus:border-[#94a3b8] w-36 flex-shrink-0"
                  >
                    {['Logo', 'Brandbook', 'Aplicação de Marca', 'Paleta de Cores', 'Tipografia', 'Outro'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <div className="flex-1 min-w-0">
                    {asset.url ? (
                      <a href={asset.url} target="_blank" rel="noreferrer"
                        className="text-[11px] text-[#4f46e5] underline truncate block">
                        {asset.nome || asset.url}
                      </a>
                    ) : (
                      <span className="text-[11px] text-[#94a3b8] italic">Nenhum arquivo enviado</span>
                    )}
                  </div>
                  <input
                    ref={brandFileRef}
                    type="file"
                    accept="image/*,.pdf,.ai,.svg,.eps"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (f && brandUploadTarget.current) uploadBrandAsset(f, brandUploadTarget.current)
                      if (e.target) e.target.value = ''
                    }}
                  />
                  <button
                    type="button"
                    disabled={uploadandoBrand === asset.id}
                    onClick={() => {
                      brandUploadTarget.current = asset.id
                      brandFileRef.current?.click()
                    }}
                    className="flex items-center gap-1 text-[10px] text-[#475569] border border-[#e2e8f0] rounded-lg px-2 py-1.5 hover:border-[#94a3b8] disabled:opacity-50 flex-shrink-0"
                  >
                    {uploadandoBrand === asset.id ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                    {uploadandoBrand === asset.id ? 'Enviando' : 'Upload'}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeBrandAsset(asset.id)}
                    className="text-[#94a3b8] hover:text-red-500 flex-shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addBrandAsset}
              className="flex items-center gap-1.5 text-[11px] text-[#4f46e5] hover:text-[#374151] font-medium"
            >
              <Plus size={12} /> Adicionar arquivo de marca
            </button>
          </section>

        </div>
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function ContextoBlock({
  titulo, descricao, placeholder, value, onChange, gravando, onToggleAudio,
}: {
  titulo: string
  descricao: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  gravando: boolean
  onToggleAudio: () => void
}) {
  return (
    <div className="border border-[#e2e8f0] rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[12px] font-semibold text-[#0f172a]">{titulo}</div>
          <div className="text-[10px] text-[#94a3b8] mt-0.5">{descricao}</div>
        </div>
        <button
          type="button"
          onClick={onToggleAudio}
          title={gravando ? 'Parar gravação' : 'Gravar por voz'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors flex-shrink-0 ${
            gravando
              ? 'bg-red-50 border-red-200 text-red-600'
              : 'bg-[#f8fafc] border-[#e2e8f0] text-[#475569] hover:border-[#94a3b8]'
          }`}
        >
          {gravando ? (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <MicOff size={12} />
              Parar
            </>
          ) : (
            <>
              <Mic size={12} />
              Falar
            </>
          )}
        </button>
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2.5 text-[12px] text-[#0f172a] placeholder-[#94a3b8]/50 focus:outline-none focus:border-[#94a3b8] resize-y bg-[#f8fafc]"
      />
      {gravando && (
        <p className="text-[10px] text-red-500 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
          Capturando áudio... fale normalmente.
        </p>
      )}
    </div>
  )
}

function Field({
  label, value, onChange, placeholder,
}: {
  label: string
  value?: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <label className="flex items-start gap-3">
      <span className="text-[11px] text-[#475569] w-44 shrink-0 pt-1.5">{label}</span>
      <input
        type="text"
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 border border-[#e2e8f0] rounded-lg px-3 py-1.5 text-[12px] text-[#0f172a] placeholder-[#94a3b8]/50 focus:outline-none focus:border-[#94a3b8]"
      />
    </label>
  )
}

const inp = 'flex-1 border border-[#e2e8f0] rounded-lg px-3 py-1.5 text-[12px] text-[#0f172a] placeholder-[#94a3b8]/50 focus:outline-none focus:border-[#94a3b8]'
