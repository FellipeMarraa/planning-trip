// src/hooks/useTrip.ts
import { useEffect, useState } from 'react';
import { db } from '../config/firebase';
import { doc, onSnapshot, collection, query, where, limit } from 'firebase/firestore';
import type { Trip, Expense } from '@/types';

export const useTrip = (tripId: string) => {
    const [trip, setTrip] = useState<Trip | null>(null);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!tripId) return;

        setLoading(true);
        setError(null);

        // Listener da Viagem
        const unsubTrip = onSnapshot(
            doc(db, 'trips', tripId),
            (docSnap) => {
                if (docSnap.exists()) {
                    setTrip({ id: docSnap.id, ...docSnap.data() } as Trip);
                } else {
                    setError("Viagem não encontrada.");
                }
            },
            (err) => {
                console.error("Erro permissão Trip:", err);
                setError("Acesso negado à viagem.");
                setLoading(false);
            }
        );

        // Listener de Gastos (teto de segurança contra crescimento sem limite)
        const q = query(collection(db, 'expenses'), where('tripId', '==', tripId), limit(1000));
        const unsubExpenses = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Expense));
                setExpenses(data);
                setLoading(false);
            },
            (err) => {
                // Apenas logamos gastos para não travar a UI se a trip carregar
                console.error("Erro permissão Expenses:", err);
            }
        );

        return () => {
            unsubTrip();
            unsubExpenses();
        };
    }, [tripId]);

    return { trip, expenses, loading, error };
};