import { exigirPapelFinanceiro } from "@/lib/sessao-servidor";
import { PageHeader } from "../page-header";
import { listarClientes } from "@/lib/clientes";
import { listarContratosFechados } from "@/lib/contratos";
import { listarRateioContratos } from "@/lib/rateio-dados";
import { RATEIO, type Destinatario } from "@/lib/rateio";
import { RateioClient } from "./rateio-client";

export default async function RateioPage() {
  await exigirPapelFinanceiro();

  const clientes = await listarClientes();
  const nomeCliente = Object.fromEntries(clientes.map((c) => [c.id, c.nome]));
  const linhas = await listarRateioContratos(nomeCliente);

  const totais: Record<Destinatario, number> = { Maiele: 0, Michele: 0, Cassia: 0, Caixa: 0 };
  for (const linha of linhas) {
    for (const fatia of linha.fatias) {
      totais[fatia.destino] += fatia.valor;
    }
  }

  const contratosFechados = await listarContratosFechados();
  const custosTipoPorContrato = Object.fromEntries(contratosFechados.map((c) => [c.id, { custos: c.custos, tipoServico: c.tipoServico }]));

  return (
    <>
      <PageHeader titulo="Rateio societário" legenda="Divisão do lucro entre as sócias pelo Modelo C" />
      <div style={{ padding: "28px 34px 60px", flex: 1 }}>
        <RateioClient linhas={linhas} totais={totais} regras={RATEIO} custosTipoPorContrato={custosTipoPorContrato} />
      </div>
    </>
  );
}
