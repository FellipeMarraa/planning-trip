// src/lib/settlementAllocation.ts
import { computeEqualShare } from '@/hooks/useTripBalances';
import type { Expense, Settlement, SettlementAllocation } from '@/types';

// Quanto ainda falta uma pessoa pagar de uma despesa específica — cota
// original menos tudo que já foi alocado a ela nessa despesa por qualquer
// acerto da viagem. Fonte única usada tanto pra exibir a lista detalhada
// quanto pra saber quanto sobrou antes de auto-alocar um pagamento novo.
export function getExpenseRemaining(expense: Expense, uid: string, settlements: Settlement[]): number {
    const share = computeEqualShare(expense.amountBRL, (expense.participants || []).length);
    const allocated = settlements
        .flatMap((s) => s.allocations || [])
        .filter((a) => a.expenseId === expense.id && a.uid === uid)
        .reduce((sum, a) => sum + a.amount, 0);
    return Math.max(0, share - allocated);
}

interface AllocatableItem {
    expenseId: string;
    remaining: number;
    date: string;
}

// Distribui um pagamento livre entre as dívidas de uma pessoa, sempre da
// despesa mais antiga (por data) pra mais nova — cobre uma cota inteira e
// segue pra próxima até o valor acabar; a última cota tocada pode ficar
// parcialmente coberta.
export function allocatePayment(amount: number, uid: string, items: AllocatableItem[]): SettlementAllocation[] {
    const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
    const allocations: SettlementAllocation[] = [];
    let remainingAmount = amount;

    for (const item of sorted) {
        if (remainingAmount <= 0.01) break;
        if (item.remaining <= 0.01) continue;

        const applied = Math.min(remainingAmount, item.remaining);
        allocations.push({ expenseId: item.expenseId, uid, amount: applied });
        remainingAmount -= applied;
    }

    return allocations;
}
