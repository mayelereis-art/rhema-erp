/**
 * Cruzamento dos componentes identificados pela IA com o catálogo da RHEMA e
 * com a disponibilidade na data do evento. Funções puras (sem Firestore) —
 * os dados de estoque vêm de consultarDisponibilidade, a mesma usada na tela
 * de Disponibilidade e no montador de contratos.
 */

export interface ProdutoCatalogo {
  id: string;
  nome: string;
  categoriaNome: string;
}

export type StatusComponente =
  | "DISPONIVEL"
  | "INSUFICIENTE"
  | "INDISPONIVEL"
  | "NAO_CADASTRADO"
  | "CONSUMIVEL_A_COMPRAR"
  | "PERSONALIZADO";

const PALAVRAS_IGNORADAS = new Set(["de", "da", "do", "das", "dos", "e", "com", "para", "em", "a", "o", "x", "um", "uma"]);

function normalizar(texto: string): string[] {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((p) => p.length > 1 && !PALAVRAS_IGNORADAS.has(p))
    // plural simples: "cilindros" ≈ "cilindro", "baloes" ≈ "balao"
    .map((p) => p.replace(/oes$/, "ao").replace(/s$/, ""));
}

/**
 * Pontua (0–1) o quanto o nome/categoria de um produto se parece com a
 * descrição da IA: fração das palavras da descrição presentes no produto.
 */
export function similaridade(descricao: string, produto: ProdutoCatalogo): number {
  const alvo = normalizar(descricao);
  if (alvo.length === 0) return 0;
  const doProduto = new Set([...normalizar(produto.nome), ...normalizar(produto.categoriaNome)]);
  const acertos = alvo.filter((p) => doProduto.has(p)).length;
  return acertos / alvo.length;
}

/** Até `limite` produtos parecidos, para sugerir quando a IA não achou correspondência. */
export function sugerirProdutos(descricao: string, catalogo: ProdutoCatalogo[], limite = 3, minimo = 0.5): ProdutoCatalogo[] {
  return catalogo
    .map((p) => ({ p, s: similaridade(descricao, p) }))
    .filter((x) => x.s >= minimo)
    .sort((a, b) => b.s - a.s || a.p.nome.localeCompare(b.p.nome))
    .slice(0, limite)
    .map((x) => x.p);
}

export function statusComponente(
  produtoId: string,
  tipo: "ITEM" | "CONSUMIVEL" | "SERVICO",
  quantidade: number,
  livre: number | undefined
): StatusComponente {
  if (produtoId && livre !== undefined) {
    if (livre >= quantidade) return "DISPONIVEL";
    return livre > 0 ? "INSUFICIENTE" : "INDISPONIVEL";
  }
  if (tipo === "CONSUMIVEL") return "CONSUMIVEL_A_COMPRAR";
  if (tipo === "SERVICO") return "PERSONALIZADO";
  return "NAO_CADASTRADO";
}

/** Sábado é indisponível na fase inicial (agenda da Michele) — aviso leve, não bloqueio. */
export function ehSabado(dataISO: string): boolean {
  return new Date(`${dataISO.slice(0, 10)}T12:00:00`).getDay() === 6;
}
