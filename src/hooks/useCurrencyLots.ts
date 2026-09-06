// src/hooks/useCurrencyLots.ts
import { useEffect, useState } from 'react';
import { db } from '@/config/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import type { CurrencyLot } from '@/types';

// Busca TODOS os lotes do usuário de uma vez (sem filtro de tripId) — a
// tela /wallet é global, agrupa por viagem no componente. Mesmo espírito
// de useUserTrips.ts (where + limit como teto de segurança).
export function useCurrencyLots() {
    const { user } = useAuth();
    const [lots, setLots] = useState<CurrencyLot[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;

        setError(null);
        const q = query(
            collection(db, 'currency_lots'),
            where('ownerUid', '==', user.uid),
            orderBy('purchaseDate', 'desc'),
            limit(500)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as CurrencyLot[];
                setLots(data);
                setLoading(false);
            },
            (err) => {
                console.error('Erro ao carregar carteira de câmbio:', err);
                setError('Não foi possível carregar sua carteira de câmbio.');
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user]);

    return { lots, loading, error };
}
