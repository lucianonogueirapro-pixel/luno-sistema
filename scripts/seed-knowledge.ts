/**
 * Popula a tabela base_conhecimento no Supabase com os documentos de referência da Luno
 * e todas as skills do sistema.
 *
 * Rodar sempre que atualizar os docs ou skills:
 *   npx tsx scripts/seed-knowledge.ts
 */

import { readFileSync } from 'fs'

// Carrega .env.local manualmente
try {
  const env = readFileSync('.env.local', 'utf-8')
  for (const line of env.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] ??= m[2].trim()
  }
} catch {}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function read(path: string): string {
  try {
    return readFileSync(path, 'utf-8')
  } catch {
    return ''
  }
}

const LUNO  = '/Users/lucianonogueira/Desktop/Luno'
const PROJ  = '/Users/lucianonogueira/Projetos/Luno'
const SKILL = '/Users/lucianonogueira/.claude/skills'

// Status atual do Instagram (atualizado manualmente)
const INSTAGRAM_STATUS = `# Status Instagram Luno — 05/06/2026

## Situação Atual
- Conta: @lunoface (migração para @luno.hf PENDENTE)
- Status: Perfil PUBLICADO e ao ar
- Posts publicados: 0 (fase de pré-lançamento)
- Bio: configurada
- Link: lunoface.com.br

## Posts em Produção
- Post 01: PRONTO (aguardando publicação)
- Post 02: PRONTO (aguardando publicação)
- Post 03: RETRABALHO NECESSÁRIO (3 opções visuais existem, revisar)
- Post 04: CRIAR (carrossel dos pilares — do zero)
- Post 05: CRIAR (roteiro do Reel teaser de abertura)

## Tráfego Pago
- Campanha Meta Ads: NÃO ATIVA
- Estratégia paciente modelo: PRONTA
- Pendente: definir orçamento com Luciano e configurar campanha

## Métricas
- Seguidores: dados não disponíveis (conectar via API)
- Alcance: sem dados
- Engajamento: sem dados

## Decisões Bloqueadas
1. Migração @lunoface → @luno.hf (2 minutos para executar)
2. Orçamento Meta Ads (sugestão: R$ 1.500 por 30 dias)
3. Data de gravação do Reel 01 com Sarah (roteiro pronto)`

const docs = [
  // ── Documentos da Luno ──────────────────────────────────────────
  {
    slug: 'brand-book',
    titulo: 'Brand Book — Luno Harmonização Facial',
    categoria: 'marca',
    conteudo: read(`${LUNO}/01 - Marca/brand-book-luno.md`),
  },
  {
    slug: 'briefing-squad',
    titulo: 'Briefing Squad — Referência Completa',
    categoria: 'geral',
    conteudo: read(`${LUNO}/01 - Marca/luno_briefing_squad.md`),
  },
  {
    slug: 'sistema-visual',
    titulo: 'Sistema Visual — Guia de Design Luno',
    categoria: 'mkt',
    conteudo: read(`${LUNO}/01 - Marca/sistema-visual-luno.md`),
  },
  {
    slug: 'master-md',
    titulo: 'MASTER.md — Operações e Tarefas',
    categoria: 'geral',
    conteudo: read(`${PROJ}/MASTER.md`),
  },
  {
    slug: 'instagram-status',
    titulo: 'Instagram Luno — Status Atual',
    categoria: 'mkt',
    conteudo: INSTAGRAM_STATUS,
  },

  // ── Skills de design do Claude Code ─────────────────────────────
  {
    slug: 'refero-design',
    titulo: 'Metodologia Refero Design — Pesquisa Visual',
    categoria: 'design',
    conteudo: read(`${SKILL}/refero-design/SKILL.md`),
  },
  {
    slug: 'ui-ux-pro-max',
    titulo: 'UI/UX Pro Max — 67 Estilos, Paletas, Tipografia',
    categoria: 'design',
    conteudo: read(`${SKILL}/ui-ux-pro-max/SKILL.md`),
  },

  // ── Skills dos Agentes Luno ─────────────────────────────────────
  // Orquestrador
  { slug: 'skill-ravi',            titulo: 'Skill: Orquestrador (Ravi) — Chief of Staff',        categoria: 'skill', conteudo: read(`${SKILL}/luno-chief/index.md`) || read(`${SKILL}/luno/index.md`) },

  // MKT
  { slug: 'skill-mkt',             titulo: 'Skill: Gerente de MKT',                               categoria: 'skill', conteudo: read(`${SKILL}/luno-mkt/index.md`) },
  { slug: 'skill-mkt-design',      titulo: 'Skill: Designer',                                     categoria: 'skill', conteudo: read(`${SKILL}/luno-mkt-design/index.md`) },
  { slug: 'skill-mkt-conteudo',    titulo: 'Skill: Criador de Conteúdo',                          categoria: 'skill', conteudo: read(`${SKILL}/luno-mkt-conteudo/index.md`) },
  { slug: 'skill-mkt-trafego',     titulo: 'Skill: Gestor de Tráfego',                            categoria: 'skill', conteudo: read(`${SKILL}/luno-mkt-trafego/index.md`) },
  { slug: 'skill-mkt-social',      titulo: 'Skill: Social Media',                                 categoria: 'skill', conteudo: read(`${SKILL}/luno-mkt-social/index.md`) },
  { slug: 'skill-mkt-copy',        titulo: 'Skill: Copywriter',                                   categoria: 'skill', conteudo: read(`${SKILL}/luno-mkt-copy/index.md`) },
  { slug: 'skill-mkt-pesquisa',    titulo: 'Skill: Pesquisador de Mercado',                       categoria: 'skill', conteudo: read(`${SKILL}/luno-mkt-pesquisa/index.md`) },
  { slug: 'skill-mkt-dados',       titulo: 'Skill: Analista de Dados MKT',                        categoria: 'skill', conteudo: read(`${SKILL}/luno-mkt-dados/index.md`) },

  // Comercial
  { slug: 'skill-comercial',       titulo: 'Skill: Gerente Comercial',                            categoria: 'skill', conteudo: read(`${SKILL}/luno-comercial/index.md`) },
  { slug: 'skill-comercial-laura', titulo: 'Skill: Laura — Atendente IA',                         categoria: 'skill', conteudo: read(`${SKILL}/luno-comercial-atendente/index.md`) },
  { slug: 'skill-comercial-prospector', titulo: 'Skill: Prospector (Outbound)',                   categoria: 'skill', conteudo: read(`${SKILL}/luno-comercial-prospector/index.md`) },
  { slug: 'skill-comercial-qualificador', titulo: 'Skill: Qualificador / Scripts de Ligação',     categoria: 'skill', conteudo: read(`${SKILL}/luno-comercial-qualificador/index.md`) },
  { slug: 'skill-comercial-followup', titulo: 'Skill: Follow-up (D+1/D+3/D+7)',                   categoria: 'skill', conteudo: read(`${SKILL}/luno-comercial-followup/index.md`) },
  { slug: 'skill-comercial-closer', titulo: 'Skill: Closer',                                      categoria: 'skill', conteudo: read(`${SKILL}/luno-comercial-closer/index.md`) },
  { slug: 'skill-comercial-cs',    titulo: 'Skill: Customer Success / Pós-procedimento',          categoria: 'skill', conteudo: read(`${SKILL}/luno-comercial-cs/index.md`) },

  // Financeiro
  { slug: 'skill-financeiro',      titulo: 'Skill: Gerente Financeiro',                           categoria: 'skill', conteudo: read(`${SKILL}/luno-financeiro/index.md`) },
  { slug: 'skill-financeiro-controller', titulo: 'Skill: Controller / DRE',                       categoria: 'skill', conteudo: read(`${SKILL}/luno-financeiro-controller/index.md`) },
  { slug: 'skill-financeiro-fiscal', titulo: 'Skill: Analista Fiscal',                            categoria: 'skill', conteudo: read(`${SKILL}/luno-financeiro-fiscal/index.md`) },
  { slug: 'skill-financeiro-pagar', titulo: 'Skill: Contas a Pagar',                              categoria: 'skill', conteudo: read(`${SKILL}/luno-financeiro-pagar/index.md`) },
  { slug: 'skill-financeiro-receber', titulo: 'Skill: Contas a Receber',                          categoria: 'skill', conteudo: read(`${SKILL}/luno-financeiro-receber/index.md`) },

  // Admin
  { slug: 'skill-admin',           titulo: 'Skill: Gerente Administrativo',                       categoria: 'skill', conteudo: read(`${SKILL}/luno-admin/index.md`) },
  { slug: 'skill-admin-sarah',     titulo: 'Skill: Auxiliar da Dra. Sarah',                       categoria: 'skill', conteudo: read(`${SKILL}/luno-admin-sarah/index.md`) },
  { slug: 'skill-admin-luciano',   titulo: 'Skill: Auxiliar do Luciano',                          categoria: 'skill', conteudo: read(`${SKILL}/luno-admin-luciano/index.md`) },
  { slug: 'skill-admin-estoque',   titulo: 'Skill: Estoquista',                                   categoria: 'skill', conteudo: read(`${SKILL}/luno-admin-estoque/index.md`) },
  { slug: 'skill-admin-manutencao', titulo: 'Skill: Manutenção',                                  categoria: 'skill', conteudo: read(`${SKILL}/luno-admin-manutencao/index.md`) },

  // Clínico
  { slug: 'skill-clinico',         titulo: 'Skill: Gerente Clínico',                              categoria: 'skill', conteudo: read(`${SKILL}/luno-clinico/index.md`) },
  { slug: 'skill-clinico-nps',     titulo: 'Skill: NPS / Satisfação',                             categoria: 'skill', conteudo: read(`${SKILL}/luno-clinico-nps/index.md`) },
  { slug: 'skill-clinico-protocolo', titulo: 'Skill: Protocolo & Qualidade',                      categoria: 'skill', conteudo: read(`${SKILL}/luno-clinico-protocolo/index.md`) },
  { slug: 'skill-clinico-pacientes', titulo: 'Skill: Gestão de Pacientes',                        categoria: 'skill', conteudo: read(`${SKILL}/luno-clinico-pacientes/index.md`) },
  { slug: 'skill-clinico-recepcao', titulo: 'Skill: Agendamento & Recepção',                      categoria: 'skill', conteudo: read(`${SKILL}/luno-clinico-recepcao/index.md`) },

  // Jurídico
  { slug: 'skill-juridico',        titulo: 'Skill: Gerente Jurídico',                             categoria: 'skill', conteudo: read(`${SKILL}/luno-juridico/index.md`) },
  { slug: 'skill-juridico-contratos', titulo: 'Skill: Contratos e TCI',                           categoria: 'skill', conteudo: read(`${SKILL}/luno-juridico-contratos/index.md`) },
  { slug: 'skill-juridico-lgpd',   titulo: 'Skill: LGPD',                                         categoria: 'skill', conteudo: read(`${SKILL}/luno-juridico-lgpd/index.md`) },

  // RH
  { slug: 'skill-rh',              titulo: 'Skill: Gerente de RH',                                categoria: 'skill', conteudo: read(`${SKILL}/luno-rh/index.md`) },
  { slug: 'skill-rh-contratacoes', titulo: 'Skill: Contratações e Onboarding',                    categoria: 'skill', conteudo: read(`${SKILL}/luno-rh-contratacoes/index.md`) },
  { slug: 'skill-rh-folha',        titulo: 'Skill: Folha e Pró-labore',                           categoria: 'skill', conteudo: read(`${SKILL}/luno-rh-folha/index.md`) },

  // Sistema
  { slug: 'skill-sistema',         titulo: 'Skill: Gerente de Sistema/TI',                        categoria: 'skill', conteudo: read(`${SKILL}/luno-sistema/index.md`) },
]

async function upsertDoc(doc: (typeof docs)[0]) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/base_conhecimento?on_conflict=slug`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({ ...doc, updated_at: new Date().toISOString() }),
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`HTTP ${res.status}: ${txt}`)
  }
}

async function seed() {
  console.log('Iniciando seed da base de conhecimento...\n')

  let ok = 0
  let fail = 0
  let skip = 0

  for (const doc of docs) {
    if (!doc.conteudo) {
      console.warn(`  ⚠  "${doc.titulo}" — sem conteúdo, pulando`)
      skip++
      continue
    }

    try {
      await upsertDoc(doc)
      const kb = (doc.conteudo.length / 1024).toFixed(1)
      console.log(`  ✓ "${doc.titulo}" — ${kb} KB`)
      ok++
    } catch (err) {
      console.error(`  ✗ "${doc.titulo}": ${(err as Error).message}`)
      fail++
    }
  }

  console.log(`\n${ok} documentos inseridos, ${skip} sem arquivo (ok), ${fail} com erro.`)
  if (ok > 0) console.log('Agentes têm acesso à base completa da Luno.')
}

seed()
