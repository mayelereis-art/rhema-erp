import { describe, it, expect } from "vitest";
import { calcularRateio, gerarParcelas } from "./rateio";

describe("calcularRateio — Modelo C", () => {
  it("serviço presencial: custos saem antes, lucro dividido 40/35/2/23", () => {
    // contrato de 1000, custos de 200 => lucro 800
    const r = calcularRateio(1000, 200, "presencial");
    expect(r.lucro).toBe(800);
    const porDestino = Object.fromEntries(r.fatias.map((f) => [f.destino, f.valor]));
    expect(porDestino.Maiele).toBe(320); // 40%
    expect(porDestino.Michele).toBe(280); // 35%
    expect(porDestino.Cassia).toBe(16); // 2%
    expect(porDestino.Caixa).toBe(184); // 23%
    // a soma das fatias deve fechar com o lucro
    expect(r.fatias.reduce((s, f) => s + f.valor, 0)).toBe(800);
  });

  it("kit peg&monte: divisão 30/10/0/60", () => {
    const r = calcularRateio(500, 0, "pegmonte");
    const porDestino = Object.fromEntries(r.fatias.map((f) => [f.destino, f.valor]));
    expect(porDestino.Maiele).toBe(150);
    expect(porDestino.Michele).toBe(50);
    expect(porDestino.Cassia).toBe(0);
    expect(porDestino.Caixa).toBe(300);
  });

  it("nunca produz lucro negativo", () => {
    const r = calcularRateio(100, 300, "presencial");
    expect(r.lucro).toBe(0);
    expect(r.fatias.every((f) => f.valor === 0)).toBe(true);
  });
});

describe("gerarParcelas", () => {
  it("cria sinal de 50% e saldo", () => {
    const p = gerarParcelas(1000, "2026-07-01", "2026-07-03");
    expect(p).toHaveLength(2);
    expect(p[0].valor).toBe(500);
    expect(p[1].valor).toBe(500);
    expect(p[0].rotulo).toContain("Sinal");
  });

  it("arredonda corretamente valores ímpares", () => {
    const p = gerarParcelas(999.99, "2026-07-01", "2026-07-03");
    expect(p[0].valor + p[1].valor).toBe(999.99);
  });
});
