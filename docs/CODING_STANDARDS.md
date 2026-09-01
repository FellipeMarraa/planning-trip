# CODING_STANDARDS.md — Convenções extraídas do código real

> Extraídas do código já existente, não de um guia de estilo aspiracional. Onde o código atual é inconsistente, este documento nomeia a inconsistência como **Débito conhecido** em vez de fingir que não existe.

## 1. Estrutura de arquivos e nomenclatura

Nomenclatura é **mista por pasta**, não um padrão único:

| Pasta | Convenção | Exceção |
|---|---|---|
| `components/ui/` | kebab-case (`alert-dialog.tsx`) — geradas pelo shadcn CLI | nenhuma |
| `components/common/` | kebab-case (`money-input.tsx`, `stat-card.tsx`) | `LegalDialog.tsx` (PascalCase) |
| `components/trip/` | PascalCase (`AddExpenseDialog.tsx`) | `role-badge.tsx` (kebab-case) |
| `hooks/` | camelCase com prefixo `use` (`useTrip.ts`) | nenhuma |
| `services/`, `lib/` | camelCase (`trips.ts`, `legalContent.ts`) | nenhuma |
| `context/`, `pages/` | PascalCase (`AuthContext.tsx`, `Dashboard.tsx`) | nenhuma |

**Débito conhecido**: `components/common` e `components/trip` têm convenções opostas com uma exceção cada — não é motivo pra renomear arquivo existente fora de escopo, mas todo componente **novo** deve seguir a convenção da pasta em que entra (kebab-case em `common/`, PascalCase em `trip/`), não a exceção.

## 2. TypeScript

`interface` é a forma padrão pra formatos de objeto (`Trip`, `Expense`, todas as Props de componente); `type` só pra união/alias (`UserRole`, `ExpenseSortKey`, `SortDirection`). Manter esse split — não trocar `interface` por `type` num objeto só por preferência pessoal.

`any` é praticamente inexistente no código (uma única ocorrência em todo `src/`, `TripAnalytics.tsx:45`) — o projeto é tipado de forma estrita de fato, não só de nome. Não introduzir `any` novo sem justificativa forte; se o tipo é difícil de expressar, `unknown` + narrowing é preferível.

`eslint.config.js` é a config padrão do template Vite React-TS (`js.configs.recommended` + `tseslint.configs.recommended`), **sem** as variantes com type-aware linting (`strictTypeChecked`/`recommendedTypeChecked`) e sem regra customizada. Os dois `// eslint-disable-next-line react-hooks/exhaustive-deps` existentes (`useUserProfiles.ts`, `AuthContext.tsx`) são intencionais (efeito de montagem única / chave de dependência customizada), não descuido — não removê-los sem entender o motivo primeiro.

## 3. Import `@/`

Alias `@/` → `src/` configurado em `tsconfig.app.json` e `vite.config.ts`, usado na maioria dos arquivos. **Débito conhecido**: alguns hooks (`useTrip.ts`, `useUserTrips.ts`) e `AuthContext.tsx` usam import relativo (`../config/firebase`) pro mesmo módulo que outros arquivos importam via `@/config/firebase`. Código novo usa `@/` sempre — não replicar o relativo.

## 4. Comentários

Comentários existentes são **em português** e explicam o *porquê*, não o *o quê* — por exemplo, o motivo do popup em vez de redirect no Google Auth (`AuthContext.tsx`), o motivo do chunk de 499 em vez de 500 no `writeBatch` (`services/trips.ts`), o motivo de não haver `getDoc` antes do `joinTripByInvite`. Seguir esse padrão: comentário só quando existe uma decisão não-óbvia por trás, nunca pra descrever o que a próxima linha já deixa claro.

## 5. Padrão de hook/service (ver [ARCHITECTURE.md](./ARCHITECTURE.md) seção 2)

Hook novo que só lê: `onSnapshot` direto, com `limit(...)` e cleanup no `useEffect` — não passar por uma função de service.
Service novo que só escreve: função exportada em `services/<domínio>.ts`, chamada direto do componente — não passar por um hook.

## 6. Formulários e diálogos

Diálogos de criar/editar (`CreateTripDialog`, `AddExpenseDialog`, `EditTripDialog`...) seguem o mesmo formato: estado local controlado, chamada direta ao service dentro de um `try/catch`, erro reportado via `ToastContext.showError` — ver [ERROR_HANDLING.md](./ERROR_HANDLING.md).

## 7. Lint

`npm run lint` roda o `eslint.config.js` descrito na seção 2. Não há `npm run typecheck` separado — `npm run build` já roda `tsc -b` antes do `vite build`, então um erro de tipo quebra o build.

## 8. Convenção de branch/commit

Ver [GIT.md](./GIT.md) — mesmo padrão adotado no CashZ (Conventional Commits, `main` sempre deployável).
