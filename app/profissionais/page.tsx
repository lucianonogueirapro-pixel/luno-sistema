'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Plus, Pencil, CalendarDays, ReceiptText } from 'lucide-react'

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

interface Disponibilidade {
  dia_semana: number
  hora_inicio: string
  hora_fim: string
}

interface Profissional {
  id: string
  nome: string
  documento: string | null
  tipo_documento: string | null
  especialidade: string | null
  cor: string
  ativo: boolean
  disponibilidades?: Disponibilidade[]
}

export default function ProfissionaisPage() {
  const router = useRouter()
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: profs }, { data: disps }] = await Promise.all([
        supabase.from('profissionais').select('*').order('nome'),
        supabase.from('profissional_disponibilidades').select('profissional_id, dia_semana, hora_inicio, hora_fim'),
      ])
      setProfissionais(
        (profs ?? []).map((p: any) => ({
          ...p,
          disponibilidades: (disps ?? []).filter((d: any) => d.profissional_id === p.id),
        }))
      )
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Profissionais"
        subtitle="Equipe, especialidades e disponibilidades"
      >
        <Link
          href="/profissionais/comissoes"
          className="flex items-center gap-1.5 px-3 py-2 border border-[#e2e8f0] text-[#475569] text-[12px] rounded-lg hover:border-[#94a3b8] hover:text-[#0f172a] transition-colors"
        >
          <ReceiptText size={13} />
          Comissões
        </Link>
        <Link
          href="/profissionais/novo"
          className="flex items-center gap-1.5 px-4 py-2 bg-[#4f46e5] text-white text-[12px] rounded-lg hover:bg-[#374151] transition-colors"
        >
          <Plus size={13} />
          Novo profissional
        </Link>
      </PageHeader>

      {loading ? (
        <div className="py-12 text-center text-[13px] text-[#64748b]">Carregando...</div>
      ) : profissionais.length === 0 ? (
        <div className="bg-white border border-[#e2e8f0] rounded-2xl py-14 text-center">
          <div className="text-[14px] font-semibold text-[#0f172a] mb-1">Nenhum profissional cadastrado</div>
          <div className="text-[12px] text-[#64748b] mb-4">Cadastre os membros da equipe para vincular à agenda.</div>
          <Link
            href="/profissionais/novo"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4f46e5] text-white text-[12px] rounded-lg hover:bg-[#374151] transition-colors"
          >
            <Plus size={13} />
            Cadastrar primeiro profissional
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {profissionais.map(p => {
            const diasAtivos = (p.disponibilidades ?? [])
              .sort((a, b) => a.dia_semana - b.dia_semana)
            return (
              <div
                key={p.id}
                onClick={() => router.push(`/profissionais/${p.id}`)}
                className="bg-white border border-[#e2e8f0] rounded-2xl p-5 flex items-start gap-4 hover:border-[#94a3b8] hover:shadow-sm transition-all cursor-pointer"
              >
                {/* Avatar com cor */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-[14px] flex-shrink-0"
                  style={{ backgroundColor: p.cor }}
                >
                  {p.nome.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[14px] font-bold text-[#0f172a]">{p.nome}</span>
                    {!p.ativo && (
                      <span className="text-[9px] font-bold uppercase tracking-wide text-[#94a3b8] bg-[#f1f5f9] px-2 py-0.5 rounded-full">
                        Inativo
                      </span>
                    )}
                  </div>

                  {p.especialidade && (
                    <div className="text-[11px] text-[#64748b] mb-2">{p.especialidade}</div>
                  )}

                  {/* Disponibilidades */}
                  {diasAtivos.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {DIAS.map((d, i) => {
                        const disp = diasAtivos.find(x => x.dia_semana === i)
                        return (
                          <div
                            key={i}
                            title={disp ? `${d}: ${disp.hora_inicio}–${disp.hora_fim}` : d}
                            className={`w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold transition-colors ${
                              disp
                                ? 'text-white'
                                : 'bg-[#f1f5f9] text-[#94a3b8]'
                            }`}
                            style={disp ? { backgroundColor: p.cor } : {}}
                          >
                            {d[0]}
                          </div>
                        )
                      })}
                      {diasAtivos[0] && (
                        <span className="text-[10px] text-[#94a3b8] ml-1">
                          {diasAtivos[0].hora_inicio}–{diasAtivos[diasAtivos.length > 1 ? diasAtivos.length - 1 : 0].hora_fim}
                        </span>
                      )}
                    </div>
                  )}

                  {diasAtivos.length === 0 && (
                    <span className="text-[11px] text-[#94a3b8] italic">Sem disponibilidade configurada</span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => router.push(`/agenda?profissional=${p.id}`)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e2e8f0] text-[#64748b] hover:border-[#94a3b8] hover:text-[#0f172a] transition-colors"
                    title="Ver agenda"
                  >
                    <CalendarDays size={13} />
                  </button>
                  <button
                    onClick={() => router.push(`/profissionais/${p.id}`)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e2e8f0] text-[#64748b] hover:border-[#94a3b8] hover:text-[#0f172a] transition-colors"
                    title="Editar"
                  >
                    <Pencil size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
