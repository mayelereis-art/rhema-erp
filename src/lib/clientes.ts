"use server";

import { revalidatePath } from "next/cache";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";
import { COLECOES, type Cliente } from "./firestore-schema";

export async function listarClientes(): Promise<Cliente[]> {
  const snap = await adminDb.collection(COLECOES.clientes).orderBy("nome").get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Cliente);
}

export async function obterCliente(id: string): Promise<Cliente | null> {
  const doc = await adminDb.collection(COLECOES.clientes).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Cliente;
}

export interface DadosCliente {
  nome: string;
  telefone?: string;
  email?: string;
  documento?: string;
}

export async function criarCliente(dados: DadosCliente) {
  const ref = adminDb.collection(COLECOES.clientes).doc();
  await ref.set({ ...dados, criadoEm: Timestamp.now() });
  revalidatePath("/clientes");
  revalidatePath("/contratos/novo");
  return ref.id;
}

export async function atualizarCliente(id: string, dados: DadosCliente) {
  await adminDb.collection(COLECOES.clientes).doc(id).update({ ...dados });
  revalidatePath("/clientes");
}

export async function excluirCliente(id: string) {
  await adminDb.collection(COLECOES.clientes).doc(id).delete();
  revalidatePath("/clientes");
}
