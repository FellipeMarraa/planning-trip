// src/lib/walletShares.ts
import type { WalletShareDeclaration } from '@/types';

// Mútuo = existe declaração nos dois sentidos (A→B e B→A) pro mesmo tripId —
// nunca ativa com só uma das duas. `declaredByMe`/`declaredToMe` vêm de
// useWalletShares() (dois listeners separados, Firestore não faz OR entre
// campos numa query só).
export function computeMutualPartnersByTrip(
    declaredByMe: WalletShareDeclaration[],
    declaredToMe: WalletShareDeclaration[]
): Record<string, string[]> {
    const result: Record<string, string[]> = {};

    for (const mine of declaredByMe) {
        const reciprocal = declaredToMe.some(
            (theirs) => theirs.tripId === mine.tripId && theirs.fromUid === mine.toUid && theirs.toUid === mine.fromUid
        );
        if (!reciprocal) continue;

        if (!result[mine.tripId]) result[mine.tripId] = [];
        if (!result[mine.tripId].includes(mine.toUid)) result[mine.tripId].push(mine.toUid);
    }

    return result;
}
