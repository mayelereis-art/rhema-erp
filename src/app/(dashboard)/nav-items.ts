export interface NavItem {
  href: string;
  icone: string;
  rotulo: string;
  papeis?: Array<"ADMIN" | "SOCIA" | "EQUIPE">;
}

// Itens visíveis a todos, exceto os marcados com `papeis` restrito.
export const NAV_ITEMS: NavItem[] = [
  { href: "/painel", icone: "◆", rotulo: "Painel" },
  { href: "/disponibilidade", icone: "◷", rotulo: "Disponibilidade" },
  { href: "/orcamentos", icone: "✎", rotulo: "Orçamentos" },
  { href: "/contratos", icone: "✦", rotulo: "Contratos" },
  { href: "/logistica", icone: "🚚", rotulo: "Logística" },
  { href: "/catalogo", icone: "▣", rotulo: "Catálogo" },
  { href: "/clientes", icone: "◑", rotulo: "Clientes" },
  { href: "/fornecedores", icone: "◐", rotulo: "Fornecedores" },
  { href: "/financeiro", icone: "$", rotulo: "Financeiro", papeis: ["ADMIN", "SOCIA"] },
  { href: "/rateio", icone: "%", rotulo: "Rateio (sócias)", papeis: ["ADMIN", "SOCIA"] },
  { href: "/loja", icone: "◈", rotulo: "Loja virtual" },
];
