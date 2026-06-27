export function PageHeader({
  titulo,
  legenda,
  acao,
}: {
  titulo: string;
  legenda?: string;
  acao?: React.ReactNode;
}) {
  return (
    <header
      className="no-print"
      style={{
        padding: "22px 34px 18px",
        borderBottom: "1px solid var(--line)",
        background: "var(--paper)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 20,
        flexWrap: "wrap",
      }}
    >
      <div>
        <h1 style={{ fontFamily: "var(--font-d)", fontSize: 26, fontWeight: 500, letterSpacing: -0.4 }}>{titulo}</h1>
        {legenda && <div style={{ color: "var(--ink-soft)", fontSize: 13.5, marginTop: 3 }}>{legenda}</div>}
      </div>
      {acao}
    </header>
  );
}
