import { PageHeader } from "../page-header";
import { listarCategorias, listarFornecedores, listarProdutos } from "@/lib/produtos";
import { CatalogoClient } from "./catalogo-client";

export default async function CatalogoPage() {
  const [produtos, categorias, fornecedores] = await Promise.all([
    listarProdutos(),
    listarCategorias(),
    listarFornecedores(),
  ]);

  return (
    <>
      <PageHeader titulo="Catálogo" legenda="Seus produtos para locação" />
      <div style={{ padding: "28px 34px 60px", flex: 1 }}>
        <CatalogoClient produtos={produtos} categorias={categorias} fornecedores={fornecedores} />
      </div>
    </>
  );
}
