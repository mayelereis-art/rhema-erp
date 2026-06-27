"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { marcarParcelaPaga } from "@/lib/contratos";
import { criarDespesa, excluirDespesa, marcarDespesaPaga, type DespesaComId } from "@/lib/despesas";

interface ParcelaLinha {
  contratoId: string;
  numero: number;
  cliente: string;
  indice: number;
  rotulo: string;
  vencimento: string;
  valor: number;
  pago: boolean;
}

function mesAtual() {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

export function FinanceiroClient({ aReceber, despesas }: { aReceber: ParcelaLinha[]; despesas: DespesaComId[] }) {
  const [pendente, iniciar] = useTransition();
  const [descricao, setDescricao] = useState("");
  const [vencimento, setVencimento] = useState(new Date().toISOString().slice(0, 10));
  const [valor, setValor] = useState(0);
  const [mesFiltro, setMesFiltro] = useState(mesAtual());
  const [verTudo, setVerTudo] = useState(false);

  const aReceberFiltrado = useMemo(
    () => (verTudo ? aReceber : aReceber.filter((p) => p.vencimento.slice(0, 7) === mesFiltro)),
    [aReceber, mesFiltro, verTudo]
  );
  const despesasFiltradas = useMemo(
    () => (verTudo ? despesas : despesas.filter((d) => d.vencimento.slice(0, 7) === mesFiltro)),
    [despesas, mesFiltro, verTudo]
  );

  const totalAReceber = useMemo(
    () => aReceberFiltrado.filter((p) => !p.pago).reduce((s, p) => s + p.valor, 0),
    [aReceberFiltrado]
  );
  const totalAPagar = useMemo(
    () => despesasFiltradas.filter((d) => !d.pago).reduce((s, d) => s + d.valor, 0),
    [despesasFiltradas]
  );
  const saldoProjetado = totalAReceber - totalAPagar;

  async function handleCriarDespesa(e: React.FormEvent) {
    e.preventDefault();
    if (!descricao || valor <= 0) return;
    await criarDespesa({ descricao, vencimento, valor });
    setDescricao("");
    setValor(0);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <input
          type="month"
          value={mesFiltro}
          disabled={verTudo}
          onChange={(e) => setMesFiltro(e.target.value)}
          style={{ ...campoStyle, opacity: verTudo ? 0.5 : 1 }}
        />
        {mesFiltro !== mesAtual() && !verTudo && (
          <button type="button" className="btn btn-g btn-sm" onClick={() => setMesFiltro(mesAtual())}>
            Mês atual
          </button>
        )}
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
          <input type="checkbox" checked={verTudo} onChange={(e) => setVerTudo(e.target.checked)} />
          Ver todos os meses
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))", gap: 16, marginBottom: 26 }}>
        <Stat rotulo="A receber (pendente)" valor={totalAReceber} cor="var(--sage)" />
        <Stat rotulo="A pagar (pendente)" valor={totalAPagar} cor="var(--rose-deep)" />
        <Stat rotulo="Saldo projetado" valor={saldoProjetado} cor={saldoProjetado >= 0 ? "var(--sage)" : "var(--rose-deep)"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, alignItems: "start" }}>
        <Secao titulo="Contas a receber" sub={verTudo ? "Todos os meses" : "Movimento do mês selecionado"}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <tbody>
              {aReceberFiltrado.map((p) => (
                <tr key={`${p.contratoId}-${p.indice}`} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={tdCompacto}>
                    <Link href={`/contratos/${p.contratoId}`}>#{p.numero}</Link> · {p.cliente}
                    <div style={{ color: "var(--ink-soft)", fontSize: 11.5 }}>
                      {p.rotulo} — venc. {new Date(p.vencimento).toLocaleDateString("pt-BR")}
                    </div>
                  </td>
                  <td style={{ ...tdCompacto, textAlign: "right" }}>R$ {p.valor.toFixed(2)}</td>
                  <td style={{ ...tdCompacto, textAlign: "right" }}>
                    <label style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end" }}>
                      <input
                        type="checkbox"
                        checked={p.pago}
                        disabled={pendente}
                        onChange={(e) => iniciar(() => marcarParcelaPaga(p.contratoId, p.indice, e.target.checked))}
                      />
                      Pago
                    </label>
                  </td>
                </tr>
              ))}
              {aReceberFiltrado.length === 0 && (
                <tr>
                  <td style={tdCompacto}>Nenhuma parcela no período.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Secao>

        <Secao titulo="Contas a pagar" sub={verTudo ? "Todos os meses" : "Movimento do mês selecionado"}>
          <form onSubmit={handleCriarDespesa} style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            <input
              placeholder="Descrição"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              style={{ ...campoStyle, flex: 1, minWidth: 120 }}
            />
            <input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} style={campoStyle} />
            <input
              type="number"
              step="0.01"
              placeholder="Valor"
              value={valor || ""}
              onChange={(e) => setValor(Number(e.target.value))}
              style={{ ...campoStyle, width: 90 }}
            />
            <button type="submit" className="btn btn-g btn-sm">
              + Add
            </button>
          </form>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <tbody>
              {despesasFiltradas.map((d) => (
                <tr key={d.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={tdCompacto}>
                    {d.descricao}
                    <div style={{ color: "var(--ink-soft)", fontSize: 11.5 }}>venc. {new Date(d.vencimento).toLocaleDateString("pt-BR")}</div>
                  </td>
                  <td style={{ ...tdCompacto, textAlign: "right" }}>R$ {d.valor.toFixed(2)}</td>
                  <td style={{ ...tdCompacto, textAlign: "right" }}>
                    <label style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end" }}>
                      <input
                        type="checkbox"
                        checked={d.pago}
                        disabled={pendente}
                        onChange={(e) => iniciar(() => marcarDespesaPaga(d.id, e.target.checked))}
                      />
                      Pago
                    </label>
                  </td>
                  <td style={{ ...tdCompacto, textAlign: "right" }}>
                    <button className="btn btn-x" style={{ color: "var(--rose-deep)" }} onClick={() => iniciar(() => excluirDespesa(d.id))}>
                      ×
                    </button>
                  </td>
                </tr>
              ))}
              {despesasFiltradas.length === 0 && (
                <tr>
                  <td style={tdCompacto}>Nenhuma despesa no período.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Secao>
      </div>
    </div>
  );
}

function Stat({ rotulo, valor, cor }: { rotulo: string; valor: number; cor: string }) {
  return (
    <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--r)", padding: "18px 20px", boxShadow: "var(--shadow)" }}>
      <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--ink-soft)", fontWeight: 600 }}>{rotulo}</div>
      <div style={{ fontFamily: "var(--font-d)", fontSize: 28, marginTop: 6, color: cor }}>R$ {valor.toFixed(2)}</div>
    </div>
  );
}

function Secao({ titulo, sub, children }: { titulo: string; sub: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--r)", boxShadow: "var(--shadow)", padding: 18 }}>
      <div style={{ fontFamily: "var(--font-d)", fontSize: 17 }}>{titulo}</div>
      <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 14 }}>{sub}</div>
      {children}
    </div>
  );
}

const tdCompacto: React.CSSProperties = { padding: "8px 0" };
const campoStyle: React.CSSProperties = { padding: "7px 9px", borderRadius: 8, border: "1px solid var(--line)" };
