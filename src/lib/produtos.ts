"use server";

import { revalidatePath } from "next/cache";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";
import { COLECOES, type Categoria, type Fornecedor, type Produto } from "./firestore-schema";

export async function listarProdutos(): Promise<Produto[]> {
  const snap = await adminDb.collection(COLECOES.produtos).orderBy("nome").get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Produto);
}

export async function listarCategorias(): Promise<Categoria[]> {
  const snap = await adminDb.collection(COLECOES.categorias).orderBy("nome").get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Categoria);
}

export async function listarFornecedores(): Promise<Fornecedor[]> {
  const snap = await adminDb.collection(COLECOES.fornecedores).orderBy("nome").get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Fornecedor);
}

export interface DadosProduto {
  nome: string;
  emoji: string;
  precoDiaria: number;
  quantidade: number;
  destaque: boolean;
  categoriaId?: string;
  fornecedorId?: string;
}

export async function criarProduto(dados: DadosProduto) {
  await adminDb.collection(COLECOES.produtos).add({ ...dados, criadoEm: Timestamp.now() });
  revalidatePath("/catalogo");
}

export async function atualizarProduto(id: string, dados: DadosProduto) {
  await adminDb.collection(COLECOES.produtos).doc(id).update({ ...dados });
  revalidatePath("/catalogo");
}

export async function excluirProduto(id: string) {
  await adminDb.collection(COLECOES.produtos).doc(id).delete();
  revalidatePath("/catalogo");
}

export async function criarCategoria(nome: string) {
  const ref = adminDb.collection(COLECOES.categorias).doc();
  await ref.set({ nome });
  revalidatePath("/catalogo");
  return ref.id;
}
