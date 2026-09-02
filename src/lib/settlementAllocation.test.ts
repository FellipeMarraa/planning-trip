import { describe, it, expect } from 'vitest';
import { getExpenseRemaining, allocatePayment } from './settlementAllocation';
import type { Expense, Settlement } from '@/types';

function expense(overrides: Partial<Expense> = {}): Expense {
    return {
        id: 'exp1',
        tripId: 'trip1',
        description: 'Café',
        category: 'Alimentação',
        amountOriginal: 20,
        currency: 'BRL',
        amountBRL: 20,
        paidBy: 'carla',
        participants: ['carla', 'bruno'],
        date: '2027-01-05',
        ...overrides,
    };
}

function settlement(overrides: Partial<Settlement> = {}): Settlement {
    return {
        id: 's1',
        tripId: 'trip1',
        from: 'bruno',
        to: 'carla',
        amount: 10,
        createdAt: 0,
        ...overrides,
    };
}

describe('getExpenseRemaining', () => {
    it('sem nenhum acerto, retorna a cota cheia', () => {
        const exp = expense();
        expect(getExpenseRemaining(exp, 'bruno', [])).toBe(10);
    });

    it('acerto com allocation cobrindo a cota inteira zera o restante', () => {
        const exp = expense();
        const s = settlement({ allocations: [{ expenseId: 'exp1', uid: 'bruno', amount: 10 }] });
        expect(getExpenseRemaining(exp, 'bruno', [s])).toBe(0);
    });

    it('acerto com allocation parcial deixa saldo residual', () => {
        const exp = expense();
        const s = settlement({ amount: 4, allocations: [{ expenseId: 'exp1', uid: 'bruno', amount: 4 }] });
        expect(getExpenseRemaining(exp, 'bruno', [s])).toBe(6);
    });

    it('allocation de outra despesa ou outro uid não afeta esta cota', () => {
        const exp = expense();
        const sOtherExpense = settlement({ allocations: [{ expenseId: 'exp2', uid: 'bruno', amount: 10 }] });
        const sOtherUid = settlement({ allocations: [{ expenseId: 'exp1', uid: 'ana', amount: 10 }] });
        expect(getExpenseRemaining(exp, 'bruno', [sOtherExpense, sOtherUid])).toBe(10);
    });

    it('acerto "livre" (sem allocations) não afeta a cota individual', () => {
        // Acertos sem allocations abatem do total genérico (tratado em
        // MemberDebtModal), nunca de uma cota específica.
        const exp = expense();
        const s = settlement({ allocations: undefined });
        expect(getExpenseRemaining(exp, 'bruno', [s])).toBe(10);
    });
});

describe('allocatePayment', () => {
    it('cobre a despesa mais antiga primeiro', () => {
        const items = [
            { expenseId: 'sanduiche', remaining: 50, date: '2027-01-10' },
            { expenseId: 'cafe', remaining: 20, date: '2027-01-05' },
        ];

        const allocations = allocatePayment(10, 'bruno', items);

        expect(allocations).toEqual([{ expenseId: 'cafe', uid: 'bruno', amount: 10 }]);
    });

    it('cobre a mais antiga inteira e o resto vai pra próxima', () => {
        const items = [
            { expenseId: 'sanduiche', remaining: 50, date: '2027-01-10' },
            { expenseId: 'cafe', remaining: 20, date: '2027-01-05' },
        ];

        const allocations = allocatePayment(25, 'bruno', items);

        expect(allocations).toEqual([
            { expenseId: 'cafe', uid: 'bruno', amount: 20 },
            { expenseId: 'sanduiche', uid: 'bruno', amount: 5 },
        ]);
    });

    it('ignora itens já zerados', () => {
        const items = [
            { expenseId: 'cafe', remaining: 0, date: '2027-01-05' },
            { expenseId: 'sanduiche', remaining: 50, date: '2027-01-10' },
        ];

        const allocations = allocatePayment(30, 'bruno', items);

        expect(allocations).toEqual([{ expenseId: 'sanduiche', uid: 'bruno', amount: 30 }]);
    });

    it('valor maior que a soma das dívidas aloca só até cobrir tudo', () => {
        const items = [{ expenseId: 'cafe', remaining: 20, date: '2027-01-05' }];

        const allocations = allocatePayment(100, 'bruno', items);

        expect(allocations).toEqual([{ expenseId: 'cafe', uid: 'bruno', amount: 20 }]);
    });

    it('não quebra com despesa sem `date` (dado anterior ao campo existir)', () => {
        const items = [
            { expenseId: 'sanduiche', remaining: 50, date: '2027-01-10' },
            { expenseId: 'cafe-antigo', remaining: 20, date: undefined as unknown as string },
        ];

        expect(() => allocatePayment(10, 'bruno', items)).not.toThrow();
    });
});
