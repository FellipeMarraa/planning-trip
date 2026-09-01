import admin from "firebase-admin";

// Circuit-breaker de custo bem mais simples que o do CashZ (sem limite por
// usuário, sem ai_config administrável — planning-trip não tem admin panel
// pra isso). Só um teto global mensal hardcoded.
const GLOBAL_LIMIT_USD = 5;

// Preço aproximado (USD por 1k tokens) do modelo Groq usado
// (openai/gpt-oss-20b: $0.075/1M entrada, $0.30/1M saída) — revisar se o
// preço publicado mudar.
const PRICING = { promptPer1k: 0.000075, completionPer1k: 0.0003 };

function isSamePeriod(periodStart: string | undefined): boolean {
    if (!periodStart) return false;
    const stored = new Date(periodStart);
    const now = new Date();
    return stored.getUTCFullYear() === now.getUTCFullYear() && stored.getUTCMonth() === now.getUTCMonth();
}

export function calculateCostUsd(promptTokens: number, completionTokens: number): number {
    return (promptTokens / 1000) * PRICING.promptPer1k + (completionTokens / 1000) * PRICING.completionPer1k;
}

export async function checkUsageAllowed(db: admin.firestore.Firestore): Promise<boolean> {
    const snap = await db.collection('ai_usage').doc('global').get();
    const data = snap.data();
    if (!data || !isSamePeriod(data.periodStart)) return true;
    return data.spentUsd < GLOBAL_LIMIT_USD;
}

export async function recordUsage(db: admin.firestore.Firestore, costUsd: number): Promise<void> {
    const ref = db.collection('ai_usage').doc('global');
    await db.runTransaction(async (transaction) => {
        const snap = await transaction.get(ref);
        const data = snap.data();
        if (!data || !isSamePeriod(data.periodStart)) {
            transaction.set(ref, { spentUsd: costUsd, periodStart: new Date().toISOString() });
        } else {
            transaction.update(ref, { spentUsd: data.spentUsd + costUsd });
        }
    });
}
