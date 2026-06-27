/**
 * Regras do Alinhamento Societário da Rhema Decorações (Modelo C).
 *
 * Fonte: documento "Alinhamento Societário", versão definitiva de Março/2026.
 *
 * Modelo C — divisão APÓS custos:
 *   1. Do valor do contrato saem todos os custos do serviço
 *      (materiais consumíveis, balões, deslocamento).
 *   2. O lucro líquido resultante é dividido pelos percentuais abaixo,
 *      que dependem do tipo de serviço.
 *
 * Os percentuais são revisáveis 1x por ano, em reunião entre as sócias.
 * Quando o investimento inicial da Maiele estiver recuperado, podem ser
 * rebalanceados. Por isso ficam centralizados aqui, num único lugar.
 */

export type TipoServico = "presencial" | "pegmonte";

export type Destinatario = "Maiele" | "Michele" | "Cassia" | "Caixa";

export interface FatiaRateio {
  destino: Destinatario;
  rotulo: string;
  pct: number;
  justificativa: string;
}

export interface RegraServico {
  rotulo: string;
  fatias: FatiaRateio[];
}

export const RATEIO: Record<TipoServico, RegraServico> = {
  presencial: {
    rotulo: "Serviço presencial (decoração no local)",
    fatias: [
      { destino: "Maiele", rotulo: "Maiele", pct: 40, justificativa: "Investimento, gestão, logística, redes sociais, contratos" },
      { destino: "Michele", rotulo: "Michele", pct: 35, justificativa: "Execução presencial completa da decoração" },
      { destino: "Cassia", rotulo: "Cássia", pct: 2, justificativa: "Uso da marca + participação estratégica" },
      { destino: "Caixa", rotulo: "Caixa da empresa", pct: 23, justificativa: "Reposição de acervo, novos itens, reserva operacional" },
    ],
  },
  pegmonte: {
    rotulo: "Kit Peg&Monte (retirada pelo cliente)",
    fatias: [
      { destino: "Maiele", rotulo: "Maiele", pct: 30, justificativa: "Acervo, separação, entrega, gestão e contratos" },
      { destino: "Michele", rotulo: "Michele", pct: 10, justificativa: "Comissão pelo suporte e orientação de montagem" },
      { destino: "Cassia", rotulo: "Cássia", pct: 0, justificativa: "Não atua neste serviço" },
      { destino: "Caixa", rotulo: "Caixa da empresa", pct: 60, justificativa: "Alto reinvestimento — cobrir avarias, ampliar acervo" },
    ],
  },
};

// Política de pagamento definida no alinhamento.
export const SINAL_PCT = 50; // 50% de sinal confirma a reserva; saldo no cartão.

export interface ResultadoRateio {
  total: number;
  custos: number;
  lucro: number;
  regra: RegraServico;
  fatias: Array<{ destino: Destinatario; rotulo: string; pct: number; valor: number }>;
}

/**
 * Calcula o rateio de um contrato.
 * @param total  valor total do contrato (soma dos itens)
 * @param custos custos do serviço, que saem antes da divisão
 * @param tipo   tipo de serviço, que define os percentuais
 */
export function calcularRateio(total: number, custos: number, tipo: TipoServico): ResultadoRateio {
  const t = Math.max(0, Number(total) || 0);
  const c = Math.max(0, Number(custos) || 0);
  const lucro = Math.max(0, t - c);
  const regra = RATEIO[tipo] ?? RATEIO.presencial;
  const fatias = regra.fatias.map((f) => ({
    destino: f.destino,
    rotulo: f.rotulo,
    pct: f.pct,
    valor: Math.round(((lucro * f.pct) / 100) * 100) / 100,
  }));
  return { total: t, custos: c, lucro, regra, fatias };
}

/**
 * Gera as parcelas padrão de um contrato: sinal de 50% + saldo.
 * @param total      valor total
 * @param dataInicio data de retirada/início (vencimento do sinal)
 * @param dataFim    data de devolução/fim (vencimento do saldo)
 */
export function gerarParcelas(total: number, dataInicio: string, dataFim: string) {
  const t = Math.round((Number(total) || 0) * 100) / 100;
  const sinal = Math.round(((t * SINAL_PCT) / 100) * 100) / 100;
  const saldo = Math.round((t - sinal) * 100) / 100;
  return [
    { rotulo: "Sinal 50%", vencimento: dataInicio, valor: sinal, pago: false },
    { rotulo: "Saldo (cartão)", vencimento: dataFim, valor: saldo, pago: false },
  ];
}
