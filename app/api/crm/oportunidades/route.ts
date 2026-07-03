import { NextRequest } from 'next/server'

export async function GET() {
  return Response.json([])
}

export async function POST(_req: NextRequest) {
  return Response.json({ ok: true, id: null })
}
