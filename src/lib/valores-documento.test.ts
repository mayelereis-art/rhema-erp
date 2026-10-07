import { describe, expect, it } from "vitest";
import { calcularValores, type DocumentoValores } from "./valores-documento";
import { calcularRateio } from "./rateio";

const legado: DocumentoValores = {
  tipoServico: "PRESENCIAL",
  itens: [{ produtoId: "a", quantidade: 2, precoUnitario: 300 }],
  custos: 200,
  desconto: 50,
};

describe("calcularValores", () => {
  it("documento antigo: mesmo total e mesmo rateio de antes", () => {
    const v = calcularValores(legado);
    expect(v.valorTotal).toBe(600 + 200 - 50);
    expect(v.rateio).toEqual(calcularRateio(600, 200, "presencial", 50));
  });

  it("Orçamento Inteligente: avulsos entram no total e a base é receita − custos reais", () => {
    const v = calcularValores({
      ...legado,
      baseRateio: "RECEITA_MENOS_CUSTOS",
      custosInternos: 66,
      itensAvulsos: [
        { id: "x", descricao: "Balões", tipo: "CONSUMIVEL", quantidade: 150, custoUnitario: 0.4, precoUnitario: 0.88, origemPreco: "MANUAL" },
      ],
    });
    expect(v.totalAvulsos).toBe(132);
    expect(v.valorTotal).toBe(600 + 132 + 200 - 50);
    // receita 932 − desconto 50 − custos (200 + 66) = 616 de lucro
    expect(v.rateio.lucro).toBe(616);
  });

  it("Pegue e Monte não cobra montagem do cliente", () => {
    const v = calcularValores({ ...legado, tipoServico: "PEGMONTE", baseRateio: "RECEITA_MENOS_CUSTOS", custos: 0, custosInternos: 100 });
    expect(v.valorMontagem).toBe(0);
    expect(v.valorTotal).toBe(550);
    expect(v.rateio.lucro).toBe(450);
  });
});
