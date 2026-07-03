import type { AvaliacaoOpcao, CustoOpcao, Insumo } from './types'

/** Custo real de um insumo por unidade, respeitando conversão Dysport */
export function custoUnitario(insumo: Insumo): number {
  if (insumo.dysport_conversao && insumo.fator_conversao > 0) {
    return insumo.custo_atual * insumo.fator_conversao
  }
  return insumo.custo_atual
}

/** Calcula custo total e margens de uma opção */
export function calcularCustoOpcao(opcao: AvaliacaoOpcao): CustoOpcao {
  let custo_insumos = 0
  let preco_tabela = 0

  for (const op of opcao.procedimentos ?? []) {
    const proc = op.procedimento
    if (!proc) continue
    preco_tabela += proc.preco_tabela
    for (const pi of proc.insumos ?? []) {
      if (!pi.insumo) continue
      custo_insumos += custoUnitario(pi.insumo) * pi.quantidade
    }
  }

  let custo_brindes = 0
  for (const b of opcao.brindes ?? []) {
    if (!b.insumo) continue
    custo_brindes += custoUnitario(b.insumo) * b.quantidade
  }

  const custo_total = custo_insumos + custo_brindes
  const margem_bruta = preco_tabela - custo_total
  const margem_pct = preco_tabela > 0 ? (margem_bruta / preco_tabela) * 100 : 0

  return { custo_insumos, custo_brindes, custo_total, preco_tabela, margem_bruta, margem_pct }
}
