import { describe, it, expect } from 'vitest';
import { computeTripBalances, computeEqualShare } from './useTripBalances';
import type { Expense, Settlement } from '@/types';

describe('computeEqualShare', () => {
    it('divide igualmente entre os participantes', () => {
        expect(computeEqualShare(100, 4)).toBe(25);
    });

    it('não divide por zero (trata como 1 participante)', () => {
        expect(computeEqualShare(100, 0)).toBe(100);
    });

    it('trata amountBRL inválido/ausente como 0', () => {
        expect(computeEqualShare(NaN, 2)).toBe(0);
        // @ts-expect-error valor undefined vindo de dado real malformado
        expect(computeEqualShare(undefined, 2)).toBe(0);
    });
});

function expense(overrides: Partial<Expense> = {}): Expense {
    return {
        id: 'exp1',
        tripId: 'trip1',
        description: 'Teste',
        category: 'Geral',
        amountOriginal: 100,
        currency: 'BRL',
        amountBRL: 100,
        paidBy: 'a',
        participants: ['a', 'b'],
        date: '2027-01-01',
        ...overrides,
    };
}

function settlement(overrides: Partial<Settlement> = {}): Settlement {
    return {
        id: 'settle1',
        tripId: 'trip1',
        from: 'b',
        to: 'a',
        amount: 50,
        createdAt: 0,
        ...overrides,
    };
}

describe('computeTripBalances — despesa simples', () => {
    it('divide igualmente entre os participantes, quem pagou fica a receber', () => {
        const balances = computeTripBalances(['a', 'b'], [expense({ amountBRL: 100, paidBy: 'a', participants: ['a', 'b'] })], []);
        expect(balances.a).toBe(50);
        expect(balances.b).toBe(-50);
    });

    it('quem pagou não deve nada a si mesmo, mesmo estando na lista de participantes', () => {
        const balances = computeTripBalances(['a', 'b', 'c'], [expense({ amountBRL: 90, paidBy: 'a', participants: ['a', 'b', 'c'] })], []);
        expect(balances.a).toBe(60); // recebe de b e c, 30 cada
        expect(balances.b).toBe(-30);
        expect(balances.c).toBe(-30);
    });

    it('participante que não está em nenhuma despesa/acerto fica em 0', () => {
        const balances = computeTripBalances(['a', 'b', 'c'], [expense({ paidBy: 'a', participants: ['a', 'b'] })], []);
        expect(balances.c).toBe(0);
    });

    it('despesa sem participantes não quebra (divide por 1, não por 0)', () => {
        const balances = computeTripBalances(['a'], [expense({ amountBRL: 100, paidBy: 'a', participants: [] })], []);
        expect(balances.a).toBe(0);
    });

    it('participante fantasma (ghost_*) é tratado como qualquer uid', () => {
        const balances = computeTripBalances(
            ['a', 'ghost_123'],
            [expense({ amountBRL: 100, paidBy: 'a', participants: ['a', 'ghost_123'] })],
            []
        );
        expect(balances['ghost_123']).toBe(-50);
    });
});

describe('computeTripBalances — múltiplas despesas acumulam', () => {
    it('soma o saldo de várias despesas do mesmo par', () => {
        const balances = computeTripBalances(
            ['a', 'b'],
            [
                expense({ amountBRL: 100, paidBy: 'a', participants: ['a', 'b'] }),
                expense({ amountBRL: 60, paidBy: 'b', participants: ['a', 'b'] }),
            ],
            []
        );
        // a: +50 (pagou 100) -30 (deve de b) = +20
        expect(balances.a).toBe(20);
        expect(balances.b).toBe(-20);
    });
});

describe('computeTripBalances — settlements (acerto de dívida)', () => {
    it('quem paga o acerto (from) tem o saldo aumentado; quem recebe (to) diminuído', () => {
        const balances = computeTripBalances(
            ['a', 'b'],
            [expense({ amountBRL: 100, paidBy: 'a', participants: ['a', 'b'] })],
            [settlement({ from: 'b', to: 'a', amount: 50 })]
        );
        // b devia -50, pagou 50 no acerto → zera
        expect(balances.b).toBe(0);
        // a tinha +50 a receber, recebeu 50 no acerto → zera
        expect(balances.a).toBe(0);
    });

    it('acerto parcial deixa saldo residual', () => {
        const balances = computeTripBalances(
            ['a', 'b'],
            [expense({ amountBRL: 100, paidBy: 'a', participants: ['a', 'b'] })],
            [settlement({ from: 'b', to: 'a', amount: 20 })]
        );
        expect(balances.b).toBe(-30);
        expect(balances.a).toBe(30);
    });
});
