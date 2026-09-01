# ERROR_HANDLING.md — Padrão real de tratamento de erro

> Descreve o que existe hoje. Não há error boundary nem interceptor global — cada camada trata o erro localmente.

## 1. Frontend — chamadas de service (formulários/diálogos)

Padrão consistente em `CreateTripDialog`, `EditTripDialog`, `AddExpenseDialog`, `JoinTrip` e outros: `try/catch` local ao redor da chamada de service, `console.error` com o erro cru pra diagnóstico, e `ToastContext.showError(mensagem em PT-BR amigável)` pro usuário. Nunca expor a mensagem de erro do Firebase direto na UI.

```ts
try {
    await createExpense(payload);
} catch (error) {
    console.error("Erro ao criar despesa:", error);
    showError("Não foi possível salvar a despesa. Tente novamente.");
}
```

## 2. Frontend — erro de listener (`onSnapshot`)

**Débito conhecido**: inconsistente entre hooks. `useTrip.ts` passa um callback de erro ao `onSnapshot` que faz `console.error` **e** seta um estado local de erro surfaced na UI (mensagem tipo "Acesso negado à viagem."). `useActivities.ts` e a assinatura por-perfil em `useUserProfiles.ts` só fazem `console.error`, sem estado de erro visível — se a leitura falhar (ex.: regra negou acesso), a UI fica silenciosamente sem dado, sem avisar o usuário. Ao criar um hook de leitura novo, seguir o padrão de `useTrip.ts` (surfaced error), não o silencioso.

## 3. Não existe error boundary de React

Nenhum `ErrorBoundary`/equivalente a um "GlobalErrorInterceptor" (como o do CashZ) — um erro de render não capturado quebra a árvore de componentes inteira sem fallback. Não é um problema resolvido hoje; ver [ROADMAP.md](./ROADMAP.md) se isso virar prioridade.

## 4. Backend (o único que existe: o endpoint de SSO no CashZ)

O planning-trip não tem rota serverless própria — o único backend que participa do fluxo deste app é `CashZ/api/auth/trip-token.ts`, documentado no repo do CashZ. Tratamento de erro desse endpoint segue a convenção do CashZ (`docs/ERROR_HANDLING.md` de lá), não deste documento.

## 5. `useExchange` — fallback silencioso, não é erro pro usuário

Se a busca de câmbio ao vivo (AwesomeAPI) falhar, `useExchange.ts` só faz `console.error` e mantém `FALLBACK_RATES` — decisão deliberada de não incomodar o usuário com um toast por uma falha de rede num serviço secundário; o app continua funcional com taxas aproximadas.

## 6. Regra permanente central

Todo erro que chega até o usuário passa por `ToastContext.showError` com mensagem em português, curta, sem stack trace/mensagem técnica — o `console.error` correspondente é sempre feito separadamente, pro diagnóstico, nunca em vez do toast.
