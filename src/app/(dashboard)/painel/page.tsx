import { PageHeader } from "../page-header";

export default function PainelPage() {
  return (
    <>
      <PageHeader titulo="Painel" legenda="Visão geral do seu negócio de decoração" />
      <div style={{ padding: "28px 34px 60px", flex: 1 }}>
        <p style={{ color: "var(--ink-soft)" }}>
          Fase 1 concluída: autenticação e layout base. As próximas telas (disponibilidade,
          contratos, financeiro etc.) chegam na Fase 2.
        </p>
      </div>
    </>
  );
}
