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

// Firestore limita cada writeBatch a 500 operações. Trips com mais despesas
// do que isso quebrariam deleteTripCascade/linkGhostToUser inteiro (o batch
// falha e nada é commitado). Reserva 1 slot pra operação no doc da trip.
const BATCH_LIMIT = 499;

function chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks.length > 0 ? chunks : [[]];
}

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
    baseCurrency: string;
}

export async function updateTripDetails(tripId: string, input: UpdateTripInput) {
    await updateDoc(doc(db, 'trips', tripId), {
        name: input.name,
        startDate: input.startDate,
        endDate: input.endDate,
        baseCurrency: input.baseCurrency,
    });
}

export async function renameGhostMember(tripId: string, ghostUid: string, name: string) {
    await updateDoc(doc(db, 'trips', tripId), {
        [`ghosts.${ghostUid}.name`]: name,
    });
}

export async function deleteTripCascade(tripId: string) {
    const expensesSnap = await getDocs(query(collection(db, 'expenses'), where('tripId', '==', tripId)));
    const expenseRefs = expensesSnap.docs.map((d) => d.ref);
    const batches = chunk(expenseRefs, BATCH_LIMIT);

    for (let i = 0; i < batches.length; i++) {
        const batch = writeBatch(db);
        batches[i].forEach((ref) => batch.delete(ref));
        if (i === batches.length - 1) {
            batch.delete(doc(db, 'trips', tripId));
        }
        await batch.commit();
    }
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
    // Nota: getDocs + writeBatch aqui não é atômico com escritas concorrentes —
    // uma despesa criada para o ghostUid *entre* o getDocs e o commit não seria
    // migrada (ficaria com o uid fantasma órfão). Janela mínima (sem await no
    // meio), mas uma correção 100% atômica exigiria Cloud Function/transação no
    // servidor, fora do escopo do plano Spark gratuito. Impacto se acontecer: a
    // despesa some do participants/roles do fantasma, mas continua existindo —
    // basta reeditar o "pago por" dela manualmente.
    const tripRef = doc(db, 'trips', tripId);
    const tripSnap = await getDoc(tripRef);
    if (!tripSnap.exists()) return;

    const currentParticipants: string[] = tripSnap.data().participants || [];
    const nextParticipants = Array.from(new Set(currentParticipants.filter((uid) => uid !== ghostUid)));

    const expensesSnap = await getDocs(query(collection(db, 'expenses'), where('tripId', '==', tripId)));
    const expensesToMigrate = expensesSnap.docs.filter((expenseDoc) => {
        const data = expenseDoc.data();
        const participants: string[] = data.participants || [];
        return data.paidBy === ghostUid || participants.includes(ghostUid);
    });
    const batches = chunk(expensesToMigrate, BATCH_LIMIT);

    for (let i = 0; i < batches.length; i++) {
        const batch = writeBatch(db);
        batches[i].forEach((expenseDoc) => {
            const data = expenseDoc.data();
            const participants: string[] = data.participants || [];
            batch.update(expenseDoc.ref, {
                paidBy: data.paidBy === ghostUid ? realUid : data.paidBy,
                participants: participants.map((uid) => (uid === ghostUid ? realUid : uid)),
            });
        });
        if (i === batches.length - 1) {
            batch.update(tripRef, {
                participants: nextParticipants,
                [`ghosts.${ghostUid}`]: deleteField(),
            });
        }
        await batch.commit();
    }
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
