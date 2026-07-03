import { createClient } from '@/lib/supabase/server'
import { readFileSync } from 'fs'
import type { AgenteDept } from './agents'

export interface AgenteContext {
  summary: string
}

const MASTER_PATH = '/Users/lucianonogueira/Projetos/Luno/MASTER.md'

// Quais seções do MASTER.md cada dept recebe
const DEPT_SECTIONS: Record<string, string[]> = {
  mkt:        ['## MKT — ÉVOR', '## MKT — SARAH', '## TRÁFEGO', '## VÍDEO'],
  comercial:  ['## COMERCIAL'],
  financeiro: ['## FINANCEIRO'],
  clinico:    ['## SISTEMA'],
  admin:      ['## CEO — LUCIANO'],
  sistema:    ['## SISTEMA'],
}

// Mapa de conhecimento: cada agente recebe seu próprio skill + docs relevantes
// skill-[slug] carrega a inteligência completa do agente (mesma do Claude Code)
// Limite em chars para não explodir o contexto da API
const KNOWLEDGE_MAP: Record<string, { slugs: string[]; limit: number }> = {
  // Orquestrador
  ravi:                     { slugs: ['skill-ravi', 'briefing-squad', 'master-md', 'instagram-status'],             limit: 8000 },

  // MKT — Gerentes recebem skill + docs de marca
  mkt:                      { slugs: ['skill-mkt', 'instagram-status', 'brand-book', 'briefing-squad'],              limit: 7000 },
  'mkt-design':             { slugs: ['skill-mkt-design', 'sistema-visual', 'refero-design', 'ui-ux-pro-max', 'instagram-status'], limit: 7000 },
  'mkt-conteudo':           { slugs: ['skill-mkt-conteudo', 'brand-book', 'instagram-status'],                       limit: 6000 },
  'mkt-trafego':            { slugs: ['skill-mkt-trafego', 'instagram-status', 'briefing-squad'],                    limit: 6000 },
  'mkt-social':             { slugs: ['skill-mkt-social', 'instagram-status', 'brand-book'],                         limit: 6000 },
  'mkt-copy':               { slugs: ['skill-mkt-copy', 'brand-book', 'briefing-squad'],                             limit: 6000 },
  'mkt-pesquisa':           { slugs: ['skill-mkt-pesquisa', 'briefing-squad'],                                       limit: 5000 },

  // Comercial
  comercial:                { slugs: ['skill-comercial', 'briefing-squad', 'instagram-status'],                      limit: 6000 },
  'comercial-laura':        { slugs: ['skill-comercial-laura', 'briefing-squad'],                                    limit: 5000 },
  'comercial-prospector':   { slugs: ['skill-comercial-prospector', 'briefing-squad'],                               limit: 5000 },
  'comercial-qualificador': { slugs: ['skill-comercial-qualificador'],                                               limit: 5000 },
  'comercial-followup':     { slugs: ['skill-comercial-followup'],                                                   limit: 4000 },
  'comercial-closer':       { slugs: ['skill-comercial-closer'],                                                     limit: 4000 },
  'comercial-cs':           { slugs: ['skill-comercial-cs'],                                                         limit: 4000 },

  // Financeiro
  financeiro:               { slugs: ['skill-financeiro', 'briefing-squad'],                                         limit: 5000 },
  'financeiro-controller':  { slugs: ['skill-financeiro-controller'],                                                limit: 4000 },

  // Admin
  admin:                    { slugs: ['skill-admin'],                                                                limit: 4000 },
  'admin-sarah':            { slugs: ['skill-admin-sarah', 'briefing-squad'],                                        limit: 5000 },
  'admin-luciano':          { slugs: ['skill-admin-luciano', 'master-md'],                                           limit: 5000 },

  // Clínico
  clinico:                  { slugs: ['skill-clinico', 'briefing-squad'],                                            limit: 5000 },
  'clinico-nps':            { slugs: ['skill-clinico-nps'],                                                          limit: 3000 },

  // Jurídico
  juridico:                 { slugs: ['skill-juridico'],                                                             limit: 5000 },

  // RH
  rh:                       { slugs: ['skill-rh'],                                                                   limit: 4000 },

  // Sistema
  sistema:                  { slugs: ['skill-sistema'],                                                              limit: 4000 },

  // Novos agentes
  criativo:                 { slugs: ['skill-criativo', 'brand-book', 'briefing-squad', 'instagram-status'],         limit: 6000 },
  cx:                       { slugs: ['skill-cx', 'briefing-squad'],                                                 limit: 5000 },
  ux:                       { slugs: ['skill-ux', 'sistema-visual', 'briefing-squad'],                               limit: 5000 },
  seguranca:                { slugs: ['skill-seguranca'],                                                            limit: 4000 },
}

function readMasterTasks(dept: AgenteDept, slug: string): string {
  try {
    const content = readFileSync(MASTER_PATH, 'utf-8')
    if (slug === 'ravi') {
      const pending = content.match(/^- \[ \] .+/gm) ?? []
      if (!pending.length) return ''
      return `\n=== TAREFAS PENDENTES (MASTER.md) ===\n${pending.slice(0, 20).join('\n')}`
    }
    const sections = DEPT_SECTIONS[dept] ?? []
    if (!sections.length) return ''
    const collected: string[] = []
    let inSection = false
    for (const line of content.split('\n')) {
      if (line.startsWith('## ')) inSection = sections.some(s => line.startsWith(s))
      if (inSection && line.startsWith('- [ ]')) collected.push(line)
    }
    if (!collected.length) return ''
    return `\n=== TAREFAS PENDENTES ===\n${collected.join('\n')}`
  } catch {
    return ''
  }
}

async function loadKnowledge(
  supabase: Awaited<ReturnType<typeof createClient>>,
  dept: string,
  slug: string
): Promise<string> {
  // Slug específico tem prioridade sobre dept genérico
  const key = KNOWLEDGE_MAP[slug] ? slug : dept
  const cfg = KNOWLEDGE_MAP[key]
  if (!cfg || !cfg.slugs.length) return ''

  const { data } = await supabase
    .from('base_conhecimento')
    .select('slug, titulo, conteudo')
    .in('slug', cfg.slugs)

  if (!data?.length) return ''

  // Ordenar conforme a ordem definida em slugs (skill próprio vem primeiro)
  const ordered = cfg.slugs
    .map(s => data.find(d => d.slug === s))
    .filter(Boolean) as { slug: string; titulo: string; conteudo: string }[]

  let totalChars = 0
  const parts: string[] = []

  for (const doc of ordered) {
    const remaining = cfg.limit - totalChars
    if (remaining <= 0) break

    // Skills do agente são injetados sem truncamento forçado (são a essência)
    const isOwnSkill = doc.slug.startsWith('skill-')
    const truncate = isOwnSkill ? Math.max(remaining, 4000) : remaining

    const truncated = doc.conteudo.length > truncate
      ? doc.conteudo.slice(0, truncate) + '\n[... truncado]'
      : doc.conteudo

    parts.push(`\n=== ${doc.titulo.toUpperCase()} ===\n${truncated}`)
    totalChars += truncated.length
  }

  return parts.join('\n')
}

export async function buildContext(dept: AgenteDept, slug: string): Promise<AgenteContext> {
  try {
    const supabase = await createClient()
    const lines: string[] = []

    // ── Dados do sistema ──────────────────────────────────────────

    if (slug === 'ravi' || dept === 'orquestrador') {
      const [
        { count: totalClientes },
        { data: avaliacoes },
        { data: lancamentos },
      ] = await Promise.all([
        supabase.from('clientes').select('*', { count: 'exact', head: true }),
        supabase.from('avaliacoes').select('status, created_at').order('created_at', { ascending: false }).limit(20),
        supabase.from('lancamentos').select('tipo, valor_previsto, created_at').order('created_at', { ascending: false }).limit(30),
      ])
      const avs = avaliacoes ?? []
      const fechadas = avs.filter(a => a.status === 'fechado')
      const pendentes = avs.filter(a => ['pendente', 'em_negociacao'].includes(a.status))
      const receita = (lancamentos ?? []).filter(l => l.tipo === 'entrada').reduce((s, l) => s + (l.valor_previsto ?? 0), 0)
      lines.push(
        `=== DADOS DO SISTEMA ===`,
        `Clientes cadastrados: ${totalClientes ?? 0}`,
        `Avaliações recentes: ${avs.length} (${fechadas.length} fechadas, ${pendentes.length} em negociação)`,
        `Receita nos últimos lançamentos: R$ ${receita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      )
    }

    if (dept === 'comercial' || slug === 'ravi') {
      const { data: crm } = await supabase
        .from('avaliacoes')
        .select('status, clientes(nome)')
        .order('created_at', { ascending: false })
        .limit(10)
      if (crm?.length) {
        lines.push(`\n=== CRM / AVALIAÇÕES RECENTES ===`)
        crm.forEach(a => lines.push(`- ${(a.clientes as { nome?: string } | null)?.nome ?? 'Cliente'}: ${a.status}`))
      }
    }

    if (dept === 'financeiro' || slug === 'ravi') {
      const { data: lancs } = await supabase
        .from('lancamentos')
        .select('tipo, descricao, valor_previsto, valor_pago')
        .order('created_at', { ascending: false })
        .limit(15)
      if (lancs?.length) {
        const receitas = lancs.filter(l => l.tipo === 'entrada').reduce((s, l) => s + (l.valor_previsto ?? 0), 0)
        const despesas = lancs.filter(l => l.tipo === 'saida').reduce((s, l) => s + (l.valor_pago ?? l.valor_previsto ?? 0), 0)
        lines.push(
          `\n=== FINANCEIRO ===`,
          `Entradas recentes: R$ ${receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          `Saídas recentes: R$ ${despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          `Saldo: R$ ${(receitas - despesas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        )
      }
    }

    if (dept === 'admin' || slug === 'ravi') {
      const { data: produtos } = await supabase
        .from('produtos')
        .select('nome, quantidade, quantidade_min')
        .gt('quantidade_min', 0)
      if (produtos) {
        const criticos = produtos.filter(i => (i.quantidade ?? 0) <= (i.quantidade_min ?? 0))
        if (criticos.length) {
          lines.push(`\n=== ESTOQUE CRÍTICO ===`)
          criticos.forEach(i => lines.push(`- ${i.nome}: ${i.quantidade} (mínimo: ${i.quantidade_min})`))
        }
      }
    }

    if (dept === 'clinico' || slug === 'ravi') {
      const hoje = new Date().toISOString().split('T')[0]
      const { data: agenda } = await supabase
        .from('agenda')
        .select('tipo, status, data_hora, clientes(nome)')
        .gte('data_hora', hoje)
        .limit(5)
        .order('data_hora')
      if (agenda?.length) {
        lines.push(`\n=== AGENDA ===`)
        agenda.forEach(a => {
          const hora = new Date(a.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          lines.push(`- ${hora}: ${a.tipo} — ${(a.clientes as { nome?: string } | null)?.nome ?? 'Cliente'} (${a.status})`)
        })
      }
    }

    // ── Cofre de credenciais — só para o agente de segurança ─────
    if (slug === 'seguranca') {
      const { data: creds } = await supabase
        .from('cofre_credenciais')
        .select('servico, nome, descricao, categoria, updated_at')
        .eq('ativo', true)
        .order('servico')
      if (creds?.length) {
        lines.push(`\n=== COFRE DE CREDENCIAIS (${creds.length} itens) ===`)
        const byService: Record<string, typeof creds> = {}
        for (const c of creds) {
          if (!byService[c.servico]) byService[c.servico] = []
          byService[c.servico].push(c)
        }
        for (const [svc, items] of Object.entries(byService)) {
          lines.push(`${svc}: ${items.map(i => i.nome).join(', ')}`)
        }
        lines.push(`\nPara recuperar um valor específico, instrua o usuário a acessar /cofre no sistema.`)
      }
    }

    // ── Google Meu Negócio — avaliações pendentes ────────────────
    if (['comercial', 'clinico', 'cx'].includes(dept) || ['ravi', 'cx'].includes(slug)) {
      const { data: gmb } = await supabase
        .from('google_avaliacoes')
        .select('author_name, rating, comment, status, google_created_at')
        .order('google_created_at', { ascending: false })
        .limit(10)
      if (gmb?.length) {
        const pending = gmb.filter(r => r.status === 'pending')
        const avgRating = (gmb.reduce((s, r) => s + (r.rating ?? 0), 0) / gmb.length).toFixed(1)
        lines.push(`\n=== GOOGLE MEU NEGÓCIO ===`)
        lines.push(`Nota média: ${avgRating} | Total: ${gmb.length} avaliações | Pendentes: ${pending.length}`)
        if (pending.length) {
          lines.push(`Avaliações SEM resposta:`)
          pending.slice(0, 5).forEach(r => {
            const stars = '★'.repeat(r.rating ?? 0)
            lines.push(`- ${r.author_name ?? 'Anônimo'} ${stars}: ${(r.comment ?? '(sem comentário)').slice(0, 80)}`)
          })
        }
      }
    }

    // ── Tarefas pendentes (MASTER.md local) ──────────────────────
    const masterTasks = readMasterTasks(dept, slug)
    if (masterTasks) lines.push(masterTasks)

    // ── Base de conhecimento + Skills do agente (Supabase) ────────
    const knowledge = await loadKnowledge(supabase, dept, slug)
    if (knowledge) lines.push(knowledge)

    if (lines.length === 0) return { summary: '' }

    return {
      summary: `\n\n${lines.join('\n')}\n\nData/hora atual: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' })}.`,
    }
  } catch {
    return { summary: '' }
  }
}
