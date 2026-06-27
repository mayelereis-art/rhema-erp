"use server";

import { revalidatePath } from "next/cache";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";
import { COLECOES } from "./firestore-schema";

export interface DadosFornecedor {
  nome: string;
  telefone?: string;
  email?: string;
  fornece?: string;
}

export async function criarFornecedor(dados: DadosFornecedor) {
  await adminDb.collection(COLECOES.fornecedores).add({ ...dados, criadoEm: Timestamp.now() });
  revalidatePath("/fornecedores");
}

export async function atualizarFornecedor(id: string, dados: DadosFornecedor) {
  await adminDb.collection(COLECOES.fornecedores).doc(id).update({ ...dados });
  revalidatePath("/fornecedores");
}

export async function excluirFornecedor(id: string) {
  await adminDb.collection(COLECOES.fornecedores).doc(id).delete();
  revalidatePath("/fornecedores");
}
