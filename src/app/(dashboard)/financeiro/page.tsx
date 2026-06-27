import { exigirPapelFinanceiro } from "@/lib/sessao-servidor";
import { PageHeader } from "../page-header";
import { listarContratos } from "@/lib/contratos";
import { listarClientes } from "@/lib/clientes";
import { listarDespesas } from "@/lib/despesas";
import { FinanceiroClient } from "./financeiro-client";

export default async function FinanceiroPage() {
  await exigirPapelFinanceiro();

  const [contratos, clientes, despesas] = await Promise.all([
    listarContratos(),
    listarClientes(),
    listarDespesas(),
  ]);
  const nomeCliente = Object.fromEntries(clientes.map((c) => [c.id, c.nome]));

  const aReceber = contratos
    .filter((c) => c.status === "CONFIRMADO" || c.status === "CONCLUIDO")
    .flatMap((c) =>
      c.parcelas.map((p, indice) => ({
        contratoId: c.id,
        numero: c.numero,
        cliente: nomeCliente[c.clienteId] ?? "—",
        indice,
        ...p,
      }))
    );

  return (
    <>
      <PageHeader titulo="Financeiro" legenda="Parcelas a receber e contas a pagar" />
      <div style={{ padding: "28px 34px 60px", flex: 1 }}>
        <FinanceiroClient aReceber={aReceber} despesas={despesas} />
      </div>
    </>
  );
}
