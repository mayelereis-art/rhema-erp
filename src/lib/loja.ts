"use server";

import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";
import { COLECOES, type Categoria } from "./firestore-schema";
import { gravarNovoOrcamento } from "./orcamentos-gravacao";

// Só o que a vitrine pública precisa. Custo de aquisição, fornecedor, valor de
// reposição e estoque são dados internos e não podem ir para o HTML da loja.
export interface ProdutoPublico {
  id: string;
  nome: string;
  emoji: string;
  fotoUrl?: string;
  precoDiaria: number;
  destaque: boolean;
  categoriaId?: string;
}

/** Catálogo da loja virtual — pública, sem login. */
export async function listarCatalogoPublico(): Promise<{ produtos: ProdutoPublico[]; categorias: Categoria[] }> {
  const [produtosSnap, categoriasSnap] = await Promise.all([
    adminDb.collection(COLECOES.produtos).orderBy("nome").get(),
    adminDb.collection(COLECOES.categorias).orderBy("nome").get(),
  ]);
  const produtos = produtosSnap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      nome: d.nome,
      emoji: d.emoji,
      fotoUrl: d.fotoUrl,
      precoDiaria: d.precoDiaria,
      destaque: Boolean(d.destaque),
      categoriaId: d.categoriaId,
    };
  });
  const categorias = categoriasSnap.docs.map((doc) => ({ id: doc.id, nome: doc.data().nome as string }));
  return { produtos, categorias };
}

const ItemSolicitado = z.object({
  produtoId: z.string().min(1),
  quantidade: z.number().int().positive(),
});

const SolicitacaoOrcamento = z.object({
  nomeCliente: z.string().min(2).max(120),
  telefone: z.string().min(8).max(20),
  evento: z.string().max(120).optional().default(""),
  inicio: z.string().min(8),
  fim: z.string().min(8),
  itens: z.array(ItemSolicitado).min(1),
});

export type DadosSolicitacaoOrcamento = z.infer<typeof SolicitacaoOrcamento>;

async function buscarOuCriarClientePorTelefone(nome: string, telefone: string): Promise<string> {
  const snap = await adminDb.collection(COLECOES.clientes).where("telefone", "==", telefone).limit(1).get();
  if (!snap.empty) return snap.docs[0].id;

  const ref = adminDb.collection(COLECOES.clientes).doc();
  await ref.set({ nome, telefone, criadoEm: Timestamp.now() });
  return ref.id;
}

/**
 * Cria um ORÇAMENTO a partir do formulário público da Loja virtual.
 * Não exige autenticação — por isso valida tudo com zod antes de tocar o Firestore.
 */
export async function solicitarOrcamentoPublico(
  dadosBrutos: DadosSolicitacaoOrcamento
): Promise<{ ok: true; numero: number } | { ok: false; erro: string }> {
  const parse = SolicitacaoOrcamento.safeParse(dadosBrutos);
  if (!parse.success) {
    return { ok: false, erro: "Dados inválidos. Confira o formulário e tente novamente." };
  }
  const dados = parse.data;

  const produtosSnap = await adminDb
    .collection(COLECOES.produtos)
    .where("__name__", "in", dados.itens.slice(0, 30).map((i) => i.produtoId))
    .get();
  const precos = new Map(produtosSnap.docs.map((d) => [d.id, d.data().precoDiaria as number]));

  const itensComPreco = dados.itens
    .filter((i) => precos.has(i.produtoId))
    .map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade, precoUnitario: precos.get(i.produtoId)! }));

  if (itensComPreco.length === 0) {
    return { ok: false, erro: "Nenhum item válido selecionado." };
  }

  const clienteId = await buscarOuCriarClientePorTelefone(dados.nomeCliente, dados.telefone);

  const { numero } = await gravarNovoOrcamento({
    clienteId,
    evento: dados.evento || "Solicitação via loja virtual",
    inicio: dados.inicio,
    fim: dados.fim,
    tipoServico: "PRESENCIAL",
    custos: 0,
    modoLogistica: "RETIRADA",
    itens: itensComPreco,
  });

  return { ok: true, numero };
}
