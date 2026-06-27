"use server";

import { listarContratosFechados } from "./contratos";
import { calcularRateio, type Destinatario, type TipoServico as TipoServicoLower } from "./rateio";
import type { TipoServico } from "./firestore-schema";

const MAPA_TIPO: Record<TipoServico, TipoServicoLower> = { PRESENCIAL: "presencial", PEGMONTE: "pegmonte" };

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
  const contratos = await listarContratosFechados();
  return contratos.map((c) => {
    const total = c.itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0);
    const resultado = calcularRateio(total, c.custos, MAPA_TIPO[c.tipoServico]);
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
