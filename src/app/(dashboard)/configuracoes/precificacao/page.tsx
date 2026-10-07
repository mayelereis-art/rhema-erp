import { redirect } from "next/navigation";
import { PageHeader } from "../../page-header";
import { obterSessao } from "@/lib/sessao-servidor";
import { obterRegrasPrecificacao } from "@/lib/regras-precificacao";
import { RegrasForm } from "./regras-form";

export default async function RegrasPrecificacaoPage() {
  const sessao = await obterSessao();
  if (sessao?.papel !== "ADMIN") redirect("/painel");
  const regras = await obterRegrasPrecificacao();

  return (
    <>
      <PageHeader
        titulo="Regras de precificação"
        legenda="Base de cálculo do Orçamento Inteligente — só a administradora altera; a IA nunca muda estes valores"
      />
      <div style={{ padding: "28px 34px 60px", flex: 1 }}>
        <RegrasForm inicial={regras} />
      </div>
    </>
  );
}
