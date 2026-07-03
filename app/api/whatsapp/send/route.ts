import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getEmpresaId } from '@/lib/empresa.server'
import { sendText } from '@/lib/whatsapp/evolution'

export async function POST(req: NextRequest) {
  const empresaId = await getEmpresaId()
  const supabase = await createClient()
  const { conversaId, texto } = await req.json() as {
    conversaId: string
    texto: string
  }

  if (!conversaId || !texto?.trim()) {
    return Response.json({ error: 'conversaId e texto são obrigatórios' }, { status: 400 })
  }

  // Buscar telefone da conversa (garante que pertence à empresa)
  const { data: conversa } = await supabase
    .from('wa_conversas')
    .select('id, telefone')
    .eq('id', conversaId)
    .eq('empresa_id', empresaId)
    .single()

  if (!conversa) return Response.json({ error: 'Conversa não encontrada' }, { status: 404 })

  // Buscar config da empresa
  const { data: cfg } = await supabase.from('wa_config').select('*').eq('empresa_id', empresaId).limit(1).single()
  if (!cfg?.api_url || !cfg?.api_key || !cfg?.instance_name) {
    return Response.json({ error: 'Evolution API não configurada' }, { status: 400 })
  }

  const { messageId, error: sendErr } = await sendText(
    { apiUrl: cfg.api_url, apiKey: cfg.api_key, instance: cfg.instance_name },
    conversa.telefone,
    texto.trim(),
  )

  const { data: msg } = await supabase.from('wa_mensagens').insert({
    conversa_id: conversaId,
    direcao: 'saida',
    tipo: 'texto',
    conteudo: texto.trim(),
    message_id: messageId || null,
    enviado: !sendErr,
  }).select('id, conteudo, direcao, created_at').single()

  await supabase
    .from('wa_conversas')
    .update({ ultima_mensagem_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', conversaId)

  if (sendErr) {
    return Response.json({ error: sendErr, msg }, { status: 207 })
  }

  return Response.json({ ok: true, msg })
}
