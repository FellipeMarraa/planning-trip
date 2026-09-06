// src/lib/currencyWallet.ts
import type { CurrencyLot, Expense } from '@/types';

export interface WalletDemandItem {
    expenseId: string;
    description: string;
    amountNeeded: number;
}

export interface WalletCurrencySummary {
    currency: string;
    totalPurchased: number;
    totalNeeded: number;
    shortfall: number; // max(0, totalNeeded - totalPurchased)
    items: WalletDemandItem[];
}

// Planejamento, não consumo real: soma quanto já foi comprado (lotes) vs.
// quanto as despesas marcadas "carteira" precisam (currency/amountOriginal
// de cada uma), por moeda. Nunca bloqueia — o que falta só vira um número
// (shortfall) e a lista de despesas que compõem a demanda (motivo).
export function summarizeWalletDemand(lots: CurrencyLot[], walletExpenses: Expense[]): WalletCurrencySummary[] {
    const currencies = new Set([...lots.map((l) => l.currency), ...walletExpenses.map((e) => e.currency)]);

    return Array.from(currencies).map((currency) => {
        const totalPurchased = lots
            .filter((l) => l.currency === currency)
            .reduce((sum, l) => sum + l.amountPurchased, 0);

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
        };
    });
}
