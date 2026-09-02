# TESTS.md — Estado real da suíte de testes

> Prioridades 1-3 estão implementadas — ver seções 4, 4.1 e 4.2. Prioridade 4 (`joinTripByInvite`) continua recomendação, não implementada ainda.

## 1. Por que isso importa mais do que pareceria num projeto pequeno

A lógica mais arriscada do app (migração de "ghost member", cálculo de saldo entre participantes) mexe com dinheiro dividido entre pessoas reais — um bug silencioso ali gera dívida calculada errada, não só um glitch visual. Isso pesa mais que o tamanho do projeto sugeriria.

## 2. Framework

Mesma escolha do CashZ por consistência entre os dois repos: **Vitest**, sem Cypress/Playwright. `npm run test` roda os testes de função pura (`vitest.config.ts`, `environment: 'node'`, sem jsdom/`@testing-library/react` — mesma economia de dependência que o CashZ faz em `goalAnalysis.test.ts`: extrai a lógica de dentro do hook pra uma função exportada e testa a função). `npm run test:rules` roda a suíte de `firestore.rules` (seção 4, precisa do emulador).

## 3. Prioridade de cobertura (por risco de negócio, não por facilidade de escrever)

| Prioridade | Alvo | Por quê |
|---|---|---|
| 1 | `firestore.rules` (via emulator, `@firebase/rules-unit-testing`) | É a única barreira real de segurança/isolamento entre viagens — ver [SECURITY.md](./SECURITY.md) |
| 2 | ~~`useTripBalances` (cálculo de saldo)~~ — **feito** | Ver seção 4.1 |
| 3 | ~~`linkGhostToUser`/`leaveTripAsGhost` (`services/trips.ts`)~~ — **feito** | Ver seção 4.2 |
| 4 | `joinTripByInvite` | Ponto de entrada de dado externo (convite) direto numa escrita sem leitura prévia |

## 4. Testes de `firestore.rules`

Implementado: `firestore-tests/rules.test.ts` (mesmo padrão do CashZ — `initializeTestEnvironment` + `assertSucceeds`/`assertFails`, seed via `withSecurityRulesDisabled`), config em `vitest.rules.config.ts`, rodado via `npm run test:rules` (`firebase emulators:exec --only firestore --project planning-trip-6a9cb "vitest run --config vitest.rules.config.ts"`).

Cobre, com pelo menos 1 caso permite + 1 nega cada: os 4 branches de `update` em `trips` (edição normal, auto-join via convite, sair como fantasma, **transferir dono** — o mais recente e o de maior risco por ser um branch novo), `create`/`read`/`delete` de `trips`, `expenses`, `settlements` (o `to == request.auth.uid` do create), `users/{uid}` (a whitelist de campos — inclui um teste específico pro trust boundary do plano CashZ: client não escreve `plan` direto), `ai_threads`/`ai_messages`/`ai_usage` (só o backend escreve) e `invites`.

**Exige Java 21+ local** pro Firebase Emulator (mesmo requisito do CashZ) — sem isso, `npm run test:rules` falha com `firebase-tools no longer supports Java version before 21`. O arquivo de teste em si foi validado sem emulador (`npx vitest run --config vitest.rules.config.ts` reconhece as 32 asserções, sem erro de sintaxe/import/tipo) — só não roda de fato sem o JDK certo.

### 4.1 `useTripBalances` (prioridade 2)

Implementado: `src/hooks/useTripBalances.test.ts`, 8 casos, roda de verdade via `npm run test` (não depende de emulador nem Java). A lógica de cálculo foi extraída do `useMemo` pra uma função exportada `computeTripBalances` (`src/hooks/useTripBalances.ts`) — o hook em si vira só um wrapper de memoização em cima dela. Cobre: divisão igual, pagador não deve a si mesmo, participante sem movimentação fica em 0, despesa sem participantes não divide por zero, uid fantasma tratado igual, acumulação de várias despesas, acerto de dívida (`settlement`) total e parcial.

### 4.2 `linkGhostToUser`/`leaveTripAsGhost` (prioridade 3)

Implementado: `src/services/trips.test.ts`, 10 casos, roda via `npm run test` (sem emulador). Diferente de `useTripBalances`, essas funções fazem I/O real no Firestore (`getDoc`/`getDocs`/`writeBatch`/`updateDoc`) — sem emulador, o único jeito de testar é mockar o SDK no boundary (`vi.mock('firebase/firestore', ...)`, com `vi.hoisted()` pros mocks referenciados dentro da factory) e verificar exatamente quais writes a função monta a partir de snapshots simulados. Padrão novo neste repo (o CashZ só testa função pura, sem mockar SDK) — usar como referência se outro service precisar do mesmo tipo de teste.

Cobre: despesa/settlement migrado em cada direção (fantasma→real e real→fantasma), em cada papel (`paidBy`/`participants`, `from`/`to`), o `updateDoc` final (participants/ghosts/roles), e o caso de viagem que sumiu no meio do caminho (`leaveTripAsGhost` já migrou despesas/acertos mas não atualiza a trip — comportamento documentado, não um bug novo).

## 5. Verificação manual (enquanto o ambiente não tem Java 21+)

Até alguém rodar `npm run test:rules` com sucesso pelo menos uma vez, qualquer mudança em `firestore.rules` continua exigindo teste manual no Firebase Emulator Suite (ou revisão cuidadosa) antes de deploy — não assumir que a suíte escrita já é uma rede de segurança rodando de verdade.

## 6. Meta de adoção (realista, não aspiracional)

Não existe meta de cobertura percentual. A meta é: nenhuma mudança nova em `firestore.rules` ou nas funções de migração de ghost entra sem teste cobrindo o caso que motivou a mudança — cobertura cresce por necessidade, não por campanha. Próximo passo real (prioridade 4): `joinTripByInvite`, que também não depende do emulador.
