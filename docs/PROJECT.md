# PROJECT.md — O que é o planning-trip

> Documento fonte da verdade sobre **o que é** o planning-trip hoje, verificado contra o código real (`package.json`, `src/types/index.ts`, rotas de `App.tsx`). Decisões de código servem a este documento — não o contrário.

## 1. Objetivo

App de organização e divisão de despesas de viagem em grupo: cada viagem (`Trip`) tem participantes, despesas multi-moeda convertidas pra BRL, acertos de dívida entre membros e um itinerário/lista de atividades por dia. Não é um app de finanças pessoais de uso contínuo — é escopado por viagem.

## 2. Para quem é

Grupos pequenos (família, amigos) organizando uma viagem junto, tipicamente com pelo menos um membro que paga em nome dos outros e precisa depois calcular quem deve quanto pra quem. Suporta membros sem conta própria (ver "ghost member" em [ARCHITECTURE.md](./ARCHITECTURE.md) seção 3).

## 3. Funcionalidades implementadas

| Área | O que existe hoje |
|---|---|
| Viagens | Criar/editar/apagar viagem, moeda base, datas, papéis (`OWNER`/`EDITOR`/`VIEWER`) |
| Membros | Convite por link (token = ID do doc), troca de papel, transferência de dono, remoção, "sair da viagem" preservando histórico |
| Membros sem conta | "Ghost member" — participante sem login, pode ser vinculado a um usuário real depois |
| Despesas | Criar/editar/apagar, moeda original + conversão pra BRL, categoria, quem pagou, quem divide |
| Acertos | Registro de pagamento de dívida entre dois participantes (sempre em BRL) |
| Itinerário | Atividades por dia (horário, local, descrição, concluído/não) — página com layout próprio (dark mode imersivo) |
| Análise | Gráfico de gasto por categoria (Recharts), resumo de saldo por membro |
| Cotação | Busca de câmbio ao vivo (AwesomeAPI) com fallback fixo se a API falhar |
| Login | Google OAuth (popup) ou e-mail/senha — mesmo leque do CashZ, ver [ARCHITECTURE.md](./ARCHITECTURE.md) seção 4 |
| SSO com CashZ | Usuário logado no CashZ acessa o planning-trip já autenticado via custom token — ver [SECURITY.md](./SECURITY.md) seção 4 |
| Gate de plano pago | Criar viagem exige plano ativo no CashZ (free/expirado só visualiza o que já existe) — ver [SECURITY.md](./SECURITY.md) seção 5 |
| Assistente de IA de viagem | Chat com um agente especializado em viagens (planejamento, clima esperado, mala, melhores datas, sugestão de roteiro) — só sugere, nunca escreve sozinho; exige plano ativo no CashZ de **quem está conversando** (não do dono da viagem) — ver [ARCHITECTURE.md](./ARCHITECTURE.md) seção 9 e [SECURITY.md](./SECURITY.md) seção 6 |

## 4. Tecnologias (reais, verificadas em `package.json`)

React 19 + TypeScript + Vite 8, `react-router-dom` v7 (client-side routing, sem SSR), Firebase (Auth + Firestore, projeto `planning-trip-6a9cb`), Tailwind v4 (CSS-first, sem `tailwind.config.js`) + shadcn (`radix-nova`) + `radix-ui` + `lucide-react`, `date-fns`, `framer-motion`, `recharts`. Deploy: Vercel (frontend estático via SPA rewrite) + Firebase Firestore (Spark, gratuito).

## 5. Escopo atual (o que o app faz sozinho, sem trabalho adicional)

Tudo listado na tabela da seção 3. Não há push notification, não há export de dados, não há suporte a múltiplas moedas de referência simultâneas de fato (tudo é normalizado pra BRL internamente, mesmo quando `Trip.baseCurrency` sugere outra moeda — ver [DATABASE.md](./DATABASE.md) seção 2.2).

## 6. Fora de escopo (não implementar sem decisão explícita)

- **`/admin`**: rota existe (`App.tsx`, gated por `isGlobalAdmin`) mas é um placeholder estático sem funcionalidade — não expandir sem pedido explícito.
- Multi-moeda de referência real (hoje é BRL-cêntrico por baixo do capô).
- Notificações, exportação de dados, múltiplos idiomas.
- Integração de API externa (clima, voos, hotéis) no assistente de IA — hoje ele responde só com o próprio conhecimento do modelo, ver [ARCHITECTURE.md](./ARCHITECTURE.md) seção 9.
- Escrita automática da IA (criar viagem/atividade sozinha, sem confirmação do usuário) — decisão deliberada, não um limite técnico.

## 7. Restrições que moldam toda decisão técnica

- **Plano Firebase Spark (gratuito)**: sem Cloud Functions, sem trigger server-side — toda lógica de migração de dado (ex.: "sair da viagem") roda no client via `writeBatch`, nunca numa function. Ver [FIREBASE.md](./FIREBASE.md).
- **Sem `.env`**: a config do Firebase é hardcoded em `src/config/firebase.ts` (não é problema de segurança — é a `apiKey` pública do Firebase Web SDK — mas significa que não há hoje um workflow de variável de ambiente pra alternar de projeto Firebase).
- **Time pequeno/solo**: sem CI, sem suíte de teste ainda (ver [TESTS.md](./TESTS.md)) — decisões de processo devem refletir esse tamanho, não introduzir processo pesado antes da hora.

## 8. Roadmap

Ver [ROADMAP.md](./ROADMAP.md) para o detalhamento por prazo.
