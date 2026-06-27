"use server";

import { revalidatePath } from "next/cache";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";
import { COLECOES, type Contrato, type ItemContrato, type ModoLogistica, type StatusContrato, type TipoServico } from "./firestore-schema";
import { calcularLivre, type ContratoPeriodo } from "./disponibilidade";
import { gerarParcelas } from "./rateio";

export interface ContratoComId extends Omit<Contrato, "inicio" | "fim" | "criadoEm" | "parcelas"> {
  inicio: string; // ISO
  fim: string;
  criadoEm: string;
  parcelas: Array<{ rotulo: string; vencimento: string; valor: number; pago: boolean }>;
}

function serializar(id: string, d: FirebaseFirestore.DocumentData): ContratoComId {
  return {
    id,
    numero: d.numero,
    clienteId: d.clienteId,
    evento: d.evento,
    inicio: d.inicio.toDate().toISOString(),
    fim: d.fim.toDate().toISOString(),
    status: d.status,
    tipoServico: d.tipoServico,
    custos: d.custos,
    executoraId: d.executoraId,
    modoLogistica: d.modoLogistica,
    endereco: d.endereco,
    saidaEntregue: d.saidaEntregue,
    itensDevolvidos: d.itensDevolvidos,
    itens: d.itens ?? [],
    parcelas: (d.parcelas ?? []).map((p: { rotulo: string; vencimento: Timestamp; valor: number; pago: boolean }) => ({
      rotulo: p.rotulo,
      vencimento: p.vencimento.toDate().toISOString(),
      valor: p.valor,
      pago: p.pago,
    })),
    criadoEm: d.criadoEm.toDate().toISOString(),
  };
}

export async function listarContratos(statusFiltro?: StatusContrato): Promise<ContratoComId[]> {
  let query = adminDb.collection(COLECOES.contratos).orderBy("numero", "desc") as FirebaseFirestore.Query;
  if (statusFiltro) query = query.where("status", "==", statusFiltro);
  const snap = await query.get();
  return snap.docs.map((doc) => serializar(doc.id, doc.data()));
}

export async function listarContratosPorCliente(clienteId: string): Promise<ContratoComId[]> {
  const snap = await adminDb.collection(COLECOES.contratos).where("clienteId", "==", clienteId).orderBy("numero", "desc").get();
  return snap.docs.map((doc) => serializar(doc.id, doc.data()));
}

export async function obterContrato(id: string): Promise<ContratoComId | null> {
  const doc = await adminDb.collection(COLECOES.contratos).doc(id).get();
  if (!doc.exists) return null;
  return serializar(doc.id, doc.data()!);
}

async function buscarContratosPeriodo(): Promise<ContratoPeriodo[]> {
  const snap = await adminDb.collection(COLECOES.contratos).get();
  return snap.docs.map((doc) => {
    const d = doc.data();
    return { id: doc.id, inicio: d.inicio.toDate(), fim: d.fim.toDate(), status: d.status, itens: d.itens ?? [] } as ContratoPeriodo;
  });
}

async function proximoNumero(): Promise<number> {
  const ref = adminDb.collection(COLECOES.contadores).doc("contratos");
  const numero = await adminDb.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const ultimo = doc.exists ? (doc.data()!.ultimo as number) : 0;
    const proximo = ultimo + 1;
    tx.set(ref, { ultimo: proximo }, { merge: true });
    return proximo;
  });
  return numero;
}

export interface DadosContrato {
  clienteId: string;
  evento: string;
  inicio: string; // ISO
  fim: string;
  tipoServico: TipoServico;
  custos: number;
  executoraId?: string;
  modoLogistica: ModoLogistica;
  endereco?: string;
  itens: ItemContrato[];
  status: StatusContrato;
}

export interface ErroDisponibilidade {
  produtoId: string;
  nome: string;
  pedido: number;
  livre: number;
}

/**
 * Valida disponibilidade de cada item no período antes de salvar.
 * Retorna a lista de itens que excedem o estoque livre (vazia = ok para salvar).
 */
export async function validarDisponibilidadeContrato(
  itens: ItemContrato[],
  inicioISO: string,
  fimISO: string,
  ignorarContratoId?: string
): Promise<ErroDisponibilidade[]> {
  const [contratos, produtosSnap] = await Promise.all([buscarContratosPeriodo(), adminDb.collection(COLECOES.produtos).get()]);
  const produtos = new Map(produtosSnap.docs.map((d) => [d.id, d.data()]));

  const erros: ErroDisponibilidade[] = [];
  for (const item of itens) {
    const produto = produtos.get(item.produtoId);
    if (!produto) continue;
    const livre = calcularLivre(produto.quantidade, contratos, item.produtoId, new Date(inicioISO), new Date(fimISO), ignorarContratoId);
    if (item.quantidade > livre) {
      erros.push({ produtoId: item.produtoId, nome: produto.nome, pedido: item.quantidade, livre });
    }
  }
  return erros;
}

export async function criarContrato(dados: DadosContrato): Promise<{ ok: true; id: string } | { ok: false; erros: ErroDisponibilidade[] }> {
  const erros = await validarDisponibilidadeContrato(dados.itens, dados.inicio, dados.fim);
  if (erros.length > 0) return { ok: false, erros };

  const numero = await proximoNumero();
  const total = dados.itens.reduce((soma, i) => soma + i.quantidade * i.precoUnitario, 0);
  const parcelas = gerarParcelas(total, dados.inicio, dados.fim);

  const ref = await adminDb.collection(COLECOES.contratos).add({
    numero,
    clienteId: dados.clienteId,
    evento: dados.evento,
    inicio: Timestamp.fromDate(new Date(dados.inicio)),
    fim: Timestamp.fromDate(new Date(dados.fim)),
    status: dados.status,
    tipoServico: dados.tipoServico,
    custos: dados.custos,
    executoraId: dados.executoraId ?? null,
    modoLogistica: dados.modoLogistica,
    endereco: dados.endereco ?? null,
    saidaEntregue: false,
    itensDevolvidos: false,
    itens: dados.itens,
    parcelas: parcelas.map((p) => ({
      rotulo: p.rotulo,
      vencimento: Timestamp.fromDate(new Date(p.vencimento)),
      valor: p.valor,
      pago: p.pago,
    })),
    criadoEm: Timestamp.now(),
  });

  revalidatePath("/contratos");
  return { ok: true, id: ref.id };
}

export async function atualizarStatusContrato(id: string, status: StatusContrato) {
  await adminDb.collection(COLECOES.contratos).doc(id).update({ status });
  revalidatePath("/contratos");
  revalidatePath(`/contratos/${id}`);
}

export async function marcarParcelaPaga(contratoId: string, indiceParcela: number, pago: boolean) {
  const ref = adminDb.collection(COLECOES.contratos).doc(contratoId);
  const doc = await ref.get();
  if (!doc.exists) return;
  const parcelas = doc.data()!.parcelas as unknown[];
  (parcelas[indiceParcela] as { pago: boolean }).pago = pago;
  await ref.update({ parcelas });
  revalidatePath(`/contratos/${contratoId}`);
  revalidatePath("/financeiro");
}

/** Lista contratos confirmados para a tela de Logística, ordenados pela data de retirada. */
export async function listarContratosLogistica(): Promise<ContratoComId[]> {
  const snap = await adminDb.collection(COLECOES.contratos).where("status", "==", "CONFIRMADO").orderBy("inicio", "asc").get();
  return snap.docs.map((doc) => serializar(doc.id, doc.data()));
}

export async function marcarSaida(id: string, saidaEntregue: boolean) {
  await adminDb.collection(COLECOES.contratos).doc(id).update({ saidaEntregue });
  revalidatePath("/logistica");
}

export async function marcarRetorno(id: string, itensDevolvidos: boolean) {
  await adminDb.collection(COLECOES.contratos).doc(id).update({ itensDevolvidos });
  revalidatePath("/logistica");
}

/**
 * Ajusta custos do serviço e/ou tipo de serviço de um contrato — usado na tela
 * de Rateio para corrigir um contrato já fechado (CLAUDE.md item 1: os percentuais
 * em si nunca mudam por aqui, só os dados de entrada do cálculo).
 */
export async function atualizarContratoFinanceiro(id: string, dados: { custos: number; tipoServico: TipoServico }) {
  await adminDb.collection(COLECOES.contratos).doc(id).update(dados);
  revalidatePath("/rateio");
  revalidatePath(`/contratos/${id}`);
}

/** Lista contratos fechados (CONFIRMADO/CONCLUIDO) para a tela de Rateio. */
export async function listarContratosFechados(): Promise<ContratoComId[]> {
  const snap = await adminDb.collection(COLECOES.contratos).where("status", "in", ["CONFIRMADO", "CONCLUIDO"]).orderBy("numero", "desc").get();
  return snap.docs.map((doc) => serializar(doc.id, doc.data()));
}
