import admin from "firebase-admin";

// Circuit-breaker de custo bem mais simples que o do CashZ (sem limite por
// usuário, sem ai_config administrável — planning-trip não tem admin panel
// pra isso). Só um teto global mensal hardcoded.
//
// Ajustado de $5 pra $15 (2026-09-02) junto da troca pro groq/compound —
// custa mais por mensagem (token mais caro + busca na web cobrada à parte),
// o teto antigo esgotaria rápido demais pro uso real.
const GLOBAL_LIMIT_USD = 15;

// Preço em USD (console.groq.com/docs/compound/systems/compound, 2026-09):
// groq/compound roda sobre GPT-OSS-120B — $0.15/1M tokens de entrada,
// $0.60/1M de saída (o dobro do openai/gpt-oss-20b usado antes). Revisar se
// o preço publicado mudar.
const PRICING = { promptPer1k: 0.00015, completionPer1k: 0.0006 };

// Busca na web embutida do Compound é cobrada à parte do token — $5-8 por
// 1000 chamadas conforme o tipo de busca (básica/avançada), não documentado
// de forma 100% granular publicamente. Usa o valor mais caro ($8/1000) de
// propósito: mais seguro superestimar o gasto real (corta a IA cedo demais,
// no pior caso) do que subestimar (deixaria o teto do circuit-breaker
// mentir sobre o gasto real da conta Groq).
const TOOL_CALL_COST_USD = 0.008;

function isSamePeriod(periodStart: string | undefined): boolean {
    if (!periodStart) return false;
    const stored = new Date(periodStart);
    const now = new Date();
    return stored.getUTCFullYear() === now.getUTCFullYear() && stored.getUTCMonth() === now.getUTCMonth();
}

export function calculateCostUsd(promptTokens: number, completionTokens: number, toolCalls = 0): number {
    return (promptTokens / 1000) * PRICING.promptPer1k
        + (completionTokens / 1000) * PRICING.completionPer1k
        + toolCalls * TOOL_CALL_COST_USD;
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
