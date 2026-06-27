"use client";

import { useState, useTransition } from "react";
import { consultarDisponibilidade, type LinhaDisponibilidade } from "@/lib/disponibilidade-dados";

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

export function DisponibilidadeClient() {
  const [inicio, setInicio] = useState(hoje());
  const [fim, setFim] = useState(hoje());
  const [linhas, setLinhas] = useState<LinhaDisponibilidade[] | null>(null);
  const [pendente, iniciar] = useTransition();

  function consultar() {
    iniciar(async () => {
      const resultado = await consultarDisponibilidade(inicio, fim);
      setLinhas(resultado);
    });
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 14,
          alignItems: "end",
          marginBottom: 22,
          background: "var(--paper)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r)",
          padding: 18,
          flexWrap: "wrap",
        }}
      >
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Retirada</label>
          <input
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)" }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Devolução</label>
          <input
            type="date"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)" }}
          />
        </div>
        <button className="btn btn-p" onClick={consultar} disabled={pendente}>
          {pendente ? "Consultando..." : "Consultar disponibilidade"}
        </button>
      </div>

      {linhas && (
        <div
          style={{
            background: "var(--paper)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r)",
            boxShadow: "var(--shadow)",
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: "var(--cream)", textAlign: "left" }}>
                <th style={th}>Produto</th>
                <th style={th}>Categoria</th>
                <th style={{ ...th, textAlign: "right" }}>Estoque total</th>
                <th style={{ ...th, textAlign: "right" }}>Livre no período</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.produtoId} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={td}>
                    {l.emoji} {l.nome}
                  </td>
                  <td style={{ ...td, color: "var(--ink-soft)" }}>{l.categoriaNome}</td>
                  <td style={{ ...td, textAlign: "right" }}>{l.estoqueTotal}</td>
                  <td
                    style={{
                      ...td,
                      textAlign: "right",
                      fontWeight: 700,
                      color: l.livre === 0 ? "var(--rose-deep)" : "var(--sage)",
                    }}
                  >
                    {l.livre}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = { padding: "10px 16px", fontSize: 11.5, textTransform: "uppercase", color: "var(--ink-soft)" };
const td: React.CSSProperties = { padding: "10px 16px" };
