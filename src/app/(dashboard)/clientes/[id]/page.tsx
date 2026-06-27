import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "../../page-header";
import { obterCliente } from "@/lib/clientes";
import { listarContratosPorCliente } from "@/lib/contratos";
import { listarOrcamentosPorCliente } from "@/lib/orcamentos";

const ROTULO_STATUS_CONTRATO: Record<string, string> = {
  CONFIRMADO: "Confirmado",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

const ROTULO_STATUS_ORCAMENTO: Record<string, string> = {
  PENDENTE: "Pendente",
  CONVERTIDO: "Convertido em contrato",
  CANCELADO: "Cancelado",
};

export default async function ClienteDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [cliente, contratos, orcamentos] = await Promise.all([
    obterCliente(id),
    listarContratosPorCliente(id),
    listarOrcamentosPorCliente(id),
  ]);
  if (!cliente) notFound();

  return (
    <>
      <PageHeader titulo={cliente.nome} legenda={cliente.telefone ?? cliente.email ?? ""} />
      <div style={{ padding: "28px 34px 60px", flex: 1 }}>
        <div style={{ fontFamily: "var(--font-d)", fontSize: 17, marginBottom: 12 }}>Histórico de locações</div>
        <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--r)", boxShadow: "var(--shadow)", overflow: "hidden", marginBottom: 24 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: "var(--cream)", textAlign: "left" }}>
                <th style={th}>Nº</th>
                <th style={th}>Evento</th>
                <th style={th}>Período</th>
                <th style={th}>Status</th>
                <th style={{ ...th, textAlign: "right" }}>Total</th>
                <th style={{ ...th, textAlign: "right" }}></th>
              </tr>
            </thead>
            <tbody>
              {contratos.map((c) => {
                const total = c.itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0);
                return (
                  <tr key={c.id} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={td}>#{c.numero}</td>
                    <td style={td}>{c.evento}</td>
                    <td style={td}>
                      {new Date(c.inicio).toLocaleDateString("pt-BR")} – {new Date(c.fim).toLocaleDateString("pt-BR")}
                    </td>
                    <td style={td}>{ROTULO_STATUS_CONTRATO[c.status]}</td>
                    <td style={{ ...td, textAlign: "right" }}>R$ {total.toFixed(2)}</td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <Link href={`/contratos/${c.id}`} className="btn btn-g btn-sm">
                        Ver
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {contratos.length === 0 && (
                <tr>
                  <td style={td} colSpan={6}>
                    Nenhuma locação ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ fontFamily: "var(--font-d)", fontSize: 17, marginBottom: 12 }}>Orçamentos</div>
        <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--r)", boxShadow: "var(--shadow)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: "var(--cream)", textAlign: "left" }}>
                <th style={th}>Nº</th>
                <th style={th}>Evento</th>
                <th style={th}>Período</th>
                <th style={th}>Status</th>
                <th style={{ ...th, textAlign: "right" }}>Total</th>
                <th style={{ ...th, textAlign: "right" }}></th>
              </tr>
            </thead>
            <tbody>
              {orcamentos.map((o) => {
                const total = o.itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0);
                return (
                  <tr key={o.id} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={td}>#{o.numero}</td>
                    <td style={td}>{o.evento}</td>
                    <td style={td}>
                      {new Date(o.inicio).toLocaleDateString("pt-BR")} – {new Date(o.fim).toLocaleDateString("pt-BR")}
                    </td>
                    <td style={td}>{ROTULO_STATUS_ORCAMENTO[o.status]}</td>
                    <td style={{ ...td, textAlign: "right" }}>R$ {total.toFixed(2)}</td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <Link href={`/orcamentos/${o.id}`} className="btn btn-g btn-sm">
                        Ver
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {orcamentos.length === 0 && (
                <tr>
                  <td style={td} colSpan={6}>
                    Nenhum orçamento ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

const th: React.CSSProperties = { padding: "10px 16px", fontSize: 11.5, textTransform: "uppercase", color: "var(--ink-soft)" };
const td: React.CSSProperties = { padding: "10px 16px" };
