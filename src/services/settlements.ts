// src/services/settlements.ts
import { db } from '@/config/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

export async function createSettlement(tripId: string, from: string, to: string, amount: number) {
    await addDoc(collection(db, 'settlements'), {
        tripId,
        from,
        to,
        amount,
        createdAt: serverTimestamp(),
    });
}
