'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, X } from 'lucide-react'

interface State {
  impersonating: boolean
  empresa?: { id: string; nome: string; slug: string }
}

export function ImpersonateBanner() {
  const [state, setState] = useState<State>({ impersonating: false })
  const router = useRouter()

  useEffect(() => {
    fetch('/api/admin/impersonate')
      .then(r => r.json())
      .then(setState)
      .catch(() => {})
  }, [])

  async function sair() {
    await fetch('/api/admin/impersonate', { method: 'DELETE' })
    router.push('/admin')
    router.refresh()
  }

  if (!state.impersonating) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-between px-4 py-2 text-white text-xs font-semibold"
      style={{ backgroundColor: '#7c3aed' }}
    >
      <div className="flex items-center gap-2">
        <Eye size={13} />
        <span>Visualizando como cliente:</span>
        <span className="font-black">{state.empresa?.nome}</span>
        <span className="opacity-60 font-normal font-mono">({state.empresa?.slug})</span>
      </div>
      <button
        onClick={sair}
        className="flex items-center gap-1.5 hover:bg-white/20 px-2 py-0.5 rounded transition-colors"
      >
        <X size={11} />
        Sair do cliente
      </button>
    </div>
  )
}
