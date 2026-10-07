import { notFound } from "next/navigation";
import { PageHeader } from "../../page-header";
import { obterOrcamento } from "@/lib/orcamentos";
import { obterCliente } from "@/lib/clientes";
import { listarProdutos } from "@/lib/produtos";
import { listarUsuarios } from "@/lib/usuarios";
import { calcularValores } from "@/lib/valores-documento";
import { OrcamentoDetalheClient } from "./orcamento-detalhe-client";

export default async function OrcamentoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orcamento = await obterOrcamento(id);
  if (!orcamento) notFound();

  const [cliente, produtos, usuarios] = await Promise.all([
    obterCliente(orcamento.clienteId),
    listarProdutos(),
    listarUsuarios(),
  ]);
  const infoProduto = Object.fromEntries(
    produtos.map((p) => [p.id, { nome: p.nome, fotoUrl: p.fotoUrl, codigo: p.codigo, valorReposicao: p.valorReposicao }])
  );
  const nomeAtendente = usuarios.find((u) => u.id === orcamento.executoraId)?.nome;

  const valores = calcularValores(orcamento);
  const total = valores.totalItens;
  const rateio = valores.rateio;

  return (
    <>
      <PageHeader titulo={`Orçamento #${orcamento.numero}`} legenda={orcamento.evento} />
      <div style={{ padding: "28px 34px 60px", flex: 1 }}>
        <OrcamentoDetalheClient
          orcamento={orcamento}
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
