"use server";

import { revalidatePath } from "next/cache";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";
import { COLECOES } from "./firestore-schema";

export interface DespesaComId {
  id: string;
  descricao: string;
  vencimento: string; // ISO
  valor: number;
  pago: boolean;
  criadoEm: string;
}

export async function listarDespesas(): Promise<DespesaComId[]> {
  const snap = await adminDb.collection(COLECOES.despesas).orderBy("vencimento", "asc").get();
  return snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      descricao: d.descricao,
      vencimento: d.vencimento.toDate().toISOString(),
      valor: d.valor,
      pago: d.pago,
      criadoEm: d.criadoEm.toDate().toISOString(),
    };
  });
}

export interface DadosDespesa {
  descricao: string;
  vencimento: string; // ISO
  valor: number;
}

export async function criarDespesa(dados: DadosDespesa) {
  await adminDb.collection(COLECOES.despesas).add({
    descricao: dados.descricao,
    vencimento: Timestamp.fromDate(new Date(dados.vencimento)),
    valor: dados.valor,
    pago: false,
    criadoEm: Timestamp.now(),
  });
  revalidatePath("/financeiro");
}

export async function marcarDespesaPaga(id: string, pago: boolean) {
  await adminDb.collection(COLECOES.despesas).doc(id).update({ pago });
  revalidatePath("/financeiro");
}

export async function excluirDespesa(id: string) {
  await adminDb.collection(COLECOES.despesas).doc(id).delete();
  revalidatePath("/financeiro");
}
