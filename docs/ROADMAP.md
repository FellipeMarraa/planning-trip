# ROADMAP.md — Curto/médio/longo prazo

> Prioriza correção sobre novidade. Ordem dentro de cada horizonte reflete prioridade. Itens concluídos ficam marcados com `~~riscado~~` — **feito** em vez de removidos, pra servir de changelog.

## 1. Curto prazo (próximas semanas)

1. ~~**[ARCHITECTURE.md 5] Corrigir assimetria `linkGhostToUser`/`leaveTripAsGhost`**~~ — **feito**: `linkGhostToUser` (`src/services/trips.ts`) agora migra `settlements` também (mesmo padrão de `leaveTripAsGhost`), antes de atualizar `participants`/`ghosts` da trip.
2. **[DATABASE.md 2.2] Resolver o drift de `Expense.status`/`exchangeRateAtTime`**: campos existem no tipo mas nunca são escritos pelo service — ou a feature de status pendente/reservado é ligada na UI, ou os campos são removidos do tipo.
3. **[ARCHITECTURE.md 2] Decidir o destino de `services/auth.ts`**: arquivo vazio, lógica real em `AuthContext.tsx` — preencher ou remover.

## 2. Médio prazo (próximos meses)

1. Primeiro teste automatizado (ver [TESTS.md](./TESTS.md) seção 3, prioridade 1: `firestore.rules`).
2. Error boundary de React (ver [ERROR_HANDLING.md](./ERROR_HANDLING.md) seção 3) — hoje um erro de render não capturado derruba a árvore inteira.
3. Padronizar tratamento de erro de `onSnapshot` entre hooks (ver [ERROR_HANDLING.md](./ERROR_HANDLING.md) seção 2).

## 3. Longo prazo (quando o volume de usuários justificar)

1. Paginação real (`startAfter`) se algum `limit(1000)` (ver [PERFORMANCE.md](./PERFORMANCE.md) seção 3) começar a ser um teto real, não teórico.
2. Log estruturado/remoto se um bug em produção precisar de investigação sem depender do usuário reportar (ver [LOGGING.md](./LOGGING.md) seção 4).
3. Revisar `isGlobalAdmin` como custom claim/regra de Firestore, se `/admin` ganhar alguma ação real (ver [SECURITY.md](./SECURITY.md) seção 3).

## 4. Fora de escopo até segunda ordem

- Funcionalidade real em `/admin` (hoje é placeholder — ver [PROJECT.md](./PROJECT.md) seção 6).
- Backend próprio do planning-trip além do endpoint SSO já existente no CashZ.
- Suporte a múltiplas moedas de referência de fato (o app é BRL-cêntrico por baixo, mesmo com `Trip.baseCurrency`).
- Modelo de branching mais pesado que o descrito em [GIT.md](./GIT.md).

## 5. Como atualizar este roadmap

Item concluído: risca o texto original (`~~...~~`) e adiciona **— feito**: explicação curta, na mesma linha — não apagar o item, ele serve de changelog. Item novo entra no horizonte certo pela prioridade real (risco de dado/segurança > correção > conveniência), não pela ordem em que foi lembrado.
