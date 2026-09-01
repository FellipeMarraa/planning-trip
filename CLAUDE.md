# CLAUDE.md — Ponto Central da Documentação do planning-trip

> Este arquivo é o índice e o contrato permanente para qualquer trabalho de desenvolvimento neste repositório, feito por Claude Code ou por qualquer pessoa. Leia isto antes de tocar em qualquer código.

## 1. O que é o planning-trip

App web de organização e divisão de despesas de viagem em grupo (React + TypeScript + Vite + Firebase + Vercel), interligado ao [CashZ](../CashZ/CLAUDE.md) via SSO (login automático de quem já está logado no CashZ). Descrição completa de produto em [docs/PROJECT.md](./docs/PROJECT.md). **Não assuma escopo além do que está lá documentado** — se uma tarefa pedir algo fora do escopo descrito (ex.: backend próprio, múltiplas moedas de referência de verdade), isso é uma mudança de escopo de produto que precisa ser confirmada antes de implementar, não assumida.

## 2. Como usar esta documentação

Os documentos em `docs/` se referenciam entre si porque a arquitetura real é interligada. Antes de qualquer alteração:

1. **Entenda o pedido** em relação ao produto ([docs/PROJECT.md](./docs/PROJECT.md)) e à arquitetura real ([docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)) — não implemente um padrão novo se um equivalente já existe e está documentado (em especial o padrão de "ghost member", o mais complexo do app).
2. **Se a mudança toca dado**, consulte [docs/DATABASE.md](./docs/DATABASE.md) (modelo real) e [docs/FIREBASE.md](./docs/FIREBASE.md) (restrição de custo do plano Spark) antes de escrever uma query.
3. **Se a mudança toca segurança, permissão de viagem ou o fluxo de SSO com o CashZ**, [docs/SECURITY.md](./docs/SECURITY.md) é obrigatório — documenta os princípios permanentes e o trust boundary que o SSO introduz.
4. **Se a mudança é de UI**, consulte [docs/UI_UX.md](./docs/UI_UX.md) e [docs/CODING_STANDARDS.md](./docs/CODING_STANDARDS.md) para reutilizar componente/padrão existente em vez de criar um novo.
5. **Antes de finalizar**, confira [docs/ERROR_HANDLING.md](./docs/ERROR_HANDLING.md), [docs/LOGGING.md](./docs/LOGGING.md), [docs/TESTS.md](./docs/TESTS.md) e [docs/PERFORMANCE.md](./docs/PERFORMANCE.md) conforme a natureza da mudança.
6. **Ao commitar/entregar**, siga [docs/GIT.md](./docs/GIT.md) — listar arquivos criados/modificados e sugerir o `git add` explícito.
7. **Ao fazer deploy ou mudar regra do Firestore**, [docs/DEPLOY.md](./docs/DEPLOY.md) tem os passos manuais que não são automáticos — inclui a dependência cruzada com o endpoint SSO no CashZ.
8. **Para saber o que já está planejado e o que está fora de escopo**, [docs/ROADMAP.md](./docs/ROADMAP.md).

## 3. Índice completo

| Documento | Conteúdo |
|---|---|
| [docs/PROJECT.md](./docs/PROJECT.md) | Objetivo, funcionalidades reais, tecnologias, escopo |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Camadas (leitura via hook, escrita via service), padrão de ghost member, integração SSO |
| [docs/DATABASE.md](./docs/DATABASE.md) | Coleções Firestore, models, relacionamentos |
| [docs/FIREBASE.md](./docs/FIREBASE.md) | Regras do plano Spark: sem polling, sempre desmontar listener, `limit` como teto |
| [docs/SECURITY.md](./docs/SECURITY.md) | Princípios permanentes, regras do Firestore, trust boundary do SSO com o CashZ |
| [docs/CODING_STANDARDS.md](./docs/CODING_STANDARDS.md) | Nomenclatura real (mista por pasta), TS, imports, lint |
| [docs/UI_UX.md](./docs/UI_UX.md) | Stack Tailwind v4/shadcn, responsividade real (mobile-first) |
| [docs/PERFORMANCE.md](./docs/PERFORMANCE.md) | Lazy loading (feito), memoização, limites de query, o que falta |
| [docs/ERROR_HANDLING.md](./docs/ERROR_HANDLING.md) | Padrão de erro no frontend (try/catch + toast), inconsistência conhecida |
| [docs/LOGGING.md](./docs/LOGGING.md) | Estado real (só console), débitos conhecidos |
| [docs/TESTS.md](./docs/TESTS.md) | `firestore.rules` testado (emulador); prioridade de adoção do resto |
| [docs/DEPLOY.md](./docs/DEPLOY.md) | Vercel + Firebase, passos manuais, dependência do CashZ |
| [docs/ROADMAP.md](./docs/ROADMAP.md) | Curto/médio/longo prazo, por prioridade de risco |
| [docs/GIT.md](./docs/GIT.md) | Branches, commits, PR, checklist de revisão |

## 4. Responsabilidades permanentes de quem trabalha neste repositório (inclui Claude Code)

1. **Nunca criar documentação ou código genérico** — toda decisão se baseia no que o código real deste projeto já faz, documentado nos arquivos acima. Se uma pergunta não tem resposta clara nos docs, ler o código correspondente antes de assumir.
2. **Nunca assumir tecnologia que não existe no projeto** — antes de mencionar uma lib/serviço, confirmar no `package.json`/código que ela é realmente usada.
3. **Sempre reaproveitar padrão existente** — hooks de leitura, services de escrita, helpers de ghost member, componentes de `common/`/`ui/`. Ver [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) e [docs/CODING_STANDARDS.md](./docs/CODING_STANDARDS.md) antes de inventar um novo.
4. **Sempre respeitar o plano Spark do Firebase** — nenhuma mudança deve introduzir polling, listener sem cleanup, contagem de documento via query, ou dependência de Cloud Functions (que exigem Blaze). Ver [docs/FIREBASE.md](./docs/FIREBASE.md).
5. **Sempre priorizar segurança** — nenhuma mudança deve confiar em dado vindo do client sem checagem equivalente em `firestore.rules`. Ver [docs/SECURITY.md](./docs/SECURITY.md), especialmente o trust boundary do SSO com o CashZ.
6. **Toda mudança de UI mantém responsividade mobile-first** — ver [docs/UI_UX.md](./docs/UI_UX.md).
7. **Nunca alterar identidade visual, escopo de produto ou modelo de dado central sem que isso esteja claramente autorizado pelo pedido do usuário** — quando em dúvida, perguntar antes de assumir.
8. **Mudança que toca o fluxo de SSO é revisada nos dois repos** (este e o CashZ) — nunca só de um lado. Ver [docs/DEPLOY.md](./docs/DEPLOY.md) seção 5.
9. **Ao final de qualquer entrega**, seguir [docs/GIT.md](./docs/GIT.md) seção 5: listar arquivos criados/modificados e comandos `git add` sugeridos.

## 5. Quando este conjunto de documentos e o código real divergirem

O código é a fonte de verdade sobre **o que existe**; este conjunto de documentos é a fonte de verdade sobre **como as coisas devem continuar sendo feitas**. Se uma mudança de código tornar um destes documentos desatualizado, **atualizar o documento no mesmo commit** — documentação que fica pra trás vira uma fonte de erro pior do que não ter documentação nenhuma.
