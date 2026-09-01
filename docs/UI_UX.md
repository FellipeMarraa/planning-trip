# UI_UX.md — Stack visual e responsividade

> Todo componente novo precisa funcionar em mobile e desktop — a base do app hoje é mobile-first (ver seção 3), então "funcionar em desktop" é o que exige atenção extra, não o contrário.

## 1. Stack de UI (real)

Tailwind v4 **CSS-first** — não existe `tailwind.config.js`/`.ts` no repositório. Tudo vive em `src/index.css`: `@import "tailwindcss"`, um bloco `@theme inline { ... }` mapeando tokens, variáveis `:root`/`.dark` em **OKLCH**, `--radius` derivado de um único `--radius: 1rem` via `calc()`. Dark mode é **por classe** (`@custom-variant dark (&:is(.dark *))`), não `prefers-color-scheme`.

Componentes: shadcn configurado como `radix-nova` (`components.json`: `baseColor: "neutral"`, `cssVariables: true`, `prefix: ""`, `iconLibrary: "lucide"`), sobre `radix-ui`. Fonte: `@fontsource-variable/geist` self-hosted (`--font-sans: 'Geist Variable'`), não Google Fonts via link.

Utilitários custom: `.scrollbar-none` e `.mask-fade-y` (fade gradient em listas com scroll) — usar esses em vez de reinventar.

## 2. Cores e tema

Tokens vêm do `@theme inline` + variáveis CSS em `:root`/`.dark`, valores em OKLCH. Nunca hardcodar uma cor hex direto num componente — usar o token Tailwind (`bg-background`, `text-muted-foreground`, etc.), do mesmo jeito que o resto do app já faz.

## 3. Responsividade — breakpoints reais em uso

Contagem real de uso no código (`grep` em `src/`): `sm:` em 22 lugares/12 arquivos, `md:` em 11/8, `lg:` em só 4/4. **O app é mobile-first com ajuste leve pra tablet (`sm:`) — `lg:`/desktop específico é raro**, concentrado em `Layout.tsx`, `Dashboard.tsx`, `TripAnalytics.tsx`, `button.tsx`. Componente novo: desenhar pra mobile primeiro, usar `sm:`/`md:` pra ajustar, só usar `lg:` se o mobile-first genuinamente quebrar em tela grande.

## 4. Sidebar e navegação

Não há sidebar — `Layout.tsx` é um único header fixo no topo com logo/link pra `/`, ícone de admin condicional (`isGlobalAdmin`), avatar/nome/e-mail do usuário e botão de logout. A página de itinerário (`/trip/:tripId/itinerary`) não usa `Layout` — tem visual próprio, imersivo, dark mode fixo.

## 5. Reutilização de componentes — nunca duplicar

Antes de criar um componente novo, checar `components/common/*` (primitivas: `empty-state`, `money-input`, `section-header`, `stat-card`) e `components/trip/*` (feature: diálogos, tabelas, modais já existentes) — o padrão de "estado vazio" (`empty-state.tsx`) e o de input monetário (`money-input.tsx`) já resolvidos ali devem ser reaproveitados, não reescritos dentro de uma feature nova.

## 6. Componentes shadcn/radix disponíveis

`components/ui/`: `alert-dialog`, `badge`, `button`, `card`, `dialog`, `dropdown-menu`, `input`, `label`, `select`, `textarea`. Conjunto bem menor que o do CashZ (43 componentes) — se uma feature nova precisar de um primitivo que não está nessa lista (ex.: `tabs`, `tooltip`, `popover`), adicionar via `npx shadcn@latest add <componente>` em vez de recriar à mão.

## 7. Loading e estado vazio

Loading de rota: spinner simples (`div` com borda animada) em `PageLoader` (`App.tsx`), mostrado durante o `Suspense` de lazy loading e enquanto `AuthContext.loading` é `true`. Estado vazio: componente `EmptyState` (`components/common/empty-state.tsx`) — usar em qualquer lista que pode vir vazia, não inventar um texto solto.

## 8. Acessibilidade

Nenhuma auditoria formal de acessibilidade foi feita — os componentes `ui/*` herdam a acessibilidade padrão do Radix (foco, ARIA, teclado), que é a garantia mínima existente hoje. Não é um item coberto por teste automatizado (ver [TESTS.md](./TESTS.md)).

## 9. Nunca quebrar identidade visual

Fonte (`Geist Variable`), paleta OKLCH e o estilo `radix-nova` do shadcn são a identidade visual atual — não trocar sem decisão explícita do usuário, mesmo que pareça uma melhoria.
