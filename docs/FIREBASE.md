# FIREBASE.md — Regras do plano Spark (gratuito)

> O planning-trip roda no plano Spark do Firebase (sem custo, sem Cloud Functions). Este documento aplica isso ao que o app já faz — verificar valores de cota atuais no console antes de assumir que ainda são os mesmos.

## 1. Regra de ouro: nunca gastar cota por acidente

### 1.1 Leitura é sempre `onSnapshot`, nunca polling

Confirmado em todos os hooks de leitura (`useTrip`, `useActivities`, `useSettlements`, `useUserProfiles`, `useUserTrips`) — real-time listener, sem `setInterval`/refetch manual em lugar nenhum do código.

### 1.2 Listener só existe enquanto o componente que o usa está montado

Cada `onSnapshot` retorna a função de unsubscribe, devolvida no `return` do `useEffect` — padrão React padrão, seguido consistentemente nos hooks acima.

### 1.3 Leitura sempre tem `limit(...)` como teto de segurança

`expenses` (`useTrip.ts`) → `limit(1000)`; `activities` → `limit(1000)`; `settlements` → `limit(1000)`; `trips` do usuário (`useUserTrips.ts`) → `limit(200)`. Não é paginação de UI — é só um teto contra uma viagem crescer sem limite e estourar leitura. Ver [PERFORMANCE.md](./PERFORMANCE.md) pra paginação de verdade (ainda não implementada).

### 1.4 Nunca contar documentos com uma query

Não existe hoje nenhum contador derivado de `getDocs().size` em UI — os poucos `getDocs` que existem (`services/trips.ts`, migrações de ghost) são operações pontuais de escrita, não contagem exibida ao usuário.

### 1.5 Migração de dado em lote roda no client, nunca em Cloud Function

`deleteTripCascade`, `linkGhostToUser`, `leaveTripAsGhost` (`services/trips.ts`) usam `getDocs` + `writeBatch` chunkado em 499 operações, direto do browser do usuário logado — decisão deliberada pra ficar dentro do Spark (Cloud Functions exige plano Blaze). Ver o trade-off de não-atomicidade em [ARCHITECTURE.md](./ARCHITECTURE.md) seção 5.

## 2. Cache

Não existe camada de cache hoje (nem React Query nem equivalente) — cada hook mantém seu próprio estado local via `onSnapshot`, que já é "grátis" em termos de leitura repetida (o SDK do Firestore cacheia localmente e só cobra leitura de novo em mudança real). Diferente do CashZ, que usa `@tanstack/react-query` — não é uma lacuna a preencher sem necessidade real, só uma diferença de escala do projeto.

## 3. Paginação

Não existe. Ver seção 1.3 — os `limit(...)` são teto, não paginação incremental. Se o volume de despesas por viagem crescer a ponto do teto de 1000 virar um problema real, é quando vale introduzir cursor (`startAfter`) — não antes.

## 4. Cloud Messaging / Storage

Nenhum dos dois é usado pelo planning-trip hoje (nem `firebase/messaging` nem `firebase/storage` aparecem nas dependências ou no código).

## 5. Checklist antes de mergear qualquer mudança que toque Firestore

1. Toda leitura nova é `onSnapshot` com `limit(...)` e cleanup no `useEffect`, ou justifica explicitamente por que precisa ser `getDocs` pontual (como as migrações de ghost).
2. Toda escrita em lote é chunkada em `BATCH_LIMIT` (499, `services/trips.ts`), nunca um `writeBatch` sem chunk.
3. Regra correspondente em `firestore.rules` atualizada no mesmo commit — ver [DATABASE.md](./DATABASE.md) seção 6.
4. Nenhuma dependência nova de Cloud Function/Blaze introduzida sem decisão explícita — o app inteiro assume Spark.
