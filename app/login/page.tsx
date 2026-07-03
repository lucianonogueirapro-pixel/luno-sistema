'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error || !data?.user) {
        setError('E-mail ou senha incorretos')
        setLoading(false)
        return
      }
      const role = data.user?.user_metadata?.role ?? data.user?.app_metadata?.role
      router.push(role === 'super_admin' ? '/admin' : '/dashboard')
      router.refresh()
    } catch {
      setError('Erro de conexão. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white tracking-tight">
            Luno<span className="text-[#818cf8]">.</span>
          </h1>
          <p className="text-[#475569] text-sm mt-1 tracking-widest uppercase font-mono">Sistema de Gestão</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-[#e2e8f0] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#4f46e5]"
                autoFocus
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-[#e2e8f0] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#4f46e5]"
                required
              />
            </div>
            {error && <p className="text-red-600 text-xs">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#4f46e5] text-white py-2 rounded-md text-sm font-semibold hover:bg-[#4338ca] transition-colors disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Acessar'}
            </button>
          </form>
          <p className="text-center text-[10px] text-[#94a3b8] pt-1">
            Acesso restrito. Sistema de uso exclusivo.
          </p>
        </div>
      </div>
    </div>
  )
}
