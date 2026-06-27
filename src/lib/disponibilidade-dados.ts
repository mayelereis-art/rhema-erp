"use server";

import { adminDb } from "./firebase-admin";
import { COLECOES } from "./firestore-schema";
import { calcularLivre, type ContratoPeriodo } from "./disponibilidade";

export interface LinhaDisponibilidade {
  produtoId: string;
  nome: string;
  emoji: string;
  categoriaNome: string;
  estoqueTotal: number;
  livre: number;
}

async function buscarContratosPeriodo(): Promise<ContratoPeriodo[]> {
  // Carrega todos os contratos não cancelados/concluídos para o cálculo de
  // sobreposição. O volume é baixo (negócio local) — sem necessidade de índice
  // composto por enquanto.
  const snap = await adminDb.collection(COLECOES.contratos).get();
  return snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      inicio: d.inicio.toDate(),
      fim: d.fim.toDate(),
      status: d.status,
      itens: d.itens ?? [],
    } as ContratoPeriodo;
  });
}

/** Calcula a quantidade livre de cada produto no período [inicioISO, fimISO]. */
export async function consultarDisponibilidade(
  inicioISO: string,
  fimISO: string,
  ignorarContratoId?: string
): Promise<LinhaDisponibilidade[]> {
  const inicio = new Date(inicioISO);
  const fim = new Date(fimISO);

  const [produtosSnap, categoriasSnap, contratos] = await Promise.all([
    adminDb.collection(COLECOES.produtos).orderBy("nome").get(),
    adminDb.collection(COLECOES.categorias).get(),
    buscarContratosPeriodo(),
  ]);

  const nomeCategoria = new Map(categoriasSnap.docs.map((d) => [d.id, d.data().nome as string]));

  return produtosSnap.docs.map((doc) => {
    const p = doc.data();
    return {
      produtoId: doc.id,
      nome: p.nome,
      emoji: p.emoji,
      categoriaNome: p.categoriaId ? nomeCategoria.get(p.categoriaId) ?? "" : "",
      estoqueTotal: p.quantidade,
      livre: calcularLivre(p.quantidade, contratos, doc.id, inicio, fim, ignorarContratoId),
    };
  });
}

/** Usado pelo montador de contratos para validar um item antes de adicionar. */
export async function obterLivreProduto(
  produtoId: string,
  estoqueTotal: number,
  inicioISO: string,
  fimISO: string,
  ignorarContratoId?: string
): Promise<number> {
  const contratos = await buscarContratosPeriodo();
  return calcularLivre(estoqueTotal, contratos, produtoId, new Date(inicioISO), new Date(fimISO), ignorarContratoId);
}
