"use server";

import { exigirFinanceiro } from "./sessao-servidor";
import { listarContratosFechados } from "./contratos";
import type { Destinatario } from "./rateio";
import type { TipoServico } from "./firestore-schema";
import { calcularValores } from "./valores-documento";

export interface LinhaRateio {
  contratoId: string;
  numero: number;
  evento: string;
  clienteNome: string;
  total: number;
  custos: number;
  lucro: number;
  tipoServico: TipoServico;
  fatias: Array<{ destino: Destinatario; rotulo: string; pct: number; valor: number }>;
}

/** Acumula o rateio de todos os contratos fechados (CONFIRMADO/CONCLUIDO). */
export async function listarRateioContratos(nomeCliente: Record<string, string>): Promise<LinhaRateio[]> {
  await exigirFinanceiro();
  const contratos = await listarContratosFechados();
  return contratos.map((c) => {
    const v = calcularValores(c);
    const resultado = v.rateio;
    const total = c.baseRateio ? v.totalItens + v.totalAvulsos + v.valorMontagem : v.totalItens;
    return {
      contratoId: c.id,
      numero: c.numero,
      evento: c.evento,
      clienteNome: nomeCliente[c.clienteId] ?? "—",
      total,
      custos: resultado.custos,
      lucro: resultado.lucro,
      tipoServico: c.tipoServico,
      fatias: resultado.fatias,
    };
  });
}
