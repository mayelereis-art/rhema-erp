import { PageHeader } from "../../page-header";
import { listarClientes } from "@/lib/clientes";
import { listarProdutos } from "@/lib/produtos";
import { listarUsuarios } from "@/lib/usuarios";
import { ContratoBuilder } from "./contrato-builder";

export default async function NovoContratoPage() {
  const [clientes, produtos, usuarios] = await Promise.all([listarClientes(), listarProdutos(), listarUsuarios()]);

  return (
    <>
      <PageHeader titulo="Novo orçamento" legenda="Monte o pedido com checagem automática de estoque" />
      <div style={{ padding: "28px 34px 60px", flex: 1 }}>
        <ContratoBuilder clientes={clientes} produtos={produtos} usuarios={usuarios} />
      </div>
    </>
  );
}
