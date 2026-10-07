import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, adminDb } from "./firebase-admin";
import { COLECOES, type Papel } from "./firestore-schema";

export interface SessaoUsuario {
  uid: string;
  nome: string;
  email: string;
  papel: Papel;
}

/**
 * Verifica o cookie de sessão do Firebase e busca o papel do usuário no Firestore.
 * `cache` deduplica a verificação dentro de uma mesma requisição — uma página
 * chama várias funções protegidas em paralelo e cada uma pede a sessão.
 */
export const obterSessao = cache(async (): Promise<SessaoUsuario | null> => {
  const sessionCookie = (await cookies()).get("__session")?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const doc = await adminDb.collection(COLECOES.usuarios).doc(decoded.uid).get();
    if (!doc.exists) return null;

    const dados = doc.data()!;
    return {
      uid: decoded.uid,
      nome: dados.nome,
      email: dados.email,
      papel: dados.papel as Papel,
    };
  } catch {
    return null;
  }
});

/**
 * Para páginas de financeiro/rateio: garante que o papel logado seja ADMIN ou
 * SOCIA, redirecionando EQUIPE para o Painel. Chame no topo do server component da página.
 */
export async function exigirPapelFinanceiro(): Promise<SessaoUsuario> {
  const sessao = await obterSessao();
  if (!sessao) redirect("/login");
  if (sessao.papel === "EQUIPE") redirect("/painel");
  return sessao;
}

export class ErroAcesso extends Error {}

// Guardas para server actions. Toda função exportada de um arquivo "use server"
// vira um endpoint HTTP que qualquer um pode chamar — o middleware só confere a
// presença do cookie e a /loja nem passa por ele. Por isso cada action valida a
// sessão por conta própria, chamando um destes guardas na primeira linha.

/** Exige usuário logado (qualquer papel). */
export async function exigirUsuario(): Promise<SessaoUsuario> {
  const sessao = await obterSessao();
  if (!sessao) throw new ErroAcesso("Sessão expirada. Entre novamente.");
  return sessao;
}

/** Exige ADMIN ou SOCIA — dados e operações financeiras. */
export async function exigirFinanceiro(): Promise<SessaoUsuario> {
  const sessao = await exigirUsuario();
  if (sessao.papel === "EQUIPE") throw new ErroAcesso("Sem permissão para dados financeiros.");
  return sessao;
}

/** Exige ADMIN — configurações do sistema (ex.: regras de precificação). */
export async function exigirAdmin(): Promise<SessaoUsuario> {
  const sessao = await exigirUsuario();
  if (sessao.papel !== "ADMIN") throw new ErroAcesso("Apenas a administradora pode fazer isso.");
  return sessao;
}
