import { notFound } from "next/navigation";
import { PageHeader } from "../../page-header";
import { obterContrato } from "@/lib/contratos";
import { obterCliente } from "@/lib/clientes";
import { listarProdutos } from "@/lib/produtos";
import { calcularRateio } from "@/lib/rateio";
import { ContratoDetalheClient } from "./contrato-detalhe-client";

const MAPA_TIPO = { PRESENCIAL: "presencial", PEGMONTE: "pegmonte" } as const;

export default async function ContratoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contrato = await obterContrato(id);
  if (!contrato) notFound();

  const [cliente, produtos] = await Promise.all([obterCliente(contrato.clienteId), listarProdutos()]);
  const nomeProduto = Object.fromEntries(produtos.map((p) => [p.id, p.nome]));

  const total = contrato.itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0);
  const rateio = calcularRateio(total, contrato.custos, MAPA_TIPO[contrato.tipoServico]);

  return (
    <>
      <PageHeader titulo={`Contrato #${contrato.numero}`} legenda={contrato.evento} />
      <div style={{ padding: "28px 34px 60px", flex: 1 }}>
        <ContratoDetalheClient
          contrato={contrato}
          cliente={cliente}
          nomeProduto={nomeProduto}
          total={total}
          rateio={rateio}
        />
      </div>
    </>
  );
}
