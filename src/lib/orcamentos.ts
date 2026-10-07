"use server";

import { exigirUsuario } from "./sessao-servidor";
import { revalidatePath } from "next/cache";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";
import { COLECOES, type ItemContrato, type ModoLogistica, type StatusOrcamento, type TipoServico } from "./firestore-schema";
import { criarContrato } from "./contratos";
import { gravarNovoOrcamento, type DadosOrcamento } from "./orcamentos-gravacao";

export interface OrcamentoComId {
  id: string;
  numero: number;
  clienteId: string;
  evento: string;
  inicio: string; // ISO
  fim: string;
  status: StatusOrcamento;
  tipoServico: TipoServico;
  custos: number;
  desconto: number;
  executoraId?: string;
  modoLogistica: ModoLogistica;
  endereco?: string;
  itens: ItemContrato[];
  contratoId?: string;
  criadoEm: string;
}

function serializar(id: string, d: FirebaseFirestore.DocumentData): OrcamentoComId {
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
    desconto: d.desconto ?? 0,
    executoraId: d.executoraId,
    modoLogistica: d.modoLogistica,
    endereco: d.endereco,
    itens: d.itens ?? [],
    contratoId: d.contratoId,
    criadoEm: d.criadoEm.toDate().toISOString(),
  };
}

export async function listarOrcamentos(statusFiltro?: StatusOrcamento): Promise<OrcamentoComId[]> {
  await exigirUsuario();
  const snap = await adminDb.collection(COLECOES.orcamentos).get();
  const todos = snap.docs.map((doc) => serializar(doc.id, doc.data()));
  return todos.filter((o) => !statusFiltro || o.status === statusFiltro).sort((a, b) => b.numero - a.numero);
}

export async function listarOrcamentosPorCliente(clienteId: string): Promise<OrcamentoComId[]> {
  await exigirUsuario();
  const snap = await adminDb.collection(COLECOES.orcamentos).where("clienteId", "==", clienteId).get();
  return snap.docs.map((doc) => serializar(doc.id, doc.data())).sort((a, b) => b.numero - a.numero);
}

export async function obterOrcamento(id: string): Promise<OrcamentoComId | null> {
  await exigirUsuario();
  const doc = await adminDb.collection(COLECOES.orcamentos).doc(id).get();
  if (!doc.exists) return null;
  return serializar(doc.id, doc.data()!);
}

export type { DadosOrcamento };

export async function criarOrcamento(dados: DadosOrcamento): Promise<{ id: string }> {
  await exigirUsuario();
  const { id } = await gravarNovoOrcamento(dados);
  revalidatePath("/orcamentos");
  return { id };
}

/** Edita um orçamento ainda PENDENTE (convertidos/cancelados são histórico). */
export async function atualizarOrcamento(
  id: string,
  dados: DadosOrcamento
): Promise<{ ok: true } | { ok: false; erro: string }> {
  await exigirUsuario();
  const atual = await obterOrcamento(id);
  if (!atual) return { ok: false, erro: "Orçamento não encontrado." };
  if (atual.status !== "PENDENTE") return { ok: false, erro: "Só é possível editar orçamentos pendentes." };

  await adminDb.collection(COLECOES.orcamentos).doc(id).update({
    clienteId: dados.clienteId,
    evento: dados.evento,
    inicio: Timestamp.fromDate(new Date(dados.inicio)),
    fim: Timestamp.fromDate(new Date(dados.fim)),
    tipoServico: dados.tipoServico,
    custos: dados.custos,
    desconto: dados.desconto ?? 0,
    executoraId: dados.executoraId ?? null,
    modoLogistica: dados.modoLogistica,
    endereco: dados.endereco ?? null,
    itens: dados.itens,
  });

  revalidatePath("/orcamentos");
  revalidatePath(`/orcamentos/${id}`);
  return { ok: true };
}

export async function cancelarOrcamento(id: string) {
  await exigirUsuario();
  await adminDb.collection(COLECOES.orcamentos).doc(id).update({ status: "CANCELADO" });
  revalidatePath("/orcamentos");
  revalidatePath(`/orcamentos/${id}`);
}

/**
 * Aceita o orçamento: cria um Contrato novo (que aí sim reserva estoque, com
 * checagem de disponibilidade) e marca este orçamento como CONVERTIDO,
 * mantendo o vínculo para histórico.
 */
export async function converterEmContrato(
  id: string
): Promise<{ ok: true; contratoId: string } | { ok: false; erro: string }> {
  await exigirUsuario();
  const orcamento = await obterOrcamento(id);
  if (!orcamento) return { ok: false, erro: "Orçamento não encontrado." };
  if (orcamento.status !== "PENDENTE") return { ok: false, erro: "Este orçamento já foi convertido ou cancelado." };

  const resultado = await criarContrato({
    clienteId: orcamento.clienteId,
    evento: orcamento.evento,
    inicio: orcamento.inicio,
    fim: orcamento.fim,
    tipoServico: orcamento.tipoServico,
    custos: orcamento.custos,
    desconto: orcamento.desconto,
    executoraId: orcamento.executoraId,
    modoLogistica: orcamento.modoLogistica,
    endereco: orcamento.endereco,
    itens: orcamento.itens,
  });

  if (!resultado.ok) {
    return { ok: false, erro: "Algum item não está mais disponível no período — confira o estoque antes de confirmar." };
  }

  await adminDb.collection(COLECOES.orcamentos).doc(id).update({ status: "CONVERTIDO", contratoId: resultado.id });
  revalidatePath("/orcamentos");
  revalidatePath(`/orcamentos/${id}`);
  revalidatePath("/contratos");

  return { ok: true, contratoId: resultado.id };
}
