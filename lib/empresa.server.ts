import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { EMPRESA_ID } from '@/lib/empresa'

function adminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function getImpersonatedEmpresaId(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    return cookieStore.get('luno_impersonate')?.value ?? null
  } catch {
    return null
  }
}

export async function getEmpresaId(): Promise<string> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return EMPRESA_ID

    const role = user.user_metadata?.role ?? user.app_metadata?.role

    if (role === 'super_admin') {
      const impersonate = await getImpersonatedEmpresaId()
      return impersonate ?? EMPRESA_ID
    }

    const admin = adminClient()
    const { data } = await admin
      .from('empresa_users')
      .select('empresa_id')
      .eq('user_id', user.id)
      .single()

    return data?.empresa_id ?? EMPRESA_ID
  } catch {
    return EMPRESA_ID
  }
}

export async function getEmpresaConfig(): Promise<{
  empresaId: string
  anthropicApiKey: string | null
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let empresaId = EMPRESA_ID
    if (user) {
      const role = user.user_metadata?.role ?? user.app_metadata?.role
      if (role === 'super_admin') {
        empresaId = (await getImpersonatedEmpresaId()) ?? EMPRESA_ID
      } else {
        const admin = adminClient()
        const { data: eu } = await admin
          .from('empresa_users')
          .select('empresa_id')
          .eq('user_id', user.id)
          .single()
        empresaId = eu?.empresa_id ?? EMPRESA_ID
      }
    }

    const admin = adminClient()
    const { data: empresa } = await admin
      .from('empresas')
      .select('anthropic_api_key')
      .eq('id', empresaId)
      .maybeSingle()

    return {
      empresaId,
      anthropicApiKey: empresa?.anthropic_api_key ?? null,
    }
  } catch {
    return { empresaId: EMPRESA_ID, anthropicApiKey: null }
  }
}
