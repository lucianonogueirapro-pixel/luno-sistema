'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, Zap, Check, AlertCircle } from 'lucide-react'

interface Mensagem {
  id: string
  direcao: 'entrada' | 'saida'
  tipo: string
  conteudo: string | null
  enviado: boolean | null
  created_at: string
}

interface Props {
  conversaId: string
  mensagensIniciais: Mensagem[]
  nomeContato: string
}

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Fortaleza',
  })
}

export function ChatWindow({ conversaId, mensagensIniciais, nomeContato }: Props) {
  const [mensagens, setMensagens] = useState<Mensagem[]>(mensagensIniciais)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  // Polling leve: atualiza mensagens a cada 8 segundos
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/whatsapp/mensagens?conversaId=${conversaId}`)
        if (!res.ok) return
        const data = await res.json()
        setMensagens(data)
      } catch {}
    }, 8000)
    return () => clearInterval(interval)
  }, [conversaId])

  const enviar = useCallback(async () => {
    const msg = texto.trim()
    if (!msg || enviando) return
    setTexto('')
    setErro(null)
    setEnviando(true)

    // Otimista: mostra mensagem antes da confirmação
    const tempId = `temp-${Date.now()}`
    const tempMsg: Mensagem = {
      id: tempId,
      direcao: 'saida',
      tipo: 'texto',
      conteudo: msg,
      enviado: null,
      created_at: new Date().toISOString(),
    }
    setMensagens(prev => [...prev, tempMsg])

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversaId, texto: msg }),
      })
      const data = await res.json()
      if (data.msg) {
        setMensagens(prev => prev.map(m => m.id === tempId ? data.msg : m))
      }
      if (data.error) setErro(data.error)
    } catch {
      setMensagens(prev => prev.map(m =>
        m.id === tempId ? { ...m, enviado: false } : m
      ))
      setErro('Falha ao enviar. Verifique a conexão.')
    } finally {
      setEnviando(false)
      textareaRef.current?.focus()
    }
  }, [texto, conversaId, enviando])

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviar()
    }
  }

  // Agrupa mensagens por dia
  const grupos: { data: string; msgs: Mensagem[] }[] = []
  for (const m of mensagens) {
    const dia = new Date(m.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Fortaleza' })
    const ultimo = grupos[grupos.length - 1]
    if (ultimo?.data === dia) {
      ultimo.msgs.push(m)
    } else {
      grupos.push({ data: dia, msgs: [m] })
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-[#f8fafc]/30">
        {grupos.map(g => (
          <div key={g.data}>
            <div className="flex justify-center my-3">
              <span className="text-[10px] text-[#94a3b8] bg-white px-3 py-1 rounded-full border border-[#e2e8f0]">
                {g.data}
              </span>
            </div>
            {g.msgs.map(m => (
              <div
                key={m.id}
                className={`flex ${m.direcao === 'saida' ? 'justify-end' : 'justify-start'} mb-1.5`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
                    m.direcao === 'saida'
                      ? 'bg-[#4f46e5] text-white rounded-tr-sm'
                      : 'bg-white border border-[#e2e8f0] text-[#0f172a] rounded-tl-sm shadow-sm'
                  }`}
                >
                  {m.conteudo ?? <em className="opacity-50 text-[11px]">[mídia]</em>}
                  <div className={`flex items-center gap-1 mt-1 ${m.direcao === 'saida' ? 'justify-end' : 'justify-start'}`}>
                    <span className={`text-[9px] ${m.direcao === 'saida' ? 'text-white/50' : 'text-[#94a3b8]'}`}>
                      {fmtHora(m.created_at)}
                    </span>
                    {m.direcao === 'saida' && (
                      m.enviado === null
                        ? <Loader2 size={9} className="text-white/50 animate-spin" />
                        : m.enviado
                        ? <Check size={9} className="text-white/50" />
                        : <AlertCircle size={9} className="text-red-300" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Erro */}
      {erro && (
        <div className="mx-4 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-600 flex items-center gap-2">
          <AlertCircle size={12} />
          {erro}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-[#e2e8f0] bg-white px-4 py-3">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={handleKey}
            placeholder={`Mensagem para ${nomeContato}...`}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-[#e2e8f0] px-4 py-2.5 text-[13px] text-[#0f172a] placeholder-[#94a3b8]/60 focus:outline-none focus:border-[#94a3b8] transition-colors bg-[#f8fafc] max-h-32"
            style={{ overflowY: 'auto' }}
          />
          <button
            onClick={enviar}
            disabled={enviando || !texto.trim()}
            className="w-10 h-10 rounded-xl bg-[#4f46e5] text-white flex items-center justify-center hover:bg-[#374151] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            {enviando ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </div>
        <p className="text-[10px] text-[#94a3b8]/50 mt-1.5 text-center">
          Enter para enviar · Shift+Enter para nova linha
        </p>
      </div>
    </div>
  )
}
