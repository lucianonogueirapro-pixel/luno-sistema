import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DEFAULTS = {
  pct_pix: 0,
  pct_dinheiro: 0,
  pct_debito: 1.5,
  pct_credito: 2.99,
  regime_fiscal: 'mei',
  aliq_simples: 0,
  reserva_acumulada: 10,
  fc_inicial: 0,
}

export async function GET() {
  const supabase = await createClient()
  const ano = new Date().getFullYear()

  const { data: fat } = await supabase
    .from('lancamentos')
    .select('valor_previsto')
    .eq('tipo', 'entrada')
    .gte('mes', `${ano}-01`)
    .lte('mes', `${ano}-12`)

  const faturamento_ano = (fat ?? []).reduce(
    (s: number, r: { valor_previsto: number | null }) => s + (r.valor_previsto ?? 0),
    0,
  )

  return Response.json({ ...DEFAULTS, faturamento_ano })
}

export async function POST(_req: NextRequest) {
  return Response.json({ ok: true })
}
