// src/hooks/useTripBalances.ts
import { useMemo } from 'react';
import type { Expense, Settlement } from '@/types';

// Extraído do useMemo como função pura exportada só pra ser testável sem
// infra de teste de hook (jsdom/@testing-library/react) — mesmo padrão do
// CashZ (ver src/lib/goalAnalysis.ts de lá): testa a função, não o hook.
// useTripBalances abaixo é só o wrapper de memoização.
export function computeTripBalances(participants: string[], expenses: Expense[], settlements: Settlement[]): Record<string, number> {
    const balances: Record<string, number> = {};
    participants.forEach((uid) => { balances[uid] = 0; });

    expenses.forEach((exp) => {
        const amount = Number(exp.amountBRL) || 0;
        const splitWith = exp.participants || [];
        const share = amount / (splitWith.length || 1);

        splitWith.forEach((uid) => {
            if (uid === exp.paidBy) return;
            if (!(uid in balances)) balances[uid] = 0;
            if (!(exp.paidBy in balances)) balances[exp.paidBy] = 0;
            balances[uid] -= share;
            balances[exp.paidBy] += share;
        });
    });

    settlements.forEach((settle) => {
        if (!(settle.from in balances)) balances[settle.from] = 0;
        if (!(settle.to in balances)) balances[settle.to] = 0;
        balances[settle.from] += settle.amount;
        balances[settle.to] -= settle.amount;
    });

    return balances;
}

export function useTripBalances(participants: string[], expenses: Expense[], settlements: Settlement[]) {
    return useMemo(
        () => computeTripBalances(participants, expenses, settlements),
        [participants, expenses, settlements]
    );
}
