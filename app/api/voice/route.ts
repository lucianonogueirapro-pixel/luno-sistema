import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { EMPRESA_ID } from '@/lib/empresa'

function supabaseService() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const NAVIGATION_MAP: { keywords: string[]; path: string; label: string }[] = [
  { keywords: ['dashboard', 'início', 'inicio', 'visão geral'],                    path: '/dashboard',      label: 'Dashboard' },
  { keywords: ['agenda', 'agendamento', 'agendamentos', 'horários'],               path: '/agenda',         label: 'Agenda' },
  { keywords: ['clientes', 'pacientes', 'cliente', 'paciente'],                    path: '/pacientes',      label: 'Clientes' },
  { keywords: ['crm', 'pipeline', 'funil', 'leads'],                               path: '/crm',            label: 'CRM' },
  { keywords: ['financeiro', 'finanças', 'financeiro', 'financas'],                path: '/financeiro',     label: 'Financeiro' },
  { keywords: ['dre', 'caixa', 'fluxo de caixa'],                                 path: '/dre',            label: 'DRE / Caixa' },
  { keywords: ['custos', 'custo'],                                                  path: '/custos',         label: 'Custos' },
  { keywords: ['tarefas', 'tarefa', 'tarefeiro', 'kanban'],                        path: '/tarefas',        label: 'Tarefas' },
  { keywords: ['agentes', 'ia', 'inteligência artificial', 'equipe de ia'],        path: '/agentes',        label: 'Agentes IA' },
  { keywords: ['atendimento', 'whatsapp', 'luna'],                                 path: '/atendimento',    label: 'Atendimento' },
  { keywords: ['profissionais', 'profissional', 'colaboradores'],                  path: '/profissionais',  label: 'Profissionais' },
  { keywords: ['serviços', 'servicos', 'procedimentos', 'procedimento'],           path: '/procedimentos',  label: 'Serviços' },
  { keywords: ['produtos', 'insumos', 'produto', 'estoque'],                       path: '/insumos',        label: 'Produtos' },
  { keywords: ['configurações', 'configuracoes', 'configuração', 'configuracao'],  path: '/configuracoes',  label: 'Configurações' },
  { keywords: ['notificações', 'notificacoes', 'notificação'],                     path: '/notificacoes',   label: 'Notificações' },
]

const TASK_KEYWORDS = [
  'lembra de', 'lembrar de', 'não esquecer de', 'nao esquecer de',
  'cria tarefa', 'criar tarefa', 'adiciona tarefa', 'adicionar tarefa',
  'anota', 'anotar', 'coloca para fazer', 'add tarefa',
]

const PRIORITY_KEYWORDS: { words: string[]; level: string }[] = [
  { words: ['urgente', 'urgentíssimo', 'muito urgente'],       level: 'urgente' },
  { words: ['importante', 'alta prioridade', 'prioritário'],   level: 'alta' },
  { words: ['baixa prioridade', 'quando puder', 'sem pressa'], level: 'baixa' },
]

function detectNavigation(text: string): { path: string; label: string } | null {
  const lower = text.toLowerCase()
  for (const entry of NAVIGATION_MAP) {
    if (entry.keywords.some(k => lower.includes(k))) return entry
  }
  return null
}

function detectTaskIntent(text: string): string | null {
  const lower = text.toLowerCase()
  for (const kw of TASK_KEYWORDS) {
    if (lower.includes(kw)) {
      const idx = lower.indexOf(kw)
      return text.slice(idx + kw.length).trim().replace(/^[,:;]\s*/, '')
    }
  }
  return null
}

function detectPriority(text: string): string {
  const lower = text.toLowerCase()
  for (const p of PRIORITY_KEYWORDS) {
    if (p.words.some(w => lower.includes(w))) return p.level
  }
  return 'media'
}

export async function POST(req: NextRequest) {
  try {
    const { transcript } = await req.json()
    if (!transcript) return Response.json({ response: 'Não entendi o comando.' })

    const lower = transcript.toLowerCase()

    // 1. Navigation intent
    const navMatch = detectNavigation(lower)
    if (navMatch && (lower.includes('abrir') || lower.includes('abre') || lower.includes('ir para') || lower.includes('vai para') || lower.includes('mostra') || lower.includes('navegar'))) {
      return Response.json({
        action: 'navigate',
        path: navMatch.path,
        response: `Abrindo ${navMatch.label}…`,
      })
    }

    // 2. Task creation intent
    const taskTitle = detectTaskIntent(transcript)
    if (taskTitle) {
      const prioridade = detectPriority(transcript)
      const supabase = supabaseService()

      const { error } = await supabase.from('tarefas').insert({
        empresa_id: EMPRESA_ID,
        titulo: taskTitle.charAt(0).toUpperCase() + taskTitle.slice(1),
        status: 'todo',
        prioridade,
      })

      if (error) {
        console.error('[voice] insert tarefa:', error)
        return Response.json({ response: `Entendi: "${taskTitle}". Mas houve um erro ao salvar — verifique se a tabela tarefas existe.` })
      }

      const labelPrio = prioridade === 'urgente' ? 'urgente' : prioridade === 'alta' ? 'prioridade alta' : prioridade === 'baixa' ? 'baixa prioridade' : 'prioridade média'
      return Response.json({ response: `Tarefa criada: "${taskTitle}" (${labelPrio})` })
    }

    // 3. General: route to Tarefeiro AI
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: `Você é o Tarefeiro, assistente de voz do sistema Luno para pequenas e médias empresas.
Responda em português brasileiro de forma muito curta (máximo 2 frases).
Você pode criar tarefas, responder perguntas rápidas do gestor e dar dicas de produtividade.
Data atual: ${new Date().toLocaleDateString('pt-BR')}.`,
      messages: [{ role: 'user', content: transcript }],
    })

    const resposta = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')

    return Response.json({ response: resposta })
  } catch (err) {
    console.error('[voice]', err)
    return Response.json({ response: 'Erro ao processar comando.' })
  }
}
