import { describe, expect, it } from "vitest";
import { ehSabado, similaridade, statusComponente, sugerirProdutos, type ProdutoCatalogo } from "./cruzamento-catalogo";

const catalogo: ProdutoCatalogo[] = [
  { id: "1", nome: "Trio de Cilindros MDF", categoriaNome: "Mobiliário" },
  { id: "2", nome: "Arco redondo dourado 1,5m", categoriaNome: "Painéis & Arcos" },
  { id: "3", nome: "Painel redondo branco", categoriaNome: "Painéis & Arcos" },
  { id: "4", nome: "Bandeja espelhada", categoriaNome: "Bandejas" },
];

describe("sugerirProdutos", () => {
  it("encontra produto mesmo com plural e acento diferentes", () => {
    expect(sugerirProdutos("trio de cilindros", catalogo)[0].id).toBe("1");
    expect(sugerirProdutos("Painel redondo temático", catalogo)[0].id).toBe("3");
  });

  it("não sugere nada sem semelhança real", () => {
    expect(sugerirProdutos("capa para cilindro tecido azul", catalogo)).toEqual([]);
    expect(sugerirProdutos("", catalogo)).toEqual([]);
  });

  it("considera a categoria", () => {
    expect(similaridade("bandejas", catalogo[3])).toBe(1);
  });
});

describe("statusComponente", () => {
  it("compara quantidade pedida com o livre na data", () => {
    expect(statusComponente("1", "ITEM", 1, 1)).toBe("DISPONIVEL");
    expect(statusComponente("1", "ITEM", 3, 1)).toBe("INSUFICIENTE");
    expect(statusComponente("1", "ITEM", 1, 0)).toBe("INDISPONIVEL");
  });

  it("classifica itens sem cadastro pelo tipo", () => {
    expect(statusComponente("", "ITEM", 1, undefined)).toBe("NAO_CADASTRADO");
    expect(statusComponente("", "CONSUMIVEL", 150, undefined)).toBe("CONSUMIVEL_A_COMPRAR");
    expect(statusComponente("", "SERVICO", 1, undefined)).toBe("PERSONALIZADO");
  });
});

describe("ehSabado", () => {
  it("identifica sábado pela data local", () => {
    expect(ehSabado("2026-11-14")).toBe(true);
    expect(ehSabado("2026-11-15")).toBe(false);
  });
});
