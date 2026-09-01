# ERROR_HANDLING.md — Padrão real de tratamento de erro

> Descreve o que existe hoje. Há um error boundary (ver seção 3) protegendo a árvore inteira contra erro de render não capturado; fora isso, cada camada trata o erro localmente.

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

## 3. Error boundary de React

`src/components/common/error-boundary.tsx` (`ErrorBoundary`, class component) envolve `<Suspense>`/`<Routes>` em `App.tsx` — acima do Suspense, porque é ali que uma falha de `React.lazy()` (import dinâmico) é lançada no render. Trata dois casos:

1. **Falha de chunk lazy-loaded pós-deploy** (`Failed to fetch dynamically imported module` e variantes): cada deploy troca o hash dos arquivos JS; uma aba aberta de antes do deploy busca um chunk que não existe mais. Detecta pela mensagem do erro e recarrega a página automaticamente **uma vez** (`sessionStorage` guarda a flag `plt_chunk_reload_attempted`, limpa no boot seguinte bem-sucedido, em `App.tsx`, pra não mascarar um erro real como loop de reload). Sem isso, o usuário via tela branca e só resolvia fechando e reabrindo o site — era a causa real de um bug relatado ao abrir `/profile`.
2. **Qualquer outro erro não capturado**: fallback visual (ícone + mensagem + botão "Recarregar"), sem reload automático — não mascarar um bug de verdade.

## 4. Backend (o único que existe: o endpoint de SSO no CashZ)

O planning-trip não tem rota serverless própria — o único backend que participa do fluxo deste app é `CashZ/api/auth/trip-token.ts`, documentado no repo do CashZ. Tratamento de erro desse endpoint segue a convenção do CashZ (`docs/ERROR_HANDLING.md` de lá), não deste documento.

## 5. `useExchange` — fallback silencioso, não é erro pro usuário

Se a busca de câmbio ao vivo (AwesomeAPI) falhar, `useExchange.ts` só faz `console.error` e mantém `FALLBACK_RATES` — decisão deliberada de não incomodar o usuário com um toast por uma falha de rede num serviço secundário; o app continua funcional com taxas aproximadas.

## 6. Regra permanente central

Todo erro que chega até o usuário passa por `ToastContext.showError` com mensagem em português, curta, sem stack trace/mensagem técnica — o `console.error` correspondente é sempre feito separadamente, pro diagnóstico, nunca em vez do toast.
