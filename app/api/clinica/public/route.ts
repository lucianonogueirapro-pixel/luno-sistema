import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data } = await admin
    .from('empresa_config')
    .select('nome, cidade, voucher_logo_url, voucher_titulo, voucher_subtitulo')
    .limit(1)
    .single()

  return Response.json(data ?? {})
}
