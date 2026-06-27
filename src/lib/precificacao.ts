/**
 * Sugestão de preço de diária para itens do catálogo.
 *
 * Regra do setor de locação de eventos: o preço por uso deve recuperar entre
 * 10% e 20% do custo de aquisição da peça, dependendo do desgaste. Assim o
 * item se paga em 5–10 locações; difere de venda porque o mesmo item é
 * alugado repetidas vezes.
 */

export const PERCENTUAL_RECUPERACAO_PADRAO = 15;

/**
 * @param custoAquisicao      quanto custou comprar a peça
 * @param percentualRecuperacao % do custo recuperado por locação (10–20% é a faixa usual)
 */
export function calcularPrecoSugerido(custoAquisicao: number, percentualRecuperacao: number): number {
  const custo = Math.max(0, Number(custoAquisicao) || 0);
  const pct = Math.max(0, Number(percentualRecuperacao) || 0);
  return Math.round(((custo * pct) / 100) * 100) / 100;
}

/** Quantas locações (arredondado para cima) até o item se pagar, no preço atual. */
export function calcularLocacoesParaRecuperar(custoAquisicao: number, precoDiaria: number): number | null {
  if (!custoAquisicao || !precoDiaria) return null;
  return Math.ceil(custoAquisicao / precoDiaria);
}
