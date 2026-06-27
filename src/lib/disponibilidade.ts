/**
 * Disponibilidade por período — regra crítica do negócio (ver CLAUDE.md item 4).
 *
 * Um produto não pode ser alugado além do estoque dentro de um intervalo de
 * datas que se sobreponha. "Comprometido" = soma das quantidades em contratos
 * (ORCAMENTO ou CONFIRMADO) cujo intervalo de datas se sobrepõe ao período consultado.
 *
 * As funções puras abaixo não tocam o Firestore — são testáveis isoladamente.
 * O acesso a dados fica em consultarDisponibilidade/verificarDisponivel, no fim do arquivo.
 */

export interface ItemPeriodo {
  produtoId: string;
  quantidade: number;
}

export interface ContratoPeriodo {
  id: string;
  inicio: Date;
  fim: Date;
  status: "ORCAMENTO" | "CONFIRMADO" | "CONCLUIDO" | "CANCELADO";
  itens: ItemPeriodo[];
}

// Apenas ORCAMENTO e CONFIRMADO comprometem estoque; CONCLUIDO já devolveu,
// CANCELADO nunca chegou a sair.
const STATUS_QUE_COMPROMETEM = new Set(["ORCAMENTO", "CONFIRMADO"]);

/** Dois intervalos [aInicio,aFim] e [bInicio,bFim] se sobrepõem? */
export function seSobrepoe(aInicio: Date, aFim: Date, bInicio: Date, bFim: Date): boolean {
  return aInicio.getTime() <= bFim.getTime() && bInicio.getTime() <= aFim.getTime();
}

/**
 * Soma a quantidade de `produtoId` comprometida no período [inicio, fim],
 * considerando apenas contratos em ORCAMENTO/CONFIRMADO que se sobrepõem.
 * `ignorarContratoId` serve para excluir o próprio contrato ao editá-lo.
 */
export function calcularComprometido(
  contratos: ContratoPeriodo[],
  produtoId: string,
  inicio: Date,
  fim: Date,
  ignorarContratoId?: string
): number {
  return contratos
    .filter((c) => c.id !== ignorarContratoId)
    .filter((c) => STATUS_QUE_COMPROMETEM.has(c.status))
    .filter((c) => seSobrepoe(c.inicio, c.fim, inicio, fim))
    .reduce((soma, c) => {
      const item = c.itens.find((i) => i.produtoId === produtoId);
      return soma + (item?.quantidade ?? 0);
    }, 0);
}

/** Quantidade livre = estoque total − comprometido no período. */
export function calcularLivre(
  estoqueTotal: number,
  contratos: ContratoPeriodo[],
  produtoId: string,
  inicio: Date,
  fim: Date,
  ignorarContratoId?: string
): number {
  const comprometido = calcularComprometido(contratos, produtoId, inicio, fim, ignorarContratoId);
  return Math.max(0, estoqueTotal - comprometido);
}
