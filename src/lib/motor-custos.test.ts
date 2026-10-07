import { describe, expect, it } from "vitest";
import { calcularOrcamento, precoVendaSugerido, REGRAS_PADRAO, type EntradaCalculo, type RegrasPrecificacao } from "./motor-custos";

const regras: RegrasPrecificacao = {
  ...REGRAS_PADRAO,
  margemMinimaPct: 30,
  markupPct: 100,
  valorHoraProducao: 50,
  valorHoraMontagem: 80,
  valorHoraDesmontagem: 60,
  deslocamentoFixo: 20,
  custoPorKm: 1,
  custoUtilizacaoPct: 10,
  perdasPct: 10,
  contingenciaPct: 0,
};

function entrada(extra: Partial<EntradaCalculo> = {}): EntradaCalculo {
  return {
    modalidade: "PRESENCIAL",
    linhas: [
      { descricao: "Trio de cilindros", quantidade: 1, tipo: "ITEM", produtoId: "p1", precoDiaria: 150 },
      { descricao: "Balões", quantidade: 150, tipo: "CONSUMIVEL", custoUnitario: 0.4, precoUnitario: 0.8 },
    ],
    horas: { producao: 2, montagem: 2, desmontagem: 1 },
    km: 30,
    regras,
    ...extra,
  };
}

describe("calcularOrcamento", () => {
  it("separa custo interno de preço de venda no presencial", () => {
    const r = calcularOrcamento(entrada());
    // receita: diária 150 + balões 120 + serviço repassado ao custo
    expect(r.receitaLocacao).toBe(150);
    expect(r.receitaAvulsos).toBe(120);
    // mão de obra 2×50 + 2×80 + 1×60 = 320; deslocamento 20 + 30×1 = 50
    expect(r.custoMaoDeObra).toBe(320);
    expect(r.custoDeslocamento).toBe(50);
    expect(r.custoServico).toBe(370);
    expect(r.receitaServico).toBe(370);
    // balões: custo 60 + 10% de perdas = 66; uso do item próprio: 10% de 150 = 15
    expect(r.custoMateriais).toBe(66);
    expect(r.custoUtilizacao).toBe(15);
    expect(r.custoEstimado).toBe(66 + 15 + 320 + 50);
    expect(r.precoSugerido).toBe(150 + 120 + 370);
  });

  it("Pegue e Monte não cobra nem custeia montagem, desmontagem e deslocamento", () => {
    const r = calcularOrcamento(entrada({ modalidade: "PEGMONTE" }));
    expect(r.custoMaoDeObra).toBe(100); // só produção
    expect(r.custoDeslocamento).toBe(0);
    expect(r.custoServico).toBe(0);
    expect(r.receitaServico).toBe(0);
    expect(r.precoSugerido).toBe(270);
  });

  it("preço mínimo garante a margem mínima e alerta quando a margem fica abaixo", () => {
    const r = calcularOrcamento(entrada());
    expect(r.precoMinimo).toBeCloseTo(r.custoEstimado / 0.7, 2);
    // receita 640, custo 451 → margem ~29,5% < 30%
    expect(r.margemPct).toBeLessThan(30);
    expect(r.alertas.some((a) => a.includes("abaixo do mínimo"))).toBe(true);
  });

  it("alerta item sem preço e item vendido abaixo do custo", () => {
    const r = calcularOrcamento(
      entrada({
        linhas: [
          { descricao: "Capa de cilindro", quantidade: 3, tipo: "ITEM", custoUnitario: 40, precoUnitario: 0 },
          { descricao: "Número 1", quantidade: 1, tipo: "SERVICO", custoUnitario: 50, precoUnitario: 30 },
        ],
      })
    );
    expect(r.alertas.some((a) => a.includes("Capa de cilindro") && a.includes("sem preço"))).toBe(true);
    expect(r.alertas.some((a) => a.includes("Número 1") && a.includes("abaixo do custo"))).toBe(true);
    expect(r.custoItensNovos).toBe(170);
  });

  it("aplica adicionais de personalização e urgência só quando cabem", () => {
    const comAdicionais = { ...regras, adicionalPersonalizacaoPct: 10, adicionalUrgenciaPct: 20, diasUrgencia: 7 };
    const hoje = new Date("2026-11-10T12:00:00");
    const semPersonalizado = calcularOrcamento(entrada({ regras: comAdicionais, dataEvento: "2026-12-20", hoje }));
    expect(semPersonalizado.adicionalPersonalizacao).toBe(0);
    expect(semPersonalizado.urgente).toBe(false);

    const urgente = calcularOrcamento(
      entrada({
        regras: comAdicionais,
        dataEvento: "2026-11-14",
        hoje,
        linhas: [{ descricao: "Painel exclusivo", quantidade: 1, tipo: "SERVICO", custoUnitario: 100, precoUnitario: 200 }],
      })
    );
    expect(urgente.urgente).toBe(true);
    const base = 200 + urgente.receitaServico;
    expect(urgente.adicionalPersonalizacao).toBeCloseTo(base * 0.1, 2);
    expect(urgente.adicionalUrgencia).toBeCloseTo(base * 0.2, 2);
  });
});

describe("precoVendaSugerido", () => {
  it("aplica perdas só em consumível e depois o markup", () => {
    expect(precoVendaSugerido(10, "ITEM", regras)).toBe(20);
    expect(precoVendaSugerido(10, "CONSUMIVEL", regras)).toBe(22);
  });
});
