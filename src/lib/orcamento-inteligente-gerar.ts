"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { z } from "zod";
import { adminDb } from "./firebase-admin";
import { COLECOES, type ItemAvulso, type ItemContrato } from "./firestore-schema";
import { exigirUsuario } from "./sessao-servidor";
import { obterRegrasPrecificacao } from "./regras-precificacao";
import { calcularOrcamento } from "./motor-custos";
import { gravarNovoOrcamento } from "./orcamentos-gravacao";

const LinhaSchema = z.object({
  descricao: z.string().trim().min(1, "Há item sem descrição.").max(200),
  quantidade: z.number().int().min(1).max(100_000),
  tipo: z.enum(["ITEM", "CONSUMIVEL", "SERVICO"]),
  produtoId: z.string().max(100).optional().default(""),
  custoUnitario: z.number().min(0).max(1_000_000).default(0),
  precoUnitario: z.number().min(0).max(1_000_000).default(0),
  precoManual: z.boolean().default(false),
  origemCusto: z.enum(["MANUAL", "PESQUISA_MERCADO"]).optional(),
  fonteUrl: z.string().url().max(2000).optional(),
  dataPesquisa: z.string().datetime().optional(),
  confianca: z.enum(["ALTA", "MEDIA", "BAIXA"]).optional(),
  confiancaPct: z.number().optional(),
  daIA: z.boolean().default(false),
});

const PedidoGerar = z.object({
  clienteId: z.string().min(1, "Selecione o cliente."),
  dataEvento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data do evento."),
  horario: z.string().max(5).optional().default(""),
  local: z.string().max(200).optional().default(""),
  cidade: z.string().max(100).optional().default(""),
  convidados: z.number().int().min(0).max(5000).optional(),
  tema: z.string().max(120).optional().default(""),
  descricao: z.string().max(2000).optional().default(""),
  tipoServico: z.enum(["PRESENCIAL", "PEGMONTE"]),
  horas: z.object({ producao: z.number().min(0).max(500), montagem: z.number().min(0).max(500), desmontagem: z.number().min(0).max(500) }),
  km: z.number().min(0).max(10_000),
  linhas: z.array(LinhaSchema).min(1, "Adicione ao menos um item.").max(200),
  fotos: z.array(z.string().regex(/^orcamentos-ia\/[\w.-]+$/)).max(8).default([]),
  temaIA: z.string().max(200).optional(),
});

export type DadosGerarOrcamento = z.input<typeof PedidoGerar>;

/**
 * Grava o orçamento revisado pela usuária. Só é chamada pelo botão "Gerar
 * orçamento", depois da confirmação — a IA nunca chama isto. Recalcula tudo no
 * servidor com a diária do catálogo e as regras vigentes: os números vindos da
 * tela servem apenas como os valores que a usuária digitou (custo/preço de avulsos).
 * Não reserva estoque (orçamento nunca reserva; só a conversão em contrato).
 */
export async function gerarOrcamentoInteligente(
  dadosBrutos: DadosGerarOrcamento
): Promise<{ ok: true; id: string } | { ok: false; erro: string }> {
  const sessao = await exigirUsuario();
  const parse = PedidoGerar.safeParse(dadosBrutos);
  if (!parse.success) return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parse.data;

  const semPreco = d.linhas.find((l) => !l.produtoId && l.precoUnitario <= 0);
  if (semPreco) return { ok: false, erro: `"${semPreco.descricao}" está sem preço de venda.` };

  const ids = [...new Set(d.linhas.map((l) => l.produtoId).filter(Boolean))];
  const [regras, clienteDoc, produtosDocs] = await Promise.all([
    obterRegrasPrecificacao(),
    adminDb.collection(COLECOES.clientes).doc(d.clienteId).get(),
    Promise.all(ids.map((id) => adminDb.collection(COLECOES.produtos).doc(id).get())),
  ]);
  if (!clienteDoc.exists) return { ok: false, erro: "Cliente não encontrado." };
  const diaria = new Map<string, number>();
  for (const doc of produtosDocs) {
    if (!doc.exists) return { ok: false, erro: "Um produto vinculado não existe mais no catálogo. Revise os itens." };
    diaria.set(doc.id, Number(doc.data()!.precoDiaria) || 0);
  }

  const r = calcularOrcamento({
    modalidade: d.tipoServico,
    dataEvento: d.dataEvento,
    horas: d.horas,
    km: d.km,
    regras,
    linhas: d.linhas.map((l) => ({
      descricao: l.descricao,
      quantidade: l.quantidade,
      tipo: l.tipo,
      produtoId: l.produtoId || undefined,
      precoDiaria: l.produtoId ? diaria.get(l.produtoId) : undefined,
      custoUnitario: l.custoUnitario,
      precoUnitario: l.precoUnitario,
    })),
  });

  // Itens do catálogo: mesmo produto em várias linhas vira uma linha só.
  const qtdPorProduto = new Map<string, number>();
  for (const l of d.linhas) if (l.produtoId) qtdPorProduto.set(l.produtoId, (qtdPorProduto.get(l.produtoId) ?? 0) + l.quantidade);
  const itens: ItemContrato[] = [...qtdPorProduto].map(([produtoId, quantidade]) => ({
    produtoId,
    quantidade,
    precoUnitario: diaria.get(produtoId) ?? 0,
  }));

  const itensAvulsos: ItemAvulso[] = d.linhas
    .filter((l) => !l.produtoId)
    .map((l) => ({
      id: randomUUID(),
      descricao: l.descricao,
      tipo: l.tipo,
      quantidade: l.quantidade,
      // Consumível: grava o custo já com perdas, que é o custo real previsto.
      custoUnitario:
        Math.round(l.custoUnitario * (l.tipo === "CONSUMIVEL" ? 1 + regras.perdasPct / 100 : 1) * 100) / 100,
      precoUnitario: l.precoUnitario,
      ...(l.origemCusto === "PESQUISA_MERCADO" && l.fonteUrl
        ? { origemPreco: "PESQUISA_MERCADO" as const, fonteUrl: l.fonteUrl, ...(l.dataPesquisa ? { dataPesquisa: l.dataPesquisa } : {}) }
        : { origemPreco: "MANUAL" as const }),
      ...(l.precoUnitario > 0 && l.custoUnitario > 0
        ? { margemPct: Math.round(((l.precoUnitario - l.custoUnitario) / l.precoUnitario) * 1000) / 10 }
        : {}),
    }));
  if (r.adicionalPersonalizacao > 0) {
    itensAvulsos.push({ id: randomUUID(), descricao: "Adicional de personalização", tipo: "SERVICO", quantidade: 1, custoUnitario: 0, precoUnitario: r.adicionalPersonalizacao, origemPreco: "MANUAL" });
  }
  if (r.adicionalUrgencia > 0) {
    itensAvulsos.push({ id: randomUUID(), descricao: "Adicional de urgência", tipo: "SERVICO", quantidade: 1, custoUnitario: 0, precoUnitario: r.adicionalUrgencia, origemPreco: "MANUAL" });
  }

  // custos = serviço presencial (cobrado do cliente pelo custo, como sempre);
  // custosInternos = o resto do custo real (não aparece para o cliente).
  const custos = r.custoServico;
  const custosInternos = Math.round((r.custoEstimado - r.custoServico) * 100) / 100;
  const presencial = d.tipoServico === "PRESENCIAL";
  const endereco = [d.local, d.cidade].filter(Boolean).join(" — ");
  // Mesma convenção dos montadores de orçamento/contrato ("YYYY-MM-DD" → meia-noite
  // UTC), senão a checagem de sobreposição de datas não casa com os contratos.
  const dataISO = d.dataEvento;

  const { id } = await gravarNovoOrcamento(
    {
      clienteId: d.clienteId,
      evento: d.tema || d.temaIA || "Decoração",
      inicio: dataISO,
      fim: dataISO,
      tipoServico: d.tipoServico,
      custos,
      desconto: 0,
      executoraId: sessao.uid,
      modoLogistica: presencial ? "ENTREGA" : "RETIRADA",
      endereco: presencial ? endereco || undefined : undefined,
      itens,
    },
    {
      ...(d.horario ? { horario: d.horario } : {}),
      ...(d.local ? { local: d.local } : {}),
      ...(d.cidade ? { cidade: d.cidade } : {}),
      ...(d.convidados ? { convidados: d.convidados } : {}),
      ...(d.tema ? { tema: d.tema } : {}),
      itensAvulsos,
      custosInternos,
      baseRateio: "RECEITA_MENOS_CUSTOS",
      origem: "ORCAMENTO_INTELIGENTE",
      analiseIA: {
        fotos: d.fotos,
        pedidoCliente: d.descricao,
        temaIA: d.temaIA ?? null,
        horas: d.horas,
        km: d.km,
        linhas: d.linhas.map((l) => ({
          descricao: l.descricao,
          quantidade: l.quantidade,
          tipo: l.tipo,
          produtoId: l.produtoId || null,
          daIA: l.daIA,
          confianca: l.confianca ?? null,
          confiancaPct: l.confiancaPct ?? null,
        })),
        regras,
        calculo: {
          custoEstimado: r.custoEstimado,
          precoSugerido: r.precoSugerido,
          precoMinimo: r.precoMinimo,
          margemPct: r.margemPct,
          custoMateriais: r.custoMateriais,
          custoItensNovos: r.custoItensNovos,
          custoUtilizacao: r.custoUtilizacao,
          custoMaoDeObra: r.custoMaoDeObra,
          custoDeslocamento: r.custoDeslocamento,
          custoContingencia: r.custoContingencia,
        },
        geradoPor: sessao.uid,
        geradoEm: new Date().toISOString(),
      },
    }
  );

  revalidatePath("/orcamentos");
  return { ok: true, id };
}
