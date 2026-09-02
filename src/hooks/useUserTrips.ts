import { useEffect, useState } from 'react';
import { db } from '../config/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { compareTripsByProximity } from '../lib/dates';
import type {Trip} from '@/types';

export const useUserTrips = () => {
    const { user } = useAuth();
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'trips'),
            where('participants', 'array-contains', user.uid),
            orderBy('createdAt', 'desc'),
            limit(200)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Trip[];
            // orderBy('createdAt') na query acima é só pra dar um resultado
            // determinístico do Firestore — a ordem real de exibição (mais
            // próxima primeiro) é recalculada aqui, client-side.
            data.sort(compareTripsByProximity);
            setTrips(data);
            setLoading(false);
        }, (error) => {
            console.error("Erro ao buscar viagens:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    return { trips, loading };
};