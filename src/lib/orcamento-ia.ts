"use server";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { adminBucket, adminDb } from "./firebase-admin";
import { COLECOES } from "./firestore-schema";
import { exigirUsuario } from "./sessao-servidor";

// A integração com a Anthropic roda exclusivamente aqui no servidor. A chave
// vem de ANTHROPIC_API_KEY (sem prefixo NEXT_PUBLIC_, então o Next nunca a
// embute no bundle do navegador) e não é logada nem devolvida em resposta.
const MODELO = "claude-opus-5";

function iaConfigurada(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export async function statusIA(): Promise<{ configurada: boolean }> {
  await exigirUsuario();
  return { configurada: iaConfigurada() };
}

const PedidoAnalise = z.object({
  fotos: z
    .array(z.string().regex(/^orcamentos-ia\/[\w.-]+$/, "Caminho de foto inválido"))
    .min(1, "Envie ao menos uma foto.")
    .max(8, "Envie no máximo 8 fotos."),
  descricao: z.string().max(2000).optional().default(""),
  clienteId: z.string().optional().default(""),
  dataEvento: z.string().min(8, "Informe a data do evento."),
  horario: z.string().max(5).optional().default(""),
  local: z.string().max(200).optional().default(""),
  cidade: z.string().max(100).optional().default(""),
  convidados: z.number().int().min(0).max(5000).optional(),
  tema: z.string().max(120).optional().default(""),
  tipoServico: z.enum(["PRESENCIAL", "PEGMONTE"]),
});

export type DadosPedidoAnalise = z.input<typeof PedidoAnalise>;

// Formato que a IA é obrigada a devolver (structured outputs). Espelhado no
// JSON Schema abaixo; o zod revalida no servidor antes de qualquer uso.
const Material = z.object({ descricao: z.string(), quantidade: z.number(), unidade: z.string() });
const Componente = z.object({
  descricao: z.string(),
  quantidade: z.number(),
  confianca: z.enum(["ALTA", "MEDIA", "BAIXA"]),
  confiancaPct: z.number(),
  produtoId: z.string(), // "" quando nada do catálogo corresponde
  tipo: z.enum(["ITEM", "CONSUMIVEL", "SERVICO"]),
  observacao: z.string(),
  materiais: z.array(Material),
});
const AnaliseIA = z.object({
  tema: z.string(),
  tipoEvento: z.string(),
  componentes: z.array(Componente),
  horasEstimadas: z.object({ producao: z.number(), montagem: z.number(), desmontagem: z.number() }),
  observacoes: z.string(),
});

export type ComponenteIA = z.infer<typeof Componente>;
export type AnaliseDecoracao = z.infer<typeof AnaliseIA>;

const obj = (properties: Record<string, unknown>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const SCHEMA_ANALISE = obj({
  tema: { type: "string" },
  tipoEvento: { type: "string" },
  componentes: {
    type: "array",
    items: obj({
      descricao: { type: "string" },
      quantidade: { type: "number" },
      confianca: { type: "string", enum: ["ALTA", "MEDIA", "BAIXA"] },
      confiancaPct: { type: "number" },
      produtoId: { type: "string" },
      tipo: { type: "string", enum: ["ITEM", "CONSUMIVEL", "SERVICO"] },
      observacao: { type: "string" },
      materiais: {
        type: "array",
        items: obj({ descricao: { type: "string" }, quantidade: { type: "number" }, unidade: { type: "string" } }),
      },
    }),
  },
  horasEstimadas: obj({ producao: { type: "number" }, montagem: { type: "number" }, desmontagem: { type: "number" } }),
  observacoes: { type: "string" },
});

const INSTRUCOES = `Você é assistente de orçamentos da RHEMA Decorações, empresa de locação de decoração de festas em Guararema/SP.
Analise as fotos de referência enviadas pelo cliente e liste os componentes da decoração.

Regras:
- Liste apenas o que você consegue ver nas fotos. Nunca invente elementos. Se algo é incerto, inclua com confiança BAIXA e explique em "observacao".
- confianca: ALTA (claramente visível e identificável), MEDIA (visível, mas tipo/quantidade incertos), BAIXA (parcialmente visível ou suposição). confiancaPct de 0 a 100, coerente com o nível.
- produtoId: use o id de um item do CATÁLOGO RHEMA somente se for de fato a mesma peça ou equivalente direto. Caso contrário, deixe "". Não force correspondências.
- tipo: ITEM para peças reutilizáveis (painel, cilindro, mesa, suporte, vaso, tapete); CONSUMIVEL para o que se gasta no evento (balões, flores naturais, adesivos); SERVICO para personalização feita sob medida (ex.: número personalizado, painel impresso exclusivo).
- materiais: para componentes que precisam ser produzidos (ex.: arco de balões), estime os materiais e quantidades. Para peças prontas, deixe a lista vazia.
- horasEstimadas: estimativa de horas de produção, montagem e desmontagem para a decoração completa. É apenas uma sugestão que a usuária vai revisar.
- Não dê preços. Escreva tudo em português do Brasil.`;

export type ResultadoAnalise =
  | { ok: true; analise: AnaliseDecoracao }
  | { ok: false; codigo: "IA_NAO_CONFIGURADA" | "DADOS_INVALIDOS" | "FALHA_IA"; mensagem: string };

async function lerFoto(caminho: string): Promise<string> {
  const [buffer] = await adminBucket().file(caminho).download();
  return buffer.toString("base64");
}

async function resumoCatalogo(): Promise<string> {
  const [produtos, categorias] = await Promise.all([
    adminDb.collection(COLECOES.produtos).orderBy("nome").get(),
    adminDb.collection(COLECOES.categorias).get(),
  ]);
  const nomeCat = new Map(categorias.docs.map((c) => [c.id, c.data().nome as string]));
  return produtos.docs
    .map((p) => {
      const d = p.data();
      return `- id=${p.id} | ${d.nome}${d.categoriaId ? ` | categoria: ${nomeCat.get(d.categoriaId) ?? ""}` : ""}`;
    })
    .join("\n");
}

export async function analisarDecoracao(dadosBrutos: DadosPedidoAnalise): Promise<ResultadoAnalise> {
  await exigirUsuario();

  const parse = PedidoAnalise.safeParse(dadosBrutos);
  if (!parse.success) {
    return { ok: false, codigo: "DADOS_INVALIDOS", mensagem: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const dados = parse.data;

  if (!iaConfigurada()) {
    return {
      ok: false,
      codigo: "IA_NAO_CONFIGURADA",
      mensagem: "IA não configurada. Peça à administradora para cadastrar a chave ANTHROPIC_API_KEY no Firebase App Hosting.",
    };
  }

  let fotos: string[];
  let catalogo: string;
  try {
    [fotos, catalogo] = await Promise.all([Promise.all(dados.fotos.map(lerFoto)), resumoCatalogo()]);
  } catch {
    return { ok: false, codigo: "FALHA_IA", mensagem: "Não foi possível ler as fotos enviadas. Envie-as novamente." };
  }

  const contexto = [
    `Modalidade: ${dados.tipoServico === "PRESENCIAL" ? "RHEMA decora no local" : "Pegue e Monte (cliente retira e monta)"}`,
    dados.tema && `Tema informado: ${dados.tema}`,
    dados.convidados && `Convidados estimados: ${dados.convidados}`,
    dados.descricao && `Pedido do cliente: ${dados.descricao}`,
    `\nCATÁLOGO RHEMA:\n${catalogo}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const client = new Anthropic();
    const resposta = await client.beta.messages.create({
      model: MODELO,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA_ANALISE } },
      system: INSTRUCOES,
      messages: [
        {
          role: "user",
          content: [
            ...fotos.map((data) => ({
              type: "image" as const,
              source: { type: "base64" as const, media_type: "image/jpeg" as const, data },
            })),
            { type: "text" as const, text: contexto },
          ],
        },
      ],
    });

    if (resposta.stop_reason === "refusal") {
      return { ok: false, codigo: "FALHA_IA", mensagem: "A IA não conseguiu analisar estas fotos. Tente outras imagens." };
    }
    const texto = resposta.content.find((b) => b.type === "text");
    const analise = AnaliseIA.safeParse(texto && "text" in texto ? JSON.parse(texto.text) : null);
    if (!analise.success) {
      return { ok: false, codigo: "FALHA_IA", mensagem: "A resposta da IA veio incompleta. Tente analisar novamente." };
    }

    // Só aceita correspondências com ids que de fato existem no catálogo.
    const idsValidos = new Set(catalogo.match(/id=(\S+)/g)?.map((m) => m.slice(3)));
    for (const c of analise.data.componentes) {
      if (c.produtoId && !idsValidos.has(c.produtoId)) c.produtoId = "";
    }
    return { ok: true, analise: analise.data };
  } catch (erro) {
    if (erro instanceof Anthropic.AuthenticationError) {
      return { ok: false, codigo: "FALHA_IA", mensagem: "A chave da IA é inválida. Verifique a ANTHROPIC_API_KEY." };
    }
    if (erro instanceof Anthropic.RateLimitError) {
      return { ok: false, codigo: "FALHA_IA", mensagem: "Limite de uso da IA atingido. Aguarde alguns minutos." };
    }
    // Mensagem genérica: detalhes do erro podem conter dados da requisição.
    console.error("Falha na análise da IA:", erro instanceof Anthropic.APIError ? erro.status : "erro inesperado");
    return { ok: false, codigo: "FALHA_IA", mensagem: "A IA está indisponível no momento. Tente novamente em instantes." };
  }
}
