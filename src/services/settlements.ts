// src/services/settlements.ts
import { db } from '@/config/firebase';
import { addDoc, collection, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import type { SettlementAllocation } from '@/types';

export async function createSettlement(tripId: string, from: string, to: string, amount: number, allocations?: SettlementAllocation[]) {
    await addDoc(collection(db, 'settlements'), {
        tripId,
        from,
        to,
        amount,
        ...(allocations && allocations.length > 0 ? { allocations } : {}),
        createdAt: serverTimestamp(),
    });
}

export async function deleteSettlement(settlementId: string) {
    await deleteDoc(doc(db, 'settlements', settlementId));
}
