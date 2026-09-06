// src/hooks/useWalletExpenses.ts
import { useEffect, useState } from 'react';
import { db } from '@/config/firebase';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import type { Expense } from '@/types';

// Todas as despesas pagas por uma lista de uids (o próprio usuário +
// parceiros de carteira compartilhada mútua), marcadas "carteira". Filtro
// de paidFromWallet é client-side (evita índice composto novo só pra essa
// tela; expenses já tem índices pra paginação normal da viagem, ver
// FIREBASE.md). `in` aceita até 10 valores — mesmo teto de useCurrencyLots.
export function useWalletExpenses(paidByUids: string[]) {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const uidsKey = [...paidByUids].sort().join(',');

    useEffect(() => {
        if (paidByUids.length === 0) {
            setExpenses([]);
            setLoading(false);
            return;
        }

        setError(null);
        const q = query(
            collection(db, 'expenses'),
            where('paidBy', 'in', paidByUids),
            limit(500)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs
                    .map((d) => ({ id: d.id, ...d.data() })) as Expense[];
                setExpenses(data.filter((e) => e.paidFromWallet === true));
                setLoading(false);
            },
            (err) => {
                console.error('Erro ao carregar despesas da carteira:', err);
                setError('Não foi possível carregar suas despesas de carteira.');
                setLoading(false);
            }
        );

        return () => unsubscribe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uidsKey]);

    return { expenses, loading, error };
}
