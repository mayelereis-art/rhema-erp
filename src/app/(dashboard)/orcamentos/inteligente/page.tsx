import { PageHeader } from "../../page-header";
import { listarClientes } from "@/lib/clientes";
import { statusIA } from "@/lib/orcamento-ia";
import { OrcamentoInteligente } from "./orcamento-inteligente";

export default async function OrcamentoInteligentePage() {
  const [clientes, { configurada }] = await Promise.all([listarClientes(), statusIA()]);

  return (
    <>
      <PageHeader
        titulo="Orçamento Inteligente"
        legenda="Envie as fotos de referência do cliente e a IA sugere a composição e os valores — a decisão final é sempre sua"
      />
      <div style={{ padding: "28px 34px 60px", flex: 1 }}>
        <OrcamentoInteligente clientes={clientes} iaConfigurada={configurada} />
      </div>
    </>
  );
}
