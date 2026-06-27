"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Cliente } from "@/lib/firestore-schema";
import type { OrcamentoComId } from "@/lib/orcamentos";
import { cancelarOrcamento, converterEmContrato } from "@/lib/orcamentos";
import type { ResultadoRateio } from "@/lib/rateio";
import { EMPRESA } from "@/lib/empresa";
import { rotuloModalidade } from "@/lib/contrato-clausulas";

const ROTULO_STATUS: Record<string, string> = {
  PENDENTE: "Pendente",
  CONVERTIDO: "Convertido em contrato",
  CANCELADO: "Cancelado",
};

export function OrcamentoDetalheClient({
  orcamento,
  cliente,
  infoProduto,
  nomeAtendente,
  total,
  rateio,
}: {
  orcamento: OrcamentoComId;
  cliente: Cliente | null;
  infoProduto: Record<string, { nome: string; fotoUrl?: string; codigo?: string; valorReposicao?: number }>;
  nomeAtendente?: string;
  total: number;
  rateio: ResultadoRateio;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const valorMontagem = orcamento.tipoServico === "PRESENCIAL" ? orcamento.custos : 0;
  const valorTotalOrcamento = total + valorMontagem;

  function cancelar() {
    if (!confirm("Cancelar este orçamento?")) return;
    iniciar(() => cancelarOrcamento(orcamento.id));
  }

  function converter() {
    if (!confirm("Converter este orçamento em contrato? Isso vai checar e reservar o estoque.")) return;
    iniciar(async () => {
      const resultado = await converterEmContrato(orcamento.id);
      if (resultado.ok) {
        router.push(`/contratos/${resultado.contratoId}`);
      } else {
        alert(resultado.erro);
      }
    });
  }

  const linkWhatsApp = linkWhatsAppDoOrcamento(cliente?.telefone, orcamento.numero, orcamento.evento, valorTotalOrcamento);
  const numeroOrcamento = `${orcamento.numero}`.padStart(3, "0");

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
            <div style={{ fontSize: 11, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: 1.5 }}>Orçamento</div>
            <div style={{ fontFamily: "var(--font-d)", fontSize: 18 }}>#{numeroOrcamento}</div>
            <span style={{ fontWeight: 700, color: "var(--gold)" }}>{ROTULO_STATUS[orcamento.status] ?? orcamento.status}</span>
            <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 2 }}>{rotuloModalidade(orcamento.tipoServico)}</div>
          </div>
        </div>

        <div style={{ background: "var(--cream)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "var(--ink-soft)", marginBottom: 20 }}>
          Este orçamento não reserva os itens em estoque. As datas só são confirmadas se este orçamento for convertido em contrato.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20, fontSize: 13.5 }}>
          <div>
            <strong>Cliente:</strong> {cliente?.nome ?? "—"}
            {cliente?.documento && <> · CPF/CNPJ {cliente.documento}</>}
          </div>
          <div>
            <strong>Telefone:</strong> {cliente?.telefone ?? "—"}
          </div>
          <div>
            <strong>Objetivo da locação:</strong> {orcamento.evento}
          </div>
          <div>
            <strong>Atendente:</strong> {nomeAtendente ?? "—"}
          </div>
          <div>
            <strong>Data do orçamento:</strong> {new Date(orcamento.criadoEm).toLocaleDateString("pt-BR")}
          </div>
          <div>
            <strong>Início / término da locação:</strong> {new Date(orcamento.inicio).toLocaleDateString("pt-BR")} —{" "}
            {new Date(orcamento.fim).toLocaleDateString("pt-BR")}
          </div>
          <div>
            <strong>Tipo:</strong> {orcamento.modoLogistica === "ENTREGA" ? "Entrega no local" : "Retirar na loja"}
          </div>
          {orcamento.modoLogistica === "ENTREGA" && (
            <div>
              <strong>Endereço de entrega:</strong> {orcamento.endereco ?? "—"}
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
            {orcamento.itens.map((i) => {
              const info = infoProduto[i.produtoId];
              return (
                <tr key={i.produtoId} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "6px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {info?.fotoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={info.fotoUrl}
                          alt={info.nome}
                          style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
                        />
                      )}
                      <div>
                        {info?.codigo && <div style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>Cód. {info.codigo}</div>}
                        {info?.nome ?? i.produtoId}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "6px 0", textAlign: "right" }}>{i.quantidade}</td>
                  <td style={{ padding: "6px 0", textAlign: "right" }}>R$ {i.precoUnitario.toFixed(2)}</td>
                  <td style={{ padding: "6px 0", textAlign: "right" }}>R$ {(i.quantidade * i.precoUnitario).toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ fontSize: 13, minWidth: 240 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
              <span>Valor da locação</span>
              <strong>R$ {total.toFixed(2)}</strong>
            </div>
            {valorMontagem > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                <span>Valor do serviço de montagem</span>
                <strong>R$ {valorMontagem.toFixed(2)}</strong>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderTop: "1px solid var(--line)", marginTop: 4, fontFamily: "var(--font-d)", fontSize: 17 }}>
              <span>Total</span>
              <strong>R$ {valorTotalOrcamento.toFixed(2)}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="no-print" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <Secao titulo="Ações">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button className="btn btn-g" onClick={() => window.print()}>
              Imprimir orçamento
            </button>
            {linkWhatsApp && (
              <a href={linkWhatsApp} target="_blank" rel="noreferrer" className="btn btn-p" style={{ textAlign: "center" }}>
                Enviar por WhatsApp
              </a>
            )}
            {orcamento.status === "PENDENTE" && (
              <>
                <button className="btn btn-p" disabled={pendente} onClick={converter}>
                  {pendente ? "Convertendo..." : "Converter em contrato"}
                </button>
                <button className="btn btn-x" style={{ color: "var(--rose-deep)" }} disabled={pendente} onClick={cancelar}>
                  Cancelar orçamento
                </button>
              </>
            )}
          </div>
        </Secao>

        <Secao titulo={`Rateio (estimado) · ${rateio.regra.rotulo}`}>
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
      </div>
    </div>
  );
}

function linkWhatsAppDoOrcamento(telefone: string | undefined, numero: number, evento: string, total: number) {
  if (!telefone) return null;
  const digitos = telefone.replace(/\D/g, "");
  const texto = encodeURIComponent(
    `Olá! Aqui está o orçamento #${numero} (${evento}) da Rhema Decorações. Valor total: R$ ${total.toFixed(2)}.`
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
