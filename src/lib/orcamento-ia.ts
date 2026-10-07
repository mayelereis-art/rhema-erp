"use server";

import { z } from "zod";
import { exigirUsuario } from "./sessao-servidor";

// A integração com a Anthropic roda exclusivamente aqui no servidor. A chave
// vem de ANTHROPIC_API_KEY (sem prefixo NEXT_PUBLIC_, então o Next nunca a
// embute no bundle do navegador) e não é logada nem devolvida em resposta.
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

export type ResultadoAnalise =
  | { ok: false; codigo: "IA_NAO_CONFIGURADA" | "DADOS_INVALIDOS" | "EM_CONSTRUCAO"; mensagem: string };

export async function analisarDecoracao(dadosBrutos: DadosPedidoAnalise): Promise<ResultadoAnalise> {
  await exigirUsuario();

  const parse = PedidoAnalise.safeParse(dadosBrutos);
  if (!parse.success) {
    return { ok: false, codigo: "DADOS_INVALIDOS", mensagem: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }

  if (!iaConfigurada()) {
    return {
      ok: false,
      codigo: "IA_NAO_CONFIGURADA",
      mensagem: "IA não configurada. Peça à administradora para cadastrar a chave ANTHROPIC_API_KEY no Firebase App Hosting.",
    };
  }

  return {
    ok: false,
    codigo: "EM_CONSTRUCAO",
    mensagem: "A chave da IA está configurada, mas a análise automática será liberada na próxima etapa.",
  };
}
