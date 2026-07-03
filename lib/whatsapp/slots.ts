import type { SupabaseClient } from '@supabase/supabase-js'

export interface HorarioConfig {
  horario_inicio: string       // "09:00"
  horario_fim: string          // "18:00"
  sabado_ativo: boolean
  sabado_inicio: string        // "09:00"
  sabado_fim: string           // "13:00"
  duracao_avaliacao_min: number // 60
  slots_antecipacao_dias: number // 7
}

export interface SlotDisponivel {
  iso: string
  label: string
  profissional_id?: string
  profissional_nome?: string
}

function horaParaMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

export function formatarSlot(dt: Date): string {
  const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const dia = dias[dt.getDay()]
  const data = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Fortaleza' })
  const hora = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Fortaleza' })
  return `${dia} ${data} às ${hora}`
}

export async function calcularSlotsDisponiveis(
  cfg: HorarioConfig,
  supabase: SupabaseClient,
  quantidade = 5,
  empresaId?: string,
): Promise<SlotDisponivel[]> {
  // Tenta usar disponibilidades dos profissionais primeiro
  const profQuery = supabase
    .from('profissionais')
    .select('id, nome, profissional_disponibilidades(dia_semana, hora_inicio, hora_fim)')
    .eq('ativo', true)
  if (empresaId) profQuery.eq('empresa_id', empresaId)
  const { data: profissionais } = await profQuery

  const profsComDisp = (profissionais ?? []).filter(
    (p: any) => p.profissional_disponibilidades?.length > 0
  )

  if (profsComDisp.length > 0) {
    return calcularSlotsComProfissionais(profsComDisp, supabase, cfg.duracao_avaliacao_min ?? 60, cfg.slots_antecipacao_dias ?? 7, quantidade, empresaId)
  }

  // Fallback: horário global da configuração
  return calcularSlotsGlobal(cfg, supabase, quantidade, empresaId)
}

async function calcularSlotsComProfissionais(
  profissionais: any[],
  supabase: SupabaseClient,
  duracao: number,
  diasAntecipacao: number,
  quantidade: number,
  empresaId?: string,
): Promise<SlotDisponivel[]> {
  const agora = new Date()
  const limite = new Date(agora)
  limite.setDate(limite.getDate() + diasAntecipacao)

  const agQuery = supabase
    .from('agenda')
    .select('data_hora, profissional_id')
    .gte('data_hora', agora.toISOString())
    .lte('data_hora', limite.toISOString())
    .not('status', 'in', '("cancelado","faltou")')
  if (empresaId) agQuery.eq('empresa_id', empresaId)
  const { data: agendamentos } = await agQuery

  // chave: "profId|2026-06-10T09:00" → ocupado
  const ocupados = new Set<string>(
    (agendamentos ?? []).map((a: any) =>
      `${a.profissional_id ?? ''}|${new Date(a.data_hora).toISOString().slice(0, 16)}`
    )
  )

  const slots: SlotDisponivel[] = []
  const cursor = new Date(agora)
  cursor.setMinutes(0, 0, 0)
  cursor.setHours(cursor.getHours() + 1)

  while (slots.length < quantidade && cursor < limite) {
    const diaSemana = cursor.getDay()

    for (const prof of profissionais) {
      if (slots.length >= quantidade) break
      const disps: any[] = prof.profissional_disponibilidades ?? []
      const disp = disps.find((d: any) => d.dia_semana === diaSemana)
      if (!disp) continue

      const inicioMin = horaParaMinutos(disp.hora_inicio)
      const fimMin = horaParaMinutos(disp.hora_fim)
      const cursorHora = cursor.getHours() * 60 + cursor.getMinutes()
      let slotMin = Math.max(inicioMin, cursorHora)

      while (slotMin + duracao <= fimMin && slots.length < quantidade) {
        const slotDt = new Date(cursor)
        slotDt.setHours(Math.floor(slotMin / 60), slotMin % 60, 0, 0)
        const chave = `${prof.id}|${slotDt.toISOString().slice(0, 16)}`

        if (!ocupados.has(chave)) {
          slots.push({
            iso: slotDt.toISOString(),
            label: `${formatarSlot(slotDt)} — ${prof.nome.split(' ')[0]}`,
            profissional_id: prof.id,
            profissional_nome: prof.nome,
          })
        }
        slotMin += duracao
      }
    }

    cursor.setDate(cursor.getDate() + 1)
    cursor.setHours(0, 0, 0, 0)
  }

  return slots
}

async function calcularSlotsGlobal(
  cfg: HorarioConfig,
  supabase: SupabaseClient,
  quantidade: number,
  empresaId?: string,
): Promise<SlotDisponivel[]> {
  const agora = new Date()
  const limite = new Date(agora)
  limite.setDate(limite.getDate() + (cfg.slots_antecipacao_dias ?? 7))

  const agQuery = supabase
    .from('agenda')
    .select('data_hora')
    .gte('data_hora', agora.toISOString())
    .lte('data_hora', limite.toISOString())
    .not('status', 'in', '("cancelado","faltou")')
  if (empresaId) agQuery.eq('empresa_id', empresaId)
  const { data: agendamentos } = await agQuery

  const ocupados = new Set<string>(
    (agendamentos ?? []).map((a: any) => new Date(a.data_hora).toISOString().slice(0, 16))
  )

  const slots: SlotDisponivel[] = []
  const cursor = new Date(agora)
  cursor.setMinutes(0, 0, 0)
  cursor.setHours(cursor.getHours() + 1)

  const duracao = cfg.duracao_avaliacao_min ?? 60

  while (slots.length < quantidade && cursor < limite) {
    const diaSemana = cursor.getDay()
    let inicioMin: number | null = null
    let fimMin: number | null = null

    if (diaSemana >= 1 && diaSemana <= 5) {
      inicioMin = horaParaMinutos(cfg.horario_inicio ?? '09:00')
      fimMin    = horaParaMinutos(cfg.horario_fim ?? '18:00')
    } else if (diaSemana === 6 && cfg.sabado_ativo) {
      inicioMin = horaParaMinutos(cfg.sabado_inicio ?? '09:00')
      fimMin    = horaParaMinutos(cfg.sabado_fim ?? '13:00')
    }

    if (inicioMin !== null && fimMin !== null) {
      const cursorHora = cursor.getHours() * 60 + cursor.getMinutes()
      let slotMin = Math.max(inicioMin, cursorHora)

      while (slotMin + duracao <= fimMin) {
        const slotDt = new Date(cursor)
        slotDt.setHours(Math.floor(slotMin / 60), slotMin % 60, 0, 0)

        const chave = slotDt.toISOString().slice(0, 16)
        if (!ocupados.has(chave)) {
          slots.push({ iso: slotDt.toISOString(), label: formatarSlot(slotDt) })
          if (slots.length >= quantidade) break
        }
        slotMin += duracao
      }
    }

    cursor.setDate(cursor.getDate() + 1)
    cursor.setHours(0, 0, 0, 0)
  }

  return slots
}
