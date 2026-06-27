"use client";

import { useTransition } from "react";
import type { Cliente } from "@/lib/firestore-schema";
import type { ContratoComId } from "@/lib/contratos";
import { atualizarStatusContrato, marcarParcelaPaga } from "@/lib/contratos";
import type { ResultadoRateio } from "@/lib/rateio";
import { EMPRESA } from "@/lib/empresa";
import { CLAUSULAS_CONTRATO } from "@/lib/contrato-clausulas";

const PROXIMO_STATUS: Record<string, { status: string; rotulo: string } | undefined> = {
  CONFIRMADO: { status: "CONCLUIDO", rotulo: "Marcar como concluído" },
};

const ROTULO_STATUS: Record<string, string> = {
  CONFIRMADO: "Confirmado",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

export function ContratoDetalheClient({
  contrato,
  cliente,
  nomeProduto,
  nomeAtendente,
  total,
  rateio,
}: {
  contrato: ContratoComId;
  cliente: Cliente | null;
  nomeProduto: Record<string, string>;
  nomeAtendente?: string;
  total: number;
  rateio: ResultadoRateio;
}) {
  const [pendente, iniciar] = useTransition();

  const proximo = PROXIMO_STATUS[contrato.status];

  function mudarStatus(status: string) {
    iniciar(async () => {
      await atualizarStatusContrato(contrato.id, status as never);
    });
  }

  function cancelar() {
    if (!confirm("Cancelar este contrato?")) return;
    mudarStatus("CANCELADO");
  }

  const linkWhatsApp = linkWhatsAppDoContrato(cliente?.telefone, contrato.numero, contrato.evento, total);
  const valorPago = contrato.parcelas.filter((p) => p.pago).reduce((s, p) => s + p.valor, 0);
  const valorPendente = total - valorPago;
  const numeroPedido = `${contrato.numero}`.padStart(3, "0");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 22, alignItems: "start" }}>
      <div
        id="documento-contrato"
        style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--r)", boxShadow: "var(--shadow)", padding: 28 }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 16,
            paddingBottom: 16,
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div>
            <div style={{ fontFamily: "var(--font-d)", fontSize: 22, fontWeight: 600 }}>
              Rhema <em style={{ color: "var(--gold)", fontStyle: "italic" }}>Decorações</em>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 4, lineHeight: 1.5 }}>
              {EMPRESA.razaoSocial} · CNPJ {EMPRESA.cnpj}
              <br />
              {EMPRESA.telefone} · {EMPRESA.email}
              <br />
              {EMPRESA.endereco}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: 1.5 }}>
              Contrato de locação
            </div>
            <div style={{ fontFamily: "var(--font-d)", fontSize: 18 }}>#{numeroPedido}</div>
            <span style={{ fontWeight: 700, color: "var(--rose-deep)" }}>{ROTULO_STATUS[contrato.status] ?? contrato.status}</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20, fontSize: 13.5 }}>
          <div>
            <strong>Cliente:</strong> {cliente?.nome ?? "—"}
          </div>
          <div>
            <strong>Telefone:</strong> {cliente?.telefone ?? "—"}
          </div>
          <div>
            <strong>Objetivo da locação:</strong> {contrato.evento}
          </div>
          <div>
            <strong>Atendente:</strong> {nomeAtendente ?? "—"}
          </div>
          <div>
            <strong>Data do pedido:</strong> {new Date(contrato.criadoEm).toLocaleDateString("pt-BR")}
          </div>
          <div>
            <strong>Início / término da locação:</strong> {new Date(contrato.inicio).toLocaleDateString("pt-BR")} —{" "}
            {new Date(contrato.fim).toLocaleDateString("pt-BR")}
          </div>
          <div>
            <strong>Tipo:</strong> {contrato.modoLogistica === "ENTREGA" ? "Entrega no local" : "Retirar na loja"}
          </div>
          {contrato.modoLogistica === "ENTREGA" && (
            <div>
              <strong>Endereço de entrega:</strong> {contrato.endereco ?? "—"}
            </div>
          )}
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, marginBottom: 16 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>
              <th style={{ padding: "6px 0" }}>Item</th>
              <th style={{ padding: "6px 0", textAlign: "right" }}>Qtd.</th>
              <th style={{ padding: "6px 0", textAlign: "right" }}>Preço/diária</th>
              <th style={{ padding: "6px 0", textAlign: "right" }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {contrato.itens.map((i) => (
              <tr key={i.produtoId} style={{ borderBottom: "1px solid var(--line)" }}>
                <td style={{ padding: "6px 0" }}>{nomeProduto[i.produtoId] ?? i.produtoId}</td>
                <td style={{ padding: "6px 0", textAlign: "right" }}>{i.quantidade}</td>
                <td style={{ padding: "6px 0", textAlign: "right" }}>R$ {i.precoUnitario.toFixed(2)}</td>
                <td style={{ padding: "6px 0", textAlign: "right" }}>R$ {(i.quantidade * i.precoUnitario).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
          <div style={{ fontSize: 13, minWidth: 220 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
              <span>Valor total</span>
              <strong>R$ {total.toFixed(2)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "var(--sage)" }}>
              <span>Valor pago</span>
              <strong>R$ {valorPago.toFixed(2)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "var(--rose-deep)" }}>
              <span>Valor pendente</span>
              <strong>R$ {valorPendente.toFixed(2)}</strong>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
          <strong>Recibo de pagamento</strong>
          {contrato.parcelas.map((p, idx) => (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
              <span>
                {p.rotulo} — venc. {new Date(p.vencimento).toLocaleDateString("pt-BR")}
              </span>
              <span>
                R$ {p.valor.toFixed(2)} {p.pago ? "✓ Pago" : ""}
              </span>
            </div>
          ))}
        </div>

        <div className="clausulas-contrato" style={{ marginTop: 28, fontSize: 11.5, color: "var(--ink-soft)", lineHeight: 1.5 }}>
          <div style={{ fontFamily: "var(--font-d)", fontSize: 15, color: "var(--ink)", marginBottom: 10 }}>Termos e condições da locação</div>
          {CLAUSULAS_CONTRATO.map((c, idx) => (
            <p key={c.titulo} style={{ marginBottom: 7 }}>
              <strong>{idx + 1}. {c.titulo}.</strong> {c.texto}
            </p>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28, fontSize: 12.5, color: "var(--ink)" }}>
            <div>
              ___________________________________
              <div style={{ marginTop: 4 }}>{EMPRESA.nomeFantasia} (Locadora)</div>
            </div>
            <div>
              ___________________________________
              <div style={{ marginTop: 4 }}>{cliente?.nome ?? "Contratante"}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="no-print" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <Secao titulo="Ações">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button className="btn btn-g" onClick={() => window.print()}>
              Imprimir contrato
            </button>
            {linkWhatsApp && (
              <a href={linkWhatsApp} target="_blank" rel="noreferrer" className="btn btn-p" style={{ textAlign: "center" }}>
                Enviar por WhatsApp
              </a>
            )}
            {proximo && (
              <button className="btn btn-p" disabled={pendente} onClick={() => mudarStatus(proximo.status)}>
                {proximo.rotulo}
              </button>
            )}
            {contrato.status !== "CANCELADO" && contrato.status !== "CONCLUIDO" && (
              <button className="btn btn-x" style={{ color: "var(--rose-deep)" }} disabled={pendente} onClick={cancelar}>
                Cancelar contrato
              </button>
            )}
          </div>
        </Secao>

        <Secao titulo={`Rateio · ${rateio.regra.rotulo}`}>
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 8 }}>
            Custos: R$ {rateio.custos.toFixed(2)} · Lucro líquido: R$ {rateio.lucro.toFixed(2)}
          </div>
          {rateio.fatias.map((f) => (
            <div key={f.destino} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}>
              <span>
                {f.rotulo} <span style={{ color: "var(--ink-soft)" }}>({f.pct}%)</span>
              </span>
              <strong>R$ {f.valor.toFixed(2)}</strong>
            </div>
          ))}
        </Secao>

        <Secao titulo="Parcelas">
          {contrato.parcelas.map((p, idx) => (
            <label key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", fontSize: 13 }}>
              <span>
                <input
                  type="checkbox"
                  checked={p.pago}
                  onChange={(e) => iniciar(() => marcarParcelaPaga(contrato.id, idx, e.target.checked))}
                  style={{ marginRight: 8 }}
                />
                {p.rotulo}
              </span>
              <strong>R$ {p.valor.toFixed(2)}</strong>
            </label>
          ))}
        </Secao>
      </div>
    </div>
  );
}

function linkWhatsAppDoContrato(telefone: string | undefined, numero: number, evento: string, total: number) {
  if (!telefone) return null;
  const digitos = telefone.replace(/\D/g, "");
  const texto = encodeURIComponent(
    `Olá! Aqui está o resumo do contrato #${numero} (${evento}) com a Rhema Decorações. Valor total: R$ ${total.toFixed(2)}.`
  );
  return `https://wa.me/55${digitos}?text=${texto}`;
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--r)", boxShadow: "var(--shadow)", padding: 18 }}>
      <div style={{ fontFamily: "var(--font-d)", fontSize: 16, marginBottom: 12 }}>{titulo}</div>
      {children}
    </div>
  );
}
