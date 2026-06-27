import { PageHeader } from "../page-header";
import { listarClientes } from "@/lib/clientes";
import { ClientesClient } from "./clientes-client";

export default async function ClientesPage() {
  const clientes = await listarClientes();

  return (
    <>
      <PageHeader titulo="Clientes" legenda="Quem aluga com a Rhema" />
      <div style={{ padding: "28px 34px 60px", flex: 1 }}>
        <ClientesClient clientes={clientes} />
      </div>
    </>
  );
}
