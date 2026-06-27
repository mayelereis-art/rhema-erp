# ERP Rhema Decorações

Sistema de gestão de locação de decoração de eventos para a Rhema Decorações.
Web, multiusuário, com as regras do alinhamento societário (Modelo C) embutidas.

## Início rápido

Abra esta pasta no **Claude Code** e diga: _"Leia o CLAUDE.md e a especificação,
depois comece pela Fase 1."_ O agente já tem o modelo de dados, as regras de
negócio e o backlog prontos.

Manualmente:

```bash
npm install
cp .env.example .env      # preencha as credenciais do Firebase
npm run db:seed
npm run dev
```

## O que já vem pronto

- `src/lib/rateio.ts` — regras do rateio societário (Modelo C) + geração de parcelas.
- `src/lib/rateio.test.ts` — testes provando que a divisão está correta.
- `src/lib/firestore-schema.ts` — modelo de dados das coleções do Firestore.
- `src/lib/firebase-client.ts` / `firebase-admin.ts` — SDKs do Firebase configurados.
- `scripts/seed.ts` — dados de exemplo (sócias, produtos, um contrato).
- `CLAUDE.md` — instruções permanentes para o agente.
- `docs/ESPECIFICACAO.md` — backlog de telas em ordem de prioridade.

## O que falta construir

As telas (Next.js) — listadas em `docs/ESPECIFICACAO.md`. A fundação de dados,
autenticação e a lógica financeira já estão prontas e testadas.

## Onde hospedar (web, de qualquer lugar)

- **Banco e autenticação:** Firebase (Firestore + Firebase Auth) — crie um
  projeto em https://console.firebase.google.com.
- **App:** Firebase App Hosting (`firebase deploy --only apphosting`), que
  integra nativamente com Next.js.
