/**
 * Modelo de dados do Firestore — substitui o antigo prisma/schema.prisma.
 *
 * Coleções (todas no nível raiz, sem subcoleções, para manter as queries simples):
 *   usuarios       — id do documento = uid do Firebase Auth
 *   categorias
 *   fornecedores
 *   produtos
 *   clientes
 *   contratos      — itens e parcelas embutidos como arrays (não há necessidade
 *                    de subcoleção: o volume por contrato é pequeno e sempre lido junto)
 *   despesas
 *
 * Datas são guardadas como Firestore Timestamp. Valores monetários como number
 * (BRL, duas casas decimais) — não há tipo Decimal no Firestore.
 */

import type { Timestamp } from "firebase/firestore";

export type Papel = "ADMIN" | "SOCIA" | "EQUIPE";

export interface Usuario {
  id: string; // uid do Firebase Auth
  nome: string;
  email: string;
  papel: Papel;
  criadoEm: Timestamp;
}

export interface Categoria {
  id: string;
  nome: string;
}

export interface Fornecedor {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  fornece?: string;
  criadoEm: Timestamp;
}

export interface Produto {
  id: string;
  nome: string;
  emoji: string;
  precoDiaria: number;
  quantidade: number;
  destaque: boolean;
  categoriaId?: string;
  fornecedorId?: string;
  // Quanto custou comprar a peça (preço unitário pago ao fornecedor) — base
  // para sugerir o preço da diária (ver custoSugerido em src/lib/precificacao.ts).
  custoAquisicao?: number;
  // % do custo recuperado por locação. Itens de alto desgaste (tecido, balão)
  // ficam por volta de 20%; itens duráveis (estrutura metálica, vaso) por volta
  // de 10%. Padrão: 15%.
  percentualRecuperacao?: number;
  criadoEm: Timestamp;
}

export interface Cliente {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  documento?: string;
  criadoEm: Timestamp;
}

export type StatusContrato = "CONFIRMADO" | "CONCLUIDO" | "CANCELADO";
export type TipoServico = "PRESENCIAL" | "PEGMONTE";
export type ModoLogistica = "RETIRADA" | "ENTREGA";
export type StatusOrcamento = "PENDENTE" | "CONVERTIDO" | "CANCELADO";

export interface ItemContrato {
  produtoId: string;
  quantidade: number;
  // preço congelado no momento da locação (histórico não muda se o catálogo mudar)
  precoUnitario: number;
}

export interface Parcela {
  rotulo: string; // "Sinal 50%", "Saldo (cartão)"
  vencimento: Timestamp;
  valor: number;
  pago: boolean;
}

export interface Contrato {
  id: string;
  numero: number; // gerado via contador em /contadores/contratos
  clienteId: string;
  evento: string;
  inicio: Timestamp;
  fim: Timestamp;
  status: StatusContrato;
  tipoServico: TipoServico;
  custos: number; // saem antes do rateio
  executoraId?: string;

  modoLogistica: ModoLogistica;
  endereco?: string;
  saidaEntregue: boolean;
  itensDevolvidos: boolean;

  itens: ItemContrato[];
  parcelas: Parcela[];
  criadoEm: Timestamp;
}

// Orçamento NÃO reserva estoque (diferente de Contrato) — é só uma proposta de
// preço enviada ao cliente. Quando aceito, vira um Contrato (registro novo) via
// converterEmContrato em src/lib/orcamentos.ts; o orçamento original fica como
// histórico, marcado CONVERTIDO e apontando para o contratoId gerado.
export interface Orcamento {
  id: string;
  numero: number; // gerado via contador em /contadores/orcamentos — numeração própria, não compartilha com Contrato
  clienteId: string;
  evento: string;
  inicio: Timestamp;
  fim: Timestamp;
  status: StatusOrcamento;
  tipoServico: TipoServico;
  custos: number;
  executoraId?: string;
  modoLogistica: ModoLogistica;
  endereco?: string;
  itens: ItemContrato[];
  contratoId?: string; // preenchido quando convertido
  criadoEm: Timestamp;
}

export interface Despesa {
  id: string;
  descricao: string;
  vencimento: Timestamp;
  valor: number;
  pago: boolean;
  criadoEm: Timestamp;
}

export const COLECOES = {
  usuarios: "usuarios",
  categorias: "categorias",
  fornecedores: "fornecedores",
  produtos: "produtos",
  clientes: "clientes",
  contratos: "contratos",
  orcamentos: "orcamentos",
  despesas: "despesas",
  contadores: "contadores",
} as const;
