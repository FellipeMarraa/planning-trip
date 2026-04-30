// src/hooks/useTrip.ts
import { useEffect, useState } from 'react';
import { db } from '../config/firebase';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import type { Trip, Expense } from '@/types';

export const useTrip = (tripId: string) => {
    const [trip, setTrip] = useState<Trip | null>(null);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tripId) return;

        setLoading(true);

        // Doc da viagem
        const unsubTrip = onSnapshot(doc(db, 'trips', tripId), (docSnap) => {
            if (docSnap.exists()) {
                setTrip({ id: docSnap.id, ...docSnap.data() } as Trip);
            }
        });

        // Gastos relacionados
        const q = query(collection(db, 'expenses'), where('tripId', '==', tripId));
        const unsubExpenses = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Expense));
            setExpenses(data);
            setLoading(false);
        });

        return () => {
            unsubTrip();
            unsubExpenses();
        };
    }, [tripId]);

    return { trip, expenses, loading };
};