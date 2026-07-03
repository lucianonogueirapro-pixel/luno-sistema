export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { Paciente, CanalAquisicao } from '@/lib/types'

const CANAL_LABEL: Record<CanalAquisicao, string> = {
  instagram: 'Instagram',
  indicacao: 'Indicação',
  google: 'Google',
  anuncios: 'Anúncios',
  outros: 'Outros',
}

const CANAL_BADGE: Record<CanalAquisicao, 'blue' | 'green' | 'amber' | 'gray'> = {
  instagram: 'blue',
  indicacao: 'green',
  google: 'amber',
  anuncios: 'amber',
  outros: 'gray',
}

function calcIdade(dataNasc: string | null): string {
  if (!dataNasc) return '—'
  const nasc = new Date(dataNasc)
  const hoje = new Date()
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
  return `${idade} anos`
}

export default async function PacientesPage() {
  const supabase = await createClient()
  const { data: pacientes } = await supabase
    .from('clientes')
    .select('*')
    .order('nome', { ascending: true })

  const all: Paciente[] = pacientes ?? []

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={`${all.length} cadastrado${all.length !== 1 ? 's' : ''}`}
      >
        <Link href="/pacientes/nova">
          <Button>+ Novo Cliente</Button>
        </Link>
      </PageHeader>

      <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden">
        {all.length === 0 ? (
          <div className="py-16 text-center text-[13px] text-[#64748b]">
            Nenhum cliente cadastrado.{' '}
            <Link href="/pacientes/nova" className="text-[#0f172a] font-semibold hover:underline">
              Cadastrar o primeiro →
            </Link>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#f1f5f9] bg-[#f8fafc]">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#64748b] uppercase tracking-wide">Paciente</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#64748b] uppercase tracking-wide hidden sm:table-cell">Telefone</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#64748b] uppercase tracking-wide hidden md:table-cell">Idade</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#64748b] uppercase tracking-wide hidden lg:table-cell">Canal</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {all.map(p => (
                <tr key={p.id} className="hover:bg-[#f8fafc] transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#94a3b8] to-[#64748b] flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                        {p.nome[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-[#0f172a]">{p.nome}</div>
                        {p.email && <div className="text-[11px] text-[#64748b]">{p.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#0f172a] hidden sm:table-cell">{p.telefone}</td>
                  <td className="px-4 py-3 text-[#64748b] hidden md:table-cell">{calcIdade(p.data_nascimento)}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {p.canal_aquisicao ? (
                      <Badge variant={CANAL_BADGE[p.canal_aquisicao]}>
                        {CANAL_LABEL[p.canal_aquisicao]}
                      </Badge>
                    ) : (
                      <span className="text-[#94a3b8]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/pacientes/${p.id}`}
                      className="text-[11px] text-[#64748b] hover:text-[#0f172a] font-semibold"
                    >
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
