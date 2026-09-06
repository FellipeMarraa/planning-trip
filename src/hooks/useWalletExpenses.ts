// src/hooks/useWalletExpenses.ts
import { useEffect, useState } from 'react';
import { db } from '@/config/firebase';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import type { Expense } from '@/types';

// Todas as despesas pagas pelo usuário, marcadas "carteira" — filtro de
// paidFromWallet é client-side (evita índice composto novo só pra essa
// tela; expenses já tem índices pra paginação normal da viagem, ver
// FIREBASE.md). limit(500) como teto de segurança, mesmo padrão do resto.
export function useWalletExpenses() {
    const { user } = useAuth();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;

        setError(null);
        const q = query(
            collection(db, 'expenses'),
            where('paidBy', '==', user.uid),
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
    }, [user]);

    return { expenses, loading, error };
}
