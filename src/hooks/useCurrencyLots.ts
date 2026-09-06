// src/hooks/useCurrencyLots.ts
import { useEffect, useState } from 'react';
import { db } from '@/config/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import type { CurrencyLot } from '@/types';

// Busca os lotes de uma lista de donos de uma vez (o próprio usuário +
// parceiros de carteira compartilhada mútua, ver lib/walletShares.ts) —
// sem filtro de tripId, a tela /wallet é global, agrupa por viagem no
// componente. `in` do Firestore aceita até 10 valores — sem risco real de
// alguém compartilhar com mais de 9 pessoas.
export function useCurrencyLots(ownerUids: string[]) {
    const [lots, setLots] = useState<CurrencyLot[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const uidsKey = [...ownerUids].sort().join(',');

    useEffect(() => {
        if (ownerUids.length === 0) {
            setLots([]);
            setLoading(false);
            return;
        }

        setError(null);
        const q = query(
            collection(db, 'currency_lots'),
            where('ownerUid', 'in', ownerUids),
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uidsKey]);

    return { lots, loading, error };
}
