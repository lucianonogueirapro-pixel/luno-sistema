import { NextResponse } from 'next/server'
import { getEmpresaId } from '@/lib/empresa.server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET() {
  try {
    const empresa_id = await getEmpresaId()

    const { data } = await adminClient()
      .from('empresas')
      .select('plano')
      .eq('id', empresa_id)
      .maybeSingle()

    return NextResponse.json({
      empresa_id,
      plano: data?.plano ?? 'basic',
    })
  } catch {
    return NextResponse.json({ empresa_id: null, plano: 'basic' })
  }
}
