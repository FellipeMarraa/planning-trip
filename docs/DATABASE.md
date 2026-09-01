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
    exchangeRateAtTime: number; paidBy: string; participants: string[];
    status: 'pago' | 'pendente' | 'reservar'; date: string;
    spreadApplied?: number; exchangeRateUsed?: number; baseRateAtTime?: number;
}
```

Toda despesa é normalizada pra BRL no momento da escrita (`amountBRL`), com a taxa capturada (`exchangeRateUsed`/`baseRateAtTime`/`spreadApplied`) — mesmo que `Trip.baseCurrency` sugira outra moeda de referência, o app é BRL-cêntrico por baixo.

**Débito conhecido**: `status` e `exchangeRateAtTime` existem no tipo mas o service (`services/expenses.ts`, `ExpensePayload`/`createExpense`/`updateExpense`) nunca os escreve — só grava `spreadApplied`/`exchangeRateUsed`/`baseRateAtTime`. É resquício de uma feature de status pendente/reservado que não foi (ou ainda não foi) ligada na UI. Não assumir que `status` tem valor confiável em nenhuma despesa existente.

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
interface UserProfile { uid: string; email: string; displayName: string; photoURL: string; }
```

Cache leve do perfil, separado do Firebase Auth, pra outros participantes conseguirem ler nome/foto de um membro sem precisar de Admin SDK. Upsertado a cada login (`setDoc(..., {merge:true})`), nunca deletado automaticamente.

### 2.6 `invites`

```ts
interface InviteData { tripId: string; role: 'EDITOR' | 'VIEWER'; createdBy: string; createdAt: number; }
```

O próprio ID do documento é o segredo — imprevisível o suficiente pra servir de token de convite (ver regra em [SECURITY.md](./SECURITY.md) seção 1). `update`/`delete` são sempre negados pela regra — não existe revogação de convite hoje.

## 3. Padrão "ghost member" — impacto no dado

Um `ghost_<uuid>` aparece em `trips.participants`/`trips.roles` como qualquer uid real, e pode aparecer em `expenses.paidBy`/`expenses.participants` e `settlements.from`/`settlements.to`. Ver o fluxo completo de criação/vínculo/saída em [ARCHITECTURE.md](./ARCHITECTURE.md) seção 5, incluindo o **Débito conhecido** de `linkGhostToUser` não migrar `settlements`.

## 4. Relacionamentos (sem joins — resolvidos no client)

`expenses`/`settlements`/`activities` referenciam `trips` só por `tripId` (string solta, sem `DocumentReference`). Resolver "despesas da viagem X" é sempre uma query `where('tripId','==', X)` com `limit(1000)` como teto de segurança (ver [PERFORMANCE.md](./PERFORMANCE.md)) — nunca uma leitura de subcoleção.

## 5. Índices

Não existe `firestore.indexes.json` no repositório — nenhum índice composto foi necessário até agora (as queries atuais são filtro único por `tripId` + `orderBy` em no máximo um campo). Se uma query nova combinar filtro por `tripId` com `orderBy` em outro campo além do já usado, o próprio Firebase vai recusar em runtime com um link pra criar o índice — não tentar adivinhar o índice antes disso acontecer.

## 6. Regras para qualquer coleção nova

1. Sempre `where('tripId','==', ...)` pra escopar por viagem — nunca uma coleção "solta" sem dono.
2. Sempre `limit(...)` como teto de segurança na leitura (ver [FIREBASE.md](./FIREBASE.md)).
3. Adicionar a regra correspondente em `firestore.rules` **no mesmo commit** — nunca uma coleção nova sem regra (o catch-all final já nega tudo que não tem `match` explícito, então esquecer a regra derruba a feature, não vaza dado).
4. Se a coleção participa do fluxo de "sair da viagem"/ghost, replicar o padrão de `update` restrito por campo (ver `expenses`/`settlements` em `firestore.rules`), nunca liberar `update` geral pra participante não-editor só pra viabilizar a troca de uid.
