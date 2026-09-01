// src/hooks/useActivities.ts
import { useState, useEffect } from 'react';
import { db } from '@/config/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import type { Activity } from '@/types';

export function useActivities(tripId: string) {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!tripId) return;

        setError(null);

        const q = query(
            collection(db, 'activities'),
            where('tripId', '==', tripId),
            orderBy('time', 'asc'),
            limit(1000)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Activity[];
                setActivities(data);
                setLoading(false);
            },
            (err) => {
                // Mesmo padrão de erro surfaced de useTrip.ts (ver ERROR_HANDLING.md
                // seção 2) — sem isso, uma regra negando acesso deixava o roteiro
                // silenciosamente vazio, sem avisar o usuário.
                console.error("Erro permissão Activities:", err);
                setError("Não foi possível carregar o roteiro.");
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [tripId]);

    return { activities, loading, error };
}