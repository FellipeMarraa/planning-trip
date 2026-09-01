# DEPLOY.md — Topologia, env vars, dependência cruzada com o CashZ

> Descreve o pipeline real. Passos que não são automáticos estão marcados como manuais — não assumir que `git push` sozinho cobre tudo.

## 1. Topologia de deploy

```
GitHub (main) ──push──▶ Vercel (build automático)
                              │
                              ▼
                    dist/ estático (SPA, vercel.json faz o rewrite pra index.html)

Firebase (projeto planning-trip-6a9cb) ──▶ só Firestore (regras + dados)
                                            sem Hosting, sem Cloud Functions (plano Spark)
```

Domínio de produção: `https://planning-trip.vercel.app`.

## 2. Frontend

Build: `tsc -b && vite build` (erro de tipo quebra o build, não só o lint). Deploy automático via integração Git do Vercel a cada push em `main` — não há passo manual pro frontend em si.

## 3. Variáveis de ambiente

**Não existe `.env`/`.env.example` no repositório.** A config do Firebase Web SDK (`apiKey`, `authDomain`, `projectId`...) é hardcoded em `src/config/firebase.ts` — não é segredo (é a chave pública do SDK client), mas significa que trocar de projeto Firebase exige editar esse arquivo, não uma env var. Diferente do CashZ, que usa `VITE_*`/env vars server-only — não copiar esse padrão pro planning-trip sem necessidade real (trocar de projeto Firebase não é algo que acontece com frequência aqui).

## 4. Firebase — configuração que não vive no repositório

- Regras de segurança (`firestore.rules`) exigem deploy manual: `firebase deploy --only firestore:rules --project planning-trip-6a9cb`. Não é automático pelo pipeline do Vercel.
- Não existe `firestore.indexes.json` — nenhum índice composto foi necessário até hoje (ver [DATABASE.md](./DATABASE.md) seção 5).
- Login habilitado no Firebase Auth: só Google (ver [ARCHITECTURE.md](./ARCHITECTURE.md) seção 4) — qualquer provedor novo precisa ser habilitado manualmente no console do Firebase antes de aparecer no código.

## 5. Dependência cruzada com o CashZ (SSO)

O login via SSO (ver [SECURITY.md](./SECURITY.md) seção 4) depende de um endpoint que **não mora neste repositório**: `CashZ/api/auth/trip-token.ts`, com credenciais de Admin SDK do projeto `planning-trip-6a9cb` guardadas como env var no Vercel do **CashZ**. Se esse endpoint ficar fora do ar ou as credenciais expirarem/forem revogadas, o SSO quebra sem que nenhum deploy deste repositório tenha mudado nada — ao investigar um problema de login via SSO, checar o lado do CashZ primeiro (ver `CashZ/docs/DEPLOY.md`), não só este repo.

## 6. Rollback

Reverter pelo painel do Vercel (redeploy de um build anterior) ou `git revert` + push em `main` — sem passo adicional específico do planning-trip além do já coberto na seção 4 se a mudança revertida tiver tocado `firestore.rules`.

## 7. Checklist de deploy para mudança que toca dado/segurança

1. Mudou `firestore.rules`? Rodar contra o emulator antes (ver [TESTS.md](./TESTS.md)) e fazer o deploy manual da seção 4 — o push pro Vercel não cobre isso.
2. Mudou o formato de algum documento (`Trip`/`Expense`/`Settlement`/`Activity`)? Conferir se despesas/viagens já existentes continuam legíveis com o formato novo — não há migração automática de dado existente.
3. Mudou algo no fluxo de SSO? Revisar também o lado do CashZ (seção 5) antes de considerar a mudança completa.
