// src/hooks/useCurrencyLots.ts
import { useEffect, useState } from 'react';
import { db } from '@/config/firebase';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import type { CurrencyLot } from '@/types';

// Busca por tripId (não por ownerUid/`in`) — achado real: uma query
// `where('ownerUid','in',uids)` cruzando o uid de um parceiro de carteira
// compartilhada falha com "Missing or insufficient permissions", porque o
// Firestore só permite uma query de lista quando o campo que ela filtra
// corresponde a um campo que a regra de leitura realmente checa pra provar
// a query segura sem avaliar documento por documento fora desse campo.
// `tripId` aparece direto na regra (`canEdit(resource.data.tripId)` /
// `hasMutualWalletShare(resource.data.tripId, ...)`), então filtrar por ele
// sempre passa — quem é dono de cada lote é filtrado client-side depois
// (`poolUids.includes(ownerUid)`, ver WalletPage.tsx). Sem orderBy (evita
// índice composto novo) — ordenação por data, se precisar, é client-side.
export function useCurrencyLots(tripId: string) {
    const [lots, setLots] = useState<CurrencyLot[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!tripId) {
            setLots([]);
            setLoading(false);
            return;
        }

        setError(null);
        const q = query(
            collection(db, 'currency_lots'),
            where('tripId', '==', tripId),
            limit(200)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as CurrencyLot[];
                data.sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));
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
    }, [tripId]);

    return { lots, loading, error };
}
