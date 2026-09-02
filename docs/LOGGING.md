# LOGGING.md — Estado real (bem mais simples que o CashZ, de propósito)

> O planning-trip tem log remoto de erro (seção 2), mas continua sem serviço externo (Sentry ou equivalente) nem log estruturado — proporcional ao tamanho do projeto, não um débito a corrigir só porque o CashZ tem mais.

## 1. Desenvolvimento

`console.error`/`console.warn` continuam o padrão local. `reportClientError` (`src/lib/reportClientError.ts`) é no-op em dev (`import.meta.env.DEV`), só reporta em produção.

## 2. Produção

Existe `client_logs` (Firestore) — diferente do CashZ (que passa por `/api/log-error`, um endpoint serverless), o planning-trip **não tem backend próprio** (ver [ROADMAP.md](./ROADMAP.md) seção 4), então `reportClientError` escreve direto no Firestore via client SDK; `firestore.rules` só permite `create` autoatribuído (nunca em nome de outro uid) e `read`/`delete` só pro admin global (ver [SECURITY.md](./SECURITY.md) seção 2-3). Dois pontos de captura:
- **`ErrorBoundary`** (`src/components/common/error-boundary.tsx`) — erro de render, via `componentDidCatch`. Pula o report especificamente pra falha de chunk lazy-loaded pós-deploy (ver [ERROR_HANDLING.md](./ERROR_HANDLING.md) seção 3) — é autocorrigido (reload automático), reportar isso a cada deploy seria ruído, não sinal.
- **`GlobalErrorInterceptor`** (`src/components/common/global-error-interceptor.tsx`) — erro assíncrono (`window.onerror`/`onunhandledrejection`), que não passa pelo `ErrorBoundary`.

Visível em `/admin` → aba "Erros" (`src/pages/Admin.tsx`), últimos 30 (`limit(30)`, `orderBy('createdAt','desc')`), com botão de limpar.

## 3. Backend

Não aplicável — o planning-trip não tem rota serverless própria (ver [ERROR_HANDLING.md](./ERROR_HANDLING.md) seção 4). É exatamente por isso que o logging remoto grava direto do client em vez de passar por uma API, diferente do CashZ.

## 4. Débitos conhecidos

1. ~~Sem visibilidade de erro em produção fora do console do próprio usuário~~ — **resolvido** (seção 2), motivado pelo app deixar de ser uso pessoal só do dono.
2. Sem correlação entre "erro no client" e "viagem afetada" — `client_logs` guarda `userId`/`url`, não `tripId`. Se um bug específico de uma viagem precisar de investigação, cruzar manualmente pela URL.
3. Sem serviço externo (Sentry) nem alerta proativo — alguém ainda precisa abrir `/admin` pra notar um erro novo, não é notificado.

Nenhum dos três bloqueia o uso atual — mencionados aqui pra não serem esquecidos se o volume de erros crescer a ponto de precisar de alerta ativo.

## 5. Regra permanente central

Log de erro fica no `console.error` acompanhado de contexto suficiente pra reproduzir (o quê, com qual input) — nunca um `console.error(error)` sozinho sem uma frase dizendo o que estava acontecendo.
