# SECURITY.md — Princípios permanentes e boundaries de confiança

> Regras permanentes (seção 1) separadas do que existe hoje em `firestore.rules` (seção 2) e dos boundaries de confiança entre sistemas (seções 3–4). Isolamento por uid é a base de tudo — nenhuma regra abaixo deve enfraquecer isso sem decisão explícita.

## 1. Princípios permanentes

1. **Toda leitura/escrita de `trips`/`expenses`/`settlements`/`activities` exige ser participante da viagem** (`isParticipant`/`canEdit` em `firestore.rules`) — nunca abrir uma coleção pra leitura geral de usuário logado só por conveniência.
2. **`VIEWER` nunca escreve.** `canEdit(tripId)` só é verdadeiro pra `OWNER`/`EDITOR` — qualquer regra nova que precise de escrita deve checar `canEdit`, nunca só `isParticipant`.
3. **O dono de uma viagem nunca pode ser removido/rebaixado por edição normal** — a regra de `update` em `trips` trava explicitamente `roles[ownerId] == 'OWNER'` e `ownerId in participants` no branch de edição normal (linhas 39–41 de `firestore.rules`).
4. **Nenhuma mudança de campo sensível confia em valor vindo do client sem checagem equivalente na regra** — os três branches de `update` em `trips`/`expenses`/`settlements` (edição normal, auto-join, sair-como-ghost) usam `diff().affectedKeys().hasOnly([...])` pra travar exatamente quais campos cada tipo de escrita pode tocar, não confiando em "o app não vai mandar outra coisa".

## 2. Regras do Firestore que já fazem a coisa certa (referência pra código novo)

- **Auto-join por convite**: o branch de `update` em `trips` que permite um usuário novo entrar via link de convite só aceita a escrita se `participants`/`roles` mudarem **exatamente** pra adicionar o próprio uid do requisitante, mais nada (`firestore.rules` linhas 42–48). O client (`joinTripByInvite`, `services/trips.ts`) nem tenta ler o doc antes — quem ainda não é participante não tem permissão de leitura, então o `getDoc` seria negado.
- **Sair-como-ghost**: o branch de `update` que permite um participante sair travando um ghost no lugar exige que o próprio uid seja removido de `participants`/`roles`, que no máximo 1 ghost novo seja adicionado, e que nenhum outro campo mude (`firestore.rules` linhas 49–63). O mesmo padrão de "troca de uid só do próprio, mais nada" se repete em `expenses`/`settlements` (linhas 73–85, 103–111).
- **`invites`**: leitura liberada pra qualquer usuário logado (`allow read: if isSignedIn()`), porque o segredo é o **ID do documento**, imprevisível — não dá pra listar/adivinhar. `update`/`delete` sempre negados: convite é criado ou não existe, sem meio-termo. Criação exige `canEdit` na viagem do convite.
- **`users/{uid}`**: leitura liberada pra qualquer logado (necessário pra `useUserProfiles` resolver nome de qualquer membro — implica que qualquer usuário logado também consegue ler o `plan`/`planExpiresAt` de qualquer outro, ver seção 5). Escrita do client restrita por `diff().affectedKeys().hasOnly(['uid','email','displayName','photoURL'])` — `plan`/`planExpiresAt`/`planSyncedAt` nunca são aceitos vindo do client, só o Admin SDK do CashZ escreve esses campos (bypassa regra).
- **Catch-all final** (`match /{document=**} { allow read, write: if false; }`) — qualquer coleção nova sem regra explícita é negada por padrão, não permitida. Ver [DATABASE.md](./DATABASE.md) seção 6.

## 3. `AuthContext` — allowlist de admin é hardcoded

`isGlobalAdmin` em `src/context/AuthContext.tsx` é uma lista de e-mail hardcoded no bundle do client (`GLOBAL_ADMIN_EMAILS`), não um custom claim do Firebase Auth nem um campo verificado por regra do Firestore. Isso é aceitável **só** porque `/admin` hoje é um placeholder sem funcionalidade real (ver [PROJECT.md](./PROJECT.md) seção 6) — se `/admin` ganhar qualquer ação que escreva dado sensível, a checagem de admin tem que virar uma regra de Firestore (campo `isAdmin` num doc, checado em `firestore.rules`), não só uma lista no client, porque um client comprometido pode contornar qualquer checagem que exista só no frontend.

## 4. SSO com o CashZ — trust boundary novo

O planning-trip aceita login via **Firebase custom token** minerado por um sistema externo (`CashZ/api/auth/trip-token.ts`, endpoint serverless no repo do CashZ). Fluxo: o CashZ verifica o ID token do próprio usuário (projeto `cashz-c832d`), exige `email_verified === true`, busca (ou cria, se não existir) um usuário no Firebase Auth do planning-trip por e-mail via Admin SDK, e gera um custom token pro uid encontrado/criado.

**O que isso significa em termos de confiança**: quem tem acesso às credenciais de Admin SDK do planning-trip (`TRIP_FIREBASE_*`, guardadas como env var no Vercel do **CashZ**, não deste repo) consegue autenticar como **qualquer** usuário do planning-trip, sem senha — é a definição de Admin SDK. Isso é aceito porque:
- As credenciais nunca chegam ao client (ficam só no servidor do CashZ).
- O endpoint exige e-mail verificado antes de mintar o token — reduz a chance de alguém provisionar acesso via e-mail não confirmado.
- O planning-trip **não pode revogar ou auditar** esse trust de dentro do próprio repo — é uma dependência de segurança externa, documentada aqui pra não ser esquecida.

Se o CashZ algum dia parar de ser a única fonte de custom tokens, ou esse fluxo for exposto por outro caminho, revisitar este documento — o princípio de "nenhum client não-confiável consegue autenticar como outro uid" só se mantém enquanto as credenciais `TRIP_FIREBASE_*` ficarem exclusivamente no backend do CashZ.

## 5. Gate de plano pago (CashZ) — trust boundary estendido

Criar uma viagem (`trips` `create`) exige plano ativo no CashZ (`isCashzPremium(uid)` em `firestore.rules`). Como os dois projetos Firebase são separados, o planning-trip não lê `user_preferences` do CashZ diretamente — o status é **sincronizado** pro doc `users/{uid}` deste projeto por dois caminhos, ambos via Admin SDK do CashZ:

1. **No login via SSO**: `CashZ/api/auth/trip-token.ts` já verifica o uid do CashZ — lê `user_preferences/{uid}` de lá e grava `plan`/`planExpiresAt` aqui antes de gerar o custom token.
2. **No login direto** (Google popup, sem passar pelo CashZ): `AuthContext.tsx` chama `CashZ/api/auth/plan-status.ts` (único endpoint chamado **cross-origin** em todo o sistema, CORS restrito a `https://planning-trip.vercel.app`) — esse endpoint verifica o token do planning-trip, busca `user_preferences` do CashZ por e-mail, e grava o mesmo jeito.

**Os dois caminhos exigem e-mail verificado antes de confiar na correspondência por e-mail** — sem isso, alguém poderia se cadastrar no projeto Firebase do planning-trip via e-mail/senha reivindicando o e-mail de outra pessoa (sem prova de posse) e herdar o plano dela:
- `trip-token.ts` já exigia `decoded.email_verified` do lado do CashZ (o token que chega é sempre de um e-mail comprovado); passou a checar também `tripUser.emailVerified` do lado do planning-trip antes de sincronizar — se já existe uma conta com aquele e-mail lá mas ela nunca foi verificada, o SSO recusa (`409`) em vez de sincronizar plano pra uma conta cujo dono real é desconhecido.
- `plan-status.ts` passou a exigir `decodedTrip.email_verified` do token do planning-trip antes de fazer o lookup por e-mail no CashZ — sem isso, uma conta de e-mail/senha não verificada bastava pra puxar o plano de qualquer pessoa cujo e-mail se reivindicasse.
- **Recomendação pendente (config externa, não é código)**: desabilitar o provedor Email/Senha no Firebase Console do projeto `planning-trip-6a9cb`, já que o app só usa Google (`AuthContext.tsx`) — isso fecha a superfície de ataque na raiz, os dois checks de `email_verified` acima ficam como defesa em profundidade.

**A regra nunca confia no campo sincronizado sozinho**: `isCashzPremium()` recalcula `planExpiresAt > request.time` no momento da escrita, réplica exata do `isPlanActive()` do CashZ — mesmo princípio da seção 1, item 4, aplicado a um campo que vem de outro sistema em vez do próprio client.

**Débito conhecido / trade-off aceito**: `users/{uid}` é legível por qualquer usuário logado (necessário pro `useUserProfiles`), o que significa que o status de plano (premium/free, data de expiração) de qualquer usuário é visível pra qualquer outro usuário logado no planning-trip — não é dado de pagamento (sem valor, sem cartão, sem ID de transação — isso nunca sai do CashZ), mas é mais exposição do que o CashZ dá pro próprio campo (`user_preferences` lá é leitura só do dono). Aceito pela simplicidade de reaproveitar a coleção `users` já existente em vez de criar uma coleção `billing` separada só pra restringir esse campo — revisitar se algum dia o app expuser algo mais sensível no mesmo doc.

## 6. Checklist de segurança para toda mudança

1. Toda coleção nova tem regra explícita no mesmo commit (nunca depender do catch-all pra "proteger por omissão" — ele bloqueia tudo, incluindo a própria feature).
2. Toda escrita restrita a um subconjunto de campos usa `diff().affectedKeys().hasOnly([...])`, não só um `allow update: if canEdit(...)` genérico, quando a intenção é limitar o que pode mudar.
3. Nenhuma lógica de admin/permissão especial vive só no client se ela guarda uma ação que escreve dado sensível — replicar em regra.
4. Mudança que toca o fluxo de SSO (seção 4) ou o gate de plano (seção 5) é revisada nos dois repos (CashZ e planning-trip), nunca só num lado.
5. Nenhuma regra nova que dependa de "usuário tem plano ativo" confia só no campo `plan` — sempre recalcula `planExpiresAt` contra `request.time`, igual `isCashzPremium()`.
