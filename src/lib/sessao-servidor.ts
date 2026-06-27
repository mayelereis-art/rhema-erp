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

/** Verifica o cookie de sessão do Firebase e busca o papel do usuário no Firestore. */
export async function obterSessao(): Promise<SessaoUsuario | null> {
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
}

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
