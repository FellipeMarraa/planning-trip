# ARCHITECTURE.md — Camadas e fluxo de dados reais

> Descreve a arquitetura **como ela é hoje**, verificada lendo `src/hooks/*`, `src/services/*` e `src/context/*` — não um alvo aspiracional. Onde há uma lacuna conhecida, está marcada como **Débito conhecido**.

## 1. Estrutura de pastas (real)

```
src/
├── components/
│   ├── trip/      → componentes de feature (diálogos, tabelas, gráficos de uma viagem)
│   ├── common/     → primitivas compartilhadas (empty-state, money-input, stat-card...)
│   ├── layout/     → Layout.tsx (shell/header autenticado)
│   └── ui/         → primitivas shadcn/radix, nunca editadas à mão por lógica de negócio
├── config/firebase.ts → init do Firebase client (auth, db, googleProvider)
├── context/        → AuthContext, ToastContext
├── hooks/          → camada de leitura (ver seção 2) + hooks de cálculo puro
├── lib/            → funções puras sem I/O (categorias, moedas, datas, ghost helpers...)
├── pages/          → uma por rota
├── services/       → camada de escrita (ver seção 2)
└── types/index.ts  → único arquivo de tipos de domínio
```

## 2. Duas camadas diferentes, sem indireção comum — leitura ≠ escrita

**Débito conhecido / padrão real a seguir, não uma falha a corrigir sem necessidade**: leitura e escrita não passam pela mesma camada.

- **Leitura**: Componente → hook (`useTrip`, `useActivities`, `useSettlements`, `useUserProfiles`, `useUserTrips`) → `onSnapshot` **direto** no Firestore, dentro do próprio hook. Não existe `getTrip()`/`getExpenses()` na camada de serviço — a leitura reativa vive inteira no hook.
- **Escrita**: Componente/diálogo → `src/services/*.ts` (`createTrip`, `createExpense`, `deleteActivity`...) → Firestore. Hooks **nunca** chamam services; services **nunca** assinam (`onSnapshot`).

```
LEITURA:  Componente ──▶ hook (onSnapshot) ──▶ Firestore
ESCRITA:  Componente ──▶ service (services/*.ts) ──▶ Firestore
```

Ao adicionar um novo domínio, siga esse mesmo split: hook pra ler em tempo real, service pra escrever. Não invente uma terceira camada (repository, use-case) pra um projeto deste tamanho.

**Débito conhecido**: `src/services/auth.ts` existe mas está **vazio**. Toda a lógica de auth (Google popup, logout, allowlist de admin) mora em `src/context/AuthContext.tsx`. Ou o arquivo é preenchido, ou é removido — não deixar como está sem decisão.

## 3. Hooks de cálculo puro (sem Firestore)

- `useTripBalances` — recebe `expenses`/`settlements` já carregados e calcula saldo por membro num `useMemo`. Não faz I/O.
- `useTripRole` — deriva o papel do usuário logado a partir de um `Trip` + `useAuth()`. Não faz I/O.
- `useExchange` — não usa Firestore: busca câmbio ao vivo na AwesomeAPI (`economia.awesomeapi.com.br`), com uma tabela `FALLBACK_RATES` hardcoded se a chamada falhar (`src/hooks/useExchange.ts`).

## 4. Contexts globais (`src/context/`)

- **`AuthContext`**: login só por Google (`signInWithPopup`, nunca `signInWithRedirect` — comentário no código explica que o redirect quebra em Safari 16.1+/Chrome 115+/Firefox 109+ porque `authDomain` (`*.firebaseapp.com`) é domínio diferente do app (`*.vercel.app`), e esses browsers bloqueiam storage entre domínios durante o redirect). `isGlobalAdmin` é um allowlist de e-mail hardcoded (`GLOBAL_ADMIN_EMAILS`), não um custom claim do Firebase.
- **`ToastContext`**: toast feito à mão (sem lib externa), `showError`/`showSuccess`, auto-dismiss em 5s.

## 5. Padrão de "ghost member" — a regra de domínio mais complexa do app

Um participante sem conta (ex.: cônjuge/filho que não vai logar) é representado por um uid sintético `ghost_<uuid>`, guardado em `trips.ghosts[ghostUid] = {name}` e incluído em `trips.participants`/`trips.roles`. Helpers em `src/lib/members.ts`:

```ts
export function isGhostUid(uid: string) {
    return uid.startsWith('ghost_');
}
```

Três operações tocam esse padrão, todas em `src/services/trips.ts`:

1. **`addGhostMember`** — cria um ghost direto.
2. **`linkGhostToUser`** — liga um ghost a um usuário real depois que ele entra no app; migra as **despesas** que referenciam o ghost (`paidBy`/`participants`) pro uid real, em lotes de 499 (limite de 500 por `writeBatch`).
3. **`leaveTripAsGhost`** — o inverso: quando um usuário real sai da viagem, seu uid é trocado por um novo ghost em **despesas e acertos**, preservando o histórico financeiro pros demais.

**Débito conhecido**: `linkGhostToUser` migra só `expenses`; `leaveTripAsGhost` migra `expenses` **e** `settlements`. Mesma classe de operação (trocar um uid por outro em todo lugar que aparece), cobertura assimétrica — um ghost vinculado de volta a um usuário real fica com `settlements` órfãos referenciando o uid antigo do ghost. Ver [ROADMAP.md](./ROADMAP.md).

Nenhuma dessas migrações é atômica (comentário explícito em `linkGhostToUser`: `getDocs` + `writeBatch` não é atômico contra escrita concorrente) — aceito conscientemente porque uma correção 100% atômica exigiria Cloud Function/transação server-side, fora do plano Spark gratuito (ver [FIREBASE.md](./FIREBASE.md)).

## 6. Integração SSO com o CashZ

`src/pages/Sso.tsx`, rota `/sso` (fora de `ProtectedRoute`/`PublicRoute` — é transitória). Recebe um Firebase custom token no hash da URL (`#token=...`), chama `signInWithCustomToken`, limpa o hash do histórico e redireciona pra `/`. O token é gerado do outro lado, por `CashZ/api/auth/trip-token.ts` — ver [SECURITY.md](./SECURITY.md) seção 4 pro trust boundary que isso introduz.

## 7. Roteamento

`react-router-dom` v7, todas as páginas lazy-loaded (`React.lazy` + um único `Suspense` em `App.tsx`) pra não puxar Recharts/Framer Motion antes da hora. `ProtectedRoute` embrulha em `Layout`, exceto a rota de itinerário (`/trip/:tripId/itinerary`), que tem layout próprio imersivo.

## 8. Convenções já validadas (siga-as)

1. Ler é hook+`onSnapshot`; escrever é service. Não misturar.
2. Migração de dado em lote sempre em chunks de 499 (`BATCH_LIMIT` em `trips.ts`), nunca um `writeBatch` sem chunking.
3. Todo id de ghost usa o prefixo `ghost_` e passa por `isGhostUid`/`getMemberName` (`src/lib/members.ts`) pra resolver nome — nunca resolver nome de uid manualmente em componente.
4. Import de `firebase`/contexts é majoritariamente `@/...`, mas alguns hooks usam relativo (`../config/firebase`) — inconsistência existente, não é motivo pra reescrever arquivo que não está sendo tocado por outro motivo.
