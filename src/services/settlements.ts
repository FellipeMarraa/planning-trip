// src/services/settlements.ts
import { db } from '@/config/firebase';
import { addDoc, collection, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

export async function createSettlement(tripId: string, from: string, to: string, amount: number) {
    await addDoc(collection(db, 'settlements'), {
        tripId,
        from,
        to,
        amount,
        createdAt: serverTimestamp(),
    });
}

export async function deleteSettlement(settlementId: string) {
    await deleteDoc(doc(db, 'settlements', settlementId));
}
