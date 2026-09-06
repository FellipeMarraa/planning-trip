# DATABASE.md — Coleções Firestore (schema real)

> Documenta as coleções **como existem hoje**, lidas direto de `src/types/index.ts`, `src/services/*.ts` e `firestore.rules`. Não há schema explícito no Firestore — este documento é o schema de fato.

## 1. Visão geral das coleções

| Coleção | Doc ID | Escrita por | Leitura por |
|---|---|---|---|
| `trips` | auto | `services/trips.ts` | `useTrip`, `useUserTrips` |
| `expenses` | auto | `services/expenses.ts`, migrações em `services/trips.ts` | `useTrip` (lista por `tripId`) |
| `settlements` | auto | `services/settlements.ts`, migração em `leaveTripAsGhost` | `useSettlements` |
| `activities` | auto | `services/activities.ts` | `useActivities` |
| `currency_lots` | auto | `services/currencyLots.ts` | `useCurrencyLots` (próprio `ownerUid` + parceiros de compartilhamento mútuo, privado do resto) |
| `wallet_shares` | determinístico (`${tripId}_${fromUid}_${toUid}`) | `services/walletShares.ts` | `useWalletShares` (só declarações que envolvem o próprio uid) |
| `users` | uid do Firebase Auth | `upsertUserProfile` (`services/users.ts`), chamado a cada login | `useUserProfiles` |
| `invites` | auto (o próprio ID é o token do convite) | `createInvite` (`services/invites.ts`) | `getInvite`/`joinTripByInvite` |
| `ai_threads` | auto | só `api/ai/chat.ts` (Admin SDK) | `src/ai/hooks/useAIChat.ts` (`onSnapshot`, só a própria) |
| `ai_messages` | auto | só `api/ai/chat.ts` (Admin SDK) | `src/ai/hooks/useAIChat.ts` (`onSnapshot`, só a própria thread) |
| `ai_usage` | fixo (`global`) | só `api/ai/_lib/usage.ts` (Admin SDK) | nunca — nem client nem regra permitem leitura |
| `client_logs` | auto | `reportClientError` (`src/lib/reportClientError.ts`), qualquer usuário autenticado, autoatribuído | só admin global (`src/pages/Admin.tsx`) |

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
    receiptBase64?: string;
}
```

Toda despesa é normalizada pra BRL no momento da escrita (`amountBRL`), com a taxa capturada (`exchangeRateUsed`/`baseRateAtTime`/`spreadApplied`) — mesmo que `Trip.baseCurrency` sugira outra moeda de referência, o app é BRL-cêntrico por baixo. Desde a simplificação da carteira de câmbio (ver 2.5), despesa não-BRL sempre usa cotação de mercado (`exchangeRateUsed == baseRateAtTime`, `spreadApplied == 0`) — não existe mais escolha manual de taxa/spread (`AddExpenseDialog.tsx`); esses 3 campos continuam existindo só por compatibilidade com despesa BRL (`exchangeRateUsed/baseRateAtTime == 1`) e despesa não-BRL criada antes dessa simplificação, que pode ter um `spreadApplied` real gravado.

`date` é `yyyy-MM-ddTHH:mm` (valor cru do `<input type="datetime-local">`, `AddExpenseDialog.tsx`) — **campo existia no tipo desde sempre mas nunca era escrito** até 2026-09-02 (sem input no formulário, sem uso em `ExpenseTable.tsx`); despesas criadas antes disso não têm esse campo. Todo código que lê `date` (`allocatePayment` em `settlementAllocation.ts`, `formatDateTimeBR` em `lib/dates.ts`) trata a ausência de forma defensiva, não assume presença.

`receiptBase64` é o comprovante/recibo anexado (opcional) — mesmo padrão do avatar (`lib/image.ts` `resizeReceiptToBase64`, base64 direto no Firestore, sem Firebase Storage), mas sem crop quadrado (preserva proporção) e resolução maior (precisa dar pra ler o texto). Editável junto com o resto da despesa; removível (vira `deleteField()` em `services/expenses.ts` `updateExpense`, não fica um campo `null` esquecido no doc).

**Não existe campo separado marcando "despesa de carteira"** — o sinal é a própria `currency`: qualquer despesa não-BRL já é, por definição, demanda de carteira de câmbio do pagador (`useWalletExpenses.ts` filtra `currency !== 'BRL'`, ver 2.5). Achado do usuário testando: uma marcação manual separada (`paidFromWallet`, existiu numa versão anterior desta feature) era redundante — se você registra em EUR/GBP/etc. é porque precisa ter aquele dinheiro físico no destino, nunca "posso pagar em real"; a moeda escolhida já é o sinal, sem precisar de um segundo campo pra confirmar a mesma coisa.

### 2.5 `CurrencyLot`

```ts
interface CurrencyLot { id: string; tripId: string; ownerUid: string; currency: string; amountPurchased: number; ratePaidBRL: number; purchaseDate: string; createdAt: number; }
```

Registro de compra de moeda estrangeira, por viagem e por participante (não persiste entre viagens). É aritmética de planejamento, não um caixa: `src/lib/currencyWallet.ts` (`summarizeWalletDemand`) soma `amountPurchased` de todos os lotes de uma moeda vs. `amountOriginal` de todas as despesas daquela viagem com `paidFromWallet: true`, e mostra a diferença ("falta comprar X") — nada é consumido/reservado de verdade, então não existe `update` nem lógica de reversão (lote errado é apagado e recriado). `ratePaidBRL` é só informativo.

**Privado por padrão**: `firestore.rules` só libera leitura/escrita pro próprio `ownerUid`, ou pro owner/editor da viagem quando `ownerUid` é um fantasma (`ghost_*`, que não tem login pra gerenciar a própria carteira) — **ou** quando existe compartilhamento mútuo ativo (ver 2.6 `wallet_shares`). A tela `/wallet` (`src/pages/WalletPage.tsx`, acessível pelo dropdown do avatar no `Layout.tsx`) busca lotes/despesas-carteira de `[o próprio uid, ...parceiros mútuos de cada viagem]` (`useCurrencyLots`/`useWalletExpenses`, sem filtro de `tripId` — global, agrupa por viagem no componente usando `useUserTrips`).

### 2.6 `WalletShareDeclaration` (coleção `wallet_shares`, doc ID determinístico)

```ts
interface WalletShareDeclaration { id: string; tripId: string; fromUid: string; toUid: string; createdAt: number; }
```

Declaração **unilateral** de "quero juntar minha carteira com a de X, nessa viagem" — caso de uso real: casal viajando junto, dinheiro unificado (ela tem €250, ele tem €250, juntos validam contra €500 de necessidade, mesmo a divisão de despesa continuando igual pros dois). Doc ID = `${tripId}_${fromUid}_${toUid}` (nunca auto-ID) — permite a regra do Firestore checar existência via `exists()` direto por caminho, sem query. **Mútuo** (pool ativo, libera leitura cruzada de `currency_lots`) só quando existem os dois sentidos (`A_B` e `B_A`) pro mesmo `tripId` — uma declaração sozinha não expõe nada, `src/lib/walletShares.ts` (`computeMutualPartnersByTrip`) calcula isso client-side a partir de dois listeners (`useWalletShares.ts`, um `where('fromUid','==',uid)` e outro `where('toUid','==',uid)` — Firestore não faz OR entre campos numa query só). Sem `update` — revogar (apagar) e declarar de novo, se precisar mudar algo. Não se aplica a fantasma (sem login, não tem como declarar a própria metade).

### 2.3 `Settlement`

```ts
interface Settlement { id: string; tripId: string; from: string; to: string; amount: number; createdAt: number; allocations?: SettlementAllocation[]; }
interface SettlementAllocation { expenseId: string; uid: string; amount: number; }
```

`amount` é sempre em BRL (comentário no tipo). Representa "`from` pagou `to`" — um registro de quitação de dívida, não uma despesa. `allocations` (opcional) diz a quais cotas específicas (despesa + participante) esse valor se refere — metadado de exibição só, a lista detalhada de dívidas (`MemberDebtModal.tsx`) usa isso pra saber exatamente qual item já foi coberto, mas **o saldo total nunca depende disso** — `computeTripBalances`/`firestore.rules` continuam usando só `amount` cru. Acerto sem `allocations` (dado anterior a essa feature, ou pagamento sem vínculo com item nenhum) ainda abate do total de forma genérica.

Quem pode registrar: qualquer `OWNER`/`EDITOR` da viagem, entre **quaisquer** dois participantes (não precisa ser uma das partes envolvidas) — é o que permite um editor "marcar como pago" a dívida de outra pessoa. `VIEWER` nunca cria acerto nenhum.

**Desfazer** ("marcar como pago" por engano, `undoExpensePayment` em `services/settlements.ts`): se o acerto foi criado só pra essa cota (`allocations` com 1 item — sempre o caso do botão "marcar como pago"), apaga o documento inteiro. Se o acerto também cobre outras despesas (pagamento livre auto-alocado em várias, ver `allocatePayment` em `lib/settlementAllocation.ts`), remove só a alocação em questão e subtrai o valor correspondente do `amount` — nunca apaga o acerto inteiro nesse caso, senão desfaria o pagamento de itens não relacionados.

### 2.4 `Activity`

```ts
interface Activity { id: string; tripId: string; dateId: string; time: string; location: string; description: string; completed: boolean; coordinates?: { lat: number; lng: number }; }
```

`dateId` agrupa atividades por dia no itinerário — chave de agrupamento denormalizada, não uma referência a outro doc.

`coordinates` é opcional e aditivo — preenchido só quando o usuário escolhe a localização via `LocationPicker.tsx` (busca de endereço ou clique no mapa, ver [ARCHITECTURE.md](./ARCHITECTURE.md)); atividades criadas antes dessa feature, ou onde o usuário só digitou o texto livre em `location`, não têm o campo. `DayRouteMap.tsx` filtra só as atividades com `coordinates` pra desenhar o mapa do dia — nenhuma leitura/escrita trata a ausência do campo como erro.

### 2.5 `UserProfile` (coleção `users`)

```ts
interface UserProfile { uid: string; email: string; displayName: string; photoURL: string; photoBase64?: string; isAdmin?: boolean; }
```

Cache leve do perfil, separado do Firebase Auth, pra outros participantes conseguirem ler nome/foto de um membro sem precisar de Admin SDK. Upsertado a cada login (`setDoc(..., {merge:true})`), nunca deletado automaticamente.

`photoBase64` é o avatar customizado (upload próprio via `uploadAvatar`, ver [FIREBASE.md](./FIREBASE.md) seção 4) — data URI JPEG, tem prioridade sobre `photoURL` (Google) na exibição. O upsert de login nunca escreve esse campo, só o próprio `uploadAvatar` — senão o próximo login apagaria a foto customizada.

`isAdmin` é o admin GLOBAL do sistema (nada a ver com `trips/{id}.ownerId`) — **fora** da whitelist de campos que `upsertUserProfile`/o client conseguem gravar (`firestore.rules`), só setável manualmente no Firebase Console. Ver [SECURITY.md](./SECURITY.md) seção 3.

**Campos extras gravados mas fora dessa interface TS** (mesmo padrão de drift descrito em 2.2): o doc também carrega `plan?: 'free'|'premium'|'annual'`, `planExpiresAt?: string|null` e `planSyncedAt?: Timestamp` — status de plano sincronizado do CashZ (ver [SECURITY.md](./SECURITY.md) seção 5), escritos só pelo Admin SDK do CashZ, nunca pelo client (`services/users.ts` não os conhece). Um doc de usuário que nunca fez SSO nem teve o próprio `plan-status` sincronizado simplesmente não tem esses campos — trate ausência como "desconhecido/free", nunca como erro.

### 2.6 `invites`

```ts
interface InviteData { tripId: string; role: 'EDITOR' | 'VIEWER'; createdBy: string; createdAt: number; }
```

O próprio ID do documento é o segredo — imprevisível o suficiente pra servir de token de convite (ver regra em [SECURITY.md](./SECURITY.md) seção 1). `update`/`delete` são sempre negados pela regra — não existe revogação de convite hoje.

### 2.7 `ai_threads` / `ai_messages`

```ts
interface AiThread { userId: string; tripId: string | null; title: string; archived: boolean; createdAt: Timestamp; updatedAt: Timestamp; lastMessagePreview?: string; }
interface AiMessage { threadId: string; userId: string; role: 'user' | 'assistant'; content: string; suggestedActivities?: SuggestedActivity[] | null; suggestedTrip?: SuggestedTrip | null; suggestedExpense?: SuggestedExpense | null; tripId?: string | null; provider?: string; createdAt: Timestamp; }
```

Só o `api/ai/chat.ts` escreve conteúdo (Admin SDK) — client nunca escreve direto, só lê a própria conversa. Única exceção: o dono pode fazer `updateDoc` do campo `archived` em `ai_threads` (`firestore.rules` restringe via `diff().affectedKeys().hasOnly(['archived'])`) — "arquivar" só esconde da lista (`src/ai/repositories/aiThreadsRepository.ts`), não apaga `ai_messages`. `tripId` em `ai_threads` é opcional: `null` quando a conversa começou fora do contexto de uma viagem. `suggestedActivities`/`suggestedTrip`/`suggestedExpense`, quando presentes numa mensagem do assistente, são sugestões (roteiro/viagem/despesa) que ainda não foram confirmadas pelo usuário — sempre sanitizadas server-side (`sanitizeSuggested*` em `api/ai/chat.ts`, nunca confia no shape que o modelo emite) e escritas de verdade só quando o usuário clica confirmar no card (`src/ai/components/Suggested*Card.tsx`) — ver [SECURITY.md](./SECURITY.md) seção 6. Cada item de `suggestedActivities` ganha `coordinates?` best-effort via geocoding server-side (nunca vindo do modelo, ver [ARCHITECTURE.md](./ARCHITECTURE.md) seção 8) antes de ser gravado aqui.

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
