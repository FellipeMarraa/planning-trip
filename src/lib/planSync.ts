import type { User } from 'firebase/auth';

const CASHZ_PLAN_STATUS_URL = 'https://cashz.vercel.app/api/auth/plan-status';

// Sincroniza o status de plano do CashZ pro doc users/{uid} deste app —
// necessário pra quem loga direto no planning-trip (Google popup) sem passar
// pelo fluxo de SSO, que já faz essa sincronização do próprio lado do CashZ.
// Fire-and-forget: falha aqui não deve travar login nem UI, só loga.
export async function syncPlanFromCashz(user: User): Promise<void> {
    try {
        const idToken = await user.getIdToken();
        await fetch(CASHZ_PLAN_STATUS_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${idToken}` },
        });
    } catch (error) {
        console.error('Erro ao sincronizar status de plano com o CashZ:', error);
    }
}
