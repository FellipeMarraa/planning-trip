// src/hooks/useWalletExpenses.ts
import { useEffect, useState } from 'react';
import { db } from '@/config/firebase';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import type { Expense } from '@/types';

// Todas as despesas em moeda estrangeira em que uma lista de uids (o
// próprio usuário + parceiros de carteira compartilhada mútua) é
// PARTICIPANTE da divisão — não quem pagou. Cada participante precisa ter
// em mãos a própria cota da despesa em moeda local, independente de quem
// registrou como paidBy (achado real: filtrar só por paidBy deixava a
// despesa inteira de fora da carteira de quem divide mas não pagou).
// `array-contains-any` aceita até 10 valores — mesmo teto de useCurrencyLots.
// Filtro de moeda != BRL é client-side (evita índice composto novo só pra
// essa tela; expenses já tem índices pra paginação normal da viagem, ver
// FIREBASE.md).
export function useWalletExpenses(poolUids: string[]) {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const uidsKey = [...poolUids].sort().join(',');

    useEffect(() => {
        if (poolUids.length === 0) {
            setExpenses([]);
            setLoading(false);
            return;
        }

        setError(null);
        const q = query(
            collection(db, 'expenses'),
            where('participants', 'array-contains-any', poolUids),
            limit(500)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs
                    .map((d) => ({ id: d.id, ...d.data() })) as Expense[];
                setExpenses(data.filter((e) => e.currency !== 'BRL'));
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
