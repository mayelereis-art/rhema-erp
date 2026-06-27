"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { LinhaRateio } from "@/lib/rateio-dados";
import type { Destinatario, RegraServico, TipoServico } from "@/lib/rateio";
import { atualizarContratoFinanceiro } from "@/lib/contratos";

export function RateioClient({
  linhas,
  totais,
  regras,
  custosTipoPorContrato,
}: {
  linhas: LinhaRateio[];
  totais: Record<Destinatario, number>;
  regras: Record<TipoServico, RegraServico>;
  custosTipoPorContrato: Record<string, { custos: number; tipoServico: "PRESENCIAL" | "PEGMONTE" }>;
}) {
  const [editandoId, setEditandoId] = useState<string | null>(null);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 26 }}>
        {(["Maiele", "Michele", "Cassia", "Caixa"] as Destinatario[]).map((d) => (
          <div key={d} style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--r)", padding: "16px 18px", boxShadow: "var(--shadow)" }}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--ink-soft)", fontWeight: 600 }}>{d === "Cassia" ? "Cássia" : d}</div>
            <div style={{ fontFamily: "var(--font-d)", fontSize: 24, marginTop: 4 }}>R$ {totais[d].toFixed(2)}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--r)", boxShadow: "var(--shadow)", overflow: "hidden", marginBottom: 26 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--cream)", textAlign: "left" }}>
              <th style={th}>Contrato</th>
              <th style={th}>Tipo</th>
              <th style={{ ...th, textAlign: "right" }}>Total</th>
              <th style={{ ...th, textAlign: "right" }}>Custos</th>
              <th style={{ ...th, textAlign: "right" }}>Lucro</th>
              <th style={th}>Fatias</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const editando = editandoId === l.contratoId;
              return (
                <tr key={l.contratoId} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={td}>
                    <Link href={`/contratos/${l.contratoId}`}>#{l.numero}</Link> · {l.clienteNome}
                  </td>
                  <td style={td}>{l.tipoServico === "PRESENCIAL" ? "Presencial" : "Peg&Monte"}</td>
                  <td style={{ ...td, textAlign: "right" }}>R$ {l.total.toFixed(2)}</td>
                  <td style={{ ...td, textAlign: "right" }}>R$ {l.custos.toFixed(2)}</td>
                  <td style={{ ...td, textAlign: "right" }}>R$ {l.lucro.toFixed(2)}</td>
                  <td style={td}>
                    {l.fatias.map((f) => (
                      <div key={f.destino} style={{ fontSize: 12 }}>
                        {f.rotulo}: R$ {f.valor.toFixed(2)}
                      </div>
                    ))}
                  </td>
                  <td style={td}>
                    <button className="btn btn-g btn-sm" onClick={() => setEditandoId(editando ? null : l.contratoId)}>
                      {editando ? "Fechar" : "Ajustar"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {linhas.length === 0 && (
              <tr>
                <td style={td} colSpan={7}>
                  Nenhum contrato fechado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editandoId && (
        <AjusteContrato
          contratoId={editandoId}
          inicial={custosTipoPorContrato[editandoId]}
          onFechar={() => setEditandoId(null)}
        />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
        <TabelaReferencia titulo="Presencial (decoração no local)" regra={regras.presencial} />
        <TabelaReferencia titulo="Peg&Monte (retirada pelo cliente)" regra={regras.pegmonte} />
      </div>
    </div>
  );
}

function AjusteContrato({
  contratoId,
  inicial,
  onFechar,
}: {
  contratoId: string;
  inicial: { custos: number; tipoServico: "PRESENCIAL" | "PEGMONTE" };
  onFechar: () => void;
}) {
  const [custos, setCustos] = useState(inicial.custos);
  const [tipoServico, setTipoServico] = useState(inicial.tipoServico);
  const [pendente, iniciar] = useTransition();

  function salvar() {
    iniciar(async () => {
      await atualizarContratoFinanceiro(contratoId, { custos, tipoServico });
      onFechar();
    });
  }

  return (
    <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--r)", padding: 18, marginBottom: 26, display: "flex", gap: 14, alignItems: "end", flexWrap: "wrap" }}>
      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Custos do serviço (R$)</label>
        <input type="number" step="0.01" value={custos} onChange={(e) => setCustos(Number(e.target.value))} style={campoStyle} />
      </div>
      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Tipo de serviço</label>
        <select value={tipoServico} onChange={(e) => setTipoServico(e.target.value as "PRESENCIAL" | "PEGMONTE")} style={campoStyle}>
          <option value="PRESENCIAL">Presencial</option>
          <option value="PEGMONTE">Peg&Monte</option>
        </select>
      </div>
      <button className="btn btn-p" disabled={pendente} onClick={salvar}>
        {pendente ? "Salvando..." : "Salvar ajuste"}
      </button>
    </div>
  );
}

function TabelaReferencia({ titulo, regra }: { titulo: string; regra: RegraServico }) {
  return (
    <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--r)", boxShadow: "var(--shadow)", padding: 18 }}>
      <div style={{ fontFamily: "var(--font-d)", fontSize: 16, marginBottom: 10 }}>{titulo}</div>
      {regra.fatias.map((f) => (
        <div key={f.destino} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid var(--line)", fontSize: 13 }}>
          <div>
            <div>{f.rotulo}</div>
            <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{f.justificativa}</div>
          </div>
          <strong style={{ whiteSpace: "nowrap", marginLeft: 12 }}>{f.pct}%</strong>
        </div>
      ))}
    </div>
  );
}

const th: React.CSSProperties = { padding: "10px 16px", fontSize: 11.5, textTransform: "uppercase", color: "var(--ink-soft)" };
const td: React.CSSProperties = { padding: "10px 16px" };
const campoStyle: React.CSSProperties = { padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)" };
