import { notFound } from "next/navigation";
import { PageHeader } from "../../page-header";
import { obterContrato } from "@/lib/contratos";
import { obterCliente } from "@/lib/clientes";
import { listarProdutos } from "@/lib/produtos";
import { listarUsuarios } from "@/lib/usuarios";
import { calcularValores } from "@/lib/valores-documento";
import { ContratoDetalheClient } from "./contrato-detalhe-client";

export default async function ContratoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contrato = await obterContrato(id);
  if (!contrato) notFound();

  const [cliente, produtos, usuarios] = await Promise.all([
    obterCliente(contrato.clienteId),
    listarProdutos(),
    listarUsuarios(),
  ]);
  const infoProduto = Object.fromEntries(
    produtos.map((p) => [p.id, { nome: p.nome, fotoUrl: p.fotoUrl, codigo: p.codigo, valorReposicao: p.valorReposicao }])
  );
  const nomeAtendente = usuarios.find((u) => u.id === contrato.executoraId)?.nome;

  const valores = calcularValores(contrato);
  const total = valores.totalItens;
  const rateio = valores.rateio;

  return (
    <>
      <PageHeader titulo={`Contrato #${contrato.numero}`} legenda={contrato.evento} />
      <div style={{ padding: "28px 34px 60px", flex: 1 }}>
        <ContratoDetalheClient
          contrato={contrato}
          cliente={cliente}
          infoProduto={infoProduto}
          nomeAtendente={nomeAtendente}
          total={total}
          rateio={rateio}
        />
      </div>
    </>
  );
}
