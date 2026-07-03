export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import CustosClient from './CustosClient'

export default async function CustosPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('custos_config')
    .select('*')
    .order('posicao')

  return (
    <div>
      <PageHeader
        title="Gestão de Custos"
        subtitle="Custos fixos, variáveis e de emergência da clínica"
      />
      <CustosClient initialCustos={data ?? []} />
    </div>
  )
}
