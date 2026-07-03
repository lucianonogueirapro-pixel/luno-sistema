import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { EMPRESA_ID } from '@/lib/empresa'
import { getEmpresaConfig } from '@/lib/empresa.server'

function supabaseService() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function startOfMonth(offset = 0) {
  const d = new Date()
  d.setMonth(d.getMonth() + offset, 1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 3600_000).toISOString()
}

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function soma(rows: any[], campo = 'valor_previsto') {
  return (rows ?? []).reduce((s: number, r: any) => s + (r[campo] ?? 0), 0)
}

// ── Contextos por agente ──────────────────────────────────────────────────

async function contextoOrquestrador(supabase: any) {
  const hoje = new Date().toISOString().slice(0, 10)

  const [
    { data: cfg },
    { count: totalClientes },
    { count: novosClientes30d },
    { data: recMesRows },
    { data: despMesRows },
    { data: recPassRows },
    { count: agendaHoje },
    { count: leadsAtivos },
    { count: tarefasPendentes },
    { count: tarefasAtrasadas },
    { count: clientesInativos },
  ] = await Promise.all([
    supabase.from('empresa_config').select('nome,cidade,segmento,horario_texto').limit(1).maybeSingle(),
    supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('empresa_id', EMPRESA_ID),
    supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('empresa_id', EMPRESA_ID).gte('created_at', daysAgo(30)),
    supabase.from('lancamentos').select('valor_previsto').eq('tipo', 'entrada').eq('empresa_id', EMPRESA_ID).gte('created_at', startOfMonth()),
    supabase.from('lancamentos').select('valor_previsto').eq('tipo', 'saida').eq('empresa_id', EMPRESA_ID).gte('created_at', startOfMonth()),
    supabase.from('lancamentos').select('valor_previsto').eq('tipo', 'entrada').eq('empresa_id', EMPRESA_ID).gte('created_at', startOfMonth(-1)).lt('created_at', startOfMonth()),
    supabase.from('agenda').select('*', { count: 'exact', head: true }).eq('empresa_id', EMPRESA_ID).gte('data_hora', hoje + 'T00:00:00').lte('data_hora', hoje + 'T23:59:59'),
    supabase.from('avaliacoes').select('*', { count: 'exact', head: true }).eq('empresa_id', EMPRESA_ID).not('status', 'in', '("fechado","perdido")'),
    supabase.from('tarefas').select('*', { count: 'exact', head: true }).eq('empresa_id', EMPRESA_ID).in('status', ['todo', 'doing']),
    supabase.from('tarefas').select('*', { count: 'exact', head: true }).eq('empresa_id', EMPRESA_ID).in('status', ['todo', 'doing']).lt('data_limite', new Date().toISOString()),
    supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('empresa_id', EMPRESA_ID).lt('updated_at', daysAgo(60)),
  ])

  const recMes = soma(recMesRows)
  const despMes = soma(despMesRows)
  const recPass = soma(recPassRows)
  const varPct = recPass > 0 ? ((recMes - recPass) / recPass * 100).toFixed(1) : null

  return `EMPRESA: ${(cfg as any)?.nome ?? 'Luno'} | Cidade: ${(cfg as any)?.cidade ?? '—'} | Segmento: ${(cfg as any)?.segmento ?? '—'}
DATA: ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}

VISÃO GERAL DO NEGÓCIO:
- Clientes cadastrados: ${totalClientes ?? 0} (${novosClientes30d ?? 0} novos nos últimos 30 dias)
- Clientes inativos (60+ dias): ${clientesInativos ?? 0}
- Agendamentos hoje: ${agendaHoje ?? 0}
- Leads ativos no pipeline: ${leadsAtivos ?? 0}
- Tarefas pendentes: ${tarefasPendentes ?? 0} (${tarefasAtrasadas ?? 0} atrasadas)

FINANCEIRO DO MÊS ATUAL:
- Receita: ${fmtBRL(recMes)}${varPct ? ` (${Number(varPct) >= 0 ? '+' : ''}${varPct}% vs mês passado)` : ''}
- Despesas: ${fmtBRL(despMes)}
- Resultado: ${fmtBRL(recMes - despMes)} (${recMes > despMes ? 'positivo' : 'negativo'})
- Mês passado receita: ${fmtBRL(recPass)}`
}

async function contextoMkt(supabase: any) {
  const mesAtual = new Date().getMonth() + 1

  const [
    { data: cfg },
    { data: clientes },
    { count: novos30d },
    { count: novos60_30d },
    { data: lancMes },
  ] = await Promise.all([
    supabase.from('empresa_config').select('nome,cidade,segmento').limit(1).maybeSingle(),
    supabase.from('clientes').select('canal_aquisicao,data_nascimento,created_at').eq('empresa_id', EMPRESA_ID).limit(500),
    supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('empresa_id', EMPRESA_ID).gte('created_at', daysAgo(30)),
    supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('empresa_id', EMPRESA_ID).gte('created_at', daysAgo(60)).lt('created_at', daysAgo(30)),
    supabase.from('lancamentos').select('cliente_id,valor_previsto').eq('tipo', 'entrada').eq('empresa_id', EMPRESA_ID).gte('created_at', startOfMonth()),
  ])

  const canalCount: Record<string, number> = {}
  const aniversariantes: string[] = []
  for (const c of clientes ?? []) {
    const canal = c.canal_aquisicao ?? 'não informado'
    canalCount[canal] = (canalCount[canal] ?? 0) + 1
    if (c.data_nascimento) {
      const mes = new Date(c.data_nascimento + 'T12:00:00').getMonth() + 1
      if (mes === mesAtual) aniversariantes.push(c.data_nascimento)
    }
  }
  const canaisStr = Object.entries(canalCount)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}: ${v} clientes`)
    .join(', ')

  const recMes = soma(lancMes)
  const crescimento = novos60_30d && novos60_30d > 0
    ? (((novos30d ?? 0) - novos60_30d) / novos60_30d * 100).toFixed(1)
    : null

  return `EMPRESA: ${(cfg as any)?.nome ?? 'Luno'} | Segmento: ${(cfg as any)?.segmento ?? '—'} | Cidade: ${(cfg as any)?.cidade ?? '—'}
DATA: ${new Date().toLocaleDateString('pt-BR')}

DADOS DE MARKETING:
- Total de clientes: ${(clientes ?? []).length}
- Novos clientes (últimos 30 dias): ${novos30d ?? 0}${crescimento ? ` (${Number(crescimento) >= 0 ? '+' : ''}${crescimento}% vs 30 dias anteriores)` : ''}
- Aniversariantes este mês: ${aniversariantes.length} clientes
- Receita gerada este mês: ${fmtBRL(recMes)}

CANAIS DE AQUISIÇÃO:
${canaisStr || 'Nenhum canal cadastrado ainda'}

OPORTUNIDADES IDENTIFICADAS:
- ${aniversariantes.length} aniversariantes este mês (ótimo para campanha de parabéns + desconto)
- Clientes cadastrados nos últimos 30 dias: ${novos30d ?? 0} (potencial de primeira recompra)
${novos30d && novos60_30d && (novos30d ?? 0) < (novos60_30d ?? 0) ? `- ATENÇÃO: captação caiu ${Math.abs(Number(crescimento))}% — revisar estratégia de aquisição` : ''}`
}

async function contextoComercial(supabase: any) {
  const [
    { data: cfg },
    { data: avaliacoes },
    { data: lancamentos },
    { data: clientes },
    { count: waAtivos },
    { data: topLtv },
  ] = await Promise.all([
    supabase.from('empresa_config').select('nome,cidade').limit(1).maybeSingle(),
    supabase.from('avaliacoes').select('status,obs,created_at,avaliacao_opcoes(preco_negociado)').eq('empresa_id', EMPRESA_ID).order('created_at', { ascending: false }).limit(100),
    supabase.from('lancamentos').select('cliente_id,valor_previsto,created_at').eq('tipo', 'entrada').eq('empresa_id', EMPRESA_ID).limit(1000),
    supabase.from('clientes').select('id,nome,canal_aquisicao,created_at').eq('empresa_id', EMPRESA_ID).limit(500),
    supabase.from('wa_conversas').select('*', { count: 'exact', head: true }).not('status', 'in', '("fechado","perdido")'),
    supabase.from('clientes').select('id,nome').eq('empresa_id', EMPRESA_ID).limit(5),
  ])

  const stageCount: Record<string, number> = {}
  let valorPipeline = 0
  for (const av of avaliacoes ?? []) {
    stageCount[av.status] = (stageCount[av.status] ?? 0) + 1
    const precos = (av.avaliacao_opcoes ?? []).map((o: any) => o.preco_negociado ?? 0)
    if (precos.length) valorPipeline += Math.max(...precos)
  }

  const ltv: Record<string, number> = {}
  const ultimaCompra: Record<string, string> = {}
  for (const l of lancamentos ?? []) {
    if (!l.cliente_id) continue
    ltv[l.cliente_id] = (ltv[l.cliente_id] ?? 0) + (l.valor_previsto ?? 0)
    if (!ultimaCompra[l.cliente_id] || l.created_at > ultimaCompra[l.cliente_id]) {
      ultimaCompra[l.cliente_id] = l.created_at
    }
  }

  const clienteMap: Record<string, string> = {}
  for (const c of clientes ?? []) clienteMap[c.id] = c.nome

  const inativos = Object.entries(ultimaCompra)
    .filter(([, data]) => data < daysAgo(60))
    .map(([id]) => clienteMap[id])
    .filter(Boolean)
    .slice(0, 10)

  const topClientes = Object.entries(ltv)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, v]) => `${clienteMap[id] ?? id}: ${fmtBRL(v)}`)

  const pipelineStr = Object.entries(stageCount)
    .map(([s, n]) => `${s}: ${n}`)
    .join(', ')

  return `EMPRESA: ${(cfg as any)?.nome ?? 'Luno'} | Data: ${new Date().toLocaleDateString('pt-BR')}

PIPELINE DE VENDAS:
- Estágios: ${pipelineStr || 'vazio'}
- Valor total no pipeline: ${fmtBRL(valorPipeline)}
- Leads ativos no WhatsApp: ${waAtivos ?? 0}

TOP 5 CLIENTES POR LTV:
${topClientes.length ? topClientes.join('\n') : 'Sem dados de vendas ainda'}

CLIENTES INATIVOS (60+ dias sem comprar):
${inativos.length ? inativos.join(', ') : 'Nenhum identificado'}
Total de clientes inativos: ${inativos.length}

OPORTUNIDADES IMEDIATAS:
- ${inativos.length} clientes inativos para reativação
- Pipeline com ${fmtBRL(valorPipeline)} em negociação
- ${stageCount['proposta'] ?? 0} propostas em aberto (prioridade de follow-up)`
}

async function contextoFinanceiro(supabase: any) {
  const [
    { data: cfg },
    { data: recMesRows },
    { data: despMesRows },
    { data: recPassRows },
    { data: despPassRows },
    { data: recAnualRows },
    { data: ultimosLanc },
    { data: despCategorias },
  ] = await Promise.all([
    supabase.from('empresa_config').select('nome,cidade').limit(1).maybeSingle(),
    supabase.from('lancamentos').select('valor_previsto,categoria').eq('tipo', 'entrada').eq('empresa_id', EMPRESA_ID).gte('created_at', startOfMonth()),
    supabase.from('lancamentos').select('valor_previsto,categoria').eq('tipo', 'saida').eq('empresa_id', EMPRESA_ID).gte('created_at', startOfMonth()),
    supabase.from('lancamentos').select('valor_previsto').eq('tipo', 'entrada').eq('empresa_id', EMPRESA_ID).gte('created_at', startOfMonth(-1)).lt('created_at', startOfMonth()),
    supabase.from('lancamentos').select('valor_previsto').eq('tipo', 'saida').eq('empresa_id', EMPRESA_ID).gte('created_at', startOfMonth(-1)).lt('created_at', startOfMonth()),
    supabase.from('lancamentos').select('valor_previsto').eq('tipo', 'entrada').eq('empresa_id', EMPRESA_ID).gte('created_at', startOfMonth(-12)),
    supabase.from('lancamentos').select('descricao,valor_previsto,tipo,created_at').eq('empresa_id', EMPRESA_ID).order('created_at', { ascending: false }).limit(10),
    supabase.from('lancamentos').select('categoria,valor_previsto').eq('tipo', 'saida').eq('empresa_id', EMPRESA_ID).gte('created_at', startOfMonth()),
  ])

  const recMes = soma(recMesRows)
  const despMes = soma(despMesRows)
  const recPass = soma(recPassRows)
  const despPass = soma(despPassRows)
  const recAnual = soma(recAnualRows)
  const ticketMedio = recMesRows && recMesRows.length > 0 ? recMes / recMesRows.length : 0

  const catMap: Record<string, number> = {}
  for (const l of despCategorias ?? []) {
    const cat = l.categoria ?? 'Sem categoria'
    catMap[cat] = (catMap[cat] ?? 0) + (l.valor_previsto ?? 0)
  }
  const catStr = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}: ${fmtBRL(v)}`)
    .join('\n')

  const ultStr = (ultimosLanc ?? [])
    .map((l: any) => `${l.tipo === 'entrada' ? '+' : '-'} ${fmtBRL(l.valor_previsto ?? 0)} — ${l.descricao ?? 'sem descrição'} (${new Date(l.created_at).toLocaleDateString('pt-BR')})`)
    .join('\n')

  const varRec = recPass > 0 ? ((recMes - recPass) / recPass * 100).toFixed(1) : null
  const varDesp = despPass > 0 ? ((despMes - despPass) / despPass * 100).toFixed(1) : null

  return `EMPRESA: ${(cfg as any)?.nome ?? 'Luno'} | Data: ${new Date().toLocaleDateString('pt-BR')}

MÊS ATUAL:
- Receita: ${fmtBRL(recMes)} (${varRec ? (Number(varRec) >= 0 ? '+' : '') + varRec + '% vs mês passado' : 'sem comparativo'})
- Despesas: ${fmtBRL(despMes)} (${varDesp ? (Number(varDesp) >= 0 ? '+' : '') + varDesp + '% vs mês passado' : 'sem comparativo'})
- Resultado: ${fmtBRL(recMes - despMes)} (${recMes > despMes ? 'POSITIVO' : 'NEGATIVO'})
- Ticket médio (lançamentos): ${fmtBRL(ticketMedio)}

MÊS PASSADO:
- Receita: ${fmtBRL(recPass)}
- Despesas: ${fmtBRL(despPass)}
- Resultado: ${fmtBRL(recPass - despPass)}

RECEITA ANUAL (últimos 12 meses): ${fmtBRL(recAnual)}

DESPESAS POR CATEGORIA (mês atual):
${catStr || 'Nenhuma despesa categorizada'}

ÚLTIMOS 10 LANÇAMENTOS:
${ultStr || 'Nenhum lançamento registrado'}`
}

async function contextoTarefeiro(supabase: any) {
  const [
    { data: cfg },
    { data: tarefasPendentes },
    { data: tarefasFeitas },
    { count: totalFeitas30d },
  ] = await Promise.all([
    supabase.from('empresa_config').select('nome').limit(1).maybeSingle(),
    supabase.from('tarefas').select('titulo,status,prioridade,data_limite,responsavel,created_at').eq('empresa_id', EMPRESA_ID).in('status', ['todo', 'doing']).order('prioridade', { ascending: false }).order('data_limite', { ascending: true }),
    supabase.from('tarefas').select('titulo,updated_at').eq('empresa_id', EMPRESA_ID).eq('status', 'done').order('updated_at', { ascending: false }).limit(5),
    supabase.from('tarefas').select('*', { count: 'exact', head: true }).eq('empresa_id', EMPRESA_ID).eq('status', 'done').gte('updated_at', daysAgo(30)),
  ])

  const agora = new Date().toISOString()
  const urgentes = (tarefasPendentes ?? []).filter((t: any) => t.prioridade === 'urgente' || t.prioridade === 'alta')
  const atrasadas = (tarefasPendentes ?? []).filter((t: any) => t.data_limite && t.data_limite < agora)
  const semPrazo = (tarefasPendentes ?? []).filter((t: any) => !t.data_limite)

  function fmtTarefa(t: any) {
    const prio = t.prioridade?.toUpperCase() ?? 'MÉDIA'
    const prazo = t.data_limite ? `prazo: ${new Date(t.data_limite).toLocaleDateString('pt-BR')}` : 'sem prazo'
    const status = t.status === 'doing' ? '[EM ANDAMENTO]' : '[A FAZER]'
    const atrasada = t.data_limite && t.data_limite < agora ? ' ⚠ ATRASADA' : ''
    return `• ${status} [${prio}] ${t.titulo} (${prazo})${atrasada}`
  }

  return `EMPRESA: ${(cfg as any)?.nome ?? 'Luno'} | Data: ${new Date().toLocaleDateString('pt-BR')}

RESUMO DE TAREFAS:
- Pendentes (A fazer + Em andamento): ${(tarefasPendentes ?? []).length}
- Atrasadas: ${atrasadas.length}
- Alta prioridade / Urgentes: ${urgentes.length}
- Sem prazo definido: ${semPrazo.length}
- Concluídas nos últimos 30 dias: ${totalFeitas30d ?? 0}

TAREFAS PENDENTES:
${(tarefasPendentes ?? []).length === 0 ? 'Nenhuma tarefa pendente — tudo em dia!' : (tarefasPendentes ?? []).map(fmtTarefa).join('\n')}

CONCLUÍDAS RECENTEMENTE:
${(tarefasFeitas ?? []).map((t: any) => `✓ ${t.titulo} (${new Date(t.updated_at).toLocaleDateString('pt-BR')})`).join('\n') || 'Nenhuma concluída ainda'}`
}

// ── System prompts ──────────────────────────────────────────────────────────

const SYSTEM_PROMPTS: Record<string, string> = {
  orquestrador: `Você é o Orquestrador da Equipe de IA do sistema Luno — sistema de gestão para pequenos e médios negócios.
Você tem acesso aos dados reais do negócio no contexto abaixo. USE ESSES DADOS para dar respostas específicas, com números reais.
Nunca diga "não tenho acesso aos dados" — os dados estão no contexto. Se algo não tiver dados, diga que ainda não há registros.
Seja direto, estratégico e use os números reais na resposta. Português brasileiro.`,

  mkt: `Você é o Agente de Marketing do sistema Luno para pequenos e médios negócios.
USE OS DADOS REAIS fornecidos (canais, aniversariantes, novos clientes) para criar sugestões específicas e mensuráveis.
Nunca diga "não tenho acesso" — os dados estão no contexto. Seja criativo, prático e cite os números reais. Português brasileiro.`,

  comercial: `Você é o Agente Comercial do sistema Luno, especialista em vendas e CRM.
USE OS DADOS REAIS do pipeline, clientes inativos e LTV para análises concretas e ações específicas.
Nunca diga "não tenho acesso" — os dados estão no contexto. Cite nomes, valores e percentuais reais. Português brasileiro.`,

  financeiro: `Você é o Agente Financeiro do sistema Luno, especialista em gestão financeira.
USE OS DADOS REAIS de lançamentos, receitas e despesas para análises precisas. Compare meses, calcule variações, identifique tendências.
Nunca diga "não tenho acesso" — os dados estão no contexto. Seja analítico, cite os números exatos. Português brasileiro.`,

  tarefeiro: `Você é o Agente Tarefeiro do sistema Luno — assistente pessoal do gestor.
USE AS TAREFAS REAIS DO SISTEMA para organizar prioridades e dar recomendações concretas.
Quando listar tarefas, use os dados reais do contexto. Quando criar uma nova tarefa, confirme que foi registrada.
Seja organizado e objetivo. Português brasileiro.`,
}

const CONTEXTO_FNS: Record<string, (supabase: any) => Promise<string>> = {
  orquestrador: contextoOrquestrador,
  mkt: contextoMkt,
  comercial: contextoComercial,
  financeiro: contextoFinanceiro,
  tarefeiro: contextoTarefeiro,
}

// ── Handler ────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { agente, mensagem, historico = [] } = await req.json()

    if (!mensagem || !agente) {
      return Response.json({ error: 'mensagem e agente são obrigatórios' }, { status: 400 })
    }

    const supabase = supabaseService()

    // Resolve chave Anthropic do cliente (debitado na conta dele, não na de Luciano)
    const { anthropicApiKey } = await getEmpresaConfig()

    const contextFn = CONTEXTO_FNS[agente] ?? CONTEXTO_FNS.orquestrador
    const systemBase = SYSTEM_PROMPTS[agente] ?? SYSTEM_PROMPTS.orquestrador

    const contexto = await contextFn(supabase)

    const anthropic = new Anthropic({ apiKey: anthropicApiKey ?? process.env.ANTHROPIC_API_KEY! })

    const messages: Anthropic.MessageParam[] = [
      ...historico.map((m: { role: string; text: string }) => ({
        role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.text,
      })),
      { role: 'user' as const, content: mensagem },
    ]

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemBase + '\n\n--- DADOS REAIS DO NEGÓCIO ---\n' + contexto,
      messages,
    })

    const resposta = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')

    return Response.json({ resposta })
  } catch (err) {
    console.error('[agentes/chat]', err)
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
