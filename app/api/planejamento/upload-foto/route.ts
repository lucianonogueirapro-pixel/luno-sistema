import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const pacienteId = formData.get('pacienteId') as string
  const tipo = formData.get('tipo') as string
  const file = formData.get('file') as File

  if (!pacienteId || !tipo || !file) {
    return NextResponse.json({ error: 'pacienteId, tipo e file são obrigatórios' }, { status: 400 })
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `planejamento/${pacienteId}/${tipo}/${Date.now()}.${ext}`

  const buffer = await file.arrayBuffer()
  const { error } = await admin.storage
    .from('consulta-fotos')
    .upload(path, buffer, { contentType: file.type || 'image/jpeg', upsert: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: { publicUrl } } = admin.storage
    .from('consulta-fotos')
    .getPublicUrl(path)

  return NextResponse.json({ url: publicUrl, path })
}
