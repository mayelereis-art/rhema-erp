"use server";

import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { exigirUsuario } from "./sessao-servidor";
import { criarClienteAnthropic, descreverErroIA, iaConfigurada, MODELO_IA } from "./anthropic-cliente";
import { resumirOfertas, type ResumoMercado } from "./precos-mercado";

const Pedido = z.object({
  descricao: z.string().trim().min(3, "Descreva o item para pesquisar.").max(200),
  tipo: z.enum(["ITEM", "CONSUMIVEL", "SERVICO"]),
  quantidade: z.number().int().min(1).max(100_000),
});

export type ResultadoPesquisa =
  | ({ ok: true; dataPesquisa: string; unidade: string } & ResumoMercado)
  | { ok: false; mensagem: string };

const SEM_PRECO = "Não foi possível obter preço de mercado.";

const SCHEMA = {
  type: "object",
  properties: {
    unidade: { type: "string" },
    ofertas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          titulo: { type: "string" },
          loja: { type: "string" },
          preco: { type: "number" },
          url: { type: "string" },
        },
        required: ["titulo", "loja", "preco", "url"],
        additionalProperties: false,
      },
    },
  },
  required: ["unidade", "ofertas"],
  additionalProperties: false,
};

const Resposta = z.object({
  unidade: z.string(),
  ofertas: z.array(z.object({ titulo: z.string(), loja: z.string(), preco: z.number(), url: z.string() })),
});

/** Todos os links que de fato vieram das ferramentas de busca/leitura da web. */
function urlsDasFerramentas(conteudo: unknown[]): Set<string> {
  const urls = new Set<string>();
  const visitar = (v: unknown) => {
    if (Array.isArray(v)) return v.forEach(visitar);
    if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v)) {
        if (k === "url" && typeof x === "string") urls.add(x);
        else visitar(x);
      }
    }
  };
  for (const bloco of conteudo) {
    const tipo = (bloco as { type?: string }).type ?? "";
    if (tipo.endsWith("_tool_result")) visitar(bloco);
  }
  return urls;
}

/**
 * Pesquisa preço de compra de um item que a RHEMA não tem no catálogo. Só
 * roda quando a usuária clica em "Pesquisar preço" — nada é gravado aqui; o
 * valor só entra no orçamento se ela decidir usar.
 */
export async function pesquisarPrecoMercado(dadosBrutos: z.input<typeof Pedido>): Promise<ResultadoPesquisa> {
  await exigirUsuario();
  const parse = Pedido.safeParse(dadosBrutos);
  if (!parse.success) return { ok: false, mensagem: parse.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parse.data;
  if (!iaConfigurada()) return { ok: false, mensagem: `IA não configurada. ${SEM_PRECO}` };

  const pedido = `Pesquise na internet o preço de COMPRA no Brasil, hoje, de: "${d.descricao}"${
    d.tipo === "CONSUMIVEL" ? ` (material de consumo; quantidade necessária: ${d.quantidade})` : ""
  }.

Regras:
- Use a ferramenta de busca. Procure em lojas, marketplaces e fornecedores brasileiros de artigos para festa e decoração.
- Liste até 6 ofertas reais encontradas, cada uma com o link exato da página do produto que apareceu na busca, a loja, o título e o preço em reais.
- "preco" é o preço por UMA unidade do item (se o anúncio vende pacote, divida pelo número de unidades do pacote). Informe em "unidade" que unidade é essa (ex.: "unidade", "metro", "balão").
- Só inclua ofertas cujo preço você viu na página/resultados. Nunca estime, arredonde de memória ou invente preço ou link.
- Se não encontrar nenhuma oferta confiável, devolva a lista vazia.`;

  try {
    const client = criarClienteAnthropic();
    const mensagens: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: pedido }];
    const conteudoTotal: unknown[] = [];
    let resposta: Anthropic.Beta.BetaMessage | null = null;

    // pause_turn: a busca no servidor da Anthropic pode pausar um turno longo;
    // reenviar o turno do assistente faz continuar de onde parou.
    for (let rodada = 0; rodada < 4; rodada++) {
      resposta = await client.beta.messages.create({
        model: MODELO_IA,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        thinking: { type: "adaptive" },
        output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
        tools: [
          {
            type: "web_search_20260209",
            name: "web_search",
            max_uses: 5,
            user_location: { type: "approximate", country: "BR", region: "São Paulo", city: "Guararema", timezone: "America/Sao_Paulo" },
          },
        ],
        messages: mensagens,
      });
      conteudoTotal.push(...resposta.content);
      if (resposta.stop_reason !== "pause_turn") break;
      mensagens.push({ role: "assistant", content: resposta.content });
    }

    if (!resposta || resposta.stop_reason === "refusal" || resposta.stop_reason === "pause_turn") {
      return { ok: false, mensagem: SEM_PRECO };
    }
    const texto = resposta.content.filter((b) => b.type === "text").map((b) => ("text" in b ? b.text : "")).join("");
    let json: unknown = null;
    try {
      json = JSON.parse(texto);
    } catch {
      json = null;
    }
    const lido = Resposta.safeParse(json);
    if (!lido.success) return { ok: false, mensagem: SEM_PRECO };

    const resumo = resumirOfertas(lido.data.ofertas, urlsDasFerramentas(conteudoTotal));
    if (!resumo) return { ok: false, mensagem: SEM_PRECO };
    return { ok: true, dataPesquisa: new Date().toISOString(), unidade: lido.data.unidade || "unidade", ...resumo };
  } catch (erro) {
    console.error("Falha na pesquisa de preço:", descreverErroIA(erro));
    return { ok: false, mensagem: `${SEM_PRECO} (detalhe técnico: ${descreverErroIA(erro)})` };
  }
}
