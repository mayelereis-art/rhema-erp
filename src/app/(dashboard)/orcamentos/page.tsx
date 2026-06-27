import Link from "next/link";
import { PageHeader } from "../page-header";
import { listarOrcamentos } from "@/lib/orcamentos";
import { listarClientes } from "@/lib/clientes";
import type { StatusOrcamento } from "@/lib/firestore-schema";

const ROTULO_STATUS: Record<StatusOrcamento, string> = {
  PENDENTE: "Pendente",
  CONVERTIDO: "Convertido",
  CANCELADO: "Cancelado",
};

const COR_STATUS: Record<StatusOrcamento, string> = {
  PENDENTE: "var(--gold)",
  CONVERTIDO: "var(--sage)",
  CANCELADO: "var(--ink-soft)",
};

export default async function OrcamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const statusFiltro = status as StatusOrcamento | undefined;

  const [orcamentos, clientes] = await Promise.all([listarOrcamentos(statusFiltro), listarClientes()]);
  const nomeCliente = new Map(clientes.map((c) => [c.id, c.nome]));

  return (
    <>
      <PageHeader
        titulo="Orçamentos"
        legenda="Propostas de preço — não reservam estoque até serem convertidas em contrato"
        acao={
          <Link href="/orcamentos/novo" className="btn btn-p">
            + Novo orçamento
          </Link>
        }
      />
      <div style={{ padding: "28px 34px 60px", flex: 1 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {([undefined, "PENDENTE", "CONVERTIDO", "CANCELADO"] as const).map((s) => (
            <Link
              key={s ?? "todos"}
              href={s ? `/orcamentos?status=${s}` : "/orcamentos"}
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
              {orcamentos.map((o) => (
                <tr key={o.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={td}>#{o.numero}</td>
                  <td style={td}>{nomeCliente.get(o.clienteId) ?? "—"}</td>
                  <td style={td}>{o.evento}</td>
                  <td style={td}>
                    {new Date(o.inicio).toLocaleDateString("pt-BR")} – {new Date(o.fim).toLocaleDateString("pt-BR")}
                  </td>
                  <td style={td}>
                    <span style={{ color: COR_STATUS[o.status], fontWeight: 600 }}>{ROTULO_STATUS[o.status]}</span>
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <Link href={`/orcamentos/${o.id}`} className="btn btn-g btn-sm">
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
              {orcamentos.length === 0 && (
                <tr>
                  <td style={td} colSpan={6}>
                    Nenhum orçamento encontrado.
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
