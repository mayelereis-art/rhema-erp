"use client";

import { useState, useTransition } from "react";
import { salvarRegrasPrecificacao } from "@/lib/regras-precificacao";
import { REGRAS_PADRAO, type RegrasPrecificacao } from "@/lib/motor-custos";

type Chave = keyof RegrasPrecificacao;

const GRUPOS: Array<{ titulo: string; campos: Array<{ chave: Chave; rotulo: string; unidade: "R$" | "%" | "dias" | "R$/h" | "R$/km"; ajuda: string }> }> = [
  {
    titulo: "Margem",
    campos: [
      { chave: "margemMinimaPct", rotulo: "Margem mínima", unidade: "%", ajuda: "Abaixo disso o orçamento mostra alerta vermelho." },
      { chave: "markupPct", rotulo: "Markup de itens avulsos", unidade: "%", ajuda: "Preço de venda sugerido = custo × (1 + markup). 100% = dobro do custo." },
    ],
  },
  {
    titulo: "Mão de obra",
    campos: [
      { chave: "valorHoraProducao", rotulo: "Produção / personalização", unidade: "R$/h", ajuda: "Vale para as duas modalidades." },
      { chave: "valorHoraMontagem", rotulo: "Montagem", unidade: "R$/h", ajuda: "Só na decoração no local." },
      { chave: "valorHoraDesmontagem", rotulo: "Desmontagem", unidade: "R$/h", ajuda: "Só na decoração no local." },
    ],
  },
  {
    titulo: "Deslocamento (decoração no local)",
    campos: [
      { chave: "deslocamentoFixo", rotulo: "Valor fixo por evento", unidade: "R$", ajuda: "Custo da empresa, não cobrado à parte." },
      { chave: "custoPorKm", rotulo: "Custo por km", unidade: "R$/km", ajuda: "Multiplicado pelos km (ida e volta) informados no orçamento." },
    ],
  },
  {
    titulo: "Custos internos",
    campos: [
      { chave: "custoUtilizacaoPct", rotulo: "Uso de itens próprios", unidade: "%", ajuda: "Desgaste/limpeza, em % da diária. 0 = como o sistema calcula hoje." },
      { chave: "perdasPct", rotulo: "Perdas de consumíveis", unidade: "%", ajuda: "Somado ao custo de balões, flores etc." },
      { chave: "contingenciaPct", rotulo: "Contingência", unidade: "%", ajuda: "Reserva sobre o custo total estimado." },
    ],
  },
  {
    titulo: "Adicionais sobre o preço",
    campos: [
      { chave: "adicionalPersonalizacaoPct", rotulo: "Personalização", unidade: "%", ajuda: "Quando há item personalizado/sob medida." },
      { chave: "adicionalUrgenciaPct", rotulo: "Urgência", unidade: "%", ajuda: "Quando o evento está próximo. 0 = desligado." },
      { chave: "diasUrgencia", rotulo: "Considerar urgente se faltarem até", unidade: "dias", ajuda: "" },
    ],
  },
];

export function RegrasForm({ inicial }: { inicial: RegrasPrecificacao }) {
  const [regras, setRegras] = useState(inicial);
  const [mensagem, setMensagem] = useState<{ ok: boolean; texto: string } | null>(null);
  const [salvando, iniciar] = useTransition();
  const alterado = JSON.stringify(regras) !== JSON.stringify(inicial);

  function salvar() {
    if (!confirm("Salvar as novas regras? Elas valem para os próximos orçamentos inteligentes.")) return;
    iniciar(async () => {
      const r = await salvarRegrasPrecificacao(regras);
      setMensagem(r.ok ? { ok: true, texto: "Regras salvas." } : { ok: false, texto: r.erro });
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 820 }}>
      <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
        Orçamentos e contratos já criados não mudam quando você altera estas regras.
      </div>
      {GRUPOS.map((g) => (
        <div key={g.titulo} style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--r)", boxShadow: "var(--shadow)", padding: 18 }}>
          <div style={{ fontFamily: "var(--font-d)", fontSize: 16, marginBottom: 12 }}>{g.titulo}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            {g.campos.map((c) => (
              <div key={c.chave}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                  {c.rotulo} <span style={{ color: "var(--ink-soft)", fontWeight: 400 }}>({c.unidade})</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step={c.unidade === "dias" ? 1 : 0.01}
                  value={regras[c.chave]}
                  onChange={(e) => setRegras({ ...regras, [c.chave]: Number(e.target.value) })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)" }}
                />
                {c.ajuda && <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 4 }}>{c.ajuda}</div>}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button className="btn btn-p" disabled={salvando || !alterado} onClick={salvar}>
          {salvando ? "Salvando..." : "Salvar regras"}
        </button>
        <button className="btn btn-g" disabled={salvando} onClick={() => setRegras(REGRAS_PADRAO)}>
          Restaurar padrão
        </button>
        {mensagem && <span style={{ fontSize: 13, color: mensagem.ok ? "var(--sage)" : "var(--rose-deep)" }}>{mensagem.texto}</span>}
      </div>
    </div>
  );
}
