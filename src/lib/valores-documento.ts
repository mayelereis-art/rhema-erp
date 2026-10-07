/**
 * Valores de um orçamento ou contrato — total cobrado do cliente e entrada do
 * rateio — calculados num lugar só, para orçamento, contrato, parcelas, painel
 * e tela de Rateio nunca divergirem.
 *
 * Duas bases de rateio convivem (os percentuais de src/lib/rateio.ts não mudam):
 * - LEGADA (documentos sem `baseRateio`): lucro = itens − desconto − custos.
 *   É o cálculo de sempre; documentos antigos continuam dando o mesmo número.
 * - RECEITA_MENOS_CUSTOS (Orçamento Inteligente): lucro = tudo o que o cliente
 *   paga − todos os custos reais (serviço + custos internos: materiais, itens
 *   novos, uso de itens próprios, contingência, produção no Pegue e Monte).
 */

import { calcularRateio, type ResultadoRateio } from "./rateio";
import type { ItemAvulso, ItemContrato, TipoServico } from "./firestore-schema";

export type BaseRateio = "RECEITA_MENOS_CUSTOS";

export interface DocumentoValores {
  tipoServico: TipoServico;
  itens: ItemContrato[];
  itensAvulsos?: ItemAvulso[];
  custos: number;
  custosInternos?: number;
  desconto?: number;
  baseRateio?: BaseRateio;
}

export interface Valores {
  totalItens: number;
  totalAvulsos: number;
  valorMontagem: number;
  desconto: number;
  valorTotal: number;
  rateio: ResultadoRateio;
}

const r2 = (v: number) => Math.round(v * 100) / 100;

export function calcularValores(d: DocumentoValores): Valores {
  const totalItens = d.itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0);
  const totalAvulsos = (d.itensAvulsos ?? []).reduce((s, i) => s + i.quantidade * i.precoUnitario, 0);
  const valorMontagem = d.tipoServico === "PRESENCIAL" ? d.custos : 0;
  const desconto = d.desconto ?? 0;
  const valorTotal = Math.max(0, totalItens + totalAvulsos + valorMontagem - desconto);
  const tipo = d.tipoServico === "PRESENCIAL" ? "presencial" : "pegmonte";

  const rateio =
    d.baseRateio === "RECEITA_MENOS_CUSTOS"
      ? calcularRateio(totalItens + totalAvulsos + valorMontagem, d.custos + (d.custosInternos ?? 0), tipo, desconto)
      : calcularRateio(totalItens, d.custos, tipo, desconto);

  return {
    totalItens: r2(totalItens),
    totalAvulsos: r2(totalAvulsos),
    valorMontagem: r2(valorMontagem),
    desconto: r2(desconto),
    valorTotal: r2(valorTotal),
    rateio,
  };
}
