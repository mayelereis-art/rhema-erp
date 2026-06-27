import { PageHeader } from "../page-header";
import { listarContratosLogistica } from "@/lib/contratos";
import { listarClientes } from "@/lib/clientes";
import { LogisticaClient } from "./logistica-client";

export default async function LogisticaPage() {
  const [contratos, clientes] = await Promise.all([listarContratosLogistica(), listarClientes()]);
  const nomeCliente = Object.fromEntries(clientes.map((c) => [c.id, c.nome]));

  return (
    <>
      <PageHeader titulo="Logística" legenda="Entregas e devoluções por evento" />
      <div style={{ padding: "28px 34px 60px", flex: 1 }}>
        <LogisticaClient contratos={contratos} nomeCliente={nomeCliente} />
      </div>
    </>
  );
}
