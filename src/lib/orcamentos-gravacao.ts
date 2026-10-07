// Módulo interno (sem "use server"): estas funções NÃO viram endpoints HTTP.
// Só são chamadas por actions que já validaram quem está chamando — o
// criarOrcamento autenticado e o formulário público da loja (que valida com zod).
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";
import { COLECOES, type ItemContrato, type ModoLogistica, type Orcamento, type TipoServico } from "./firestore-schema";

export interface DadosOrcamento {
  clienteId: string;
  evento: string;
  inicio: string; // ISO
  fim: string;
  tipoServico: TipoServico;
  custos: number;
  desconto?: number;
  executoraId?: string;
  modoLogistica: ModoLogistica;
  endereco?: string;
  itens: ItemContrato[];
}

async function proximoNumero(): Promise<number> {
  const ref = adminDb.collection(COLECOES.contadores).doc("orcamentos");
  return adminDb.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const ultimo = doc.exists ? (doc.data()!.ultimo as number) : 0;
    const proximo = ultimo + 1;
    tx.set(ref, { ultimo: proximo }, { merge: true });
    return proximo;
  });
}

/**
 * Orçamento não reserva estoque — é só uma proposta de preço, igual ao modelo
 * que a Rhema já usava ("Estas datas não interferem na reserva de estoque").
 * A checagem de disponibilidade só acontece ao converter em contrato.
 */
export async function gravarNovoOrcamento(
  dados: DadosOrcamento,
  // Campos opcionais do Orçamento Inteligente (Orcamento em firestore-schema.ts).
  extras: Partial<Pick<Orcamento, "horario" | "local" | "cidade" | "convidados" | "tema" | "itensAvulsos" | "custosInternos" | "baseRateio" | "origem" | "analiseIA">> = {}
): Promise<{ id: string; numero: number }> {
  const numero = await proximoNumero();

  const ref = await adminDb.collection(COLECOES.orcamentos).add({
    numero,
    clienteId: dados.clienteId,
    evento: dados.evento,
    inicio: Timestamp.fromDate(new Date(dados.inicio)),
    fim: Timestamp.fromDate(new Date(dados.fim)),
    status: "PENDENTE",
    tipoServico: dados.tipoServico,
    custos: dados.custos,
    desconto: dados.desconto ?? 0,
    executoraId: dados.executoraId ?? null,
    modoLogistica: dados.modoLogistica,
    endereco: dados.endereco ?? null,
    itens: dados.itens,
    contratoId: null,
    criadoEm: Timestamp.now(),
    ...extras,
  });

  return { id: ref.id, numero };
}
