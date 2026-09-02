# ROADMAP.md — Curto/médio/longo prazo

> Prioriza correção sobre novidade. Ordem dentro de cada horizonte reflete prioridade. Itens concluídos ficam marcados com `~~riscado~~` — **feito** em vez de removidos, pra servir de changelog.

## 1. Curto prazo (próximas semanas)

1. ~~**[ARCHITECTURE.md 5] Corrigir assimetria `linkGhostToUser`/`leaveTripAsGhost`**~~ — **feito**: `linkGhostToUser` (`src/services/trips.ts`) agora migra `settlements` também (mesmo padrão de `leaveTripAsGhost`), antes de atualizar `participants`/`ghosts` da trip.
2. ~~**[DATABASE.md 2.2] Resolver o drift de `Expense.status`/`exchangeRateAtTime`**~~ — **feito**: campos removidos do tipo (`src/types/index.ts`) — nunca foram escritos pelo service, a taxa de câmbio já é rastreada de verdade por `exchangeRateUsed`/`baseRateAtTime`/`spreadApplied`.
3. ~~**[ARCHITECTURE.md 2] Decidir o destino de `services/auth.ts`**~~ — **feito**: arquivo removido (estava vazio e sem nenhum import — lógica real já mora em `AuthContext.tsx`).

## 2. Médio prazo (próximos meses)

1. ~~Primeiro teste automatizado (prioridade 1: `firestore.rules`)~~ — **feito**: `firestore-tests/rules.test.ts` + `npm run test:rules`, ver [TESTS.md](./TESTS.md) seção 4. Só falta rodar de fato — máquina de dev está com Java 8, emulador exige 21+.
2. ~~Error boundary de React~~ — **feito**: `src/components/common/error-boundary.tsx`, envolve `<Suspense>`/`<Routes>` em `App.tsx`. Trata em especial falha de chunk lazy-loaded pós-deploy (recarrega a página automaticamente uma vez) — era a causa real da tela branca ao abrir `/profile` reportada pelo usuário.
3. ~~Padronizar tratamento de erro de `onSnapshot` entre hooks~~ — **feito**: `useActivities.ts` e `useUserProfiles.ts` agora retornam `error` surfaced (via toast nas páginas que os usam), mesmo padrão de `useTrip.ts` (ver [ERROR_HANDLING.md](./ERROR_HANDLING.md) seção 2).

## 3. Longo prazo (quando o volume de usuários justificar)

1. Paginação real (`startAfter`) se algum `limit(1000)` (ver [PERFORMANCE.md](./PERFORMANCE.md) seção 3) começar a ser um teto real, não teórico.
2. ~~Log estruturado/remoto~~ — **feito** (2026-09-02, motivado pelo app deixar de ser uso pessoal só do dono): `client_logs` (Firestore, gate por `isGlobalAdmin()` na regra) + `ErrorBoundary`/`GlobalErrorInterceptor` reportando erro de render e assíncrono. Ver [LOGGING.md](./LOGGING.md) seção 4.
3. **Migrar admin de e-mail hardcoded pra campo `isAdmin`/custom claim** — `/admin` ganhou ação real (2026-09-02: `client_logs`, contagem de `trips`/`users`), o trigger que este item esperava. Ainda hardcoded (duplicado em `AuthContext.tsx` + `firestore.rules`) porque só existe 1 admin hoje — vira prioridade real no dia em que precisar de um segundo. Ver [SECURITY.md](./SECURITY.md) seção 3.

## 4. Fora de escopo até segunda ordem

- Backend próprio do planning-trip além do endpoint SSO já existente no CashZ.
- Suporte a múltiplas moedas de referência de fato (o app é BRL-cêntrico por baixo, mesmo com `Trip.baseCurrency`).
- Modelo de branching mais pesado que o descrito em [GIT.md](./GIT.md).

## 5. Como atualizar este roadmap

Item concluído: risca o texto original (`~~...~~`) e adiciona **— feito**: explicação curta, na mesma linha — não apagar o item, ele serve de changelog. Item novo entra no horizonte certo pela prioridade real (risco de dado/segurança > correção > conveniência), não pela ordem em que foi lembrado.
