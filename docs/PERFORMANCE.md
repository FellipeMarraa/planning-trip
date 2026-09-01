# PERFORMANCE.md — O que já está implementado vs. o que é recomendação

> Combina o que **já está implementado** (verificado no código) com o que é **próximo passo recomendado**. As duas categorias estão marcadas explicitamente — não confundir uma com a outra.

## 1. Code-splitting — ✅ implementado

Todas as 6 páginas roteadas (`Login`, `Sso`, `Dashboard`, `TripDetails`, `JoinTrip`, `TripItineraryPage`) são `React.lazy`, dentro de um único `Suspense` em `App.tsx`. Motivo explícito no comentário: evitar carregar Recharts/Framer Motion antes da hora (ex.: a página de convite não precisa de nenhum dos dois).

## 2. Memoização — parcialmente implementada

`useMemo`/`useCallback` aparecem em 22 pontos/6 arquivos. Uso real, não decorativo: `useTripBalances` embrulha o cálculo de saldo inteiro num `useMemo` chaveado em `[participants, expenses, settlements]`; `TripAnalytics` e `MemberDebtModal` memoizam dado derivado pro gráfico/modal; `ToastContext` usa `useCallback` nas funções que expõe. **Não implementado**: nenhum `React.memo` em componente — não introduzir sem medir que há re-render caro de verdade primeiro.

## 3. Queries com teto de segurança — ✅ implementado (não é paginação)

`expenses`/`activities`/`settlements` usam `limit(1000)`, `trips` do usuário usa `limit(200)` — comentário no código chama isso de "teto de segurança contra crescimento sem limite". **Não implementado**: paginação de verdade (`startAfter`/cursor) — zero ocorrências no código. Recomendação: só introduzir se algum uso real bater perto do teto de 1000 despesas numa viagem.

## 4. `onSnapshot` vs `getDocs` — já bem separado

Toda leitura reativa de UI usa `onSnapshot`; `getDocs` só aparece nas migrações pontuais de `services/trips.ts` (`deleteTripCascade`, `linkGhostToUser`, `leaveTripAsGhost`), onde uma assinatura em tempo real não faz sentido. Split correto, seguir o mesmo critério em código novo.

## 5. Cache — não implementado

Diferente do CashZ (`@tanstack/react-query`), o planning-trip não tem camada de cache — cada hook depende só do cache local do SDK do Firestore. **Recomendação, não urgente**: se o número de listeners simultâneos crescer (múltiplas viagens abertas ao mesmo tempo, por exemplo), reavaliar; hoje não há sinal de que seja necessário.

## 6. Virtualização — não implementada e não necessária hoje

Nenhuma lista do app hoje passa perto de precisar de `react-window`/`react-virtual` — os tetos de `limit(1000)` já seguram o pior caso, e a UI (tabela de despesas, lista de atividades) não renderiza tudo de uma vez sem paginação/filtro visual.

## 7. Bundle — pontos de atenção

`framer-motion` e `recharts` são as duas dependências mais pesadas — já isoladas via lazy loading (seção 1). Ao adicionar uma lib nova de peso comparável, considerar o mesmo tratamento (lazy import na página que a usa) antes de importar no topo de um arquivo compartilhado.
