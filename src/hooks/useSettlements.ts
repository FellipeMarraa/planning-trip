// src/hooks/useSettlements.ts
import { useEffect, useState } from 'react';
import { db } from '@/config/firebase';
import { collection, onSnapshot, query, where, limit } from 'firebase/firestore';
import type { Settlement } from '@/types';

export function useSettlements(tripId: string) {
    const [settlements, setSettlements] = useState<Settlement[]>([]);

    useEffect(() => {
        if (!tripId) return;

        const q = query(collection(db, 'settlements'), where('tripId', '==', tripId), limit(1000));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Settlement));
            setSettlements(data);
        });

        return () => unsubscribe();
    }, [tripId]);

    return { settlements };
}
