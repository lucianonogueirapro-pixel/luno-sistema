'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mic } from 'lucide-react'

type State = 'idle' | 'listening' | 'processing' | 'responding'

declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

export function VoiceButton() {
  const router = useRouter()
  const [state, setState] = useState<State>('idle')
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState('')
  const [supported, setSupported] = useState(false)
  const transcriptRef = useRef('')
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    setSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition))
  }, [])

  if (!supported) return null

  function startListening() {
    clearTimeout(dismissTimer.current)
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const recog = new SR()
    recog.lang = 'pt-BR'
    recog.continuous = false
    recog.interimResults = true

    recog.onresult = (e: any) => {
      const text = Array.from(e.results as any[]).map((r: any) => r[0].transcript).join('')
      setTranscript(text)
      transcriptRef.current = text
    }

    recog.onend = () => {
      if (transcriptRef.current) sendToApi(transcriptRef.current)
      else setState('idle')
    }

    recog.onerror = () => setState('idle')
    recog.start()
    setState('listening')
    setTranscript('')
    setResponse('')
    transcriptRef.current = ''
  }

  async function sendToApi(text: string) {
    setState('processing')
    try {
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text }),
      })
      const data = await res.json()
      setResponse(data.response ?? '')
      setState('responding')
      if (data.action === 'navigate' && data.path) {
        dismissTimer.current = setTimeout(() => {
          router.push(data.path)
          setState('idle')
        }, 1200)
      } else {
        dismissTimer.current = setTimeout(() => setState('idle'), 4000)
      }
    } catch {
      setState('idle')
    }
  }

  function dismiss() {
    clearTimeout(dismissTimer.current)
    setState('idle')
    setTranscript('')
    setResponse('')
    transcriptRef.current = ''
  }

  const isActive = state !== 'idle'

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 pointer-events-none">
      {/* Bolha de status */}
      {isActive && (
        <div
          className="bg-[#0f172a]/95 border border-[#1e293b] rounded-2xl px-4 py-2.5 max-w-[260px] shadow-2xl pointer-events-auto"
          style={{ animation: 'fade-in-up .2s ease' }}
        >
          {state === 'listening' && (
            <div className="flex items-center gap-2">
              <div className="flex gap-[3px] items-end h-4 flex-shrink-0">
                {[0.12, 0.04, 0.20, 0.08, 0.16].map((delay, i) => (
                  <div
                    key={i}
                    className="w-[3px] rounded-full bg-[#22d3ee]"
                    style={{
                      height: '100%',
                      transformOrigin: 'bottom',
                      animation: `bar-pulse .7s ease-in-out ${delay}s infinite`,
                    }}
                  />
                ))}
              </div>
              <span className="text-[11px] text-[#94a3b8] truncate">
                {transcript || 'Ouvindo…'}
              </span>
            </div>
          )}
          {state === 'processing' && (
            <span className="text-[11px] text-[#64748b]">Processando…</span>
          )}
          {state === 'responding' && (
            <span className="text-[11px] text-[#e2e8f0] leading-relaxed">{response}</span>
          )}
        </div>
      )}

      {/* Botão principal */}
      <button
        onClick={isActive ? dismiss : startListening}
        className="w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all pointer-events-auto"
        style={{
          backgroundColor: state === 'listening' ? '#ef4444' : 'var(--sc, #4f46e5)',
          boxShadow: state === 'listening'
            ? '0 0 0 10px rgba(239,68,68,.12), 0 4px 20px rgba(239,68,68,.35)'
            : '0 4px 20px rgba(0,0,0,.25)',
          transform: state === 'listening' ? 'scale(1.08)' : 'scale(1)',
        }}
        title={isActive ? 'Cancelar' : 'Comando de voz (pt-BR)'}
      >
        {state === 'listening' ? (
          <div className="w-3 h-3 rounded-sm bg-white" />
        ) : state === 'processing' ? (
          <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
        ) : (
          <Mic size={18} color="white" />
        )}
      </button>
    </div>
  )
}
