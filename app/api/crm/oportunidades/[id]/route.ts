import { NextRequest } from 'next/server'

export async function PATCH(_req: NextRequest) {
  return Response.json({ ok: true })
}

export async function DELETE(_req: NextRequest) {
  return Response.json({ ok: true })
}
