// src/hooks/useCurrencyLots.ts
import { useEffect, useState } from 'react';
import { db } from '@/config/firebase';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import type { CurrencyLot } from '@/types';

// Precisa filtrar por tripId E por ownerUid juntos — nenhum dos dois sozinho
// prova a regra de leitura pro Firestore (achado real, 2 rodadas de bug):
// a regra de `currency_lots` é um OR que depende tanto de `tripId` quanto de
// `ownerUid` (`ownerUid == auth.uid` OU `hasMutualWalletShare(tripId, auth.uid,
// ownerUid)`, ver firestore.rules) — numa query de lista, o Firestore só
// libera se conseguir provar a regra pro "conjunto potencial de resultados"
// da query, não documento por documento com dado real. Filtrar só por tripId
// deixa `ownerUid` livre (poderia ser de qualquer outro participante da
// viagem, que a regra reprova) — nega tudo. Filtrar só por ownerUid (`in`)
// deixa `tripId` livre (poderia ser de qualquer viagem em que o dono tem
// lote) — nega tudo. Os dois juntos restringem o resultado potencial ao
// conjunto exato (esta viagem, só donos do pool) que a regra sabe validar.
// `ownerUid in poolUids` tem o limite de 10 valores do Firestore — pool de
// carteira compartilhada (dono + parceiros mútuos) não passa disso na prática.
export function useCurrencyLots(tripId: string, poolUids: string[]) {
    const [lots, setLots] = useState<CurrencyLot[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!tripId || poolUids.length === 0) {
            setLots([]);
            setLoading(false);
            return;
        }

        setError(null);
        const q = query(
            collection(db, 'currency_lots'),
            where('tripId', '==', tripId),
            where('ownerUid', 'in', poolUids),
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tripId, poolUids.join(',')]);

    return { lots, loading, error };
}
