# DATABASE.md — Coleções Firestore (schema real)

> Documenta as coleções **como existem hoje**, lidas direto de `src/types/index.ts`, `src/services/*.ts` e `firestore.rules`. Não há schema explícito no Firestore — este documento é o schema de fato.

## 1. Visão geral das coleções

| Coleção | Doc ID | Escrita por | Leitura por |
|---|---|---|---|
| `trips` | auto | `services/trips.ts` | `useTrip`, `useUserTrips` |
| `expenses` | auto | `services/expenses.ts`, migrações em `services/trips.ts` | `useTrip` (lista por `tripId`) |
| `settlements` | auto | `services/settlements.ts`, migração em `leaveTripAsGhost` | `useSettlements` |
| `activities` | auto | `services/activities.ts` | `useActivities` |
| `users` | uid do Firebase Auth | `upsertUserProfile` (`services/users.ts`), chamado a cada login | `useUserProfiles` |
| `invites` | auto (o próprio ID é o token do convite) | `createInvite` (`services/invites.ts`) | `getInvite`/`joinTripByInvite` |
| `ai_threads` | auto | só `api/ai/chat.ts` (Admin SDK) | `src/ai/hooks/useAIChat.ts` (`onSnapshot`, só a própria) |
| `ai_messages` | auto | só `api/ai/chat.ts` (Admin SDK) | `src/ai/hooks/useAIChat.ts` (`onSnapshot`, só a própria thread) |
| `ai_usage` | fixo (`global`) | só `api/ai/_lib/usage.ts` (Admin SDK) | nunca — nem client nem regra permitem leitura |

Todas as coleções são **top-level, sem subcoleção** — `expenses`/`settlements`/`activities` denormalizam `tripId` e são filtradas com `where('tripId', '==', ...)`.

## 2. Modelos de domínio

### 2.1 `Trip`

```ts
interface Trip {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    ownerId: string;
    participants: string[];       // uids reais + ghost_*
    baseCurrency: string;
    exchangeRates: { [key: string]: number };
    createdAt: number;
    roles: { [uid: string]: 'OWNER' | 'EDITOR' | 'VIEWER' };
    ghosts?: { [ghostUid: string]: { name: string } };
}
```

`exchangeRates` é preenchido na criação com um fallback hardcoded (`EUR: 6.12, GBP: 7.34, USD: 5.45`, em `services/trips.ts`) — os mesmos números duplicados em `useExchange.ts`'s `FALLBACK_RATES`. Se um dia o câmbio de referência mudar, tem que mudar nos dois lugares.

### 2.2 `Expense`

```ts
interface Expense {
    id: string; tripId: string; description: string; category: string;
    amountOriginal: number; currency: string; amountBRL: number;
    paidBy: string; participants: string[]; date: string;
    spreadApplied?: number; exchangeRateUsed?: number; baseRateAtTime?: number;
}
```

Toda despesa é normalizada pra BRL no momento da escrita (`amountBRL`), com a taxa capturada (`exchangeRateUsed`/`baseRateAtTime`/`spreadApplied`) — mesmo que `Trip.baseCurrency` sugira outra moeda de referência, o app é BRL-cêntrico por baixo.

### 2.3 `Settlement`

```ts
interface Settlement { id: string; tripId: string; from: string; to: string; amount: number; createdAt: number; }
```

`amount` é sempre em BRL (comentário no tipo). Representa "`from` pagou `to`" — um registro de quitação de dívida, não uma despesa.

### 2.4 `Activity`

```ts
interface Activity { id: string; tripId: string; dateId: string; time: string; location: string; description: string; completed: boolean; }
```

`dateId` agrupa atividades por dia no itinerário — chave de agrupamento denormalizada, não uma referência a outro doc.

### 2.5 `UserProfile` (coleção `users`)

```ts
interface UserProfile { uid: string; email: string; displayName: string; photoURL: string; photoBase64?: string; }
```

Cache leve do perfil, separado do Firebase Auth, pra outros participantes conseguirem ler nome/foto de um membro sem precisar de Admin SDK. Upsertado a cada login (`setDoc(..., {merge:true})`), nunca deletado automaticamente.

`photoBase64` é o avatar customizado (upload próprio via `uploadAvatar`, ver [FIREBASE.md](./FIREBASE.md) seção 4) — data URI JPEG, tem prioridade sobre `photoURL` (Google) na exibição. O upsert de login nunca escreve esse campo, só o próprio `uploadAvatar` — senão o próximo login apagaria a foto customizada.

**Campos extras gravados mas fora dessa interface TS** (mesmo padrão de drift descrito em 2.2): o doc também carrega `plan?: 'free'|'premium'|'annual'`, `planExpiresAt?: string|null` e `planSyncedAt?: Timestamp` — status de plano sincronizado do CashZ (ver [SECURITY.md](./SECURITY.md) seção 5), escritos só pelo Admin SDK do CashZ, nunca pelo client (`services/users.ts` não os conhece). Um doc de usuário que nunca fez SSO nem teve o próprio `plan-status` sincronizado simplesmente não tem esses campos — trate ausência como "desconhecido/free", nunca como erro.

### 2.6 `invites`

```ts
interface InviteData { tripId: string; role: 'EDITOR' | 'VIEWER'; createdBy: string; createdAt: number; }
```

O próprio ID do documento é o segredo — imprevisível o suficiente pra servir de token de convite (ver regra em [SECURITY.md](./SECURITY.md) seção 1). `update`/`delete` são sempre negados pela regra — não existe revogação de convite hoje.

### 2.7 `ai_threads` / `ai_messages`

```ts
interface AiThread { userId: string; tripId: string | null; title: string; archived: boolean; createdAt: Timestamp; updatedAt: Timestamp; lastMessagePreview?: string; }
interface AiMessage { threadId: string; userId: string; role: 'user' | 'assistant'; content: string; suggestedActivities?: SuggestedActivity[] | null; tripId?: string | null; provider?: string; createdAt: Timestamp; }
```

Só o `api/ai/chat.ts` escreve conteúdo (Admin SDK) — client nunca escreve direto, só lê a própria conversa. Única exceção: o dono pode fazer `updateDoc` do campo `archived` em `ai_threads` (`firestore.rules` restringe via `diff().affectedKeys().hasOnly(['archived'])`) — "arquivar" só esconde da lista (`src/ai/repositories/aiThreadsRepository.ts`), não apaga `ai_messages`. `tripId` em `ai_threads` é opcional: `null` quando a conversa começou fora do contexto de uma viagem. `suggestedActivities`, quando presente numa mensagem do assistente, é o roteiro sugerido que ainda não foi confirmado pelo usuário — ver [ARCHITECTURE.md](./ARCHITECTURE.md) seção 8.

### 2.8 `ai_usage/global`

```ts
interface AiUsageGlobal { spentUsd: number; periodStart: string; }
```

Circuit-breaker de custo mensal simples — sem leitura nem escrita liberada pro client em nenhuma hipótese (`allow read, write: if false`). Reseta quando `periodStart` não é mais do mês corrente (checado inline a cada chamada, sem cron — mesmo padrão do CashZ).

## 3. Padrão "ghost member" — impacto no dado

Um `ghost_<uuid>` aparece em `trips.participants`/`trips.roles` como qualquer uid real, e pode aparecer em `expenses.paidBy`/`expenses.participants` e `settlements.from`/`settlements.to`. Ver o fluxo completo de criação/vínculo/saída em [ARCHITECTURE.md](./ARCHITECTURE.md) seção 5, incluindo o **Débito conhecido** de `linkGhostToUser` não migrar `settlements`.

## 4. Relacionamentos (sem joins — resolvidos no client)

`expenses`/`settlements`/`activities` referenciam `trips` só por `tripId` (string solta, sem `DocumentReference`). Resolver "despesas da viagem X" é sempre uma query `where('tripId','==', X)` com `limit(1000)` como teto de segurança (ver [PERFORMANCE.md](./PERFORMANCE.md)) — nunca uma leitura de subcoleção.

## 5. Índices

`firestore.indexes.json` existe e reflete exatamente os índices compostos ativos no projeto (checar com `firebase firestore:indexes --project planning-trip-6a9cb` se desconfiar de drift). Cinco hoje: `activities` (`tripId` + `time`), `ai_messages` (`threadId` + `createdAt`, usado pela query do servidor em `api/ai/chat.ts`), `ai_messages` (`userId` + `threadId` + `createdAt`, usado pela query do client em `useAIChat.ts` — precisa do `userId` porque a regra do Firestore checa esse campo e uma *query* só passa se algum `where` já filtrar exatamente o campo que a regra usa, senão a lista inteira é negada mesmo que cada doc individualmente passasse), `ai_threads` (`userId` + `archived` + `updatedAt`, lista de conversas em `useAIThreads.ts`), `trips` (`participants` array-contains + `createdAt`). Os dois primeiros existiam antes de qualquer um ser capturado no arquivo — foram criados manualmente clicando no link de erro do Firebase quando a query correspondente rodou pela primeira vez, sem nunca ter sido registrados no repo (débito corrigido agora). Se uma query nova combinar filtro de igualdade com `orderBy`/`array-contains` numa combinação ainda não coberta, o Firebase recusa em runtime com um link pra criar o índice — **sempre** adicionar o índice resultante em `firestore.indexes.json` e rodar `firebase deploy --only firestore:indexes` no mesmo commit, nunca só clicar no link e deixar por isso mesmo (foi exatamente esse hábito que gerou o drift que acabou de ser corrigido).

## 6. Regras para qualquer coleção nova

1. Sempre `where('tripId','==', ...)` pra escopar por viagem — nunca uma coleção "solta" sem dono.
2. Sempre `limit(...)` como teto de segurança na leitura (ver [FIREBASE.md](./FIREBASE.md)).
3. Adicionar a regra correspondente em `firestore.rules` **no mesmo commit** — nunca uma coleção nova sem regra (o catch-all final já nega tudo que não tem `match` explícito, então esquecer a regra derruba a feature, não vaza dado).
4. Se a coleção participa do fluxo de "sair da viagem"/ghost, replicar o padrão de `update` restrito por campo (ver `expenses`/`settlements` em `firestore.rules`), nunca liberar `update` geral pra participante não-editor só pra viabilizar a troca de uid.
