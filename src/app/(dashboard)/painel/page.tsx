import Link from "next/link";
import { PageHeader } from "../page-header";
import { listarContratos } from "@/lib/contratos";
import { listarOrcamentos } from "@/lib/orcamentos";
import { listarClientes } from "@/lib/clientes";
import { listarDespesas } from "@/lib/despesas";
import { listarProdutos } from "@/lib/produtos";

export default async function PainelPage() {
  const [contratos, orcamentos, clientes, despesas, produtos] = await Promise.all([
    listarContratos(),
    listarOrcamentos(),
    listarClientes(),
    listarDespesas(),
    listarProdutos(),
  ]);

  const nomeCliente = Object.fromEntries(clientes.map((c) => [c.id, c.nome]));
  const hoje = new Date();

  const contratosConfirmados = contratos.filter((c) => c.status === "CONFIRMADO");
  const proximosEventos = contratosConfirmados
    .filter((c) => new Date(c.inicio) >= hoje)
    .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())
    .slice(0, 5);

  const aReceber = contratos
    .filter((c) => c.status === "CONFIRMADO" || c.status === "CONCLUIDO")
    .flatMap((c) => c.parcelas.filter((p) => !p.pago).map((p) => p.valor))
    .reduce((s, v) => s + v, 0);

  const aPagar = despesas.filter((d) => !d.pago).reduce((s, d) => s + d.valor, 0);

  const orcamentosPendentes = orcamentos.filter((o) => o.status === "PENDENTE");
  const valorOrcamentosPendentes = orcamentosPendentes.reduce(
    (s, o) =>
      s + o.itens.reduce((si, i) => si + i.quantidade * i.precoUnitario, 0) + (o.tipoServico === "PRESENCIAL" ? o.custos : 0),
    0
  );

  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();
  const faturamentoMes = contratos
    .filter((c) => c.status !== "CANCELADO")
    .filter((c) => {
      const d = new Date(c.inicio);
      return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
    })
    .reduce((s, c) => s + c.itens.reduce((si, i) => si + i.quantidade * i.precoUnitario, 0), 0);

  return (
    <>
      <PageHeader titulo="Painel" legenda="Visão geral do seu negócio de decoração" />
      <div style={{ padding: "28px 34px 60px", flex: 1 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
          <Cartao titulo="A receber" valor={`R$ ${aReceber.toFixed(2)}`} cor="var(--sage)" legenda="parcelas pendentes" />
          <Cartao titulo="A pagar" valor={`R$ ${aPagar.toFixed(2)}`} cor="var(--rose-deep)" legenda="despesas pendentes" />
          <Cartao
            titulo="Orçamentos abertos"
            valor={`${orcamentosPendentes.length}`}
            cor="var(--gold)"
            legenda={`potencial R$ ${valorOrcamentosPendentes.toFixed(2)}`}
          />
          <Cartao titulo="Faturamento do mês" valor={`R$ ${faturamentoMes.toFixed(2)}`} cor="var(--rose)" legenda="contratos no mês atual" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
          <Secao titulo="Próximos eventos confirmados">
            {proximosEventos.length === 0 && <div style={{ color: "var(--ink-soft)", fontSize: 13.5 }}>Nenhum evento confirmado à frente.</div>}
            {proximosEventos.map((c) => (
              <Link
                key={c.id}
                href={`/contratos/${c.id}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--line)",
                  fontSize: 13.5,
                  color: "var(--ink)",
                }}
              >
                <div>
                  <strong>#{c.numero}</strong> · {nomeCliente[c.clienteId] ?? "—"} — {c.evento}
                </div>
                <span style={{ color: "var(--ink-soft)" }}>{new Date(c.inicio).toLocaleDateString("pt-BR")}</span>
              </Link>
            ))}
          </Secao>

          <Secao titulo="Resumo do acervo">
            <Linha label="Produtos cadastrados" valor={`${produtos.length}`} />
            <Linha label="Clientes cadastrados" valor={`${clientes.length}`} />
            <Linha label="Contratos confirmados" valor={`${contratosConfirmados.length}`} />
            <Linha label="Orçamentos pendentes" valor={`${orcamentosPendentes.length}`} />
          </Secao>
        </div>
      </div>
    </>
  );
}

function Cartao({ titulo, valor, legenda, cor }: { titulo: string; valor: string; legenda: string; cor: string }) {
  return (
    <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--r)", boxShadow: "var(--shadow)", padding: 18 }}>
      <div style={{ fontSize: 11.5, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: 1 }}>{titulo}</div>
      <div style={{ fontFamily: "var(--font-d)", fontSize: 24, color: cor, marginTop: 6 }}>{valor}</div>
      <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 2 }}>{legenda}</div>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--r)", boxShadow: "var(--shadow)", padding: 18 }}>
      <div style={{ fontFamily: "var(--font-d)", fontSize: 16, marginBottom: 10 }}>{titulo}</div>
      {children}
    </div>
  );
}

function Linha({ label, valor }: { label: string; valor: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13.5, borderBottom: "1px solid var(--line)" }}>
      <span style={{ color: "var(--ink-soft)" }}>{label}</span>
      <strong>{valor}</strong>
    </div>
  );
}
