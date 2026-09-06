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

function participantShare(expense: Expense): number {
    return expense.amountOriginal / (expense.participants.length || 1);
}

// Planejamento, não consumo real: soma quanto já foi comprado (lotes) vs.
// quanto o pool precisa (cota de cada membro do pool nas despesas em que
// ele DIVIDE, não o valor cheio da despesa) — cada participante precisa ter
// em mãos a própria cota em moeda local, independente de quem pagou. Uma
// despesa de €750 dividida em 3 conta €250 se só 1 membro do pool participa
// dela, ou €500 se 2 membros do pool participam. `walletExpenses` já vem
// filtrado pelo chamador pra moeda != BRL (ver WalletPage.tsx — busca por
// tripId via useTrip, nunca por participants/paidBy diretamente: uma query
// cruzando uid de terceiro nesse campo é rejeitada pelo Firestore, ver
// firestore.rules) — pode conter despesa onde nem todo mundo do pool participa.
export function summarizeWalletDemand(lots: CurrencyLot[], walletExpenses: Expense[], poolUids: string[]): WalletCurrencySummary[] {
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
        const items: WalletDemandItem[] = expensesInCurrency
            .map((e) => {
                const poolParticipants = e.participants.filter((p) => poolUids.includes(p)).length;
                return {
                    expenseId: e.id,
                    description: e.description,
                    amountNeeded: participantShare(e) * poolParticipants,
                };
            })
            .filter((item) => item.amountNeeded > 0);
        const totalNeeded = items.reduce((sum, item) => sum + item.amountNeeded, 0);

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
