"use client";

import { useTransition } from "react";
import Link from "next/link";
import type { ContratoComId } from "@/lib/contratos";
import { marcarRetorno, marcarSaida } from "@/lib/contratos";

export function LogisticaClient({ contratos, nomeCliente }: { contratos: ContratoComId[]; nomeCliente: Record<string, string> }) {
  const [pendente, iniciar] = useTransition();
  const hoje = new Date();

  return (
    <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--r)", boxShadow: "var(--shadow)", overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
        <thead>
          <tr style={{ background: "var(--cream)", textAlign: "left" }}>
            <th style={th}>Nº</th>
            <th style={th}>Cliente</th>
            <th style={th}>Tipo</th>
            <th style={th}>Endereço</th>
            <th style={th}>Período</th>
            <th style={th}>Saída</th>
            <th style={th}>Retorno</th>
          </tr>
        </thead>
        <tbody>
          {contratos.map((c) => {
            const emAtraso = !c.itensDevolvidos && new Date(c.fim) < hoje;
            return (
              <tr key={c.id} style={{ borderTop: "1px solid var(--line)", background: emAtraso ? "#fff6f3" : undefined }}>
                <td style={td}>
                  <Link href={`/contratos/${c.id}`}>#{c.numero}</Link>
                </td>
                <td style={td}>{nomeCliente[c.clienteId] ?? "—"}</td>
                <td style={td}>{c.modoLogistica === "ENTREGA" ? "Entrega" : "Retirada"}</td>
                <td style={td}>{c.endereco ?? "Casa da Maiele"}</td>
                <td style={td}>
                  {new Date(c.inicio).toLocaleDateString("pt-BR")} – {new Date(c.fim).toLocaleDateString("pt-BR")}
                  {emAtraso && <div style={{ color: "var(--rose-deep)", fontWeight: 700, fontSize: 11.5 }}>⚠ Devolução em atraso</div>}
                </td>
                <td style={td}>
                  <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={c.saidaEntregue}
                      disabled={pendente}
                      onChange={(e) => iniciar(() => marcarSaida(c.id, e.target.checked))}
                    />
                    {c.saidaEntregue ? "Saiu" : "Pendente"}
                  </label>
                </td>
                <td style={td}>
                  <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={c.itensDevolvidos}
                      disabled={pendente}
                      onChange={(e) => iniciar(() => marcarRetorno(c.id, e.target.checked))}
                    />
                    {c.itensDevolvidos ? "Voltou" : "Pendente"}
                  </label>
                </td>
              </tr>
            );
          })}
          {contratos.length === 0 && (
            <tr>
              <td style={td} colSpan={7}>
                Nenhum contrato confirmado no momento.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = { padding: "10px 16px", fontSize: 11.5, textTransform: "uppercase", color: "var(--ink-soft)" };
const td: React.CSSProperties = { padding: "10px 16px" };
