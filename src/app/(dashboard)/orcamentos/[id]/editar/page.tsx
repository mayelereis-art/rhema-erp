import { notFound, redirect } from "next/navigation";
import { PageHeader } from "../../../page-header";
import { obterOrcamento } from "@/lib/orcamentos";
import { listarClientes } from "@/lib/clientes";
import { listarProdutos } from "@/lib/produtos";
import { listarUsuarios } from "@/lib/usuarios";
import { OrcamentoBuilder } from "../../novo/orcamento-builder";

export default async function EditarOrcamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orcamento = await obterOrcamento(id);
  if (!orcamento) notFound();
  // Convertidos/cancelados são histórico — não podem ser alterados.
  if (orcamento.status !== "PENDENTE") redirect(`/orcamentos/${id}`);

  const [clientes, produtos, usuarios] = await Promise.all([listarClientes(), listarProdutos(), listarUsuarios()]);

  return (
    <>
      <PageHeader titulo={`Editar orçamento #${orcamento.numero}`} legenda={orcamento.evento} />
      <div style={{ padding: "28px 34px 60px", flex: 1 }}>
        <OrcamentoBuilder clientes={clientes} produtos={produtos} usuarios={usuarios} inicial={orcamento} />
      </div>
    </>
  );
}
