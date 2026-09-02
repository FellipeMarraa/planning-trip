// src/services/settlements.ts
import { db } from '@/config/firebase';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import type { Settlement, SettlementAllocation } from '@/types';

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

// Desfaz "marcar como pago" (ou a parte correspondente de um pagamento livre
// auto-alocado) pra uma cota específica. Um acerto criado só pra essa cota
// (allocations com 1 item) é apagado inteiro — foi criado só pra isso, nada
// mais depende dele. Um acerto que também cobre outras despesas (pagamento
// livre alocado em várias) tem só essa alocação removida, com o valor
// correspondente subtraído do total — preserva o resto intacto.
export async function undoExpensePayment(expenseId: string, uid: string, settlements: Settlement[]) {
    const affected = settlements.filter((s) =>
        (s.allocations || []).some((a) => a.expenseId === expenseId && a.uid === uid)
    );

    await Promise.all(affected.map(async (s) => {
        const allocation = s.allocations!.find((a) => a.expenseId === expenseId && a.uid === uid)!;
        const remainingAllocations = s.allocations!.filter((a) => !(a.expenseId === expenseId && a.uid === uid));

        if (remainingAllocations.length === 0) {
            await deleteSettlement(s.id);
        } else {
            await updateDoc(doc(db, 'settlements', s.id), {
                amount: s.amount - allocation.amount,
                allocations: remainingAllocations,
            });
        }
    }));
}
