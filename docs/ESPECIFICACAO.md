# Especificação Funcional — ERP Rhema Decorações

Este documento é o backlog de construção. Cada bloco é uma entrega que pode ser
feita e testada de forma independente. A ordem reflete prioridade.

---

## Fase 1 — Fundação (fazer primeiro)

### 1.1 Autenticação e papéis
- Login por e-mail/senha (NextAuth, hash bcrypt).
- Três papéis: ADMIN, SOCIA, EQUIPE (ver `prisma/schema.prisma`).
- Middleware protegendo todas as rotas internas. Rotas de financeiro/rateio
  visíveis apenas para ADMIN e SOCIA.
- Tela de login com a identidade visual da marca (rosa #ff609d, logo redonda).

### 1.2 Layout base
- Barra lateral com navegação: Painel, Disponibilidade, Orçamentos & Contratos,
  Logística, Catálogo, Clientes, Fornecedores, Financeiro, Rateio, Loja.
- Cabeçalho com nome da página e ação principal.
- Responsivo (as sócias usam celular às vezes).

---

## Fase 2 — Núcleo de locação

### 2.1 Catálogo
- CRUD de produtos: nome, emoji/foto, categoria, preço da diária, estoque, fornecedor,
  marcação de destaque.
- Filtro por categoria e busca por nome.

### 2.2 Disponibilidade por período (CRÍTICO)
- Entrada: data de retirada e data de devolução.
- Saída: para cada produto, quantidade livre = estoque − comprometido no período.
- "Comprometido" = soma das quantidades em contratos (orçamento + confirmado) cujo
  intervalo de datas se sobrepõe ao período consultado.
- Esta checagem precisa rodar no servidor e ser reusada pelo montador de orçamento.

### 2.3 Orçamentos & Contratos
- Montador: escolhe cliente, datas, tipo de serviço, custos, quem executa, logística.
- Ao adicionar item, validar disponibilidade no período (bloquear excesso).
- Mostrar prévia do rateio ao vivo (usar `calcularRateio`).
- Salvar como ORÇAMENTO ou CONFIRMADO. Ao salvar, gerar parcelas (sinal 50% + saldo)
  com `gerarParcelas`.
- Documento do contrato pronto para impressão (com logo) e botão de WhatsApp.
- Recibo de pagamento (valor pago, saldo, data).
- Fluxo de status: ORÇAMENTO → CONFIRMADO → CONCLUÍDO (ou CANCELADO).

---

## Fase 3 — Operação e financeiro

### 3.1 Logística
- Lista de contratos confirmados: tipo (retirada/entrega), endereço, período.
- Marcar saída dos itens e retorno. Sinalizar devolução em atraso.

### 3.2 Financeiro
- Contas a receber: parcelas dos contratos, marcar como pago.
- Contas a pagar: CRUD de despesas, marcar como pago.
- Saldo projetado (a receber − a pagar).

### 3.3 Rateio societário
- Para cada contrato fechado, calcular as fatias (`calcularRateio`).
- Acumular por sócia (Maiele, Michele, Cássia) e Caixa da empresa.
- Mostrar tabelas de referência (presencial vs peg&monte).
- Permitir ajustar custos e tipo de serviço de um contrato.

---

## Fase 4 — Cadastros de apoio e loja

### 4.1 Clientes e Fornecedores
- CRUD simples. Cliente mostra histórico de locações.
- Fornecedor mostra produtos vinculados.

### 4.2 Loja virtual (catálogo público)
- Página pública (sem login) com catálogo e seção de destaques.
- Botão "Quero este" abre WhatsApp da Rhema com o item pré-preenchido.
- Formulário de solicitação de orçamento que cria um ORÇAMENTO no sistema.

---

## Fora de escopo da V1 (decidir depois)

- Integração de pagamento (PagSeguro/cartão) — começa manual.
- Assinatura digital com validade jurídica.
- App nativo (o web responsivo cobre o celular por ora).
- Sinergia automática com Rhema Personalizados (lembrancinhas) — registrar pedidos
  manualmente primeiro, automatizar depois.

---

## Notas contábeis / societárias (contexto, não código)

- A Rhema Decorações opera sob o CNPJ da Rhema Personalizados, como nome fantasia.
- Os percentuais do rateio são revisáveis 1x ao ano entre as sócias.
- Recomenda-se formalizar o acordo societário com contrato assinado pelas três partes
  — o ERP organiza a operação, não substitui a formalização jurídica.
