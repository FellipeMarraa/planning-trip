// src/services/walletShares.ts
import { db } from '@/config/firebase';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

// Doc ID determinístico — permite a regra do Firestore checar existência via
// exists() direto por caminho (mútuo = existem os dois sentidos), sem query
// dentro da regra. Ver firestore.rules e src/lib/walletShares.ts.
function walletShareDocId(tripId: string, fromUid: string, toUid: string) {
    return `${tripId}_${fromUid}_${toUid}`;
}

export async function declareWalletShare(tripId: string, fromUid: string, toUid: string) {
    await setDoc(doc(db, 'wallet_shares', walletShareDocId(tripId, fromUid, toUid)), {
        tripId,
        fromUid,
        toUid,
        createdAt: serverTimestamp(),
    });
}

export async function revokeWalletShare(tripId: string, fromUid: string, toUid: string) {
    await deleteDoc(doc(db, 'wallet_shares', walletShareDocId(tripId, fromUid, toUid)));
}
