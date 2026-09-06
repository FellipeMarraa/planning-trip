# ARCHITECTURE.md — Camadas e fluxo de dados reais

> Descreve a arquitetura **como ela é hoje**, verificada lendo `src/hooks/*`, `src/services/*` e `src/context/*` — não um alvo aspiracional. Onde há uma lacuna conhecida, está marcada como **Débito conhecido**.

## 1. Estrutura de pastas (real)

```
src/
├── components/
│   ├── trip/      → componentes de feature (diálogos, tabelas, gráficos de uma viagem)
│   ├── common/     → primitivas compartilhadas (empty-state, money-input, stat-card...)
│   ├── layout/     → Layout.tsx (shell/header autenticado)
│   └── ui/         → primitivas shadcn/radix, nunca editadas à mão por lógica de negócio
├── config/firebase.ts → init do Firebase client (auth, db, googleProvider)
├── context/        → AuthContext, ToastContext
├── hooks/          → camada de leitura (ver seção 2) + hooks de cálculo puro
├── lib/            → funções puras sem I/O (categorias, moedas, datas, ghost helpers...)
├── pages/          → uma por rota
├── services/       → camada de escrita (ver seção 2)
└── types/index.ts  → único arquivo de tipos de domínio
```

## 2. Duas camadas diferentes, sem indireção comum — leitura ≠ escrita

**Débito conhecido / padrão real a seguir, não uma falha a corrigir sem necessidade**: leitura e escrita não passam pela mesma camada.

- **Leitura**: Componente → hook (`useTrip`, `useActivities`, `useSettlements`, `useUserProfiles`, `useUserTrips`) → `onSnapshot` **direto** no Firestore, dentro do próprio hook. Não existe `getTrip()`/`getExpenses()` na camada de serviço — a leitura reativa vive inteira no hook.
- **Escrita**: Componente/diálogo → `src/services/*.ts` (`createTrip`, `createExpense`, `deleteActivity`...) → Firestore. Hooks **nunca** chamam services; services **nunca** assinam (`onSnapshot`).

```
LEITURA:  Componente ──▶ hook (onSnapshot) ──▶ Firestore
ESCRITA:  Componente ──▶ service (services/*.ts) ──▶ Firestore
```

Ao adicionar um novo domínio, siga esse mesmo split: hook pra ler em tempo real, service pra escrever. Não invente uma terceira camada (repository, use-case) pra um projeto deste tamanho.

## 3. Hooks de cálculo puro (sem Firestore)

- `useTripBalances` — recebe `expenses`/`settlements` já carregados e calcula saldo por membro num `useMemo`. Não faz I/O.
- `useTripRole` — deriva o papel do usuário logado a partir de um `Trip` + `useAuth()`. Não faz I/O.
- `useExchange` — não usa Firestore: busca câmbio ao vivo na AwesomeAPI (`economia.awesomeapi.com.br`), com uma tabela `FALLBACK_RATES` hardcoded se a chamada falhar (`src/hooks/useExchange.ts`).

## 4. Contexts globais (`src/context/`)

- **`AuthContext`**: login por Google (`signInWithPopup`, nunca `signInWithRedirect` — comentário no código explica que o redirect quebra em Safari 16.1+/Chrome 115+/Firefox 109+ porque `authDomain` (`*.firebaseapp.com`) é domínio diferente do app (`*.vercel.app`), e esses browsers bloqueiam storage entre domínios durante o redirect) **e** por e-mail/senha (`register`/`loginWithEmail`, mesmo padrão do CashZ). `register` sempre checa `fetchSignInMethodsForEmail` antes de criar conta, e trata `auth/email-already-in-use` no catch como segunda camada — sem isso, alguém registrando por e-mail/senha um endereço que já tem conta Google criaria uma segunda conta divergente (aconteceu de verdade entre CashZ e planning-trip antes desse fix, ver [SECURITY.md](./SECURITY.md) seção 3). `isGlobalAdmin` é um allowlist de e-mail hardcoded (`GLOBAL_ADMIN_EMAILS`), não um custom claim do Firebase.
- **`ToastContext`**: toast feito à mão (sem lib externa), `showError`/`showSuccess`, auto-dismiss em 5s.

## 5. Padrão de "ghost member" — a regra de domínio mais complexa do app

Um participante sem conta (ex.: cônjuge/filho que não vai logar) é representado por um uid sintético `ghost_<uuid>`, guardado em `trips.ghosts[ghostUid] = {name}` e incluído em `trips.participants`/`trips.roles`. Helpers em `src/lib/members.ts`:

```ts
export function isGhostUid(uid: string) {
    return uid.startsWith('ghost_');
}
```

Três operações tocam esse padrão, todas em `src/services/trips.ts`:

1. **`addGhostMember`** — cria um ghost direto.
2. **`linkGhostToUser`** — liga um ghost a um usuário real depois que ele entra no app; migra **despesas e acertos** que referenciam o ghost (`paidBy`/`participants` em `expenses`, `from`/`to` em `settlements`) pro uid real, em lotes de 499 (limite de 500 por `writeBatch`).
3. **`leaveTripAsGhost`** — o inverso: quando um usuário real sai da viagem, seu uid é trocado por um novo ghost em **despesas e acertos**, preservando o histórico financeiro pros demais.

Mesma classe de operação nas duas direções (trocar um uid por outro em todo lugar que aparece, despesas e acertos), cobertura simétrica desde que `linkGhostToUser` passou a migrar `settlements` também (ver [ROADMAP.md](./ROADMAP.md)).

Nenhuma dessas migrações é atômica (comentário explícito em `linkGhostToUser`: `getDocs` + `writeBatch` não é atômico contra escrita concorrente) — aceito conscientemente porque uma correção 100% atômica exigiria Cloud Function/transação server-side, fora do plano Spark gratuito (ver [FIREBASE.md](./FIREBASE.md)).

## 6. Integração SSO com o CashZ

`src/pages/Sso.tsx`, rota `/sso` (fora de `ProtectedRoute`/`PublicRoute` — é transitória). Recebe um Firebase custom token no hash da URL (`#token=...`), chama `signInWithCustomToken`, limpa o hash do histórico e redireciona pra `/`. O token é gerado do outro lado, por `CashZ/api/auth/trip-token.ts` — ver [SECURITY.md](./SECURITY.md) seção 4 pro trust boundary que isso introduz.

## 7. Roteamento

`react-router-dom` v7, todas as páginas lazy-loaded (`React.lazy` + um único `Suspense` em `App.tsx`) pra não puxar Recharts/Framer Motion antes da hora. `ProtectedRoute` embrulha em `Layout`, exceto a rota de itinerário (`/trip/:tripId/itinerary`), que tem layout próprio imersivo.

`/wallet` (`WalletPage.tsx`) é a única rota **global** que não depende de `:tripId` na URL, mesmo mostrando dado por viagem — agrupa client-side usando `useUserTrips()`. Acessível pelo avatar do header, que virou um `DropdownMenu` (`Layout.tsx`, antes era um `Link` direto pra `/profile`) com "Perfil" e "Carteira".

## 8. Assistente de IA de viagem (`api/ai/`, `src/ai/`)

Primeira vez que o planning-trip tem backend próprio (antes disso, o único código server-side que tocava este projeto era o SSO no repo do CashZ — ver seção 6). Roda inteiramente dentro do próprio projeto Firebase (`planning-trip-6a9cb`), sem cruzar com o CashZ, diferente da integração de SSO/plano.

- **`api/ai/chat.ts`**: único endpoint. Verifica ID token → checa plano ativo de quem está chamando (réplica de `isCashzPremium()`, ver [SECURITY.md](./SECURITY.md) seção 6) → rate limit → circuit-breaker de custo global (`api/ai/_lib/usage.ts`) → monta contexto (viagem + roteiro já cadastrado + resumo financeiro — total/por categoria, a partir de `expenses` — só se o uid for participante) → gera resposta (só Groq, sem fallback — decisão do usuário; `api/ai/_lib/providers/`, modelo `groq/compound` — busca na web embutida quando o modelo decide que precisa, ver seção 6 de SECURITY.md) → grava em `ai_threads`/`ai_messages`.
- **Split de segurança**: a chamada real ao provider (com `GROQ_API_KEY`) só existe em `api/ai/_lib/providers/*` — nunca em `src/`. Mesmo motivo de um achado já corrigido no CashZ (chave de IA vazando no bundle do client).
- **Tools = eager context stuffing, não function-calling nativo**: o endpoint sempre busca a viagem + atividades atuais de uma vez (se houver `tripId`) e injeta no system prompt (`api/ai/_lib/prompt.ts`) — não há um loop de "modelo pede tool → server executa → modelo continua". Mesma simplificação deliberada usada no Consultor Financeiro do CashZ.
- **A IA nunca escreve nada sozinha.** Quando o usuário pede um roteiro, a resposta pode incluir um bloco JSON delimitado (`SUGGESTION_START`/`SUGGESTION_END`, `api/ai/_lib/prompt.ts`) que o client (`src/ai/components/SuggestedItineraryCard.tsx`) transforma em cards com botão "Adicionar" — cada clique chama `createActivity` (o mesmo service do formulário manual), nunca uma tool com permissão de escrita. Mesmo princípio permanente do CashZ ("nenhuma ferramenta de IA escreve dado"), aplicado aqui desde o início. Mesmos 3 tipos de bloco (roteiro/viagem/despesa) usam `extractBlock` (`api/ai/chat.ts`) — acha o JSON por **chaves/colchetes balanceados** depois do marcador de início, não por casar o marcador de fim caractere a caractere; achado real de produção (mesmo bug corrigido no CashZ) — o modelo às vezes emite o fechamento com um nº diferente de `>` do especificado no prompt, e a comparação exata antiga deixava o bloco cru vazar pro balão de chat. O prompt (`buildSystemPrompt`) também proíbe explicitamente confirmar por texto que uma ação foi concluída — só o clique no card conta, o modelo nunca sabe se aconteceu.
- **Renderização real vem de `onSnapshot`** em `ai_messages` (`src/ai/hooks/useAIChat.ts`), não da resposta do `fetch` — a resposta só devolve o `threadId`. Mesmo padrão do CashZ.
- **Sugestão de roteiro ganha coordenada real, geocodificada no servidor** (`enrichActivitiesWithCoordinates` em `api/ai/chat.ts`, usando `api/ai/_lib/geocoding.ts` — ver seção 8.1): o modelo nunca emite lat/lng no JSON (mesmo princípio "nunca invente número" das outras sanitizações), só um texto de local específico o bastante pra geocodificar sem ambiguidade; o servidor resolve isso chamando o Nominatim sequencialmente (rate limit ~1 req/s) depois que a sugestão já foi sanitizada. Itens além do 8º de uma mesma sugestão ficam sem coordenada (teto conservador, roteiro sugerido de uma vez costuma ser um punhado de paradas). Latência real do turno de chat aumenta proporcionalmente ao nº de itens sugeridos — aceito conscientemente em troca de toda sugestão sair com localização plotável.
- **Múltiplas conversas, mesma estrutura do widget de IA do CashZ**: `AiAssistantContext` guarda a thread ativa, compartilhada entre `ThreadList` (lista as conversas do usuário via `useAIThreads`, botão "Nova conversa" zera a thread ativa) e `ChatPanel` (`AiAssistantWidget.tsx`, navegação em pilha lista↔chat, sem Dialog/Popover do shadcn pra poder virar tela cheia no mobile). "Arquivar" uma conversa (`archiveThread`, `src/ai/repositories/aiThreadsRepository.ts`) só marca `archived:true` — histórico continua em `ai_messages`, só some da lista.
- **Sem `ai_config` administrável nem `ai_usage_logs`/`ai_user_limits` por usuário**: provider ativo/fallback e limites de custo são constantes hardcoded no código (`api/ai/_lib/providers/registry.ts`, `api/ai/_lib/usage.ts`) — `/admin` (ver [PROJECT.md](./PROJECT.md) seção 6) tem visão geral e erros reportados, mas não edita config de IA em runtime. Só existe um contador global simples (`ai_usage/global`).

## 8.1 Mapa do roteiro (`react-leaflet`, geocoding via Nominatim)

Única integração externa do projeto que **não** passa por `api/` — porque, ao contrário do provedor de IA (seção 8), não há chave/segredo pra proteger nem custo por token: tiles do OpenStreetMap e geocoding via [Nominatim](https://nominatim.openstreetmap.org) são serviços públicos e gratuitos, chamados direto do client (`src/lib/geocoding.ts`).

- **`Activity.coordinates`** (opcional, ver [DATABASE.md](./DATABASE.md) 2.4) é preenchido por `LocationPicker.tsx` (dentro de `AddActivityDialog.tsx`) de duas formas: busca de endereço (`searchAddress`, debounced 600ms — política de uso do Nominatim pede ~1 req/s) ou clique num `MapContainer` inline (`reverseGeocode` preenche o texto do local a partir do ponto clicado). Também pode ser **removida** (botão "Remover" no próprio picker, quando já há coordenada) — `services/activities.ts` trata isso diferente na criação e na edição: `createActivity` só omite a chave quando não há coordenada (doc novo não tem campo antigo pra apagar); `updateActivity` sempre reflete o estado atual do formulário, então ausência de coordenada vira `deleteField()` de verdade (omitir a chave num `updateDoc` deixaria o valor antigo intacto).
- **`DayRouteMap.tsx`** mostra só as atividades do dia ativo que têm `coordinates` (`getLocatedActivitiesSorted`, `src/lib/dayRoute.ts` — única fonte de verdade do filtro+ordenação, usada também pelo botão de rota abaixo), ordenadas por horário, com uma `Polyline` reta ligando os pontos — **não é rota de rua/GPS real** (exigiria um serviço pago de directions, fora do escopo desta entrega). Cada marcador é numerado (1, 2, 3... via `L.divIcon`, não o ícone padrão do Leaflet) na ordem do horário, com cor diferente pra primeira parada (verde), última (vermelho) e meio do caminho (cor primária do app) — sem isso, marcadores idênticos não davam pra saber qual parada vinha antes/depois só olhando a linha. Vale tanto pra atividade criada manualmente quanto pra sugestão da IA confirmada (ver seção 8 — a IA nunca marca coordenada sozinha, `api/ai/_lib/geocoding.ts` geocodifica o texto do local que ela sugere antes do usuário confirmar o card).
- **Navegação real = deep-link pro Google Maps, não rota própria** (`src/lib/mapLinks.ts`, botão em `DayRouteMapDialog.tsx`): decisão explícita do usuário — GPS/trânsito/replanejamento de verdade sempre exigiria um serviço pago de directions, quebrando o princípio de zero custo recorrente já validado nesta feature inteira (tiles OSM + Nominatim). `buildGoogleMapsRouteUrl` monta uma URL `google.com/maps/dir/?api=1` com todas as paradas localizadas do dia como waypoints (origem deixada em branco de propósito — Google Maps usa a localização atual do usuário automaticamente). Corta em 8 waypoints + 1 destino por precaução (a URL simples sem chave de API paga não documenta um teto oficial, mas na prática Google Maps começa a ignorar/truncar pontos acima disso).
- **`DayRouteMapDialog.tsx`** (`TripItineraryPage.tsx`) é a única forma de ver esse mapa — sob demanda, via botão no cabeçalho do dia (só aparece quando há pelo menos 1 atividade com `coordinates`), painel próprio em tela cheia no mobile (mesmo padrão de `AiAssistantWidget.tsx`, ver [UI_UX.md](./UI_UX.md) seção 4.1 — é onde o uso real se concentra). **Achado real corrigido**: o mapa já foi renderizado sempre visível, inline na página — um bug de medida do Leaflet (ver próximo bullet) fazia ele às vezes desenhar cobrindo a tela inteira, tornando o roteiro e as outras atividades inacessíveis. Passou a montar só quando aberto, dentro de um painel `fixed` + `z-50` que também isola o empilhamento (contexto de stacking próprio) dos `z-index` internos do Leaflet (até 1000 em painéis/controles) — eles não competem mais com o resto da página de jeito nenhum, sob demanda ou não.
- **Ícone padrão do Leaflet quebra com bundler** (Vite não resolve o caminho relativo que a lib usa por padrão) — corrigido uma única vez em `src/lib/leafletIcons.ts`, chamado em `main.tsx` antes de qualquer mapa renderizar.
- **Leaflet mede o container errado dentro de layout dinâmico** (flex, animação do `framer-motion`, `Dialog`/painel ainda abrindo): o cálculo de tamanho no mount pode sair errado e o mapa desenha tiles/controles fora dos limites do próprio container. `MapAutoResize.tsx` (componente compartilhado, filho de todo `MapContainer` do projeto) resolve com `ResizeObserver` — recalcula sempre que o container muda de tamanho de verdade, mais robusto que um `setTimeout` fixo (que quebra se a animação demorar mais que o timeout escolhido).

## 8.2 Carteira de câmbio (`/wallet`, `currency_lots`)

Planejamento pessoal de moeda estrangeira — "quanto já comprei" vs. "quanto as despesas marcadas carteira precisam" — **não** um caixa com consumo/reserva real. Decisões de produto que moldaram o desenho (ver [DATABASE.md](./DATABASE.md) 2.5 pro modelo de dado):

- **Nunca afeta a divisão de gastos**: `Expense.amountBRL` continua sempre vindo da cotação de mercado do momento — o custo real de aquisição da carteira é informação pessoal do dono, nunca muda quanto os outros participantes devem.
- **Por viagem e por participante**, não persiste entre viagens, e só se aplica a viagens com moeda de referência estrangeira (`Trip.baseCurrency !== 'BRL'`) — viagem doméstica não tem esse conceito, mesmo que uma despesa avulsa tenha sido lançada noutra moeda (`WalletPage.tsx` filtra a lista de viagens; `AddExpenseDialog.tsx` usa o mesmo critério pra decidir se oferece o checkbox).
- **Nunca bloqueia**: marcar uma despesa como "carteira" é permitido mesmo sem saldo comprado suficiente — o que falta vira um número visível (`shortfall` em `summarizeWalletDemand`, `src/lib/currencyWallet.ts`), nunca um erro. Por isso não existe consumo/reversão de lote — é aritmética pura recalculada a cada leitura (soma de `amountPurchased` vs. soma de `amountOriginal` das despesas marcadas), bem mais simples que a 1ª versão cogitada (FIFO com bloqueio, descartada em conversa com o usuário).
- **Privada por padrão, compartilhável por decisão mútua** (`wallet_shares`, ver [DATABASE.md](./DATABASE.md) 2.6): `firestore.rules` libera leitura pro próprio `ownerUid`, pro owner/editor da viagem quando o dono é um fantasma (`ghost_*`), **ou** quando existe um `WalletShareDeclaration` nos dois sentidos entre os dois uids pra aquele `tripId` (`hasMutualWalletShare()` na regra — duas chamadas `exists()` por doc ID determinístico, nunca query dentro da regra). Caso de uso real: casal viajando junto com dinheiro unificado — cada um declara unilateralmente ("quero juntar com X"), o pool só ativa quando os dois lados existem; `AddExpenseDialog.tsx` só oferece o checkbox de carteira quando `paidBy` é o próprio usuário logado ou um fantasma — nunca outro participante real (declarar compartilhamento é a única forma de um ver a carteira do outro, e mesmo assim os dois precisam ter declarado).
- **`src/lib/walletShares.ts`** (`computeMutualPartnersByTrip`, pura) calcula os pares mútuos client-side a partir de `useWalletShares()` — dois listeners (`fromUid==uid` / `toUid==uid`, Firestore não faz OR entre campos). `summarizeWalletDemand` (`currencyWallet.ts`) ganha `purchasedByOwner` no retorno — breakdown "Você: €250 · Nome: €250" quando o pool tem mais de um dono, sem mudar a assinatura de entrada (quem filtra o pool certo por viagem é `WalletPage.tsx`, a função só agrupa o que recebe).
- **Tela global, não por-URL-de-viagem** (`/wallet`, `WalletPage.tsx`) — busca lotes/despesas-carteira de `[o próprio uid, ...todo parceiro mútuo de qualquer viagem]` numa lista só achatada (`useCurrencyLots`/`useWalletExpenses`, `where(...,'in',uids)`, sem filtro de `tripId`) e agrupa/filtra por viagem no componente, usando `useUserTrips()` (já existia). Acessível pelo dropdown do avatar no header (`Layout.tsx`).

## 9. Convenções já validadas (siga-as)

1. Ler é hook+`onSnapshot`; escrever é service. Não misturar.
2. Migração de dado em lote sempre em chunks de 499 (`BATCH_LIMIT` em `trips.ts`), nunca um `writeBatch` sem chunking.
3. Todo id de ghost usa o prefixo `ghost_` e passa por `isGhostUid`/`getMemberName` (`src/lib/members.ts`) pra resolver nome — nunca resolver nome de uid manualmente em componente.
4. Import de `firebase`/contexts é majoritariamente `@/...`, mas alguns hooks usam relativo (`../config/firebase`) — inconsistência existente, não é motivo pra reescrever arquivo que não está sendo tocado por outro motivo.
