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
  fotoUrl?: string;
  codigo?: string; // código curto opcional (compatibilidade com o sistema antigo, ex.: "000012")
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
  // Valor cobrado do locatário em caso de avaria irreparável/perda (cláusula
  // de avarias do contrato). Se ausente, o contrato usa valor de mercado.
  valorReposicao?: number;
  criadoEm: Timestamp;
}

export interface Cliente {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  documento?: string; // CPF ou CNPJ
  rg?: string;
  endereco?: string;
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
  desconto?: number; // abatido do total cobrado do cliente (R$)
  executoraId?: string;

  modoLogistica: ModoLogistica;
  endereco?: string;
  saidaEntregue: boolean;
  itensDevolvidos: boolean;

  itens: ItemContrato[];
  parcelas: Parcela[];
  criadoEm: Timestamp;

  // Vindos de um Orçamento Inteligente convertido (opcionais; ver Orcamento).
  itensAvulsos?: ItemAvulso[];
  custosInternos?: number;
  baseRateio?: "RECEITA_MENOS_CUSTOS";
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
  desconto?: number; // abatido do total cobrado do cliente (R$)
  executoraId?: string;
  modoLogistica: ModoLogistica;
  endereco?: string;
  itens: ItemContrato[];
  contratoId?: string; // preenchido quando convertido
  criadoEm: Timestamp;

  // --- Campos do Orçamento Inteligente. Todos opcionais: orçamentos criados
  // antes deles não os têm e precisam continuar abrindo/editando/convertendo.
  horario?: string; // "HH:MM"
  local?: string;
  cidade?: string;
  convidados?: number;
  tema?: string;
  itensAvulsos?: ItemAvulso[];
  // Custos reais que não são cobrados como "serviço" (materiais, itens novos,
  // uso de itens próprios, contingência…). Saem do lucro antes do rateio.
  custosInternos?: number;
  // Presente só em orçamentos do Orçamento Inteligente — ver valores-documento.ts.
  baseRateio?: "RECEITA_MENOS_CUSTOS";
  origem?: "ORCAMENTO_INTELIGENTE";
  // Registro do que a IA sugeriu e do cálculo aprovado, para aprendizado futuro.
  analiseIA?: Record<string, unknown>;
}

export type TipoItemAvulso = "ITEM" | "CONSUMIVEL" | "SERVICO";
export type OrigemPreco = "MANUAL" | "PESQUISA_MERCADO" | "HISTORICO" | "ESTIMATIVA_IA";

/**
 * Item que entra no orçamento sem existir na coleção `produtos` — algo que a
 * Rhema ainda não tem no acervo, ou um material de consumo (balão, fita…).
 * Nunca cria produto automaticamente. `custoUnitario` é interno (sai do lucro
 * antes do rateio); o cliente só vê `precoUnitario`.
 */
export interface ItemAvulso {
  id: string;
  descricao: string;
  tipo: TipoItemAvulso;
  quantidade: number;
  custoUnitario: number;
  precoUnitario: number;
  origemPreco: OrigemPreco;
  fonteUrl?: string;
  dataPesquisa?: string; // ISO
  margemPct?: number;
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
