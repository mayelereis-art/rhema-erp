/**
 * Motor de custos do Orçamento Inteligente — funções puras, sem Firestore.
 *
 * Separa sempre CUSTO INTERNO (o que a RHEMA gasta) de PREÇO DE VENDA (o que o
 * cliente paga). O cliente nunca vê o custo; a usuária vê os dois e a margem.
 *
 * Regras herdadas do sistema atual (não mudam aqui):
 * - Itens próprios do catálogo são cobrados pela diária cadastrada.
 * - Mão de obra/montagem/deslocamento da decoração presencial entram em
 *   "custos do serviço" e são repassados ao cliente pelo valor de custo
 *   (Cláusula 4 do contrato). No Pegue e Monte não há serviço cobrado.
 * - Deslocamento é custo da empresa, não um item cobrado à parte.
 */

import type { TipoServico } from "./firestore-schema";

export interface RegrasPrecificacao {
  margemMinimaPct: number; // abaixo disso a tela alerta
  markupPct: number; // preço de venda sugerido de itens avulsos = custo × (1 + markup)
  valorHoraProducao: number;
  valorHoraMontagem: number;
  valorHoraDesmontagem: number;
  deslocamentoFixo: number; // por evento presencial
  custoPorKm: number; // km total (ida e volta) informado na tela
  custoUtilizacaoPct: number; // custo interno de uso de item próprio (desgaste, limpeza), % da diária
  perdasPct: number; // sobre o custo dos consumíveis (balão estoura, flor murcha)
  contingenciaPct: number; // sobre o custo total estimado
  adicionalPersonalizacaoPct: number; // sobre o preço, quando há item personalizado
  adicionalUrgenciaPct: number; // sobre o preço, quando o evento está próximo
  diasUrgencia: number;
}

// Valores iniciais = os que o sistema já usava (R$ 80/h da calculadora
// presencial) e zeros onde não havia regra — nada muda até a ADMIN configurar.
export const REGRAS_PADRAO: RegrasPrecificacao = {
  margemMinimaPct: 30,
  markupPct: 100,
  valorHoraProducao: 80,
  valorHoraMontagem: 80,
  valorHoraDesmontagem: 80,
  deslocamentoFixo: 0,
  custoPorKm: 0,
  custoUtilizacaoPct: 0,
  perdasPct: 10,
  contingenciaPct: 5,
  adicionalPersonalizacaoPct: 0,
  adicionalUrgenciaPct: 0,
  diasUrgencia: 7,
};

export type TipoLinha = "ITEM" | "CONSUMIVEL" | "SERVICO";

export interface LinhaCalculo {
  descricao: string;
  quantidade: number;
  tipo: TipoLinha;
  /** Item próprio do catálogo: cobrado pela diária. */
  produtoId?: string;
  precoDiaria?: number;
  /** Item avulso (fora do catálogo): custo interno e preço de venda unitários. */
  custoUnitario?: number;
  precoUnitario?: number;
}

export interface EntradaCalculo {
  modalidade: TipoServico;
  linhas: LinhaCalculo[];
  horas: { producao: number; montagem: number; desmontagem: number };
  km: number;
  dataEvento?: string; // ISO; usada para urgência
  hoje?: Date;
  regras: RegrasPrecificacao;
}

export interface ResultadoCalculo {
  // receita (o que o cliente paga)
  receitaLocacao: number;
  receitaAvulsos: number;
  receitaServico: number; // presencial: custos do serviço repassados ao custo
  adicionalPersonalizacao: number;
  adicionalUrgencia: number;
  precoSugerido: number;
  // custo interno
  custoMateriais: number; // consumíveis, já com perdas
  custoItensNovos: number; // itens/personalizados avulsos
  custoUtilizacao: number; // uso dos itens próprios
  custoMaoDeObra: number;
  custoDeslocamento: number;
  custoContingencia: number;
  custoEstimado: number;
  /** Custo do serviço presencial — é o valor que vai no campo "custos" do orçamento. */
  custoServico: number;
  // indicadores
  precoMinimo: number;
  margemPct: number;
  urgente: boolean;
  alertas: string[];
}

const r2 = (v: number) => Math.round(v * 100) / 100;
const n = (v: unknown) => Math.max(0, Number(v) || 0);

/** Preço de venda sugerido para um item avulso a partir do custo unitário. */
export function precoVendaSugerido(custoUnitario: number, tipo: TipoLinha, regras: RegrasPrecificacao): number {
  const perdas = tipo === "CONSUMIVEL" ? 1 + n(regras.perdasPct) / 100 : 1;
  return r2(n(custoUnitario) * perdas * (1 + n(regras.markupPct) / 100));
}

export function eventoUrgente(dataEvento: string | undefined, regras: RegrasPrecificacao, hoje = new Date()): boolean {
  if (!dataEvento || n(regras.adicionalUrgenciaPct) === 0) return false;
  const dias = (new Date(`${dataEvento.slice(0, 10)}T12:00:00`).getTime() - hoje.getTime()) / 86_400_000;
  return dias >= 0 && dias <= n(regras.diasUrgencia);
}

export function calcularOrcamento(e: EntradaCalculo): ResultadoCalculo {
  const { regras } = e;
  const presencial = e.modalidade === "PRESENCIAL";
  const alertas: string[] = [];

  let receitaLocacao = 0;
  let custoUtilizacao = 0;
  let receitaAvulsos = 0;
  let custoMateriais = 0;
  let custoItensNovos = 0;
  let temPersonalizado = false;

  for (const l of e.linhas) {
    const qtd = n(l.quantidade);
    if (l.tipo === "SERVICO") temPersonalizado = true;
    if (l.produtoId) {
      const diaria = n(l.precoDiaria);
      if (diaria === 0) alertas.push(`"${l.descricao || "Item"}" está sem preço de diária no catálogo.`);
      receitaLocacao += diaria * qtd;
      custoUtilizacao += diaria * qtd * (n(regras.custoUtilizacaoPct) / 100);
      continue;
    }
    const custo = n(l.custoUnitario) * qtd;
    const preco = n(l.precoUnitario) * qtd;
    if (n(l.precoUnitario) === 0) alertas.push(`"${l.descricao || "Item"}" está sem preço de venda definido.`);
    if (n(l.custoUnitario) === 0) alertas.push(`"${l.descricao || "Item"}" está sem custo estimado.`);
    if (preco > 0 && preco < custo) alertas.push(`"${l.descricao || "Item"}" está sendo vendido abaixo do custo.`);
    receitaAvulsos += preco;
    if (l.tipo === "CONSUMIVEL") custoMateriais += custo * (1 + n(regras.perdasPct) / 100);
    else custoItensNovos += custo;
  }

  // Pegue e Monte não tem montagem/desmontagem nem transporte da equipe; a
  // produção (personalização, preparo, embalagem) existe nas duas modalidades.
  const custoMaoDeObra =
    n(e.horas.producao) * n(regras.valorHoraProducao) +
    (presencial ? n(e.horas.montagem) * n(regras.valorHoraMontagem) + n(e.horas.desmontagem) * n(regras.valorHoraDesmontagem) : 0);
  const custoDeslocamento = presencial ? n(regras.deslocamentoFixo) + n(e.km) * n(regras.custoPorKm) : 0;

  const custoBase = custoMateriais + custoItensNovos + custoUtilizacao + custoMaoDeObra + custoDeslocamento;
  const custoContingencia = custoBase * (n(regras.contingenciaPct) / 100);
  const custoEstimado = custoBase + custoContingencia;

  // Regra atual: no presencial, o serviço é cobrado do cliente pelo valor de custo.
  const custoServico = presencial ? custoMaoDeObra + custoDeslocamento : 0;
  const receitaServico = custoServico;

  const base = receitaLocacao + receitaAvulsos + receitaServico;
  const adicionalPersonalizacao = temPersonalizado ? base * (n(regras.adicionalPersonalizacaoPct) / 100) : 0;
  const urgente = eventoUrgente(e.dataEvento, regras, e.hoje);
  const adicionalUrgencia = urgente ? base * (n(regras.adicionalUrgenciaPct) / 100) : 0;
  const precoSugerido = base + adicionalPersonalizacao + adicionalUrgencia;

  const margemMin = Math.min(n(regras.margemMinimaPct), 95) / 100;
  const precoMinimo = custoEstimado / (1 - margemMin);
  const margemPct = precoSugerido > 0 ? ((precoSugerido - custoEstimado) / precoSugerido) * 100 : 0;

  if (precoSugerido > 0 && precoSugerido < custoEstimado) {
    alertas.push("O preço sugerido está abaixo do custo estimado.");
  } else if (precoSugerido > 0 && margemPct < n(regras.margemMinimaPct)) {
    alertas.push(
      `Margem de ${margemPct.toFixed(1)}%, abaixo do mínimo configurado de ${n(regras.margemMinimaPct)}%.`
    );
  }

  return {
    receitaLocacao: r2(receitaLocacao),
    receitaAvulsos: r2(receitaAvulsos),
    receitaServico: r2(receitaServico),
    adicionalPersonalizacao: r2(adicionalPersonalizacao),
    adicionalUrgencia: r2(adicionalUrgencia),
    precoSugerido: r2(precoSugerido),
    custoMateriais: r2(custoMateriais),
    custoItensNovos: r2(custoItensNovos),
    custoUtilizacao: r2(custoUtilizacao),
    custoMaoDeObra: r2(custoMaoDeObra),
    custoDeslocamento: r2(custoDeslocamento),
    custoContingencia: r2(custoContingencia),
    custoEstimado: r2(custoEstimado),
    custoServico: r2(custoServico),
    precoMinimo: r2(precoMinimo),
    margemPct: r2(margemPct),
    urgente,
    alertas,
  };
}
