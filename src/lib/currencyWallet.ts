// src/lib/currencyWallet.ts
import type { CurrencyLot, Expense } from '@/types';

export interface WalletDemandItem {
    expenseId: string;
    description: string;
    amountNeeded: number;
}

export interface WalletOwnerContribution {
    ownerUid: string;
    amount: number;
}

export interface WalletCurrencySummary {
    currency: string;
    totalPurchased: number;
    totalNeeded: number;
    shortfall: number; // max(0, totalNeeded - totalPurchased)
    items: WalletDemandItem[];
    purchasedByOwner: WalletOwnerContribution[]; // breakdown pra carteira compartilhada (ver lib/walletShares.ts)
}

// Planejamento, não consumo real: soma quanto já foi comprado (lotes) vs.
// quanto as despesas marcadas "carteira" precisam (currency/amountOriginal
// de cada uma), por moeda. Nunca bloqueia — o que falta só vira um número
// (shortfall) e a lista de despesas que compõem a demanda (motivo). `lots`/
// `walletExpenses` já vêm filtrados pelo chamador pro pool certo (só o
// próprio usuário, ou usuário + parceiros de carteira mútua) — esta função
// não sabe nem precisa saber de compartilhamento, só agrupa por dono.
export function summarizeWalletDemand(lots: CurrencyLot[], walletExpenses: Expense[]): WalletCurrencySummary[] {
    const currencies = new Set([...lots.map((l) => l.currency), ...walletExpenses.map((e) => e.currency)]);

    return Array.from(currencies).map((currency) => {
        const lotsInCurrency = lots.filter((l) => l.currency === currency);
        const totalPurchased = lotsInCurrency.reduce((sum, l) => sum + l.amountPurchased, 0);

        const purchasedByOwnerMap = new Map<string, number>();
        for (const lot of lotsInCurrency) {
            purchasedByOwnerMap.set(lot.ownerUid, (purchasedByOwnerMap.get(lot.ownerUid) || 0) + lot.amountPurchased);
        }
        const purchasedByOwner: WalletOwnerContribution[] = Array.from(purchasedByOwnerMap.entries())
            .map(([ownerUid, amount]) => ({ ownerUid, amount }));

        const expensesInCurrency = walletExpenses.filter((e) => e.currency === currency);
        const totalNeeded = expensesInCurrency.reduce((sum, e) => sum + e.amountOriginal, 0);
        const items: WalletDemandItem[] = expensesInCurrency.map((e) => ({
            expenseId: e.id,
            description: e.description,
            amountNeeded: e.amountOriginal,
        }));

        return {
            currency,
            totalPurchased,
            totalNeeded,
            shortfall: Math.max(0, totalNeeded - totalPurchased),
            items,
            purchasedByOwner,
        };
    });
}
