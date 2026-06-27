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

/** Valor/hora padrão da decoradora no serviço presencial. */
export const VALOR_HORA_DECORACAO_PADRAO = 80;

export interface CustoServicoPresencial {
  horas: number;
  valorHora: number;
  deslocamento: number;
  desmontagem: number;
}

/**
 * Custo do serviço presencial = mão de obra (horas × valor/hora) + deslocamento
 * + desmontagem. Alimenta o campo "Custos do serviço" do orçamento/contrato,
 * que por sua vez sai do lucro antes do rateio (ver src/lib/rateio.ts).
 */
export function calcularCustoServicoPresencial(c: CustoServicoPresencial): number {
  const horas = Math.max(0, Number(c.horas) || 0);
  const valorHora = Math.max(0, Number(c.valorHora) || 0);
  const deslocamento = Math.max(0, Number(c.deslocamento) || 0);
  const desmontagem = Math.max(0, Number(c.desmontagem) || 0);
  return Math.round((horas * valorHora + deslocamento + desmontagem) * 100) / 100;
}
