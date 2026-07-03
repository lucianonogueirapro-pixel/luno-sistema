'use client'

import { useActionState } from 'react'
import { entrarComoCliente } from './actions'
import Image from 'next/image'

const initialState = { erro: undefined as string | undefined }

export default function ClientesPage() {
  const [state, action, pending] = useActionState(entrarComoCliente, initialState)

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src="/logo.svg" alt="Logo" className="h-10 w-auto" />
        </div>

        <div className="bg-[#1e293b] border border-[#334155] rounded-2xl p-8 shadow-2xl">
          <h1 className="text-[#e2e8f0] text-lg font-semibold mb-1">Acesso ao sistema</h1>
          <p className="text-[#64748b] text-sm mb-6">Digite a senha de acesso para continuar.</p>

          <form action={action} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-[#94a3b8] uppercase tracking-wider mb-2">
                Senha
              </label>
              <input
                type="password"
                name="senha"
                autoFocus
                autoComplete="off"
                placeholder="••••••"
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-4 py-2.5 text-[#e2e8f0] text-sm placeholder-[#334155] focus:outline-none focus:border-[#4f46e5] transition-colors"
              />
            </div>

            {state?.erro && (
              <p className="text-red-400 text-xs">{state.erro}</p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full bg-[#4f46e5] hover:bg-[#4338ca] disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2.5 transition-colors"
            >
              {pending ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-[#1e293b] text-[10px] mt-6 select-none">
          Acesso restrito · Luno Sistema
        </p>
      </div>
    </div>
  )
}
