// src/services/expenses.ts
import { db } from '@/config/firebase';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';

export interface ExpensePayload {
    tripId: string;
    description: string;
    category: string;
    amountOriginal: number;
    currency: string;
    exchangeRateUsed: number;
    baseRateAtTime: number;
    spreadApplied: number;
    amountBRL: number;
    paidBy: string;
    participants: string[];
}

export async function createExpense(payload: ExpensePayload) {
    await addDoc(collection(db, 'expenses'), {
        ...payload,
        createdAt: serverTimestamp(),
    });
}

export async function updateExpense(expenseId: string, payload: ExpensePayload) {
    await updateDoc(doc(db, 'expenses', expenseId), {
        ...payload,
        updatedAt: serverTimestamp(),
    });
}

export async function deleteExpense(expenseId: string) {
    await deleteDoc(doc(db, 'expenses', expenseId));
}
