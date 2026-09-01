import admin from "firebase-admin";

// Réplica do checkRateLimit do CashZ (api/ai/_lib/rateLimit.ts de lá) —
// janela deslizante simples via contador em Firestore.
export async function checkRateLimit(
    db: admin.firestore.Firestore,
    key: string,
    options: { collection?: string; max?: number; windowMs?: number } = {}
): Promise<boolean> {
    const { collection = "rate_limits", max = 10, windowMs = 30_000 } = options;
    const rateLimitRef = db.collection(collection).doc(key);

    return db.runTransaction(async (transaction) => {
        const snap = await transaction.get(rateLimitRef);
        const now = Date.now();
        const data = snap.data();

        if (!data || now - data.windowStart > windowMs) {
            transaction.set(rateLimitRef, { windowStart: now, count: 1 });
            return true;
        }

        if (data.count >= max) {
            return false;
        }

        transaction.update(rateLimitRef, { count: data.count + 1 });
        return true;
    });
}
