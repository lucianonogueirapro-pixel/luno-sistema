'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'

export function DeleteConversaButton({ conversaId }: { conversaId: string }) {
  const router = useRouter()
  const [confirmando, setConfirmando] = useState(false)
  const [deletando, setDeletando] = useState(false)

  async function excluir() {
    setDeletando(true)
    try {
      await fetch(`/api/whatsapp/conversas/${conversaId}`, { method: 'DELETE' })
      router.push('/atendimento')
      router.refresh()
    } finally {
      setDeletando(false)
    }
  }

  if (confirmando) {
    return (
      <div className="flex gap-1.5">
        <button
          onClick={excluir}
          disabled={deletando}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-[11px] font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {deletando ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
          Confirmar
        </button>
        <button
          onClick={() => setConfirmando(false)}
          className="px-3 py-1.5 text-[11px] text-[#475569] border border-[#e2e8f0] rounded-lg hover:bg-[#f8fafc] transition-colors"
        >
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirmando(true)}
      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
    >
      <Trash2 size={11} />
      Excluir conversa
    </button>
  )
}
