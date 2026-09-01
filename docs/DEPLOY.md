# DEPLOY.md — Topologia, env vars, dependência cruzada com o CashZ

> Descreve o pipeline real. Passos que não são automáticos estão marcados como manuais — não assumir que `git push` sozinho cobre tudo.

## 1. Topologia de deploy

```
GitHub (main) ──push──▶ Vercel (build automático)
                              │
                              ├──▶ dist/ estático (SPA, vercel.json faz o rewrite pra index.html,
                              │     exceto /api/*)
                              │
                              └──▶ api/ai/chat.ts ─▶ function serverless (primeira do projeto)

Firebase (projeto planning-trip-6a9cb) ──▶ Firestore (regras + dados)
                                            sem Hosting, sem Cloud Functions (plano Spark) —
                                            a function acima roda no Vercel, não no Firebase
```

Domínio de produção: `https://planning-trip.vercel.app`.

## 2. Frontend

Build: `tsc -b && vite build` (erro de tipo quebra o build, não só o lint). **`tsc -b` não cobre `api/`** (nenhum dos tsconfigs referenciados inclui essa pasta) — um erro de tipo em `api/*.ts` só aparece no deploy da function pelo Vercel, não no build local. Deploy automático via integração Git do Vercel a cada push em `main` — não há passo manual pro frontend em si.

## 3. Variáveis de ambiente

A config do Firebase Web SDK (`apiKey`, `authDomain`, `projectId`...) continua hardcoded em `src/config/firebase.ts` — não é segredo (é a chave pública do SDK client). **Desde o assistente de IA (`api/ai/chat.ts`), o projeto passou a ter env vars de verdade** — server-only, nunca prefixadas `VITE_` (não vazam pro bundle):

| Variável | Onde é usada | Prefixo `VITE_`? |
|---|---|---|
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | Admin SDK do próprio projeto (`api/ai/chat.ts`) — mesmo JSON de service account já usado como `TRIP_FIREBASE_*` no Vercel do CashZ, adicionado aqui também | Não |
| `GROQ_API_KEY` | Único provider de IA (`api/ai/_lib/providers/groq.ts`) — sem fallback, decisão do usuário | Não |

Configuradas no Vercel do **planning-trip**, nunca no do CashZ — esse backend é próprio, não atravessa projeto (diferente do SSO/gate de plano, que precisa tocar o CashZ por natureza).

## 4. Firebase — configuração que não vive no repositório

- Regras de segurança (`firestore.rules`) exigem deploy manual: `firebase deploy --only firestore:rules --project planning-trip-6a9cb`. Não é automático pelo pipeline do Vercel.
- `firestore.indexes.json` também exige deploy manual: `firebase deploy --only firestore:indexes --project planning-trip-6a9cb` (ver [DATABASE.md](./DATABASE.md) seção 5) — não é automático pelo pipeline do Vercel, igual às regras.
- Login habilitado no Firebase Auth: só Google (ver [ARCHITECTURE.md](./ARCHITECTURE.md) seção 4) — qualquer provedor novo precisa ser habilitado manualmente no console do Firebase antes de aparecer no código.

## 5. Dependência cruzada com o CashZ (SSO)

O login via SSO (ver [SECURITY.md](./SECURITY.md) seção 4) depende de um endpoint que **não mora neste repositório**: `CashZ/api/auth/trip-token.ts`, com credenciais de Admin SDK do projeto `planning-trip-6a9cb` guardadas como env var no Vercel do **CashZ**. Se esse endpoint ficar fora do ar ou as credenciais expirarem/forem revogadas, o SSO quebra sem que nenhum deploy deste repositório tenha mudado nada — ao investigar um problema de login via SSO, checar o lado do CashZ primeiro (ver `CashZ/docs/DEPLOY.md`), não só este repo.

## 6. Rollback

Reverter pelo painel do Vercel (redeploy de um build anterior) ou `git revert` + push em `main` — sem passo adicional específico do planning-trip além do já coberto na seção 4 se a mudança revertida tiver tocado `firestore.rules`.

## 7. Checklist de deploy para mudança que toca dado/segurança

1. Mudou `firestore.rules`? Rodar contra o emulator antes (ver [TESTS.md](./TESTS.md)) e fazer o deploy manual da seção 4 — o push pro Vercel não cobre isso.
2. Mudou o formato de algum documento (`Trip`/`Expense`/`Settlement`/`Activity`)? Conferir se despesas/viagens já existentes continuam legíveis com o formato novo — não há migração automática de dado existente.
3. Mudou algo no fluxo de SSO? Revisar também o lado do CashZ (seção 5) antes de considerar a mudança completa.
4. Mudou algo em `api/*.ts`? Rodar `npx tsc --noEmit` manualmente nesses arquivos antes do push — `npm run build` não pega erro de tipo lá (seção 2).
5. Query nova com filtro de igualdade + `orderBy`/`array-contains`? Rodar localmente (ou testar em produção) antes de considerar pronto — se faltar índice, o erro só aparece em runtime (`FAILED_PRECONDITION`). Adicionar em `firestore.indexes.json` e `firebase deploy --only firestore:indexes` no mesmo commit, nunca só clicar no link de criação que o próprio erro oferece.
