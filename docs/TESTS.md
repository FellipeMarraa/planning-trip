# TESTS.md — Zero testes hoje, prioridade de adoção

> Vitest não está instalado, não há `test` script no `package.json`, não há um único arquivo `*.test.*` no repositório. Isso é o estado real — as prioridades abaixo são recomendação, não algo já em curso.

## 1. Por que isso importa mais do que pareceria num projeto pequeno

A lógica mais arriscada do app (migração de "ghost member", cálculo de saldo entre participantes) mexe com dinheiro dividido entre pessoas reais — um bug silencioso ali gera dívida calculada errada, não só um glitch visual. Isso pesa mais que o tamanho do projeto sugeriria.

## 2. Framework (recomendado, não instalado)

Seguir a mesma escolha do CashZ por consistência entre os dois repos: **Vitest**, sem Cypress/Playwright. Adicionar como dependência de desenvolvimento só quando o primeiro teste for escrito, não antes (não instalar infraestrutura sem teste nenhum pra rodar nela).

## 3. Prioridade de cobertura (por risco de negócio, não por facilidade de escrever)

| Prioridade | Alvo | Por quê |
|---|---|---|
| 1 | `firestore.rules` (via emulator, `@firebase/rules-unit-testing`) | É a única barreira real de segurança/isolamento entre viagens — ver [SECURITY.md](./SECURITY.md) |
| 2 | `useTripBalances` (cálculo de saldo) | Função pura, fácil de testar, e um erro aqui mostra dívida errada pra usuário real |
| 3 | `linkGhostToUser`/`leaveTripAsGhost` (`services/trips.ts`) | Lógica de migração mais complexa do app, com o débito conhecido de assimetria (ver [ARCHITECTURE.md](./ARCHITECTURE.md) seção 5) — teste aqui teria pego isso |
| 4 | `joinTripByInvite` | Ponto de entrada de dado externo (convite) direto numa escrita sem leitura prévia |

## 4. Testes de `firestore.rules`

Recomendação: mesmo padrão do CashZ — `vitest.rules.config.ts` separado, rodado via `firebase emulators:exec --only firestore --project planning-trip-6a9cb "vitest run --config vitest.rules.config.ts"`, exercitando os 3 branches de `update` em `trips` (edição normal, auto-join, sair-como-ghost) e as regras de `expenses`/`settlements`/`invites`. Exige Java 21+ local pro emulator, como no CashZ.

## 5. Verificação manual (enquanto não há suíte automatizada)

Até a prioridade 1 existir, qualquer mudança em `firestore.rules` deve ser testada manualmente no Firebase Emulator Suite antes de deploy — nunca só confiar em teste manual pela UI de produção pra regra de segurança.

## 6. Meta de adoção (realista, não aspiracional)

Não existe meta de cobertura percentual. A meta é: nenhuma mudança nova em `firestore.rules` ou nas funções de migração de ghost entra sem teste cobrindo o caso que motivou a mudança — cobertura cresce por necessidade, não por campanha.
