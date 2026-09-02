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

## 3. Hooks de cálculo puro (sem Firestore)

- `useTripBalances` — recebe `expenses`/`settlements` já carregados e calcula saldo por membro num `useMemo`. Não faz I/O.
- `useTripRole` — deriva o papel do usuário logado a partir de um `Trip` + `useAuth()`. Não faz I/O.
- `useExchange` — não usa Firestore: busca câmbio ao vivo na AwesomeAPI (`economia.awesomeapi.com.br`), com uma tabela `FALLBACK_RATES` hardcoded se a chamada falhar (`src/hooks/useExchange.ts`).

## 4. Contexts globais (`src/context/`)

- **`AuthContext`**: login por Google (`signInWithPopup`, nunca `signInWithRedirect` — comentário no código explica que o redirect quebra em Safari 16.1+/Chrome 115+/Firefox 109+ porque `authDomain` (`*.firebaseapp.com`) é domínio diferente do app (`*.vercel.app`), e esses browsers bloqueiam storage entre domínios durante o redirect) **e** por e-mail/senha (`register`/`loginWithEmail`, mesmo padrão do CashZ). `register` sempre checa `fetchSignInMethodsForEmail` antes de criar conta, e trata `auth/email-already-in-use` no catch como segunda camada — sem isso, alguém registrando por e-mail/senha um endereço que já tem conta Google criaria uma segunda conta divergente (aconteceu de verdade entre CashZ e planning-trip antes desse fix, ver [SECURITY.md](./SECURITY.md) seção 3). `isGlobalAdmin` é um allowlist de e-mail hardcoded (`GLOBAL_ADMIN_EMAILS`), não um custom claim do Firebase.
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
2. **`linkGhostToUser`** — liga um ghost a um usuário real depois que ele entra no app; migra **despesas e acertos** que referenciam o ghost (`paidBy`/`participants` em `expenses`, `from`/`to` em `settlements`) pro uid real, em lotes de 499 (limite de 500 por `writeBatch`).
3. **`leaveTripAsGhost`** — o inverso: quando um usuário real sai da viagem, seu uid é trocado por um novo ghost em **despesas e acertos**, preservando o histórico financeiro pros demais.

Mesma classe de operação nas duas direções (trocar um uid por outro em todo lugar que aparece, despesas e acertos), cobertura simétrica desde que `linkGhostToUser` passou a migrar `settlements` também (ver [ROADMAP.md](./ROADMAP.md)).

Nenhuma dessas migrações é atômica (comentário explícito em `linkGhostToUser`: `getDocs` + `writeBatch` não é atômico contra escrita concorrente) — aceito conscientemente porque uma correção 100% atômica exigiria Cloud Function/transação server-side, fora do plano Spark gratuito (ver [FIREBASE.md](./FIREBASE.md)).

## 6. Integração SSO com o CashZ

`src/pages/Sso.tsx`, rota `/sso` (fora de `ProtectedRoute`/`PublicRoute` — é transitória). Recebe um Firebase custom token no hash da URL (`#token=...`), chama `signInWithCustomToken`, limpa o hash do histórico e redireciona pra `/`. O token é gerado do outro lado, por `CashZ/api/auth/trip-token.ts` — ver [SECURITY.md](./SECURITY.md) seção 4 pro trust boundary que isso introduz.

## 7. Roteamento

`react-router-dom` v7, todas as páginas lazy-loaded (`React.lazy` + um único `Suspense` em `App.tsx`) pra não puxar Recharts/Framer Motion antes da hora. `ProtectedRoute` embrulha em `Layout`, exceto a rota de itinerário (`/trip/:tripId/itinerary`), que tem layout próprio imersivo.

## 8. Assistente de IA de viagem (`api/ai/`, `src/ai/`)

Primeira vez que o planning-trip tem backend próprio (antes disso, o único código server-side que tocava este projeto era o SSO no repo do CashZ — ver seção 6). Roda inteiramente dentro do próprio projeto Firebase (`planning-trip-6a9cb`), sem cruzar com o CashZ, diferente da integração de SSO/plano.

- **`api/ai/chat.ts`**: único endpoint. Verifica ID token → checa plano ativo de quem está chamando (réplica de `isCashzPremium()`, ver [SECURITY.md](./SECURITY.md) seção 6) → rate limit → circuit-breaker de custo global (`api/ai/_lib/usage.ts`) → monta contexto (viagem + roteiro já cadastrado, só se o uid for participante) → gera resposta (só Groq, sem fallback — decisão do usuário; `api/ai/_lib/providers/`) → grava em `ai_threads`/`ai_messages`.
- **Split de segurança**: a chamada real ao provider (com `GROQ_API_KEY`) só existe em `api/ai/_lib/providers/*` — nunca em `src/`. Mesmo motivo de um achado já corrigido no CashZ (chave de IA vazando no bundle do client).
- **Tools = eager context stuffing, não function-calling nativo**: o endpoint sempre busca a viagem + atividades atuais de uma vez (se houver `tripId`) e injeta no system prompt (`api/ai/_lib/prompt.ts`) — não há um loop de "modelo pede tool → server executa → modelo continua". Mesma simplificação deliberada usada no Consultor Financeiro do CashZ.
- **A IA nunca escreve nada sozinha.** Quando o usuário pede um roteiro, a resposta pode incluir um bloco JSON delimitado (`SUGGESTION_START`/`SUGGESTION_END`, `api/ai/_lib/prompt.ts`) que o client (`src/ai/components/SuggestedItineraryCard.tsx`) transforma em cards com botão "Adicionar" — cada clique chama `createActivity` (o mesmo service do formulário manual), nunca uma tool com permissão de escrita. Mesmo princípio permanente do CashZ ("nenhuma ferramenta de IA escreve dado"), aplicado aqui desde o início.
- **Renderização real vem de `onSnapshot`** em `ai_messages` (`src/ai/hooks/useAIChat.ts`), não da resposta do `fetch` — a resposta só devolve o `threadId`. Mesmo padrão do CashZ.
- **Múltiplas conversas, mesma estrutura do widget de IA do CashZ**: `AiAssistantContext` guarda a thread ativa, compartilhada entre `ThreadList` (lista as conversas do usuário via `useAIThreads`, botão "Nova conversa" zera a thread ativa) e `ChatPanel` (`AiAssistantWidget.tsx`, navegação em pilha lista↔chat, sem Dialog/Popover do shadcn pra poder virar tela cheia no mobile). "Arquivar" uma conversa (`archiveThread`, `src/ai/repositories/aiThreadsRepository.ts`) só marca `archived:true` — histórico continua em `ai_messages`, só some da lista.
- **Sem `ai_config` administrável nem `ai_usage_logs`/`ai_user_limits` por usuário**: provider ativo/fallback e limites de custo são constantes hardcoded no código (`api/ai/_lib/providers/registry.ts`, `api/ai/_lib/usage.ts`) — `/admin` (ver [PROJECT.md](./PROJECT.md) seção 6) tem visão geral e erros reportados, mas não edita config de IA em runtime. Só existe um contador global simples (`ai_usage/global`).

## 9. Convenções já validadas (siga-as)

1. Ler é hook+`onSnapshot`; escrever é service. Não misturar.
2. Migração de dado em lote sempre em chunks de 499 (`BATCH_LIMIT` em `trips.ts`), nunca um `writeBatch` sem chunking.
3. Todo id de ghost usa o prefixo `ghost_` e passa por `isGhostUid`/`getMemberName` (`src/lib/members.ts`) pra resolver nome — nunca resolver nome de uid manualmente em componente.
4. Import de `firebase`/contexts é majoritariamente `@/...`, mas alguns hooks usam relativo (`../config/firebase`) — inconsistência existente, não é motivo pra reescrever arquivo que não está sendo tocado por outro motivo.
