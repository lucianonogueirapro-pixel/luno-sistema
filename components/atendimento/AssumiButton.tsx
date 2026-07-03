'use client'
import { useState } from 'react'
import { UserCheck, Bot } from 'lucide-react'

export function AssumiButton({ conversaId, modoHumano }: { conversaId: string; modoHumano: boolean }) {
  const [ativo, setAtivo] = useState(modoHumano)
  const [salvando, setSalvando] = useState(false)

  async function toggle() {
    setSalvando(true)
    const novoValor = !ativo
    await fetch(`/api/whatsapp/conversas/${conversaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modo_humano: novoValor }),
    })
    setAtivo(novoValor)
    setSalvando(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={salvando}
      className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-50 ${
        ativo
          ? 'bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0] hover:bg-[#dcfce7]'
          : 'bg-[#f8fafc] text-[#475569] border border-[#e2e8f0] hover:border-[#94a3b8]'
      }`}
    >
      {ativo ? <UserCheck size={12} /> : <Bot size={12} />}
      {ativo ? 'Modo humano ativo' : 'Assumir conversa'}
    </button>
  )
}
