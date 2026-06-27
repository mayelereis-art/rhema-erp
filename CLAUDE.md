# Rhema Decorações — ERP

ERP de gestão de locação de decoração de eventos. Multiusuário, web, acesso de qualquer lugar.
Substitui o protótipo em arquivo único por um sistema real com banco de dados e login.

## Stack

- **Next.js 15** (App Router) + React 19 + TypeScript
- **Firebase Auth** para autenticação por e-mail/senha (cookie de sessão via Admin SDK)
- **Firestore** como banco de dados (sem Prisma, sem SQL)
- **Firebase App Hosting** para deploy
- **Vitest** para testes

## Como o agente deve trabalhar aqui

1. **As regras do rateio são lei.** Toda a lógica de divisão financeira está em
   `src/lib/rateio.ts` e é a tradução fiel do documento de alinhamento societário.
   Nunca espalhe percentuais pelo código — sempre importe de lá. Se um percentual
   mudar (revisão anual), muda-se só aquele arquivo.
2. **Rode os testes antes de dar por pronto:** `npm test`. Os testes em
   `src/lib/rateio.test.ts` provam que o Modelo C está correto. Não os enfraqueça
   para fazer passar; conserte o código.
3. **Preços são congelados no contrato.** `ItemContrato.precoUnitario` (ver
   `src/lib/firestore-schema.ts`) guarda o preço no momento da locação. Mudar o
   catálogo depois NÃO altera contratos antigos.
4. **Disponibilidade por período** é a regra crítica do negócio: um produto não pode
   ser alugado além do estoque dentro de um intervalo de datas que se sobreponha.
   Implemente a checagem no servidor (não só no front) — consultando a coleção
   `contratos` no Firestore via Admin SDK.
5. **Permissão por papel:** ADMIN (Maiele) vê tudo; SOCIA vê operação + seu rateio;
   EQUIPE vê só operação, sem financeiro. O papel vem do documento em
   `usuarios/{uid}` no Firestore. Páginas de financeiro/rateio devem chamar
   `exigirPapelFinanceiro()` de `src/lib/sessao-servidor.ts` no topo do server component.
6. **Acesso ao Firestore é só pelo servidor.** Toda leitura/escrita passa pelo
   Admin SDK (`src/lib/firebase-admin.ts`) em server components, route handlers ou
   server actions. O client SDK (`src/lib/firebase-client.ts`) é usado apenas para
   `signInWithEmailAndPassword` no login — não para ler/escrever dados diretamente
   do browser. `firestore.rules` bloqueia qualquer acesso direto do client por padrão.
7. **Sessão:** o login troca o idToken do Firebase Auth por um cookie de sessão
   httpOnly (`POST /api/auth/session`), validado no layout do dashboard via
   `obterSessao()`. O middleware (`src/middleware.ts`) só checa a presença do
   cookie — a validação criptográfica completa acontece em Node.js, não no Edge.

## Regras de negócio (do documento de alinhamento)

- **Modelo C:** custos do serviço saem antes; o lucro líquido é dividido.
  - Presencial: Maiele 40 / Michele 35 / Cássia 2 / Caixa 23
  - Peg&Monte: Maiele 30 / Michele 10 / Cássia 0 / Caixa 60
- **Deslocamento é custo da empresa** — entra em `custos`, não é cobrado à parte.
- **Pagamento:** 50% de sinal confirma a reserva; saldo no cartão. Use `gerarParcelas`.
- **Raio de atendimento:** apenas Guararema na fase inicial.
- **Sábados:** indisponíveis na fase inicial (conflito de agenda da Michele). Apenas
  um aviso/validação leve, não um bloqueio rígido — é revisável.
- **Acervo:** em caso de saída de sócia, o acervo permanece na empresa (regra de
  negócio documental, não afeta o código diretamente).

## Comandos

```bash
npm install
cp .env.example .env      # preencha as credenciais do Firebase
npm run db:seed           # cria usuários no Firebase Auth + popula o Firestore
npm run dev               # http://localhost:3000
npm test                  # roda os testes do rateio
```

Para rodar localmente é preciso de um projeto Firebase real com Auth (e-mail/senha
habilitado) e Firestore criados, mais uma service account para `FIREBASE_SERVICE_ACCOUNT_KEY`
(necessária só em dev — em produção no App Hosting as credenciais vêm do ambiente).

## Deploy

```bash
npm install -g firebase-tools
firebase login
firebase init apphosting   # se ainda não houver backend criado
firebase deploy --only apphosting
```

## Ordem sugerida de construção

Veja `docs/ESPECIFICACAO.md` para o backlog completo de telas e funcionalidades,
em ordem de prioridade.
