import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('wa_config')
    .select('id, nome, instance_name, ativo, tag_padrao')
    .order('created_at', { ascending: true })

  return Response.json(data ?? [])
}
