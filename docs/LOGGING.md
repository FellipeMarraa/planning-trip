# LOGGING.md — Estado real (bem mais simples que o CashZ, de propósito)

> O planning-trip não tem infraestrutura de log remoto hoje. Isso é proporcional ao tamanho e ao estágio do projeto — não é um débito a corrigir só porque o CashZ tem mais.

## 1. Desenvolvimento

Só `console.error`/`console.warn` — 22 ocorrências em 12 arquivos, mais concentradas em `TripDetails.tsx` (8). Sem `console.log` de debug esquecido no código.

## 2. Produção

Não existe coleção tipo `client_logs`/`admin_logs` (como no CashZ), nem serviço externo de log (Sentry ou equivalente) — um erro em produção só aparece no console do navegador do próprio usuário, invisível pra quem mantém o app. Ver [ERROR_HANDLING.md](./ERROR_HANDLING.md) pra como o erro é comunicado ao usuário (toast), que é uma preocupação diferente de logging.

## 3. Backend

Não aplicável — o planning-trip não tem rota serverless própria (ver [ERROR_HANDLING.md](./ERROR_HANDLING.md) seção 4).

## 4. Débitos conhecidos

1. Sem visibilidade de erro em produção fora do console do próprio usuário — se um bug afetar vários usuários, não há como descobrir sem eles reportarem manualmente.
2. Sem correlação entre "erro no client" e "usuário/viagem afetada" — nem seria possível hoje sem uma coleção de log central.

Nenhum dos dois é urgente pro tamanho atual do projeto — mencionados aqui pra não serem esquecidos se o app crescer.

## 5. Regra permanente central

Log de erro fica no `console.error` acompanhado de contexto suficiente pra reproduzir (o quê, com qual input) — nunca um `console.error(error)` sozinho sem uma frase dizendo o que estava acontecendo.
