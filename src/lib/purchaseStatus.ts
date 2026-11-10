// src/lib/purchaseStatus.ts
import type { Expense } from '@/types';

// Status de compra de uma despesa: "comprado de fato" vs. "só orçamento".
// Campo ausente (despesa anterior a essa feature, ou criada por outro fluxo
// como o card de sugestão da IA) conta como pendente — decisão de produto:
// tudo começa como orçamento e o usuário marca manualmente o que comprou.
export type PurchaseFilter = 'all' | 'purchased' | 'pending';

export function isPurchased(expense: Pick<Expense, 'purchased'>): boolean {
    return expense.purchased === true;
}

export function matchesPurchaseFilter(expense: Pick<Expense, 'purchased'>, filter: PurchaseFilter): boolean {
    if (filter === 'all') return true;
    return filter === 'purchased' ? isPurchased(expense) : !isPurchased(expense);
}

export interface PurchaseSummary {
    purchasedCount: number;
    pendingCount: number;
    totalCount: number;
    purchasedBRL: number;
    pendingBRL: number;
    totalBRL: number;
    // 0–100, por quantidade de itens (o rótulo da UI é "X de Y comprados").
    percentPurchased: number;
}

export function summarizePurchases(expenses: Pick<Expense, 'purchased' | 'amountBRL'>[]): PurchaseSummary {
    let purchasedCount = 0;
    let pendingCount = 0;
    let purchasedBRL = 0;
    let pendingBRL = 0;

    for (const expense of expenses) {
        const amount = Number(expense.amountBRL) || 0;
        if (isPurchased(expense)) {
            purchasedCount += 1;
            purchasedBRL += amount;
        } else {
            pendingCount += 1;
            pendingBRL += amount;
        }
    }

    const totalCount = purchasedCount + pendingCount;
    return {
        purchasedCount,
        pendingCount,
        totalCount,
        purchasedBRL,
        pendingBRL,
        totalBRL: purchasedBRL + pendingBRL,
        percentPurchased: totalCount > 0 ? Math.round((purchasedCount / totalCount) * 100) : 0,
    };
}
