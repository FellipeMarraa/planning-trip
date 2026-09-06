// src/services/currencyLots.ts
import { db } from '@/config/firebase';
import { addDoc, collection, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

export interface CreateCurrencyLotInput {
    tripId: string;
    ownerUid: string;
    currency: string;
    amountPurchased: number;
    ratePaidBRL: number;
    purchaseDate: string;
}

// Sem update — lote errado é apagado e recriado, decisão de simplicidade
// (não é um caixa com consumo pra rastrear, é só um registro de compra).
export async function createCurrencyLot(input: CreateCurrencyLotInput) {
    await addDoc(collection(db, 'currency_lots'), {
        ...input,
        createdAt: serverTimestamp(),
    });
}

export async function deleteCurrencyLot(lotId: string) {
    await deleteDoc(doc(db, 'currency_lots', lotId));
}
