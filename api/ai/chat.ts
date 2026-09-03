import admin from "firebase-admin";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { checkRateLimit } from "./_lib/rateLimit.js";
import { checkUsageAllowed, calculateCostUsd, recordUsage } from "./_lib/usage.js";
import {
    buildSystemPrompt,
    SUGGESTION_START,
    SUGGESTION_END,
    TRIP_SUGGESTION_START,
    TRIP_SUGGESTION_END,
    EXPENSE_SUGGESTION_START,
    EXPENSE_SUGGESTION_END,
    CURRENCY_CODES,
    EXPENSE_CATEGORIES,
    type TripContext,
} from "./_lib/prompt.js";
import { generateReply } from "./_lib/providers/registry.js";
import type { AIProviderMessage } from "./_lib/providers/types.js";

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
        });
    } catch (error) {
        console.error("❌ Erro na inicialização do Admin SDK (api/ai/chat.ts):", error instanceof Error ? error.message : error);
    }
}

const HISTORY_LIMIT = 10;

// Mesmo cálculo de isCashzPremium() do firestore.rules e de useCashzPlan.ts
// no client — nunca confia só no campo `plan` sincronizado, sempre
// recalcula a expiração no momento do uso.
function isPremium(plan: string | undefined, planExpiresAt: string | null | undefined): boolean {
    if (!plan || !['premium', 'annual'].includes(plan)) return false;
    if (!planExpiresAt) return true;
    return new Date(planExpiresAt) > new Date();
}

interface SuggestedActivity {
    dateId: string;
    time: string;
    location: string;
    description: string;
}

// Defesa em profundidade: mesmo a IA não escrevendo nada sozinha, o texto que
// ela gera é influenciável por prompt injection do próprio usuário. Nunca
// confiar no shape do JSON que ela emite — cada item é reduzido só aos 4
// campos esperados, qualquer campo extra (ex.: um `tripId` embutido pra
// tentar redirecionar a escrita quando o client confirmar) é descartado aqui,
// nunca chega a ser persistido em ai_messages.suggestedActivities.
function sanitizeSuggestedActivities(parsed: unknown): SuggestedActivity[] | null {
    if (!Array.isArray(parsed)) return null;

    const sanitized = parsed
        .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
        .map((item) => ({
            dateId: String(item.dateId ?? ''),
            time: String(item.time ?? ''),
            location: String(item.location ?? ''),
            description: String(item.description ?? ''),
        }))
        .filter((item) => item.dateId && item.time && item.location);

    return sanitized.length > 0 ? sanitized : null;
}

// Acha o primeiro JSON balanceado (objeto `{...}` ou array `[...]`) depois do
// marcador de início, em vez de exigir que o marcador de FIM bata caractere
// a caractere. Achado real em produção (mesmo bug corrigido no CashZ): o
// modelo às vezes emite "<<<FIM_..._SUGERIDO>>" (2 '>') em vez de "...>>>"
// (3) — com comparação exata (`text.indexOf(end)`), a extração nunca casava,
// o texto nunca era limpo, e o bloco cru vazava pro balão de chat do
// usuário. Contar chaves/colchetes (respeitando string/escape) não depende
// de nenhum caractere do modelo além do próprio JSON, que já é validado por
// JSON.parse logo em seguida de qualquer forma. O marcador de fim só é usado,
// de forma tolerante, pra limpar o texto exibido — nunca pra achar o JSON.
function extractBlock(text: string, start: string, end: string): { json: string; reply: string } | null {
    const startIdx = text.indexOf(start);
    if (startIdx === -1) return null;

    let i = startIdx + start.length;
    while (i < text.length && text[i] !== '{' && text[i] !== '[') i++;
    if (i >= text.length) return null;
    const jsonStart = i;
    const openChar = text[i];
    const closeChar = openChar === '{' ? '}' : ']';

    let depth = 0;
    let inString = false;
    let escaped = false;
    for (; i < text.length; i++) {
        const ch = text[i];
        if (inString) {
            if (escaped) escaped = false;
            else if (ch === '\\') escaped = true;
            else if (ch === '"') inString = false;
        } else if (ch === '"') {
            inString = true;
        } else if (ch === openChar) {
            depth++;
        } else if (ch === closeChar) {
            depth--;
            if (depth === 0) { i++; break; }
        }
    }
    if (depth !== 0) return null;

    const json = text.slice(jsonStart, i);

    const endPrefix = end.replace(/>+$/, '');
    const afterJson = text.slice(i);
    const prefixIdx = afterJson.indexOf(endPrefix);
    let consumeEnd = i;
    if (prefixIdx !== -1 && prefixIdx < 20) {
        let e = i + prefixIdx + endPrefix.length;
        while (text[e] === '>') e++;
        consumeEnd = e;
    }

    const reply = (text.slice(0, startIdx) + text.slice(consumeEnd)).trim();
    return { json, reply };
}

function extractSuggestion(text: string): { reply: string; suggestedActivities: SuggestedActivity[] | null } {
    const block = extractBlock(text, SUGGESTION_START, SUGGESTION_END);
    if (!block) return { reply: text, suggestedActivities: null };

    try {
        const parsed = JSON.parse(block.json);
        return { reply: block.reply, suggestedActivities: sanitizeSuggestedActivities(parsed) };
    } catch {
        return { reply: block.reply, suggestedActivities: null };
    }
}

interface SuggestedTrip {
    name: string;
    startDate: string;
    endDate: string;
    baseCurrency: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Mesma defesa em profundidade de sanitizeSuggestedActivities: nunca confiar
// no shape do JSON que a IA emite. Datas mal formadas, fora de ordem, ou
// moeda fora da lista suportada pelo app derrubam a sugestão inteira (volta
// null) em vez de deixar passar algo que o CreateTripDialog nunca aceitaria.
function sanitizeSuggestedTrip(parsed: unknown): SuggestedTrip | null {
    if (typeof parsed !== 'object' || parsed === null) return null;
    const obj = parsed as Record<string, unknown>;

    const name = typeof obj.name === 'string' ? obj.name.trim().slice(0, 100) : '';
    const startDate = typeof obj.startDate === 'string' ? obj.startDate : '';
    const endDate = typeof obj.endDate === 'string' ? obj.endDate : '';
    const baseCurrency = typeof obj.baseCurrency === 'string' ? obj.baseCurrency.toUpperCase() : '';

    if (!name) return null;
    if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate) || startDate > endDate) return null;
    if (!CURRENCY_CODES.includes(baseCurrency)) return null;

    return { name, startDate, endDate, baseCurrency };
}

interface SuggestedExpense {
    description: string;
    category: string;
    amountBRL: number;
    date: string;
}

const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

// Mesma defesa em profundidade das outras duas: nunca confiar no shape do
// JSON que a IA emite. category fora da lista, amountBRL <= 0, ou date fora
// do formato esperado derrubam a sugestão inteira (volta null) — o mesmo
// que a regra do Firestore já rejeitaria na escrita real, só que aqui evita
// nem mostrar um card quebrado pro usuário.
function sanitizeSuggestedExpense(parsed: unknown): SuggestedExpense | null {
    if (typeof parsed !== 'object' || parsed === null) return null;
    const obj = parsed as Record<string, unknown>;

    const description = typeof obj.description === 'string' ? obj.description.trim().slice(0, 200) : '';
    const category = typeof obj.category === 'string' ? obj.category : '';
    const amountBRL = typeof obj.amountBRL === 'number' ? obj.amountBRL : Number(obj.amountBRL);
    const date = typeof obj.date === 'string' ? obj.date : '';

    if (!description) return null;
    if (!EXPENSE_CATEGORIES.includes(category)) return null;
    if (!Number.isFinite(amountBRL) || amountBRL <= 0) return null;
    if (!DATETIME_RE.test(date)) return null;

    return { description, category, amountBRL, date };
}

function extractExpenseSuggestion(text: string): { reply: string; suggestedExpense: SuggestedExpense | null } {
    const block = extractBlock(text, EXPENSE_SUGGESTION_START, EXPENSE_SUGGESTION_END);
    if (!block) return { reply: text, suggestedExpense: null };

    try {
        const parsed = JSON.parse(block.json);
        return { reply: block.reply, suggestedExpense: sanitizeSuggestedExpense(parsed) };
    } catch {
        return { reply: block.reply, suggestedExpense: null };
    }
}

function extractTripSuggestion(text: string): { reply: string; suggestedTrip: SuggestedTrip | null } {
    const block = extractBlock(text, TRIP_SUGGESTION_START, TRIP_SUGGESTION_END);
    if (!block) return { reply: text, suggestedTrip: null };

    try {
        const parsed = JSON.parse(block.json);
        return { reply: block.reply, suggestedTrip: sanitizeSuggestedTrip(parsed) };
    } catch {
        return { reply: block.reply, suggestedTrip: null };
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const authHeader = req.headers.authorization || '';
        const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!idToken) return res.status(401).json({ message: 'Token de autenticação ausente' });

        const decoded = await admin.auth().verifyIdToken(idToken);
        const uid = decoded.uid;
        const db = admin.firestore();

        const userSnap = await db.collection('users').doc(uid).get();
        const userData = userSnap.data();
        if (!isPremium(userData?.plan, userData?.planExpiresAt)) {
            return res.status(403).json({ message: 'O assistente de viagem exige um plano ativo no CashZ.' });
        }

        const rateLimitOk = await checkRateLimit(db, uid, { collection: "ai_rate_limits", max: 15, windowMs: 60_000 });
        if (!rateLimitOk) {
            return res.status(429).json({ message: 'Muitas mensagens. Aguarde um pouco.' });
        }

        const usageOk = await checkUsageAllowed(db);
        if (!usageOk) {
            return res.status(503).json({ message: 'Assistente de viagem temporariamente indisponível (limite de uso do mês atingido).' });
        }

        const { message, threadId: incomingThreadId, tripId } = req.body || {};
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ message: 'Mensagem ausente' });
        }

        // Contexto da viagem: só injeta se o uid for participante — nunca
        // confia no tripId sozinho pra decidir o que mostrar pra IA.
        let tripContext: TripContext | undefined;
        if (tripId) {
            const tripSnap = await db.collection('trips').doc(tripId).get();
            const tripData = tripSnap.data();
            if (tripData && Array.isArray(tripData.participants) && tripData.participants.includes(uid)) {
                const activitiesSnap = await db.collection('activities').where('tripId', '==', tripId).limit(200).get();
                // Teto conservador pro tamanho do prompt — bem abaixo do
                // limit(1000) de segurança já documentado (PERFORMANCE.md);
                // é resumo agregado (total/por categoria), não a lista crua.
                const expensesSnap = await db.collection('expenses').where('tripId', '==', tripId).limit(300).get();
                const byCategory: Record<string, number> = {};
                let totalBRL = 0;
                expensesSnap.docs.forEach((d) => {
                    const exp = d.data();
                    const amount = Number(exp.amountBRL) || 0;
                    const category = typeof exp.category === 'string' ? exp.category : 'Outros';
                    totalBRL += amount;
                    byCategory[category] = (byCategory[category] || 0) + amount;
                });

                tripContext = {
                    name: tripData.name,
                    startDate: tripData.startDate,
                    endDate: tripData.endDate,
                    baseCurrency: tripData.baseCurrency,
                    activities: activitiesSnap.docs.map((d) => {
                        const a = d.data();
                        return { dateId: a.dateId, time: a.time, location: a.location, description: a.description };
                    }),
                    finance: { totalBRL, byCategory, count: expensesSnap.docs.length },
                };
            }
        }

        // Thread: continua uma existente (só se for do próprio uid) ou cria nova.
        let threadRef: admin.firestore.DocumentReference;
        if (incomingThreadId) {
            threadRef = db.collection('ai_threads').doc(incomingThreadId);
            const threadSnap = await threadRef.get();
            if (!threadSnap.exists || threadSnap.data()?.userId !== uid) {
                return res.status(404).json({ message: 'Conversa não encontrada' });
            }
        } else {
            threadRef = db.collection('ai_threads').doc();
            await threadRef.set({
                userId: uid,
                tripId: tripId ?? null,
                title: message.slice(0, 60),
                archived: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        const historySnap = await db.collection('ai_messages')
            .where('threadId', '==', threadRef.id)
            .orderBy('createdAt', 'asc')
            .limit(HISTORY_LIMIT)
            .get();

        const history: AIProviderMessage[] = historySnap.docs.map((d) => {
            const m = d.data();
            return { role: m.role, content: m.content };
        });

        await db.collection('ai_messages').add({
            threadId: threadRef.id,
            userId: uid,
            role: 'user',
            content: message,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const messages: AIProviderMessage[] = [
            { role: 'system', content: buildSystemPrompt(tripContext) },
            ...history,
            { role: 'user', content: message },
        ];

        let replyText: string;
        let suggestedActivities: SuggestedActivity[] | null = null;
        let suggestedTrip: SuggestedTrip | null = null;
        let suggestedExpense: SuggestedExpense | null = null;
        let costUsd = 0;

        try {
            const result = await generateReply(messages);
            const extractedActivities = extractSuggestion(result.text);
            const extractedTrip = extractTripSuggestion(extractedActivities.reply);
            const extractedExpense = extractExpenseSuggestion(extractedTrip.reply);
            replyText = extractedExpense.reply;
            suggestedActivities = extractedActivities.suggestedActivities;
            suggestedTrip = extractedTrip.suggestedTrip;
            suggestedExpense = extractedExpense.suggestedExpense;
            costUsd = calculateCostUsd(result.promptTokens, result.completionTokens, result.toolCalls);
        } catch (error) {
            console.error('❌ Erro ao gerar resposta do assistente de viagem:', error instanceof Error ? error.message : error);
            replyText = 'Não consegui responder agora. Tente novamente em instantes.';
        }

        await db.collection('ai_messages').add({
            threadId: threadRef.id,
            userId: uid,
            role: 'assistant',
            content: replyText,
            suggestedActivities: suggestedActivities ?? null,
            suggestedTrip: suggestedTrip ?? null,
            suggestedExpense: suggestedExpense ?? null,
            tripId: tripId ?? null,
            provider: 'groq',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await threadRef.update({
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastMessagePreview: replyText.slice(0, 120),
        });

        if (costUsd > 0) {
            await recordUsage(db, costUsd);
        }

        return res.status(200).json({ threadId: threadRef.id });
    } catch (error) {
        console.error('❌ Erro no assistente de viagem:', error instanceof Error ? error.message : error);
        return res.status(500).json({ message: 'Falha ao processar mensagem' });
    }
}
