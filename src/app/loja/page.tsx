import { listarCatalogoPublico } from "@/lib/loja";
import { LojaClient } from "./loja-client";

// Catálogo muda com frequência e depende do Admin SDK — sem pré-renderização estática.
export const dynamic = "force-dynamic";

export default async function LojaPage() {
  const { produtos, categorias } = await listarCatalogoPublico();

  return <LojaClient produtos={produtos} categorias={categorias} />;
}
