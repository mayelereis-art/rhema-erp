import Link from "next/link";
import { PageHeader } from "../page-header";
import { listarContratos } from "@/lib/contratos";
import { listarClientes } from "@/lib/clientes";
import type { StatusContrato } from "@/lib/firestore-schema";

const ROTULO_STATUS: Record<StatusContrato, string> = {
  ORCAMENTO: "Orçamento",
  CONFIRMADO: "Confirmado",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

const COR_STATUS: Record<StatusContrato, string> = {
  ORCAMENTO: "var(--gold)",
  CONFIRMADO: "var(--rose)",
  CONCLUIDO: "var(--sage)",
  CANCELADO: "var(--ink-soft)",
};

export default async function ContratosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const statusFiltro = status as StatusContrato | undefined;

  const [contratos, clientes] = await Promise.all([listarContratos(statusFiltro), listarClientes()]);
  const nomeCliente = new Map(clientes.map((c) => [c.id, c.nome]));

  return (
    <>
      <PageHeader
        titulo="Orçamentos & Contratos"
        legenda="Monte pedidos com checagem automática de estoque"
        acao={
          <Link href="/contratos/novo" className="btn btn-p">
            + Novo orçamento
          </Link>
        }
      />
      <div style={{ padding: "28px 34px 60px", flex: 1 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {([undefined, "ORCAMENTO", "CONFIRMADO", "CONCLUIDO", "CANCELADO"] as const).map((s) => (
            <Link
              key={s ?? "todos"}
              href={s ? `/contratos?status=${s}` : "/contratos"}
              className={s === statusFiltro || (!s && !statusFiltro) ? "btn btn-p btn-sm" : "btn btn-g btn-sm"}
            >
              {s ? ROTULO_STATUS[s] : "Todos"}
            </Link>
          ))}
        </div>

        <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--r)", boxShadow: "var(--shadow)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: "var(--cream)", textAlign: "left" }}>
                <th style={th}>Nº</th>
                <th style={th}>Cliente</th>
                <th style={th}>Evento</th>
                <th style={th}>Período</th>
                <th style={th}>Status</th>
                <th style={{ ...th, textAlign: "right" }}></th>
              </tr>
            </thead>
            <tbody>
              {contratos.map((c) => (
                <tr key={c.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={td}>#{c.numero}</td>
                  <td style={td}>{nomeCliente.get(c.clienteId) ?? "—"}</td>
                  <td style={td}>{c.evento}</td>
                  <td style={td}>
                    {new Date(c.inicio).toLocaleDateString("pt-BR")} – {new Date(c.fim).toLocaleDateString("pt-BR")}
                  </td>
                  <td style={td}>
                    <span style={{ color: COR_STATUS[c.status], fontWeight: 600 }}>{ROTULO_STATUS[c.status]}</span>
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <Link href={`/contratos/${c.id}`} className="btn btn-g btn-sm">
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
              {contratos.length === 0 && (
                <tr>
                  <td style={td} colSpan={6}>
                    Nenhum contrato encontrado.
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
