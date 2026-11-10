import { describe, it, expect } from 'vitest';
import { buildPurchaseValueUpdate, groupPurchasesByCategory, isPurchased, matchesPurchaseFilter, summarizePurchases } from './purchaseStatus';

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

describe('buildPurchaseValueUpdate', () => {
    const brl = { amountOriginal: 3000, amountBRL: 3000, currency: 'BRL', exchangeRateUsed: 1 };
    const eur = { amountOriginal: 500, amountBRL: 3000, currency: 'EUR', exchangeRateUsed: 6 };

    it('valor igual (ou inválido) = null, preserva a cotação histórica', () => {
        expect(buildPurchaseValueUpdate(brl, 3000, undefined)).toBeNull();
        expect(buildPurchaseValueUpdate(eur, 500, 6.5)).toBeNull();
        expect(buildPurchaseValueUpdate(brl, 0, undefined)).toBeNull();
        expect(buildPurchaseValueUpdate(brl, NaN, undefined)).toBeNull();
    });

    it('BRL: amountBRL = novo valor, taxa 1', () => {
        expect(buildPurchaseValueUpdate(brl, 3450.5, 99)).toEqual({
            amountOriginal: 3450.5,
            amountBRL: 3450.5,
            exchangeRateUsed: 1,
            baseRateAtTime: 1,
            spreadApplied: 0,
        });
    });

    it('moeda estrangeira: converte pela cotação de mercado atual', () => {
        const update = buildPurchaseValueUpdate(eur, 600, 6.5)!;
        expect(update.amountOriginal).toBe(600);
        expect(update.exchangeRateUsed).toBe(6.5);
        expect(update.baseRateAtTime).toBe(6.5);
        expect(update.amountBRL).toBeCloseTo(3900);
        expect(update.spreadApplied).toBe(0);
    });

    it('moeda estrangeira sem cotação do momento: reaproveita a taxa da despesa (nunca 1)', () => {
        expect(buildPurchaseValueUpdate(eur, 600, undefined)!.exchangeRateUsed).toBe(6);
        expect(buildPurchaseValueUpdate(eur, 600, 0)!.amountBRL).toBeCloseTo(3600);
    });

    it('despesa antiga sem exchangeRateUsed: deduz a taxa de amountBRL/amountOriginal', () => {
        const legacy = { amountOriginal: 500, amountBRL: 3000, currency: 'EUR' };
        expect(buildPurchaseValueUpdate(legacy, 600, undefined)!.exchangeRateUsed).toBe(6);
    });
});

describe('groupPurchasesByCategory', () => {
    const item = (overrides: Record<string, unknown>) => ({
        description: 'Item',
        category: 'Hospedagem',
        amountBRL: 100,
        purchased: false,
        date: '2027-01-01T10:00',
        ...overrides,
    });

    it('lista vazia = sem grupos', () => {
        expect(groupPurchasesByCategory([])).toEqual([]);
    });

    it('agrupa por categoria, com Hospedagem/Passagens antes das demais e desconhecidas no fim', () => {
        const groups = groupPurchasesByCategory([
            item({ category: 'Compras' }),
            item({ category: 'Zumba' }),
            item({ category: 'Passagens' }),
            item({ category: 'Hospedagem' }),
            item({ category: 'Alimentação' }),
            item({ category: 'Atelier' }),
        ]);
        expect(groups.map((g) => g.category)).toEqual(['Hospedagem', 'Passagens', 'Alimentação', 'Compras', 'Atelier', 'Zumba']);
    });

    it('dentro do grupo: pendentes primeiro, depois comprados; cada bloco por data', () => {
        const [group] = groupPurchasesByCategory([
            item({ description: 'Madrid', purchased: true, date: '2027-03-01T00:00' }),
            item({ description: 'Roma', purchased: false, date: '2027-03-20T00:00' }),
            item({ description: 'Barcelona', purchased: true, date: '2027-03-05T00:00' }),
            item({ description: 'Paris', purchased: false, date: '2027-03-10T00:00' }),
        ]);
        expect(group.items.map((i) => i.description)).toEqual(['Paris', 'Roma', 'Madrid', 'Barcelona']);
    });

    it('despesa sem data vai para o fim do seu bloco', () => {
        const [group] = groupPurchasesByCategory([
            item({ description: 'Sem data', date: undefined }),
            item({ description: 'Com data', date: '2027-01-01T00:00' }),
        ]);
        expect(group.items.map((i) => i.description)).toEqual(['Com data', 'Sem data']);
    });

    it('resumo do grupo considera só os itens dele', () => {
        const groups = groupPurchasesByCategory([
            item({ category: 'Hospedagem', purchased: true, amountBRL: 3200 }),
            item({ category: 'Hospedagem', purchased: false, amountBRL: 3000 }),
            item({ category: 'Passagens', purchased: true, amountBRL: 500 }),
        ]);
        expect(groups[0].summary).toMatchObject({ purchasedCount: 1, pendingCount: 1, purchasedBRL: 3200, pendingBRL: 3000 });
        expect(groups[1].summary).toMatchObject({ purchasedCount: 1, pendingCount: 0, percentPurchased: 100 });
    });

    it('categoria vazia/ausente cai em "Outros"', () => {
        const [group] = groupPurchasesByCategory([item({ category: '' })]);
        expect(group.category).toBe('Outros');
    });
});
