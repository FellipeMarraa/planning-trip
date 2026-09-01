# GIT.md — Branches, commits, PRs

> O histórico deste repositório até agora não segue um padrão fixo de commit. A partir deste documento, o padrão abaixo é o que passa a valer daqui em diante — igual à decisão já tomada no CashZ, por consistência entre os dois repos. Não reescrever histórico existente.

## 1. Branches

Branch remota existente: `main` (produção — sempre deployável, todo push nela dispara build no Vercel).

**Padrão a seguir a partir de agora**, adequado ao tamanho do time (solo):
- `main`: sempre deployável, reflete produção.
- Feature branch pontual, quando a mudança for grande o suficiente pra isolar (ex.: uma feature que toca `firestore.rules` e várias telas ao mesmo tempo): `feature/nome-curto`, `fix/nome-curto`, nascendo de `main`, voltando via merge/PR.
- Não introduzir um modelo de branching mais pesado (`develop`+`release`+`hotfix`) sem o time crescer o suficiente pra justificar.

## 2. Commits

Conventional Commits, resumido:
```
tipo(escopo opcional): descrição curta no imperativo

Corpo opcional explicando o "porquê", não o "o quê".
```
Tipos: `feat`, `fix`, `refactor`, `perf`, `docs`, `chore`, `security`.

## 3. Pull Requests

Sem processo formal de PR obrigatório hoje (time solo, push direto em `main` é aceitável para mudança pequena). Pra mudança que toca `firestore.rules` ou o fluxo de SSO com o CashZ, preferir revisar o diff antes de fazer push, mesmo sem um PR formal — ver os checklists de [SECURITY.md](./SECURITY.md) e [DEPLOY.md](./DEPLOY.md).

## 4. Code Review

Quando existir mais de uma pessoa no time, qualquer mudança em `firestore.rules` ou nas funções de migração de ghost (`services/trips.ts`) exige revisão de outra pessoa antes do merge — são os dois pontos de maior risco do código (ver [ARCHITECTURE.md](./ARCHITECTURE.md) seção 5, [SECURITY.md](./SECURITY.md)).

## 5. Ao criar/alterar arquivos — sempre informar

Ao final de qualquer entrega, listar os arquivos criados/modificados e sugerir o `git add` explícito — nunca `git add -A`/`git add .` sem revisar o que está sendo incluído (evita commitar `dist/`, `.env` local ou arquivo de IDE por acidente).

## 6. O que nunca commitar

`node_modules/`, `dist/` (já no `.gitignore`), qualquer credencial de Admin SDK (o planning-trip não guarda nenhuma no próprio repo — as credenciais que autenticam nele ficam no Vercel do CashZ, ver [SECURITY.md](./SECURITY.md) seção 4), arquivo de IDE (`*.iml`, `.idea/`) só se não fizer parte do padrão já commitado do repo.

## 7. Commits que tocam múltiplos domínios

Uma mudança que toca frontend deste repo **e** o endpoint SSO no CashZ é, na prática, dois commits em dois repositórios — não tentar forçar num só. Mencionar no corpo do commit de cada lado que a mudança é parte de um par (ex.: "parte 2/2, ver commit X no CashZ").
