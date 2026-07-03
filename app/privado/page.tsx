'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Landmark, HardHat, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const SENHA_CORRETA = '280895'

export default function PrivadoPage() {
  const router = useRouter()
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(false)
  const [autenticado, setAutenticado] = useState(false)

  function verificar(e: React.FormEvent) {
    e.preventDefault()
    if (senha === SENHA_CORRETA) {
      setErro(false)
      setAutenticado(true)
    } else {
      setErro(true)
      setSenha('')
    }
  }

  if (!autenticado) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-[#f3f0ff] flex items-center justify-center">
              <Lock size={24} className="text-[#7c3aed]" />
            </div>
          </div>
          <h1 className="text-[16px] font-bold text-[#0f172a] text-center mb-1">Área Privada</h1>
          <p className="text-[12px] text-[#64748b] text-center mb-6">Digite a senha para continuar</p>
          <form onSubmit={verificar} className="space-y-3">
            <input
              type="password"
              value={senha}
              onChange={e => { setSenha(e.target.value); setErro(false) }}
              placeholder="Senha"
              autoFocus
              className={`w-full border rounded-xl px-4 py-3 text-[13px] text-[#0f172a] bg-white focus:outline-none transition-colors ${
                erro
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-[#e2e8f0] focus:border-[#7c3aed]'
              }`}
            />
            {erro && (
              <p className="text-[11px] text-red-500">Senha incorreta. Tente novamente.</p>
            )}
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#7c3aed] text-white text-[13px] font-semibold hover:bg-[#6d28d9] transition-colors"
            >
              Entrar
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto pt-12 px-4">
      <div className="flex items-center gap-2 mb-8">
        <Lock size={16} className="text-[#7c3aed]" />
        <h1 className="text-[15px] font-bold text-[#0f172a]">Área Privada</h1>
      </div>
      <div className="space-y-3">
        <Link
          href="/emprestimo"
          className="flex items-center gap-3 w-full px-5 py-4 rounded-xl border border-[#e2e8f0] bg-white hover:border-[#7c3aed] hover:bg-[#faf5ff] transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-[#fef3c7] flex items-center justify-center flex-shrink-0">
            <Landmark size={18} className="text-[#b45309]" />
          </div>
          <div>
            <div className="text-[13px] font-semibold text-[#0f172a] group-hover:text-[#7c3aed] transition-colors">Empréstimos</div>
            <div className="text-[11px] text-[#94a3b8]">Controle de parcelas e saldo devedor</div>
          </div>
        </Link>
        <Link
          href="/obra"
          className="flex items-center gap-3 w-full px-5 py-4 rounded-xl border border-[#e2e8f0] bg-white hover:border-[#7c3aed] hover:bg-[#faf5ff] transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-[#f0fdf4] flex items-center justify-center flex-shrink-0">
            <HardHat size={18} className="text-[#15803d]" />
          </div>
          <div>
            <div className="text-[13px] font-semibold text-[#0f172a] group-hover:text-[#7c3aed] transition-colors">Obra & Investimentos</div>
            <div className="text-[11px] text-[#94a3b8]">Acompanhamento de obras e aportes</div>
          </div>
        </Link>
      </div>
    </div>
  )
}
