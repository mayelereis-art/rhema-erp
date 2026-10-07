import { describe, expect, it } from "vitest";
import { resumirOfertas } from "./precos-mercado";

const busca = ["https://www.loja-a.com.br/capa-cilindro", "https://loja-b.com/produto/123/", "https://loja-c.com/x"];

describe("resumirOfertas", () => {
  it("aceita só ofertas cujo link veio da busca e calcula menor/médio/maior", () => {
    const r = resumirOfertas(
      [
        { titulo: "Capa A", loja: "A", preco: 40, url: "https://loja-a.com.br/capa-cilindro" },
        { titulo: "Capa B", loja: "B", preco: 60, url: "https://www.loja-b.com/produto/123" },
        { titulo: "Inventada", loja: "X", preco: 10, url: "https://site-que-nao-veio-da-busca.com/p" },
      ],
      busca
    );
    expect(r).not.toBeNull();
    expect(r!.ofertas.map((o) => o.loja)).toEqual(["A", "B"]);
    expect(r!.menor).toBe(40);
    expect(r!.medio).toBe(50);
    expect(r!.maior).toBe(60);
    expect(r!.descartadas).toBe(1);
  });

  it("descarta preço inválido e link repetido", () => {
    const r = resumirOfertas(
      [
        { titulo: "a", loja: "A", preco: 0, url: "https://loja-a.com.br/capa-cilindro" },
        { titulo: "c", loja: "C", preco: 25.555, url: "https://loja-c.com/x" },
        { titulo: "c2", loja: "C", preco: 30, url: "https://loja-c.com/x/" },
      ],
      busca
    );
    expect(r!.ofertas).toHaveLength(1);
    expect(r!.menor).toBe(25.56);
  });

  it("sem nenhuma oferta comprovada devolve null (nunca inventa)", () => {
    expect(resumirOfertas([{ titulo: "x", loja: "x", preco: 50, url: "https://inventado.com" }], busca)).toBeNull();
    expect(resumirOfertas([], busca)).toBeNull();
  });
});
