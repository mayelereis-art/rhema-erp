import { describe, expect, it } from "vitest";
import { calcularComprometido, calcularLivre, seSobrepoe, type ContratoPeriodo } from "./disponibilidade";

const d = (s: string) => new Date(s);

describe("seSobrepoe", () => {
  it("detecta sobreposição parcial", () => {
    expect(seSobrepoe(d("2026-07-01"), d("2026-07-05"), d("2026-07-04"), d("2026-07-10"))).toBe(true);
  });

  it("detecta intervalos disjuntos", () => {
    expect(seSobrepoe(d("2026-07-01"), d("2026-07-05"), d("2026-07-06"), d("2026-07-10"))).toBe(false);
  });

  it("considera contato nas bordas como sobreposição", () => {
    expect(seSobrepoe(d("2026-07-01"), d("2026-07-05"), d("2026-07-05"), d("2026-07-10"))).toBe(true);
  });
});

describe("calcularComprometido", () => {
  const contratos: ContratoPeriodo[] = [
    {
      id: "c1",
      inicio: d("2026-07-04"),
      fim: d("2026-07-05"),
      status: "CONFIRMADO",
      itens: [{ produtoId: "arco", quantidade: 2 }],
    },
    {
      id: "c2",
      inicio: d("2026-07-04"),
      fim: d("2026-07-06"),
      status: "ORCAMENTO",
      itens: [{ produtoId: "arco", quantidade: 1 }],
    },
    {
      id: "c3",
      inicio: d("2026-07-04"),
      fim: d("2026-07-05"),
      status: "CANCELADO",
      itens: [{ produtoId: "arco", quantidade: 5 }],
    },
    {
      id: "c4",
      inicio: d("2026-08-01"),
      fim: d("2026-08-02"),
      status: "CONFIRMADO",
      itens: [{ produtoId: "arco", quantidade: 3 }],
    },
  ];

  it("soma apenas contratos em ORCAMENTO/CONFIRMADO que se sobrepõem ao período", () => {
    const total = calcularComprometido(contratos, "arco", d("2026-07-03"), d("2026-07-05"));
    expect(total).toBe(3); // c1 (2) + c2 (1); ignora c3 (cancelado) e c4 (fora do período)
  });

  it("ignora o próprio contrato ao excluí-lo (edição)", () => {
    const total = calcularComprometido(contratos, "arco", d("2026-07-03"), d("2026-07-05"), "c1");
    expect(total).toBe(1); // só c2
  });

  it("retorna 0 fora de qualquer período comprometido", () => {
    const total = calcularComprometido(contratos, "arco", d("2026-09-01"), d("2026-09-05"));
    expect(total).toBe(0);
  });
});

describe("calcularLivre", () => {
  const contratos: ContratoPeriodo[] = [
    {
      id: "c1",
      inicio: d("2026-07-04"),
      fim: d("2026-07-05"),
      status: "CONFIRMADO",
      itens: [{ produtoId: "arco", quantidade: 3 }],
    },
  ];

  it("subtrai o comprometido do estoque total", () => {
    expect(calcularLivre(4, contratos, "arco", d("2026-07-04"), d("2026-07-05"))).toBe(1);
  });

  it("nunca retorna negativo, mesmo se sobrecomprometido", () => {
    expect(calcularLivre(2, contratos, "arco", d("2026-07-04"), d("2026-07-05"))).toBe(0);
  });
});
