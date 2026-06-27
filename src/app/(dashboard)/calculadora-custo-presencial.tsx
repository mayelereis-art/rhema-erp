"use client";

import { useMemo, useState } from "react";
import { calcularCustoServicoPresencial, VALOR_HORA_DECORACAO_PADRAO } from "@/lib/precificacao";

/**
 * Mini-calculadora de custo do serviço presencial: mão de obra (horas × valor/hora,
 * padrão R$80) + deslocamento + desmontagem. Botão "usar" aplica o total no
 * campo "Custos do serviço" do orçamento/contrato.
 */
export function CalculadoraCustoPresencial({ onAplicar }: { onAplicar: (valor: number) => void }) {
  const [horas, setHoras] = useState(0);
  const [valorHora, setValorHora] = useState(VALOR_HORA_DECORACAO_PADRAO);
  const [deslocamento, setDeslocamento] = useState(0);
  const [desmontagem, setDesmontagem] = useState(0);

  const total = useMemo(
    () => calcularCustoServicoPresencial({ horas, valorHora, deslocamento, desmontagem }),
    [horas, valorHora, deslocamento, desmontagem]
  );

  return (
    <div style={{ background: "var(--cream)", border: "1px solid var(--line)", borderRadius: 10, padding: 14, marginTop: 4 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 10 }}>Calculadora de custo do serviço presencial</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
        <Campo label="Horas trabalhadas">
          <input type="number" step="0.5" min={0} value={horas} onChange={(e) => setHoras(Number(e.target.value))} style={campoStyle} />
        </Campo>
        <Campo label="Valor/hora (R$)">
          <input type="number" step="1" min={0} value={valorHora} onChange={(e) => setValorHora(Number(e.target.value))} style={campoStyle} />
        </Campo>
        <Campo label="Deslocamento (R$)">
          <input type="number" step="0.01" min={0} value={deslocamento} onChange={(e) => setDeslocamento(Number(e.target.value))} style={campoStyle} />
        </Campo>
        <Campo label="Desmontagem (R$)">
          <input type="number" step="0.01" min={0} value={desmontagem} onChange={(e) => setDesmontagem(Number(e.target.value))} style={campoStyle} />
        </Campo>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <span style={{ fontSize: 13 }}>
          Total estimado: <strong>R$ {total.toFixed(2)}</strong>
        </span>
        <button type="button" className="btn btn-p btn-sm" onClick={() => onAplicar(total)}>
          Usar como custo do serviço
        </button>
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

const campoStyle: React.CSSProperties = { width: "100%", padding: "7px 9px", borderRadius: 7, border: "1px solid var(--line)", fontSize: 13 };
