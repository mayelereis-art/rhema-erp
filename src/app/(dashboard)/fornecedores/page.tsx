import { PageHeader } from "../page-header";
import { listarFornecedores, listarProdutos } from "@/lib/produtos";
import { FornecedoresClient } from "./fornecedores-client";

export default async function FornecedoresPage() {
  const [fornecedores, produtos] = await Promise.all([listarFornecedores(), listarProdutos()]);

  return (
    <>
      <PageHeader titulo="Fornecedores" legenda="Quem abastece seu estoque" />
      <div style={{ padding: "28px 34px 60px", flex: 1 }}>
        <FornecedoresClient fornecedores={fornecedores} produtos={produtos} />
      </div>
    </>
  );
}
