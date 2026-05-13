// src/hooks/useActivities.ts
import { useState, useEffect } from 'react';
import { db } from '@/config/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

export interface Activity {
    id: string;
    tripId: string;
    dateId: string;
    time: string;
    location: string;
    description: string;
    completed: boolean;
}

export function useActivities(tripId: string) {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tripId) return;

        const q = query(
            collection(db, 'activities'),
            where('tripId', '==', tripId),
            orderBy('time', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Activity[];
            setActivities(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [tripId]);

    return { activities, loading };
}