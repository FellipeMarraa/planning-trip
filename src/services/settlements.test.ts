import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mesmo padrão de mock do SDK usado em services/trips.test.ts.
const { mockDeleteDoc, mockUpdateDoc } = vi.hoisted(() => ({
    mockDeleteDoc: vi.fn().mockResolvedValue(undefined),
    mockUpdateDoc: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/config/firebase', () => ({ db: {} }));

vi.mock('firebase/firestore', () => ({
    doc: vi.fn((_db, collectionName: string, id: string) => ({ __ref: true, collectionName, id })),
    collection: vi.fn(),
    addDoc: vi.fn(),
    deleteDoc: mockDeleteDoc,
    updateDoc: mockUpdateDoc,
    serverTimestamp: vi.fn(),
}));

import { undoExpensePayment } from './settlements';
import type { Settlement } from '@/types';

function settlement(overrides: Partial<Settlement> = {}): Settlement {
    return {
        id: 's1',
        tripId: 'trip1',
        from: 'bruno',
        to: 'carla',
        amount: 20,
        createdAt: 0,
        ...overrides,
    };
}

beforeEach(() => {
    mockDeleteDoc.mockClear();
    mockUpdateDoc.mockClear();
});

describe('undoExpensePayment', () => {
    it('apaga o acerto inteiro se ele cobria só essa cota', async () => {
        const s = settlement({ id: 's1', amount: 20, allocations: [{ expenseId: 'cafe', uid: 'bruno', amount: 20 }] });

        await undoExpensePayment('cafe', 'bruno', [s]);

        expect(mockDeleteDoc).toHaveBeenCalledWith(expect.objectContaining({ collectionName: 'settlements', id: 's1' }));
        expect(mockUpdateDoc).not.toHaveBeenCalled();
    });

    it('remove só a alocação e reduz o valor se o acerto cobria mais de uma despesa', async () => {
        const s = settlement({
            id: 's1',
            amount: 30,
            allocations: [
                { expenseId: 'cafe', uid: 'bruno', amount: 10 },
                { expenseId: 'sanduiche', uid: 'bruno', amount: 20 },
            ],
        });

        await undoExpensePayment('cafe', 'bruno', [s]);

        expect(mockUpdateDoc).toHaveBeenCalledWith(
            expect.objectContaining({ collectionName: 'settlements', id: 's1' }),
            { amount: 20, allocations: [{ expenseId: 'sanduiche', uid: 'bruno', amount: 20 }] }
        );
        expect(mockDeleteDoc).not.toHaveBeenCalled();
    });

    it('não mexe em acertos de outra despesa ou de outro uid', async () => {
        const other1 = settlement({ id: 's-other1', allocations: [{ expenseId: 'sanduiche', uid: 'bruno', amount: 15 }] });
        const other2 = settlement({ id: 's-other2', allocations: [{ expenseId: 'cafe', uid: 'ana', amount: 5 }] });

        await undoExpensePayment('cafe', 'bruno', [other1, other2]);

        expect(mockDeleteDoc).not.toHaveBeenCalled();
        expect(mockUpdateDoc).not.toHaveBeenCalled();
    });

    it('acerto "livre" sem allocations não é afetado (nada pra desfazer ali)', async () => {
        const s = settlement({ allocations: undefined });

        await undoExpensePayment('cafe', 'bruno', [s]);

        expect(mockDeleteDoc).not.toHaveBeenCalled();
        expect(mockUpdateDoc).not.toHaveBeenCalled();
    });
});
