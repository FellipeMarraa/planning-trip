// src/services/expenses.ts
import { db } from '@/config/firebase';
import { addDoc, arrayRemove, collection, deleteDoc, deleteField, doc, serverTimestamp, updateDoc } from 'firebase/firestore';

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
    date: string;
    // Ausente = pendente (orçamento). Sempre mandado explícito na edição
    // (true/false) pra não depender de o campo já existir no doc.
    purchased?: boolean;
    // Mesma convenção do comprovante: ausente = não mexe (update) / sem
    // referência (create); `null` só faz sentido em update e remove a que existia.
    bookingRef?: string | null;
    // Ausente (chave omitida, não `undefined` — o Firestore JS SDK rejeita
    // campo com valor undefined) = sem comprovante (create) ou "não mexe no
    // que já tinha" (update). `null` só faz sentido em update: remove o
    // comprovante que já existia.
    receiptBase64?: string | null;
}

export async function createExpense(payload: ExpensePayload) {
    await addDoc(collection(db, 'expenses'), {
        ...payload,
        createdAt: serverTimestamp(),
    });
}

export async function updateExpense(expenseId: string, payload: ExpensePayload) {
    const { receiptBase64, bookingRef, ...rest } = payload;
    await updateDoc(doc(db, 'expenses', expenseId), {
        ...rest,
        ...(bookingRef === null ? { bookingRef: deleteField() } : bookingRef !== undefined ? { bookingRef } : {}),
        ...(receiptBase64 === null ? { receiptBase64: deleteField() } : receiptBase64 !== undefined ? { receiptBase64 } : {}),
        updatedAt: serverTimestamp(),
    });
}

// Alterna só o status de compra (check da lista), sem tocar em valor/divisão.
export async function setExpensePurchased(expenseId: string, purchased: boolean) {
    await updateDoc(doc(db, 'expenses', expenseId), {
        purchased,
        updatedAt: serverTimestamp(),
    });
}

export interface ConfirmPurchasePatch {
    // Só presentes quando o valor real mudou (ver buildPurchaseValueUpdate).
    amountOriginal?: number;
    amountBRL?: number;
    exchangeRateUsed?: number;
    baseRateAtTime?: number;
    spreadApplied?: number;
    // string = grava, null = remove a que existia, undefined = não mexe.
    bookingRef?: string | null;
}

// "Confirmar compra": marca como comprado, opcionalmente atualizando o valor
// real e o código/link da reserva, numa única escrita.
export async function confirmExpensePurchase(expenseId: string, patch: ConfirmPurchasePatch) {
    const { bookingRef, ...values } = patch;
    // Firestore rejeita campo com valor undefined — só entram as chaves definidas.
    const definedValues = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined));
    await updateDoc(doc(db, 'expenses', expenseId), {
        ...definedValues,
        ...(bookingRef === null ? { bookingRef: deleteField() } : bookingRef !== undefined ? { bookingRef } : {}),
        purchased: true,
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
