import { PageHeader } from "../../page-header";
import { listarClientes } from "@/lib/clientes";
import { listarProdutos } from "@/lib/produtos";
import { listarUsuarios } from "@/lib/usuarios";
import { OrcamentoBuilder } from "./orcamento-builder";

export default async function NovoOrcamentoPage() {
  const [clientes, produtos, usuarios] = await Promise.all([listarClientes(), listarProdutos(), listarUsuarios()]);

  return (
    <>
      <PageHeader titulo="Novo orçamento" legenda="Monte uma proposta de preço para enviar ao cliente" />
      <div style={{ padding: "28px 34px 60px", flex: 1 }}>
        <OrcamentoBuilder clientes={clientes} produtos={produtos} usuarios={usuarios} />
      </div>
    </>
  );
}
