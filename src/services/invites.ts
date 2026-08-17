// src/services/invites.ts
import { db } from '@/config/firebase';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import type { UserRole } from '@/types';

export interface InviteData {
    tripId: string;
    role: Exclude<UserRole, 'OWNER'>;
}

// O papel do convite fica guardado no Firestore, não na URL — evita que
// alguém troque manualmente "viewer" por "editor" no link e ganhe acesso
// que não devia (link em si funciona como token opaco/imprevisível).
export async function createInvite(tripId: string, role: Exclude<UserRole, 'OWNER'>, createdBy: string): Promise<string> {
    const ref = await addDoc(collection(db, 'invites'), {
        tripId,
        role,
        createdBy,
        createdAt: serverTimestamp(),
    });
    return ref.id;
}

export async function getInvite(inviteId: string): Promise<InviteData | null> {
    const snap = await getDoc(doc(db, 'invites', inviteId));
    if (!snap.exists()) return null;
    const data = snap.data();
    if (data.role !== 'EDITOR' && data.role !== 'VIEWER') return null;
    return { tripId: data.tripId, role: data.role };
}
