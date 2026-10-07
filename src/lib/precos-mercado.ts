/**
 * Validação das cotações de mercado vindas da pesquisa na web — função pura.
 * Regra: nunca inventar preço. Uma oferta só é aceita se o link dela veio de
 * fato dos resultados da busca (a IA não pode "lembrar" um link) e se o preço
 * é um número positivo plausível.
 */

export interface OfertaMercado {
  titulo: string;
  loja: string;
  preco: number; // R$ por unidade do item pesquisado
  url: string;
}

export interface ResumoMercado {
  ofertas: OfertaMercado[];
  menor: number;
  medio: number;
  maior: number;
  descartadas: number;
}

const r2 = (v: number) => Math.round(v * 100) / 100;

function normalizarUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    return `${u.hostname.replace(/^www\./, "")}${u.pathname.replace(/\/$/, "")}`.toLowerCase();
  } catch {
    return "";
  }
}

export function resumirOfertas(ofertas: OfertaMercado[], urlsDaBusca: Iterable<string>): ResumoMercado | null {
  const validas = new Set([...urlsDaBusca].map(normalizarUrl).filter(Boolean));
  const vistas = new Set<string>();
  const aceitas: OfertaMercado[] = [];
  for (const o of ofertas) {
    const chave = normalizarUrl(o.url);
    const precoOk = Number.isFinite(o.preco) && o.preco > 0 && o.preco < 1_000_000;
    if (!chave || !validas.has(chave) || !precoOk || vistas.has(chave)) continue;
    vistas.add(chave);
    aceitas.push({ ...o, preco: r2(o.preco) });
  }
  if (aceitas.length === 0) return null;
  const precos = aceitas.map((o) => o.preco);
  return {
    ofertas: aceitas.sort((a, b) => a.preco - b.preco),
    menor: Math.min(...precos),
    medio: r2(precos.reduce((s, p) => s + p, 0) / precos.length),
    maior: Math.max(...precos),
    descartadas: ofertas.length - aceitas.length,
  };
}
