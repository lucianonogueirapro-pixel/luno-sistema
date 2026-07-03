import Anthropic from '@anthropic-ai/sdk'

const PROMPT_FALLBACK = `Você é Luna, assistente virtual de atendimento da empresa. Você faz o primeiro contato via WhatsApp.

REGRAS:
- Nunca diga que é IA, robô ou sistema automático
- Tom acolhedor e humano — como uma conversa real de WhatsApp
- Faça UMA pergunta por vez
- Mensagens curtas — máximo 3 linhas por resposta
- Sem emojis excessivos

MISSÃO: entender a necessidade do cliente e conduzi-lo ao próximo passo (agendamento, orçamento ou atendimento).

FLUXO:
1. Cumprimente e pergunte o nome com leveza
2. Identifique a necessidade — o que trouxe o cliente?
3. Aprofunde com UMA pergunta específica
4. Proponha o próximo passo claro (agendar, visitar, enviar orçamento)

SE A CONVERSA JÁ AVANÇOU: não repita apresentações. Continue de onde parou.

IMPORTANTE: Se este prompt padrão não refletir seu negócio, configure um prompt personalizado em Atendimento → Configurações.

TOM: Natural, frases curtas. Caloroso e eficiente.`

function loadSkill(customPrompt?: string | null): string {
  if (customPrompt?.trim()) return customPrompt
  // Tenta ler arquivo de skill local (desenvolvimento)
  try {
    const path = process.env.LUNA_SKILL_PATH
    if (path) {
      const { existsSync, readFileSync } = require('fs') as typeof import('fs')
      if (existsSync(path)) return readFileSync(path, 'utf-8')
    }
  } catch {}
  return PROMPT_FALLBACK
}

export interface LauraMsg {
  direcao: 'entrada' | 'saida'
  conteudo: string | null
  created_at: string
}

export interface SlotDisponivel {
  iso: string
  label: string
  profissional_id?: string
  profissional_nome?: string
}

export interface LauraCtx {
  telefone: string
  nome?: string | null
  historico: LauraMsg[]
  customPrompt?: string | null
  slotsDisponiveis?: SlotDisponivel[]
  model?: string
  apiKey?: string | null
}

export interface LauraResult {
  resposta: string
  inputTokens: number
  outputTokens: number
}

export async function lauraResponde(ctx: LauraCtx): Promise<LauraResult> {
  const anthropic = new Anthropic({ apiKey: ctx.apiKey ?? process.env.ANTHROPIC_API_KEY! })

  const skill = loadSkill(ctx.customPrompt)

  const slotsBloco = ctx.slotsDisponiveis?.length
    ? `\n\nHORÁRIOS DISPONÍVEIS PARA AVALIAÇÃO:\n${ctx.slotsDisponiveis.map((s, i) => {
        const profTag = s.profissional_id ? `|PROF:${s.profissional_id}` : ''
        return `${i + 1}. ${s.label} [ISO:${s.iso}${profTag}]`
      }).join('\n')}\n\nREGRA DE AGENDAMENTO: Quando a lead confirmar um horário específico e fornecer o nome, inclua EXATAMENTE ao final da sua resposta (sem nenhum texto depois): <<AGENDAR:ISO_DA_DATA:NOME_DA_PESSOA:PROF_ID>>\nExemplo: <<AGENDAR:2026-06-10T10:00:00.000Z:Ana Silva:uuid-do-profissional>>\nSe não houver profissional vinculado ao slot, omita o terceiro campo: <<AGENDAR:2026-06-10T10:00:00.000Z:Ana Silva>>\nEsse marcador será removido antes de enviar ao WhatsApp.`
    : ''

  const nomeBloco = ctx.nome
    ? `NOME DA PESSOA NESSA CONVERSA: ${ctx.nome}\nUse esse nome naturalmente ao longo da conversa.\n\n`
    : ''

  const system = [
    nomeBloco,
    skill,
    slotsBloco,
    `\nContato: ${ctx.telefone}`,
    `\nData/hora atual: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' })}`,
  ].join('')

  const history = ctx.historico.slice(-40)

  const apiMessages: Anthropic.MessageParam[] = history.map(m => ({
    role: m.direcao === 'entrada' ? 'user' : 'assistant',
    content: m.conteudo ?? '',
  }))

  if (!apiMessages.length) {
    return {
      resposta: 'Olá! Bem-vinda à Luno. Aqui é a Luna. Como posso te ajudar?',
      inputTokens: 0,
      outputTokens: 0,
    }
  }

  // Garante alternância: remove mensagens consecutivas do mesmo role
  const clean: Anthropic.MessageParam[] = []
  for (const m of apiMessages) {
    if (clean.length && clean[clean.length - 1].role === m.role) continue
    clean.push(m)
  }
  if (clean[clean.length - 1].role !== 'user') clean.pop()
  // Garante que começa com 'user'
  while (clean.length > 0 && clean[0].role !== 'user') clean.shift()

  const model = ctx.model ?? 'claude-haiku-4-5-20251001'

  const response = await anthropic.messages.create({
    model,
    max_tokens: 512,
    system,
    messages: clean,
  })

  const block = response.content[0]
  return {
    resposta: block?.type === 'text' ? block.text.trim() : '',
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  }
}
