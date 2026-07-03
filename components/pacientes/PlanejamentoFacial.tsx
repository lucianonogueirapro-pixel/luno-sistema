'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Camera, Trash2 } from 'lucide-react'

type TipoPlano = 'botox' | 'bioestimulador' | 'preenchedor'

const TIPO_CONFIG: Record<TipoPlano, { label: string; unidade: string; cor: string; step: number; default: number }> = {
  botox:          { label: 'Botox',                unidade: 'UI',  cor: '#fbbf24', step: 1,   default: 4   },
  bioestimulador: { label: 'Bioestimulador e Fios', unidade: 'mg',  cor: '#818cf8', step: 1,   default: 1   },
  preenchedor:    { label: 'Preenchedor',           unidade: 'ml',  cor: '#34d399', step: 0.1, default: 0.5 },
}

interface Ponto { id: string; x: number; y: number; quantidade: number }
interface PlanoData { fotoUrl: string | null; fotoPath: string | null; pontos: Ponto[] }
const VAZIO: PlanoData = { fotoUrl: null, fotoPath: null, pontos: [] }

export default function PlanejamentoFacial({ pacienteId, initialData }: {
  pacienteId: string
  initialData: any | null
}) {
  const supabase = useRef(createClient())
  const [planejamentoId, setPlanejamentoId] = useState<string | null>(initialData?.id ?? null)
  const [tipo, setTipo] = useState<TipoPlano>('botox')
  const [dados, setDados] = useState<Record<TipoPlano, PlanoData>>({
    botox:          { fotoUrl: initialData?.botox_foto_url ?? null,          fotoPath: initialData?.botox_foto_path ?? null,          pontos: initialData?.botox_pontos ?? [] },
    bioestimulador: { fotoUrl: initialData?.bioestimulador_foto_url ?? null,  fotoPath: initialData?.bioestimulador_foto_path ?? null,  pontos: initialData?.bioestimulador_pontos ?? [] },
    preenchedor:    { fotoUrl: initialData?.preenchedor_foto_url ?? null,     fotoPath: initialData?.preenchedor_foto_path ?? null,     pontos: initialData?.preenchedor_pontos ?? [] },
  })
  const [editando, setEditando] = useState<string | null>(null)
  const [dragging, setDragging] = useState<{ id: string; rect: DOMRect } | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const plano = dados[tipo]
  const cfg = TIPO_CONFIG[tipo]

  function updatePlano(update: Partial<PlanoData>) {
    setDados(prev => ({ ...prev, [tipo]: { ...prev[tipo], ...update } }))
  }

  async function uploadFoto(file: File) {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('pacienteId', pacienteId)
    fd.append('tipo', tipo)
    const res = await fetch('/api/planejamento/upload-foto', { method: 'POST', body: fd })
    const json = await res.json()
    setUploading(false)
    if (json.url) updatePlano({ fotoUrl: json.url, fotoPath: json.path })
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (dragging) return
    const el = e.target as HTMLElement
    if (el.closest('[data-ponto]')) return
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    const novo: Ponto = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      x, y, quantidade: cfg.default,
    }
    updatePlano({ pontos: [...plano.pontos, novo] })
    setEditando(novo.id)
  }

  function onPontoMouseDown(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (!containerRef.current) return
    setDragging({ id, rect: containerRef.current.getBoundingClientRect() })
  }

  useEffect(() => {
    if (!dragging) return
    function onMove(e: MouseEvent) {
      if (!dragging) return
      const x = Math.max(0, Math.min(100, ((e.clientX - dragging.rect.left) / dragging.rect.width) * 100))
      const y = Math.max(0, Math.min(100, ((e.clientY - dragging.rect.top) / dragging.rect.height) * 100))
      setDados(prev => ({
        ...prev,
        [tipo]: { ...prev[tipo], pontos: prev[tipo].pontos.map(p => p.id === dragging.id ? { ...p, x, y } : p) }
      }))
    }
    function onUp() { setDragging(null) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [dragging, tipo])

  // Touch drag support
  function onPontoTouchStart(e: React.TouchEvent, id: string) {
    e.stopPropagation()
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setDragging({ id, rect })
  }

  useEffect(() => {
    if (!dragging) return
    function onTouchMove(e: TouchEvent) {
      if (!dragging) return
      const t = e.touches[0]
      const x = Math.max(0, Math.min(100, ((t.clientX - dragging.rect.left) / dragging.rect.width) * 100))
      const y = Math.max(0, Math.min(100, ((t.clientY - dragging.rect.top) / dragging.rect.height) * 100))
      setDados(prev => ({
        ...prev,
        [tipo]: { ...prev[tipo], pontos: prev[tipo].pontos.map(p => p.id === dragging.id ? { ...p, x, y } : p) }
      }))
    }
    function onTouchEnd() { setDragging(null) }
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)
    return () => { window.removeEventListener('touchmove', onTouchMove); window.removeEventListener('touchend', onTouchEnd) }
  }, [dragging, tipo])

  function setQtd(id: string, v: number) {
    updatePlano({ pontos: plano.pontos.map(p => p.id === id ? { ...p, quantidade: Math.max(0, v) } : p) })
  }

  function remover(id: string) {
    updatePlano({ pontos: plano.pontos.filter(p => p.id !== id) })
    if (editando === id) setEditando(null)
  }

  async function salvar() {
    setSaving(true)
    const payload = {
      paciente_id:               pacienteId,
      botox_foto_url:            dados.botox.fotoUrl,
      botox_foto_path:           dados.botox.fotoPath,
      botox_pontos:              dados.botox.pontos,
      bioestimulador_foto_url:   dados.bioestimulador.fotoUrl,
      bioestimulador_foto_path:  dados.bioestimulador.fotoPath,
      bioestimulador_pontos:     dados.bioestimulador.pontos,
      preenchedor_foto_url:      dados.preenchedor.fotoUrl,
      preenchedor_foto_path:     dados.preenchedor.fotoPath,
      preenchedor_pontos:        dados.preenchedor.pontos,
      updated_at:                new Date().toISOString(),
    }
    if (planejamentoId) {
      await supabase.current.from('planejamento_facial').update(payload).eq('id', planejamentoId)
    } else {
      const { data } = await supabase.current.from('planejamento_facial').insert(payload).select('id').single()
      if (data) setPlanejamentoId(data.id)
    }
    setSaving(false)
  }

  const total = plano.pontos.reduce((s, p) => s + p.quantidade, 0)
  const fmtQtd = (v: number) => cfg.step < 1 ? v.toFixed(1) : String(Math.round(v))

  return (
    <div className="space-y-3">
      {/* Abas */}
      <div className="flex gap-1 bg-[#f8fafc] rounded-xl p-1 border border-[#e2e8f0]">
        {(Object.entries(TIPO_CONFIG) as [TipoPlano, typeof cfg][]).map(([key, c]) => (
          <button key={key} onClick={() => { setTipo(key); setEditando(null) }}
            className={`flex-1 text-[11px] font-semibold py-1.5 rounded-lg transition-colors ${
              tipo === key ? 'bg-white text-[#0f172a] shadow-sm' : 'text-[#64748b] hover:text-[#0f172a]'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Área do diagrama */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#f1f5f9]">
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-bold text-[#0f172a]">{cfg.label}</span>
            {plano.pontos.length > 0 && (
              <span className="text-[11px] text-[#64748b]">
                Total: <strong style={{ color: cfg.cor }}>{fmtQtd(total)} {cfg.unidade}</strong>
                <span className="ml-1.5 text-[#94a3b8]">· {plano.pontos.length} ponto{plano.pontos.length !== 1 ? 's' : ''}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { if (e.target.files?.[0]) uploadFoto(e.target.files[0]); e.target.value = '' }} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-1 text-[10px] text-[#64748b] hover:text-[#0f172a] border border-[#e2e8f0] px-2.5 py-1 rounded-lg transition-colors">
              <Camera size={11} />
              {uploading ? 'Enviando...' : plano.fotoUrl ? 'Trocar foto' : 'Foto da paciente'}
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={containerRef}
          className="relative select-none"
          style={{ background: '#0f172a', cursor: 'crosshair', minHeight: 260 }}
          onClick={handleClick}
        >
          {plano.fotoUrl ? (
            <img src={plano.fotoUrl} alt="Rosto" draggable={false}
              className="w-full block object-contain" style={{ maxHeight: 420 }} />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <svg viewBox="0 0 100 130" width="90" className="opacity-20">
                <ellipse cx="50" cy="58" rx="38" ry="46" fill="#94a3b8" />
                <ellipse cx="50" cy="116" rx="28" ry="16" fill="#64748b" />
                <circle cx="50" cy="24" rx="22" ry="18" fill="#94a3b8" />
              </svg>
              <p className="text-[11px] text-[#475569] text-center max-w-48">
                Adicione a foto frontal da paciente<br />ou clique aqui para marcar na silhueta
              </p>
            </div>
          )}

          {/* Pontos */}
          {plano.pontos.map(p => (
            <div key={p.id} data-ponto="true"
              style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%,-50%)', zIndex: 20 }}
              onMouseDown={e => onPontoMouseDown(e, p.id)}
              onTouchStart={e => onPontoTouchStart(e, p.id)}
              className="cursor-grab active:cursor-grabbing"
            >
              {/* Dot */}
              <div
                style={{ background: cfg.cor, boxShadow: `0 0 0 2px white, 0 2px 6px rgba(0,0,0,0.4)` }}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                onClick={e => { e.stopPropagation(); setEditando(editando === p.id ? null : p.id) }}
              >
                <span className="text-[10px] font-black text-[#0f172a] leading-none">{fmtQtd(p.quantidade)}</span>
              </div>

              {/* Popover de edição */}
              {editando === p.id && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 mt-2 bg-white border border-[#e2e8f0] rounded-xl shadow-xl p-2 z-30 flex items-center gap-1.5 whitespace-nowrap"
                  onClick={e => e.stopPropagation()}
                  onMouseDown={e => e.stopPropagation()}
                >
                  <button onClick={() => setQtd(p.id, p.quantidade - cfg.step)}
                    className="w-6 h-6 rounded-full bg-[#f1f5f9] text-[#0f172a] text-sm font-bold flex items-center justify-center hover:bg-[#e2e8f0]">−</button>
                  <input type="number" value={p.quantidade} step={cfg.step} min={0}
                    onChange={e => setQtd(p.id, parseFloat(e.target.value) || 0)}
                    className="w-14 text-center text-[13px] font-bold text-[#0f172a] border border-[#e2e8f0] rounded-lg px-1 py-0.5 focus:outline-none focus:border-[#4f46e5]" />
                  <span className="text-[10px] text-[#64748b] font-semibold">{cfg.unidade}</span>
                  <button onClick={() => setQtd(p.id, p.quantidade + cfg.step)}
                    className="w-6 h-6 rounded-full bg-[#f1f5f9] text-[#0f172a] text-sm font-bold flex items-center justify-center hover:bg-[#e2e8f0]">+</button>
                  <button onClick={() => remover(p.id)}
                    className="w-6 h-6 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 ml-0.5">
                    <Trash2 size={10} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Rodapé */}
        <div className="px-4 py-2 bg-[#f8fafc] border-t border-[#f1f5f9] flex items-center justify-between">
          <span className="text-[10px] text-[#94a3b8]">
            Clique para adicionar · Arraste para mover · Clique no ponto para editar quantidade
          </span>
          {plano.pontos.length > 0 && (
            <button onClick={() => { updatePlano({ pontos: [] }); setEditando(null) }}
              className="text-[10px] text-red-400 hover:text-red-600 font-semibold ml-3">
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Resumo dos três tipos */}
      <div className="grid grid-cols-3 gap-2">
        {(Object.entries(TIPO_CONFIG) as [TipoPlano, typeof cfg][]).map(([key, c]) => {
          const pts = dados[key].pontos
          const tot = pts.reduce((s, p) => s + p.quantidade, 0)
          return (
            <button key={key} onClick={() => setTipo(key)}
              className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                tipo === key ? 'border-[#4f46e5] bg-[#f0f0ff]' : 'border-[#e2e8f0] bg-white hover:bg-[#f8fafc]'
              }`}
            >
              <div className="text-[9px] font-semibold text-[#94a3b8] uppercase tracking-wide">{c.label}</div>
              {pts.length > 0 ? (
                <div className="text-[13px] font-bold mt-0.5" style={{ color: c.cor }}>
                  {c.step < 1 ? tot.toFixed(1) : Math.round(tot)} {c.unidade}
                </div>
              ) : (
                <div className="text-[11px] text-[#94a3b8] mt-0.5">—</div>
              )}
              {pts.length > 0 && (
                <div className="text-[10px] text-[#64748b]">{pts.length} ponto{pts.length !== 1 ? 's' : ''}</div>
              )}
            </button>
          )
        })}
      </div>

      {/* Botão salvar */}
      <div className="flex justify-end">
        <button onClick={salvar} disabled={saving}
          className="bg-[#4f46e5] text-white text-[12px] font-semibold px-5 py-2 rounded-xl disabled:opacity-50 hover:bg-[#4338ca] transition-colors">
          {saving ? 'Salvando...' : 'Salvar Planejamento'}
        </button>
      </div>
    </div>
  )
}
