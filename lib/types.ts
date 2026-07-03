export type UserRole = 'admin' | 'medica' | 'comercial'

export type InsumoCategoria =
  | 'bioestimulador' | 'fios' | 'preenchedor' | 'skinbooster'
  | 'toxina' | 'anestesico' | 'seringa' | 'agulha' | 'canula' | 'material'

export interface InsumoTier {
  quantidade: number   // unidades compradas
  preco_unit: number   // preço por unidade nesse tier
}

export interface Insumo {
  id: string
  nome: string
  categoria: InsumoCategoria
  marca: string | null
  fornecedor: string | null
  contato: string | null
  tiers: InsumoTier[]       // [] = sem desconto por volume
  custo_atual: number       // custo por unidade de consumo
  estoque_atual: number     // em unidades de consumo
  estoque_minimo: number    // em unidades de consumo
  unidade: string           // unidade de consumo: 'un', 'UI', 'ml', 'g', 'uso'
  preco_compra: number | null       // preço pago por 1 unidade de compra
  unidade_compra: string | null     // 'frasco', 'Cx', 'bisnaga', 'ampola'
  qtd_por_unidade_compra: number | null  // rendimento: quantas unidades de consumo por compra
  dysport_conversao: boolean
  fator_conversao: number   // 0.4 para 500UI→200UI; 1 para os demais
  lote: string | null
  data_validade: string | null
}

export interface Procedimento {
  id: string
  nome: string
  tempo_minutos: number
  preco_tabela: number
  preco_minimo?: number | null
  categoria?: string | null
  disparos?: number | null
}

export interface ProcedimentoInsumo {
  id: string
  procedimento_id: string
  insumo_id: string
  quantidade: number
  insumo?: Insumo
}

export type CanalAquisicao = 'instagram' | 'indicacao' | 'google' | 'anuncios' | 'outros'

export interface Paciente {
  id: string
  nome: string
  telefone: string
  email: string | null
  cpf: string | null
  obs: string | null
  data_nascimento: string | null
  canal_aquisicao: CanalAquisicao | null
  created_at?: string
}

export type AvaliacaoStatus =
  | 'rascunho' | 'pendente' | 'em_negociacao' | 'fechado' | 'perdido'

export interface Avaliacao {
  id: string
  paciente_id: string
  medica_id: string
  status: AvaliacaoStatus
  created_at: string
  updated_at: string
  paciente?: Paciente
  opcoes?: AvaliacaoOpcao[]
}

export type FormaPagamento = 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'parcelado'

export type NivelProtocolo = 'completo' | 'intermediario' | 'basico'

export interface AvaliacaoOpcao {
  id: string
  avaliacao_id: string
  numero_opcao: 1 | 2 | 3
  nivel: NivelProtocolo | null
  recomendado: boolean
  desconto_sugerido: number | null
  preco_negociado: number | null
  obs_comercial: string | null
  forma_pagamento: FormaPagamento | null
  procedimentos?: OpcaoProcedimento[]
  brindes?: OpcaoBrinde[]
}

export interface OpcaoProcedimento {
  id: string
  opcao_id: string
  procedimento_id: string
  procedimento?: Procedimento & { insumos?: ProcedimentoInsumo[] }
}

export interface OpcaoBrinde {
  id: string
  opcao_id: string
  insumo_id: string
  quantidade: number
  obs: string | null
  insumo?: Insumo
}

export interface CustoOpcao {
  custo_insumos: number   // soma dos insumos dos procedimentos
  custo_brindes: number   // brindes têm custo real para a clínica
  custo_total: number     // custo_insumos + custo_brindes
  preco_tabela: number    // soma dos preco_tabela dos procedimentos
  margem_bruta: number    // preco_tabela - custo_total
  margem_pct: number
}

// ——— FASE 2: Módulos Clínicos ———

export type AgendaStatus = 'agendado' | 'confirmado' | 'realizado' | 'cancelado' | 'faltou'
export type AgendaTipo   = 'consulta' | 'retorno' | 'procedimento' | 'avaliacao'

export interface AgendaItem {
  id: string
  paciente_id: string
  medica_id: string
  data_hora: string
  duracao_minutos: number
  tipo: AgendaTipo
  status: AgendaStatus
  obs: string | null
  created_at: string
  paciente?: Paciente
}

export interface Anamnese {
  id: string
  paciente_id: string
  token_publico: string
  respondida_em: string | null
  dados: Record<string, unknown> | null
  created_at: string
  paciente?: Paciente
}

export interface TermoConsentimento {
  id: string
  paciente_id: string
  avaliacao_id: string | null
  assinado_em: string | null
  consentimento_clinico: boolean
  autorizacao_marketing: boolean
  ip_assinatura: string | null
  dados: Record<string, unknown> | null
  created_at: string
  paciente?: Paciente
}

export interface ProntuarioConsulta {
  id: string
  paciente_id: string
  medica_id: string
  agenda_id: string | null
  avaliacao_id: string | null
  data_consulta: string
  notas_clinicas: string | null
  alergias: string | null
  contraindicacoes: string | null
  created_at: string
  updated_at: string
  paciente?: Paciente
}

export type AnguloFoto = 'frontal' | 'perfil_direito' | 'perfil_esquerdo' | 'diagonal_direito' | 'diagonal_esquerdo' | 'sorriso'
export type TipoFoto   = 'antes' | 'depois'

export interface FotoClinical {
  id: string
  paciente_id: string
  consulta_id: string | null
  angulo: AnguloFoto
  storage_path: string
  autoriza_marketing: boolean
  tipo: TipoFoto
  created_at: string
}

// ——— FASE 3: Financeiro ———

export const MESES_FIN = ['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06','2026-07','2026-08','2026-09','2026-10','2026-11','2026-12'] as const
export type MesFin = typeof MESES_FIN[number]

export const MESES_LABEL: Record<string, string> = {
  '2026-01':'Janeiro/26','2026-02':'Fevereiro/26',
  '2026-03':'Março/26','2026-04':'Abril/26','2026-05':'Maio/26','2026-06':'Junho/26',
  '2026-07':'Julho/26','2026-08':'Agosto/26','2026-09':'Setembro/26',
  '2026-10':'Outubro/26','2026-11':'Novembro/26','2026-12':'Dezembro/26',
}

export const MESES_OBRA = ['2026-04','2026-05']
export const MESES_PRE  = ['2026-01','2026-02','2026-03']

export type FormaPagamentoFin = 'dinheiro' | 'pix' | 'debito' | 'credito'
export type CategoriaLanc = 'fixo' | 'variavel' | 'emergencia'
export type StatusLanc = 'pend' | 'pago'

export interface LancamentoEntrada {
  id: string
  mes: string
  tipo: 'entrada'
  data_lancamento: string | null
  descricao: string | null
  valor_bruto: number
  forma_pagamento: FormaPagamentoFin
  pct_maquineta: number | null
  pct_imposto: number
  parcelas: number
  fee_repassada: boolean
  paciente_id?: string | null
  created_at?: string
}

export interface LancamentoSaida {
  id: string
  mes: string
  tipo: 'saida'
  descricao: string | null
  categoria: CategoriaLanc
  valor_previsto: number
  valor_real: number | null
  dia_vencimento: number | null
  data_lancamento: string | null
  status: StatusLanc
  ref_id: string | null
  obs: string | null
  created_at?: string
}

export interface CustoConfig {
  id: string
  tipo: 'fixo' | 'variavel' | 'emergencia'
  descricao: string
  valor: number
  dia_vencimento: number | null
  estimado: boolean
  ativo: boolean
  posicao: number
}

export interface ConfigFinanceiro {
  id: number
  fc_inicial: number
  aliq_simples: number
  pct_dinheiro: number
  pct_pix: number
  pct_debito: number
  pct_credito: number
  reserva_acumulada: number
  pct_reserva?: number
  regime_fiscal?: 'mei' | 'simples'
  mei_limite_anual?: number
}

export interface EmprestimoParcela {
  numero: number
  data_vencimento: string
  valor: number
  pago: boolean
}

export interface ObraCategoria {
  id: string
  nome: string
  posicao: number
  itens?: ObraItem[]
}

export interface ObraItem {
  id: string
  categoria_id: string
  descricao: string
  valor_projetado: number
  valor_real: number
  pago: boolean
  retorno: boolean
  posicao: number
}

// ——— FASE 4: Orçamentos ———

export type StatusOrcamento = 'rascunho' | 'enviado' | 'aprovado' | 'recusado'

export interface OrcamentoItem {
  id: string
  orcamento_id: string
  descricao: string
  valor: number
  posicao: number
}

export interface Orcamento {
  id: string
  paciente_id: string
  medica_id: string
  avaliacao_id: string | null
  status: StatusOrcamento
  titulo: string | null
  obs: string | null
  validade_dias: number
  token: string
  created_at: string
  updated_at: string
  pacientes?: { nome: string; telefone: string }
  orcamento_itens?: OrcamentoItem[]
}
