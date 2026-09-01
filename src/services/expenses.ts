// src/services/expenses.ts
import { db } from '@/config/firebase';
import { addDoc, arrayRemove, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';

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

// Corrige divisão de despesas antigas quando um participante sai da viagem
// via remoção direta (não via "sair da viagem", que já vira ghost em tudo) —
// o total (amountBRL) não muda, só divide entre quem sobrou.
export async function removeExpenseParticipant(expenseId: string, uid: string) {
    await updateDoc(doc(db, 'expenses', expenseId), {
        participants: arrayRemove(uid),
        updatedAt: serverTimestamp(),
    });
}
