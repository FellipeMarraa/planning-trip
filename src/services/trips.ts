// src/services/trips.ts
import { db } from '@/config/firebase';
import {
    addDoc,
    arrayRemove,
    arrayUnion,
    collection,
    deleteField,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    updateDoc,
    where,
    writeBatch,
} from 'firebase/firestore';
import type { UserRole } from '@/types';

interface CreateTripInput {
    name: string;
    startDate: string;
    endDate: string;
    ownerId: string;
    baseCurrency: string;
}

export async function createTrip(input: CreateTripInput) {
    await addDoc(collection(db, 'trips'), {
        name: input.name,
        startDate: input.startDate,
        endDate: input.endDate,
        ownerId: input.ownerId,
        participants: [input.ownerId],
        roles: { [input.ownerId]: 'OWNER' },
        baseCurrency: input.baseCurrency,
        exchangeRates: { EUR: 6.12, GBP: 7.34, USD: 5.45 },
        createdAt: serverTimestamp(),
    });
}

interface UpdateTripInput {
    name: string;
    startDate: string;
    endDate: string;
}

export async function updateTripDetails(tripId: string, input: UpdateTripInput) {
    await updateDoc(doc(db, 'trips', tripId), {
        name: input.name,
        startDate: input.startDate,
        endDate: input.endDate,
    });
}

export async function renameGhostMember(tripId: string, ghostUid: string, name: string) {
    await updateDoc(doc(db, 'trips', tripId), {
        [`ghosts.${ghostUid}.name`]: name,
    });
}

export async function deleteTripCascade(tripId: string) {
    const batch = writeBatch(db);
    const expensesSnap = await getDocs(query(collection(db, 'expenses'), where('tripId', '==', tripId)));
    expensesSnap.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, 'trips', tripId));
    await batch.commit();
}

export async function changeMemberRole(tripId: string, uid: string, role: Exclude<UserRole, 'OWNER'>) {
    await updateDoc(doc(db, 'trips', tripId), { [`roles.${uid}`]: role });
}

export async function removeMember(tripId: string, uid: string) {
    await updateDoc(doc(db, 'trips', tripId), {
        participants: arrayRemove(uid),
        [`roles.${uid}`]: deleteField(),
        [`ghosts.${uid}`]: deleteField(),
    });
}

export async function addGhostMember(tripId: string, name: string) {
    const ghostUid = `ghost_${crypto.randomUUID()}`;
    await updateDoc(doc(db, 'trips', tripId), {
        participants: arrayUnion(ghostUid),
        [`ghosts.${ghostUid}`]: { name },
    });
    return ghostUid;
}

export async function linkGhostToUser(tripId: string, ghostUid: string, realUid: string) {
    const tripRef = doc(db, 'trips', tripId);
    const tripSnap = await getDoc(tripRef);
    if (!tripSnap.exists()) return;

    const currentParticipants: string[] = tripSnap.data().participants || [];
    const nextParticipants = Array.from(new Set(currentParticipants.filter((uid) => uid !== ghostUid)));

    const expensesSnap = await getDocs(query(collection(db, 'expenses'), where('tripId', '==', tripId)));
    const batch = writeBatch(db);

    expensesSnap.forEach((expenseDoc) => {
        const data = expenseDoc.data();
        const participants: string[] = data.participants || [];
        if (data.paidBy !== ghostUid && !participants.includes(ghostUid)) return;

        batch.update(expenseDoc.ref, {
            paidBy: data.paidBy === ghostUid ? realUid : data.paidBy,
            participants: participants.map((uid) => (uid === ghostUid ? realUid : uid)),
        });
    });

    batch.update(tripRef, {
        participants: nextParticipants,
        [`ghosts.${ghostUid}`]: deleteField(),
    });

    await batch.commit();
}

export async function joinTripByInvite(tripId: string, role: string, uid: string) {
    const normalizedRole = role.toUpperCase();
    if (normalizedRole !== 'EDITOR' && normalizedRole !== 'VIEWER') {
        throw new Error('Papel de convite inválido');
    }

    // Não faz getDoc antes: quem ainda não é participante não tem permissão de
    // leitura em trips/{id} (regra do Firestore), então o getDoc seria negado
    // e o convite nunca completaria. arrayUnion é idempotente, então dá pra
    // escrever direto sem checar antes se já é participante.
    await updateDoc(doc(db, 'trips', tripId), {
        participants: arrayUnion(uid),
        [`roles.${uid}`]: normalizedRole,
    });
}
