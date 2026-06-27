import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao-servidor";

export default async function RootPage() {
  const sessao = await obterSessao();
  redirect(sessao ? "/painel" : "/login");
}
