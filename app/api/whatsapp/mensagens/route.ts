import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()

  const conversaId = req.nextUrl.searchParams.get('conversaId')
  if (!conversaId) return Response.json({ error: 'conversaId obrigatório' }, { status: 400 })

  const { data } = await supabase
    .from('wa_mensagens')
    .select('id, direcao, tipo, conteudo, enviado, lido, created_at')
    .eq('conversa_id', conversaId)
    .order('created_at', { ascending: true })
    .limit(200)

  return Response.json(data ?? [])
}
