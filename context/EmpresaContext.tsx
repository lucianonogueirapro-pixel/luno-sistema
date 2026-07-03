'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { EMPRESA_ID } from '@/lib/empresa'

interface EmpresaCtx {
  empresaId: string
  plano: string
  loading: boolean
}

const Ctx = createContext<EmpresaCtx>({
  empresaId: EMPRESA_ID,
  plano: 'basic',
  loading: true,
})

export function EmpresaProvider({ children }: { children: React.ReactNode }) {
  const [empresaId, setEmpresaId] = useState(EMPRESA_ID)
  const [plano, setPlano]         = useState('basic')
  const [loading, setLoading]     = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    setLoading(true)
    fetch('/api/me/empresa')
      .then(r => r.json())
      .then(d => {
        if (d.empresa_id) setEmpresaId(d.empresa_id)
        if (d.plano)      setPlano(d.plano)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [pathname])

  return (
    <Ctx.Provider value={{ empresaId, plano, loading }}>
      {children}
    </Ctx.Provider>
  )
}

export function useEmpresaId() { return useContext(Ctx).empresaId }
export function usePlano()     { return useContext(Ctx).plano }
export function useEmpresaLoading() { return useContext(Ctx).loading }
