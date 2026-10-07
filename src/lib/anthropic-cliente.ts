// Módulo interno do servidor (sem "use server": não vira endpoint). Só é
// importado por actions que já validaram a sessão.
import Anthropic from "@anthropic-ai/sdk";

export const MODELO_IA = "claude-opus-5";

export function iaConfigurada(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

/**
 * Cliente da Anthropic. A chave vem de ANTHROPIC_API_KEY (Secret Manager, sem
 * prefixo NEXT_PUBLIC_, nunca vai ao navegador). Chaves criadas no nível da
 * organização exigem o workspace no cabeçalho — o ID não é segredo e fica em
 * ANTHROPIC_WORKSPACE_ID.
 */
export function criarClienteAnthropic(): Anthropic {
  const workspace = process.env.ANTHROPIC_WORKSPACE_ID?.trim();
  return new Anthropic(workspace ? { defaultHeaders: { "anthropic-workspace-id": workspace } } : {});
}

/** Código e tipo/mensagem do erro da API — nunca a chave nem o corpo da requisição. */
export function descreverErroIA(erro: unknown): string {
  if (erro instanceof Anthropic.APIError) {
    const corpo = erro.error as { error?: { type?: string; message?: string } } | undefined;
    const tipo = corpo?.error?.type ?? "";
    const mensagem = (corpo?.error?.message ?? "").slice(0, 200);
    return `${erro.status ?? "?"} ${[tipo, mensagem].filter(Boolean).join(": ")}`.trim();
  }
  return erro instanceof Error ? erro.name : "erro inesperado";
}
