import { describe, it, expect } from 'vitest';
import { isPurchased, matchesPurchaseFilter, summarizePurchases } from './purchaseStatus';

describe('isPurchased', () => {
    it('só true explícito conta como comprado', () => {
        expect(isPurchased({ purchased: true })).toBe(true);
        expect(isPurchased({ purchased: false })).toBe(false);
        expect(isPurchased({})).toBe(false);
    });
});

describe('matchesPurchaseFilter', () => {
    it('"all" aceita tudo', () => {
        expect(matchesPurchaseFilter({ purchased: true }, 'all')).toBe(true);
        expect(matchesPurchaseFilter({}, 'all')).toBe(true);
    });

    it('"purchased" aceita só comprados', () => {
        expect(matchesPurchaseFilter({ purchased: true }, 'purchased')).toBe(true);
        expect(matchesPurchaseFilter({ purchased: false }, 'purchased')).toBe(false);
        expect(matchesPurchaseFilter({}, 'purchased')).toBe(false);
    });

    it('"pending" aceita false e ausente (despesa antiga)', () => {
        expect(matchesPurchaseFilter({ purchased: false }, 'pending')).toBe(true);
        expect(matchesPurchaseFilter({}, 'pending')).toBe(true);
        expect(matchesPurchaseFilter({ purchased: true }, 'pending')).toBe(false);
    });
});

describe('summarizePurchases', () => {
    it('lista vazia: tudo zerado, sem dividir por zero', () => {
        expect(summarizePurchases([])).toEqual({
            purchasedCount: 0,
            pendingCount: 0,
            totalCount: 0,
            purchasedBRL: 0,
            pendingBRL: 0,
            totalBRL: 0,
            percentPurchased: 0,
        });
    });

    it('separa comprado de pendente (incluindo campo ausente) e soma os valores', () => {
        const summary = summarizePurchases([
            { purchased: true, amountBRL: 3200 },
            { purchased: true, amountBRL: 2800 },
            { purchased: false, amountBRL: 3000 },
            { amountBRL: 3200 },
        ]);
        expect(summary.purchasedCount).toBe(2);
        expect(summary.pendingCount).toBe(2);
        expect(summary.totalCount).toBe(4);
        expect(summary.purchasedBRL).toBe(6000);
        expect(summary.pendingBRL).toBe(6200);
        expect(summary.totalBRL).toBe(12200);
        expect(summary.percentPurchased).toBe(50);
    });

    it('valor inválido/ausente conta como 0 em vez de gerar NaN', () => {
        const summary = summarizePurchases([
            { purchased: true, amountBRL: NaN },
            // @ts-expect-error dado real malformado sem amountBRL
            { purchased: false },
        ]);
        expect(summary.totalBRL).toBe(0);
        expect(summary.totalCount).toBe(2);
    });

    it('tudo comprado = 100%', () => {
        expect(summarizePurchases([{ purchased: true, amountBRL: 10 }]).percentPurchased).toBe(100);
    });
});
