import { describe, expect, it } from "vitest";
import { calcularLocacoesParaRecuperar, calcularPrecoSugerido } from "./precificacao";

describe("calcularPrecoSugerido", () => {
  it("aplica o percentual sobre o custo de aquisição", () => {
    expect(calcularPrecoSugerido(1000, 15)).toBe(150);
  });

  it("trata custo ou percentual negativos/inválidos como zero", () => {
    expect(calcularPrecoSugerido(-100, 15)).toBe(0);
    expect(calcularPrecoSugerido(1000, -5)).toBe(0);
  });

  it("arredonda para duas casas decimais", () => {
    expect(calcularPrecoSugerido(333, 10)).toBe(33.3);
  });
});

describe("calcularLocacoesParaRecuperar", () => {
  it("calcula quantas locações recuperam o custo, arredondando para cima", () => {
    expect(calcularLocacoesParaRecuperar(1000, 150)).toBe(7); // 6.67 -> 7
  });

  it("retorna null sem custo ou preço definidos", () => {
    expect(calcularLocacoesParaRecuperar(0, 150)).toBeNull();
    expect(calcularLocacoesParaRecuperar(1000, 0)).toBeNull();
  });
});
