'use client'
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import type { AgenteDefinition } from '@/lib/agentes/agents'
import { createClient } from '@/lib/supabase/client'

interface Attachment {
  data: string       // base64 sem prefixo
  mediaType: string
  name: string
  preview: string    // object URL para exibição
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  previews?: string[]  // object URLs de imagens, só para exibição
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

async function fileToAttachment(file: File): Promise<Attachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const data = result.split(',')[1]
      resolve({
        data,
        mediaType: file.type,
        name: file.name,
        preview: URL.createObjectURL(file),
      })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function AgentChat({ agente }: { agente: AgenteDefinition }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessaoId, setSessaoId] = useState<string | undefined>()
  const [pendingFiles, setPendingFiles] = useState<Attachment[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const initDone = useRef(false)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const streamCall = useCallback(async (payload: object) => {
    const res = await fetch('/api/agentes/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Erro na API')

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') break
        try {
          const parsed = JSON.parse(data)
          if (parsed.sessaoId) setSessaoId(prev => prev ?? parsed.sessaoId)
          if (parsed.text) {
            setMessages(prev => {
              const updated = [...prev]
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: updated[updated.length - 1].content + parsed.text,
              }
              return updated
            })
          }
        } catch {}
      }
    }
  }, [])

  useEffect(() => {
    if (initDone.current) return
    initDone.current = true

    async function checkAndInit() {
      setLoading(true)

      const { data: session } = await supabase
        .from('agente_sessoes')
        .select('id')
        .eq('agente_slug', agente.slug)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (session?.id) {
        const { data: prevMsgs } = await supabase
          .from('agente_mensagens')
          .select('role, content')
          .eq('sessao_id', session.id)
          .order('created_at', { ascending: true })
          .limit(30)

        const history = (prevMsgs ?? []) as Message[]
        setSessaoId(session.id)

        setMessages([...history, { role: 'assistant', content: '' }])

        await streamCall({
          slug: agente.slug,
          messages: history,
          sessaoId: session.id,
          autoReturn: true,
        }).catch(() => {
          setMessages(prev => {
            const updated = [...prev]
            updated[updated.length - 1] = {
              role: 'assistant',
              content: `Voltou, Luciano. Por onde quer continuar?`,
            }
            return updated
          })
        })
      } else {
        setMessages([{ role: 'assistant', content: '' }])
        await streamCall({
          slug: agente.slug,
          messages: [],
          autoInit: true,
        }).catch(() => {
          setMessages([{ role: 'assistant', content: `Olá. Sou ${agente.name}. Como posso ajudar?` }])
        })
      }

      setLoading(false)
      textareaRef.current?.focus()
    }

    checkAndInit()
  }, [agente, streamCall, supabase])

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter(f => ACCEPTED_TYPES.includes(f.type))
    if (!files.length) return
    const attachments = await Promise.all(files.map(fileToAttachment))
    setPendingFiles(prev => [...prev, ...attachments])
    e.target.value = ''
  }

  function removeFile(idx: number) {
    setPendingFiles(prev => {
      URL.revokeObjectURL(prev[idx].preview)
      return prev.filter((_, i) => i !== idx)
    })
  }

  async function send() {
    const text = input.trim()
    if ((!text && !pendingFiles.length) || loading) return
    setInput('')

    const previews = pendingFiles.map(f => f.preview)
    const attachments = pendingFiles.map(({ data, mediaType, name }) => ({ data, mediaType, name }))
    setPendingFiles([])

    const userMsg: Message = { role: 'user', content: text, previews }
    const newMessages: Message[] = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)

    const assistantMsg: Message = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantMsg])

    const apiHistory = newMessages.map(m => ({ role: m.role, content: m.content }))

    try {
      await streamCall({
        slug: agente.slug,
        messages: apiHistory,
        attachments: attachments.length ? attachments : undefined,
        sessaoId,
      })
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: 'Erro ao conectar com o agente.' }
        return updated
      })
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const isRavi = agente.slug === 'ravi'

  return (
    <div className="flex flex-col h-full">
      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-3`}>
            {msg.role === 'assistant' && (
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm ${isRavi ? 'bg-[#4f46e5]' : agente.color}`}>
                {agente.emoji}
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-[#4f46e5] text-white rounded-tr-sm'
                  : 'bg-white border border-[#e2e8f0] text-[#0f172a] rounded-tl-sm shadow-sm'
              }`}
            >
              {msg.previews?.length ? (
                <div className="flex flex-wrap gap-2 mb-2">
                  {msg.previews.map((src, pi) => (
                    <img
                      key={pi}
                      src={src}
                      alt="anexo"
                      className="max-h-48 max-w-full rounded-lg object-contain"
                    />
                  ))}
                </div>
              ) : null}
              {msg.content || (loading && i === messages.length - 1 ? (
                <span className="flex gap-1 items-center h-4">
                  <span className="w-1.5 h-1.5 bg-[#94a3b8] rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-[#94a3b8] rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-[#94a3b8] rounded-full animate-bounce [animation-delay:300ms]" />
                </span>
              ) : '')}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full flex-shrink-0 bg-[#94a3b8] flex items-center justify-center text-white text-xs font-bold">
                L
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#e2e8f0] bg-white px-4 py-3">
        {/* Preview dos arquivos pendentes */}
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {pendingFiles.map((f, i) => (
              <div key={i} className="relative group">
                <img
                  src={f.preview}
                  alt={f.name}
                  className="h-16 w-16 rounded-lg object-cover border border-[#e2e8f0]"
                />
                <button
                  onClick={() => removeFile(i)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-end">
          {/* Botão de anexo */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 rounded-xl border border-[#e2e8f0] text-[#94a3b8] flex items-center justify-center hover:bg-[#f8fafc] hover:text-[#64748b] transition-colors flex-shrink-0"
            title="Anexar imagem"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={`Mensagem para ${agente.name}...`}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-[#e2e8f0] px-4 py-2.5 text-sm text-[#0f172a] placeholder-[#94a3b8]/60 focus:outline-none focus:border-[#94a3b8] transition-colors bg-[#f8fafc] max-h-32"
            style={{ overflowY: 'auto' }}
          />
          <button
            onClick={send}
            disabled={loading || (!input.trim() && !pendingFiles.length)}
            className="w-10 h-10 rounded-xl bg-[#4f46e5] text-white flex items-center justify-center hover:bg-[#374151] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-[#94a3b8]/50 mt-1.5 text-center">Enter para enviar · Shift+Enter para nova linha · Clipe para imagens</p>
      </div>
    </div>
  )
}
