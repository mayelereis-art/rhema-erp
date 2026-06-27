"use server";

import { adminDb } from "./firebase-admin";
import { COLECOES, type Usuario } from "./firestore-schema";

// `criadoEm` é um Timestamp do Admin SDK — não é serializável ao atravessar a
// fronteira servidor/cliente do React, então é descartado aqui (a UI não usa).
export async function listarUsuarios(): Promise<Usuario[]> {
  const snap = await adminDb.collection(COLECOES.usuarios).orderBy("nome").get();
  return snap.docs.map((doc) => {
    const { criadoEm, ...resto } = doc.data();
    void criadoEm;
    return { id: doc.id, ...resto } as Usuario;
  });
}
