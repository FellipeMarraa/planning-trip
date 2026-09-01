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
- **Transferir dono**: só quem já é `ownerId` pode iniciar (`request.auth.uid == resource.data.ownerId`), só pra alguém que já é participante, `participants` não muda, e `roles.diff().affectedKeys()` só pode tocar os dois uids envolvidos — dono antigo vira `EDITOR` (não perde acesso, só o rótulo), nunca removido. Não existe "promover a dono" sem já ser dono — ninguém se autopromove.
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

**Login por e-mail/senha (`AuthContext.tsx`) exige a mesma dupla checagem que o CashZ tem** (`firebase.ts` `register()`): `fetchSignInMethodsForEmail` antes de criar a conta, e tratamento de `auth/email-already-in-use` no catch como segunda camada (a primeira pode voltar vazia se "Email Enumeration Protection" estiver ativo no projeto Firebase — config de console, não controlável por código). Sem isso, alguém registrando por e-mail/senha um endereço que já tem conta Google cria uma segunda conta com uid diferente — e como o SSO/gate de plano acima casa contas **por e-mail**, uma duplicata quebra silenciosamente esse casamento (foi exatamente esse tipo de confusão, entre CashZ e planning-trip, que motivou adicionar e-mail/senha aqui em primeiro lugar).

## 5. Gate de plano pago (CashZ) — trust boundary estendido

Criar uma viagem (`trips` `create`) exige plano ativo no CashZ (`isCashzPremium(uid)` em `firestore.rules`). Como os dois projetos Firebase são separados, o planning-trip não lê `user_preferences` do CashZ diretamente — o status é **sincronizado** pro doc `users/{uid}` deste projeto por dois caminhos, ambos via Admin SDK do CashZ:

1. **No login via SSO**: `CashZ/api/auth/trip-token.ts` já verifica o uid do CashZ — lê `user_preferences/{uid}` de lá e grava `plan`/`planExpiresAt` aqui antes de gerar o custom token.
2. **No login direto** (Google popup, sem passar pelo CashZ): `AuthContext.tsx` chama `CashZ/api/auth/plan-status.ts` (único endpoint chamado **cross-origin** em todo o sistema, CORS restrito a `https://planning-trip.vercel.app`) — esse endpoint verifica o token do planning-trip, busca `user_preferences` do CashZ por e-mail, e grava o mesmo jeito.

**Os dois caminhos exigem e-mail verificado antes de confiar na correspondência por e-mail** — sem isso, alguém poderia se cadastrar no projeto Firebase do planning-trip via e-mail/senha reivindicando o e-mail de outra pessoa (sem prova de posse) e herdar o plano dela:
- `trip-token.ts` já exigia `decoded.email_verified` do lado do CashZ (o token que chega é sempre de um e-mail comprovado); passou a checar também `tripUser.emailVerified` do lado do planning-trip antes de sincronizar — se já existe uma conta com aquele e-mail lá mas ela nunca foi verificada, o SSO recusa (`409`) em vez de sincronizar plano pra uma conta cujo dono real é desconhecido.
- `plan-status.ts` passou a exigir `decodedTrip.email_verified` do token do planning-trip antes de fazer o lookup por e-mail no CashZ — sem isso, uma conta de e-mail/senha não verificada bastava pra puxar o plano de qualquer pessoa cujo e-mail se reivindicasse.
- **Recomendação anterior revisada**: este documento chegou a recomendar desabilitar o provedor Email/Senha no Firebase Console (já que o app só usava Google). Não vale mais — e-mail/senha passou a ser usado de propósito (ver seção 4, login), justamente pra permitir que o e-mail do planning-trip bata com o do CashZ quando são contas diferentes por provedor. A defesa contra o cenário que motivou aquela recomendação (alguém provisionar acesso via e-mail não verificado) continua sendo os dois checks de `email_verified` acima, que são suficientes independente de quantos provedores o projeto tem habilitado.

**A regra nunca confia no campo sincronizado sozinho**: `isCashzPremium()` recalcula `planExpiresAt > request.time` no momento da escrita, réplica exata do `isPlanActive()` do CashZ — mesmo princípio da seção 1, item 4, aplicado a um campo que vem de outro sistema em vez do próprio client.

**Débito conhecido / trade-off aceito**: `users/{uid}` é legível por qualquer usuário logado (necessário pro `useUserProfiles`), o que significa que o status de plano (premium/free, data de expiração) de qualquer usuário é visível pra qualquer outro usuário logado no planning-trip — não é dado de pagamento (sem valor, sem cartão, sem ID de transação — isso nunca sai do CashZ), mas é mais exposição do que o CashZ dá pro próprio campo (`user_preferences` lá é leitura só do dono). Aceito pela simplicidade de reaproveitar a coleção `users` já existente em vez de criar uma coleção `billing` separada só pra restringir esse campo — revisitar se algum dia o app expuser algo mais sensível no mesmo doc.

## 6. Assistente de IA — chave de API, gate de plano, escrita restrita

`api/ai/chat.ts` é o primeiro backend próprio do planning-trip (ver [ARCHITECTURE.md](./ARCHITECTURE.md) seção 8) — os princípios abaixo valem pra ele como valem pros endpoints do CashZ:

- **Chave de provider (`GROQ_API_KEY`) só existe em `api/ai/_lib/providers/*`**, nunca em `src/`. Mesmo motivo do split client/server já documentado pro CashZ (`AI_IMPLEMENTATION.md` de lá): uma chave de IA no bundle do client é extraível via DevTools.
- **Gate de plano é por quem está conversando, não por quem é dono da viagem** — decisão deliberada, confirmada com o usuário: um participante convidado sem plano ativo no CashZ não usa o assistente, mesmo dentro de uma viagem cujo dono é premium (diferente de despesa/atividade manual, que continuam livres pra qualquer participante). Isso evita que uma viagem premium vire "IA de graça" pra qualquer número de convidados. `api/ai/chat.ts` replica `isCashzPremium()` server-side (nunca confia só no `plan` do cache, mesmo princípio da seção 5) antes de aceitar qualquer mensagem.
- **`ai_messages`/`ai_usage` nunca são graváveis pelo client** (`allow write: if false`, `firestore.rules`) — só o Admin SDK dentro de `api/ai/chat.ts` escreve. Evita conteúdo forjado (uma mensagem "assistant" falsa) ou manipulação do contador de custo. `ai_threads` tem uma única exceção: o dono pode alternar `archived` (arquivar/ocultar conversa), restrito por `diff().affectedKeys().hasOnly(['archived'])` — nunca título, `tripId` ou qualquer outro campo.
- **Contexto da viagem só é injetado no prompt se o uid for participante** — `api/ai/chat.ts` confere `participants.includes(uid)` no próprio doc da trip antes de ler atividades, nunca confia no `tripId` do corpo da requisição sozinho.
- **A IA nunca tem tool de escrita** — ver princípio central em [ARCHITECTURE.md](./ARCHITECTURE.md) seção 8. Sugestão de roteiro é só texto/JSON na resposta; a escrita real é o usuário clicando confirmar, que chama o mesmo `createActivity` do formulário manual.
- **Achado corrigido antes de ir pro ar**: o card de sugestão inicialmente fazia `createActivity({ tripId, ...activity })` — como `activity` vem de texto gerado pela IA (influenciável por prompt injection do próprio usuário), um `tripId` embutido nesse objeto sobrescrevia o `tripId` de confiança (da URL) na hora do spread, e a regra de `activities` (`canEdit(request.resource.data.tripId)`) valida o tripId do payload, não o da tela — permitindo redirecionar a escrita pra outra viagem onde o usuário também é editor. Corrigido nos dois lados: o client nunca mais espalha o objeto vindo da IA (copia campo a campo, `tripId` sempre o de confiança), e o servidor (`api/ai/chat.ts`, `sanitizeSuggestedActivities`) reduz qualquer sugestão só aos 4 campos esperados antes de persistir — nunca confiar no shape do JSON que o modelo devolve.

## 7. Checklist de segurança para toda mudança

1. Toda coleção nova tem regra explícita no mesmo commit (nunca depender do catch-all pra "proteger por omissão" — ele bloqueia tudo, incluindo a própria feature).
2. Toda escrita restrita a um subconjunto de campos usa `diff().affectedKeys().hasOnly([...])`, não só um `allow update: if canEdit(...)` genérico, quando a intenção é limitar o que pode mudar.
3. Nenhuma lógica de admin/permissão especial vive só no client se ela guarda uma ação que escreve dado sensível — replicar em regra.
4. Mudança que toca o fluxo de SSO (seção 4) ou o gate de plano (seção 5) é revisada nos dois repos (CashZ e planning-trip), nunca só num lado.
5. Nenhuma regra nova que dependa de "usuário tem plano ativo" confia só no campo `plan` — sempre recalcula `planExpiresAt` contra `request.time`, igual `isCashzPremium()`.
6. Nenhuma tool/feature de IA nova ganha permissão de escrita sem decisão explícita — o princípio da seção 6 é permanente, não um limite técnico atual.
