"use server";

import { adminDb } from "./firebase-admin";
import { COLECOES, type Usuario } from "./firestore-schema";

export async function listarUsuarios(): Promise<Usuario[]> {
  const snap = await adminDb.collection(COLECOES.usuarios).orderBy("nome").get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Usuario);
}
