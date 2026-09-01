# TESTS.md — Estado real da suíte de testes

> Prioridade 1 (`firestore.rules`) está implementada — ver seção 4. Prioridades 2-4 continuam recomendação, não implementadas ainda.

## 1. Por que isso importa mais do que pareceria num projeto pequeno

A lógica mais arriscada do app (migração de "ghost member", cálculo de saldo entre participantes) mexe com dinheiro dividido entre pessoas reais — um bug silencioso ali gera dívida calculada errada, não só um glitch visual. Isso pesa mais que o tamanho do projeto sugeriria.

## 2. Framework

Mesma escolha do CashZ por consistência entre os dois repos: **Vitest**, sem Cypress/Playwright. Instalado (`vitest`, `@firebase/rules-unit-testing`, `firebase-tools`) junto do primeiro teste (regras, seção 4) — não antes.

## 3. Prioridade de cobertura (por risco de negócio, não por facilidade de escrever)

| Prioridade | Alvo | Por quê |
|---|---|---|
| 1 | `firestore.rules` (via emulator, `@firebase/rules-unit-testing`) | É a única barreira real de segurança/isolamento entre viagens — ver [SECURITY.md](./SECURITY.md) |
| 2 | `useTripBalances` (cálculo de saldo) | Função pura, fácil de testar, e um erro aqui mostra dívida errada pra usuário real |
| 3 | `linkGhostToUser`/`leaveTripAsGhost` (`services/trips.ts`) | Lógica de migração mais complexa do app, com o débito conhecido de assimetria (ver [ARCHITECTURE.md](./ARCHITECTURE.md) seção 5) — teste aqui teria pego isso |
| 4 | `joinTripByInvite` | Ponto de entrada de dado externo (convite) direto numa escrita sem leitura prévia |

## 4. Testes de `firestore.rules`

Implementado: `firestore-tests/rules.test.ts` (mesmo padrão do CashZ — `initializeTestEnvironment` + `assertSucceeds`/`assertFails`, seed via `withSecurityRulesDisabled`), config em `vitest.rules.config.ts`, rodado via `npm run test:rules` (`firebase emulators:exec --only firestore --project planning-trip-6a9cb "vitest run --config vitest.rules.config.ts"`).

Cobre, com pelo menos 1 caso permite + 1 nega cada: os 4 branches de `update` em `trips` (edição normal, auto-join via convite, sair como fantasma, **transferir dono** — o mais recente e o de maior risco por ser um branch novo), `create`/`read`/`delete` de `trips`, `expenses`, `settlements` (o `to == request.auth.uid` do create), `users/{uid}` (a whitelist de campos — inclui um teste específico pro trust boundary do plano CashZ: client não escreve `plan` direto), `ai_threads`/`ai_messages`/`ai_usage` (só o backend escreve) e `invites`.

**Exige Java 21+ local** pro Firebase Emulator (mesmo requisito do CashZ) — sem isso, `npm run test:rules` falha com `firebase-tools no longer supports Java version before 21`. O arquivo de teste em si foi validado sem emulador (`npx vitest run --config vitest.rules.config.ts` reconhece as 32 asserções, sem erro de sintaxe/import/tipo) — só não roda de fato sem o JDK certo.

## 5. Verificação manual (enquanto o ambiente não tem Java 21+)

Até alguém rodar `npm run test:rules` com sucesso pelo menos uma vez, qualquer mudança em `firestore.rules` continua exigindo teste manual no Firebase Emulator Suite (ou revisão cuidadosa) antes de deploy — não assumir que a suíte escrita já é uma rede de segurança rodando de verdade.

## 6. Meta de adoção (realista, não aspiracional)

Não existe meta de cobertura percentual. A meta é: nenhuma mudança nova em `firestore.rules` ou nas funções de migração de ghost entra sem teste cobrindo o caso que motivou a mudança — cobertura cresce por necessidade, não por campanha. Próximo passo real (prioridade 2): `useTripBalances`, que não depende do emulador — pode ser feito mesmo sem o JDK.
