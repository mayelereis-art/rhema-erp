"use server";

import { revalidatePath } from "next/cache";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "./firebase-admin";
import { exigirAdmin, exigirUsuario } from "./sessao-servidor";
import { REGRAS_PADRAO, type RegrasPrecificacao } from "./motor-custos";

const REF = () => adminDb.collection("configuracoes").doc("precificacao");

const valor = z.number().min(0).max(100_000);
const pct = z.number().min(0).max(1000);
const RegrasSchema = z.object({
  margemMinimaPct: z.number().min(0).max(95),
  markupPct: pct,
  valorHoraProducao: valor,
  valorHoraMontagem: valor,
  valorHoraDesmontagem: valor,
  deslocamentoFixo: valor,
  custoPorKm: valor,
  custoUtilizacaoPct: z.number().min(0).max(100),
  perdasPct: z.number().min(0).max(100),
  contingenciaPct: z.number().min(0).max(100),
  adicionalPersonalizacaoPct: pct,
  adicionalUrgenciaPct: pct,
  diasUrgencia: z.number().int().min(0).max(365),
});

/** Regras vigentes; campos ainda não configurados caem no padrão. */
export async function obterRegrasPrecificacao(): Promise<RegrasPrecificacao> {
  await exigirUsuario();
  const doc = await REF().get();
  const salvas = doc.exists ? RegrasSchema.partial().safeParse(doc.data()) : null;
  return { ...REGRAS_PADRAO, ...(salvas?.success ? salvas.data : {}) };
}

/** Só a ADMIN altera. A IA nunca chama esta função. */
export async function salvarRegrasPrecificacao(
  dados: RegrasPrecificacao
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const sessao = await exigirAdmin();
  const parse = RegrasSchema.safeParse(dados);
  if (!parse.success) return { ok: false, erro: "Valores inválidos. Confira os campos." };
  await REF().set({ ...parse.data, atualizadoEm: Timestamp.now(), atualizadoPor: sessao.uid });
  revalidatePath("/configuracoes/precificacao");
  revalidatePath("/orcamentos/inteligente");
  return { ok: true };
}
