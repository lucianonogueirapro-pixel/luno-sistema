'use server'

import { createClient as createAdmin } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const DEMO_EMAIL = 'demo@luno.interno'
const DEMO_PWD   = process.env.DEMO_USER_PASSWORD ?? 'luno-demo-clientes-2026'

export async function entrarComoCliente(_prev: { erro?: string }, formData: FormData) {
  const senha = formData.get('senha')?.toString().trim()

  if (senha !== '12345') {
    return { erro: 'Senha incorreta.' }
  }

  // Garante que o usuário demo existe
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PWD,
    email_confirm: true,
  }).catch(() => { /* ignora se já existir */ })

  // Faz login como usuário demo para gerar sessão Supabase real
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll:  () => cookieStore.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    },
  )

  const { error } = await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PWD })

  if (error) {
    return { erro: 'Não foi possível criar a sessão de demonstração. Tente novamente.' }
  }

  cookieStore.set('clientes_mode', '1', { maxAge: 60 * 60 * 24, path: '/', httpOnly: false })

  redirect('/dashboard')
}
