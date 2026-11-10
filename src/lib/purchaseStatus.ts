// src/lib/purchaseStatus.ts
import type { Expense } from '@/types';

// Status de compra de uma despesa: "comprado de fato" vs. "só orçamento".
// Campo ausente (despesa anterior a essa feature, ou criada por outro fluxo
// como o card de sugestão da IA) conta como pendente — decisão de produto:
// tudo começa como orçamento e o usuário marca manualmente o que comprou.
export type PurchaseFilter = 'all' | 'purchased' | 'pending';

export function isPurchased(expense: Pick<Expense, 'purchased'>): boolean {
    return expense.purchased === true;
}

export function matchesPurchaseFilter(expense: Pick<Expense, 'purchased'>, filter: PurchaseFilter): boolean {
    if (filter === 'all') return true;
    return filter === 'purchased' ? isPurchased(expense) : !isPurchased(expense);
}

export interface PurchaseSummary {
    purchasedCount: number;
    pendingCount: number;
    totalCount: number;
    purchasedBRL: number;
    pendingBRL: number;
    totalBRL: number;
    // 0–100, por quantidade de itens (o rótulo da UI é "X de Y comprados").
    percentPurchased: number;
}

export function summarizePurchases(expenses: Pick<Expense, 'purchased' | 'amountBRL'>[]): PurchaseSummary {
    let purchasedCount = 0;
    let pendingCount = 0;
    let purchasedBRL = 0;
    let pendingBRL = 0;

    for (const expense of expenses) {
        const amount = Number(expense.amountBRL) || 0;
        if (isPurchased(expense)) {
            purchasedCount += 1;
            purchasedBRL += amount;
        } else {
            pendingCount += 1;
            pendingBRL += amount;
        }
    }

    const totalCount = purchasedCount + pendingCount;
    return {
        purchasedCount,
        pendingCount,
        totalCount,
        purchasedBRL,
        pendingBRL,
        totalBRL: purchasedBRL + pendingBRL,
        percentPurchased: totalCount > 0 ? Math.round((purchasedCount / totalCount) * 100) : 0,
    };
}

export interface PurchaseValueUpdate {
    amountOriginal: number;
    amountBRL: number;
    exchangeRateUsed: number;
    baseRateAtTime: number;
    spreadApplied: number;
}

// Ao marcar como comprado o usuário confirma o valor real. Devolve os campos
// de valor a gravar, ou `null` se o valor não mudou (aí a cotação histórica
// da despesa fica intacta — só o status muda). Mesma regra do AddExpenseDialog
// ao editar: despesa não-BRL sempre usa a cotação de mercado do momento, sem
// spread. Se a cotação do momento não estiver disponível, cai na taxa que a
// própria despesa já tinha em vez de assumir 1 (que errava o valor em moeda
// estrangeira).
export function buildPurchaseValueUpdate(
    expense: Pick<Expense, 'amountOriginal' | 'amountBRL' | 'currency' | 'exchangeRateUsed'>,
    newAmount: number,
    marketRate: number | undefined
): PurchaseValueUpdate | null {
    if (!(newAmount > 0)) return null;
    if (Math.abs(newAmount - (Number(expense.amountOriginal) || 0)) < 0.005) return null;

    let rate = 1;
    if (expense.currency !== 'BRL') {
        const previousRate = Number(expense.exchangeRateUsed)
            || (Number(expense.amountOriginal) > 0 ? Number(expense.amountBRL) / Number(expense.amountOriginal) : 1);
        rate = marketRate && marketRate > 0 ? marketRate : previousRate || 1;
    }

    return {
        amountOriginal: newAmount,
        amountBRL: newAmount * rate,
        exchangeRateUsed: rate,
        baseRateAtTime: rate,
        spreadApplied: 0,
    };
}

// Ordem de exibição das categorias no painel por categoria: as que costumam
// exigir reserva antecipada primeiro (Hospedagem, Passagens...), depois o resto.
// Categoria fora da lista (a categoria é texto livre) vai ao final, em ordem alfabética.
const CATEGORY_DISPLAY_ORDER = ['Hospedagem', 'Passagens', 'Transporte', 'Passeios', 'Alimentação', 'Lazer', 'Compras', 'Outros'];

export interface CategoryPurchaseGroup<T extends Pick<Expense, 'category' | 'purchased' | 'amountBRL'>> {
    category: string;
    // Pendentes primeiro (é o que pede ação), depois comprados; dentro de cada
    // bloco, por data e depois descrição.
    items: T[];
    summary: PurchaseSummary;
}

export function groupPurchasesByCategory<T extends Pick<Expense, 'category' | 'purchased' | 'amountBRL' | 'description'> & { date?: string }>(
    expenses: T[]
): CategoryPurchaseGroup<T>[] {
    const byCategory = new Map<string, T[]>();
    for (const expense of expenses) {
        const key = expense.category || 'Outros';
        const list = byCategory.get(key);
        if (list) list.push(expense);
        else byCategory.set(key, [expense]);
    }

    const rank = (category: string) => {
        const index = CATEGORY_DISPLAY_ORDER.indexOf(category);
        return index === -1 ? CATEGORY_DISPLAY_ORDER.length : index;
    };

    return Array.from(byCategory.entries())
        .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b, 'pt-BR'))
        .map(([category, items]) => ({
            category,
            items: [...items].sort((a, b) => {
                const byStatus = Number(isPurchased(a)) - Number(isPurchased(b));
                if (byStatus !== 0) return byStatus;
                // Sem data (despesa antiga) vai pro fim do bloco.
                const byDate = (a.date || '￿').localeCompare(b.date || '￿');
                return byDate || a.description.localeCompare(b.description, 'pt-BR');
            }),
            summary: summarizePurchases(items),
        }));
}
