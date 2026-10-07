import { PageHeader } from "../../page-header";
import { listarClientes } from "@/lib/clientes";
import { listarCategorias, listarProdutos } from "@/lib/produtos";
import { statusIA } from "@/lib/orcamento-ia";
import { OrcamentoInteligente } from "./orcamento-inteligente";

export default async function OrcamentoInteligentePage() {
  const [clientes, produtos, categorias, { configurada }] = await Promise.all([
    listarClientes(),
    listarProdutos(),
    listarCategorias(),
    statusIA(),
  ]);
  const nomeCategoria = new Map(categorias.map((c) => [c.id, c.nome]));
  const catalogo = produtos.map((p) => ({
    id: p.id,
    nome: p.nome,
    categoriaNome: p.categoriaId ? nomeCategoria.get(p.categoriaId) ?? "" : "",
  }));

  return (
    <>
      <PageHeader
        titulo="Orçamento Inteligente"
        legenda="Envie as fotos de referência do cliente e a IA sugere a composição e os valores — a decisão final é sempre sua"
      />
      <div style={{ padding: "28px 34px 60px", flex: 1 }}>
        <OrcamentoInteligente clientes={clientes} catalogo={catalogo} iaConfigurada={configurada} />
      </div>
    </>
  );
}
