import { describe, it, expect } from 'vitest';
import { summarizeWalletDemand } from './currencyWallet';
import type { CurrencyLot, Expense } from '@/types';

function lot(overrides: Partial<CurrencyLot> = {}): CurrencyLot {
    return {
        id: 'lot1',
        tripId: 'trip1',
        ownerUid: 'u1',
        currency: 'EUR',
        amountPurchased: 100,
        ratePaidBRL: 5.5,
        purchaseDate: '2026-01-01',
        createdAt: 0,
        ...overrides,
    };
}

function expense(overrides: Partial<Expense> = {}): Expense {
    return {
        id: 'exp1',
        tripId: 'trip1',
        description: 'Jantar',
        category: 'Alimentação',
        amountOriginal: 50,
        currency: 'EUR',
        amountBRL: 297.5,
        paidBy: 'u1',
        participants: ['u1', 'u2'],
        date: '2026-06-01T20:00',
        paidFromWallet: true,
        ...overrides,
    };
}

describe('summarizeWalletDemand', () => {
    it('sem lote nem despesa: lista vazia', () => {
        expect(summarizeWalletDemand([], [])).toEqual([]);
    });

    it('comprado cobre o necessário: shortfall zero', () => {
        const result = summarizeWalletDemand([lot({ amountPurchased: 100 })], [expense({ amountOriginal: 50 })]);
        expect(result).toEqual([{
            currency: 'EUR',
            totalPurchased: 100,
            totalNeeded: 50,
            shortfall: 0,
            items: [{ expenseId: 'exp1', description: 'Jantar', amountNeeded: 50 }],
        }]);
    });

    it('comprado não cobre: shortfall = necessário - comprado', () => {
        const result = summarizeWalletDemand([lot({ amountPurchased: 100 })], [
            expense({ id: 'transporte', description: 'Transporte', amountOriginal: 400 }),
            expense({ id: 'alimentacao', description: 'Alimentação', amountOriginal: 500 }),
        ]);

        expect(result).toHaveLength(1);
        expect(result[0].totalPurchased).toBe(100);
        expect(result[0].totalNeeded).toBe(900);
        expect(result[0].shortfall).toBe(800);
        expect(result[0].items).toEqual([
            { expenseId: 'transporte', description: 'Transporte', amountNeeded: 400 },
            { expenseId: 'alimentacao', description: 'Alimentação', amountNeeded: 500 },
        ]);
    });

    it('soma vários lotes da mesma moeda', () => {
        const result = summarizeWalletDemand([
            lot({ id: 'l1', amountPurchased: 100 }),
            lot({ id: 'l2', amountPurchased: 50 }),
        ], []);
        expect(result[0].totalPurchased).toBe(150);
    });

    it('agrupa por moeda separadamente', () => {
        const result = summarizeWalletDemand(
            [lot({ currency: 'EUR', amountPurchased: 100 }), lot({ currency: 'USD', amountPurchased: 200 })],
            [expense({ currency: 'EUR', amountOriginal: 50 }), expense({ id: 'exp2', currency: 'USD', amountOriginal: 300 })]
        );

        const eur = result.find((r) => r.currency === 'EUR')!;
        const usd = result.find((r) => r.currency === 'USD')!;
        expect(eur.shortfall).toBe(0);
        expect(usd.shortfall).toBe(100);
    });

    it('moeda só com lote (sem despesa carteira) aparece com necessário zero', () => {
        const result = summarizeWalletDemand([lot({ currency: 'GBP', amountPurchased: 30 })], []);
        expect(result).toEqual([{ currency: 'GBP', totalPurchased: 30, totalNeeded: 0, shortfall: 0, items: [] }]);
    });
});
