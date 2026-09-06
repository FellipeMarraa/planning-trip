// src/services/activities.ts
import { db } from '@/config/firebase';
import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, updateDoc, where, writeBatch } from 'firebase/firestore';

// Mesmo limite/motivo de trips.ts (Firestore trava writeBatch em 500 operações).
const BATCH_LIMIT = 500;

function chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
}

interface ActivityCoordinates {
    lat: number;
    lng: number;
}

interface CreateActivityInput {
    tripId: string;
    dateId: string;
    time: string;
    location: string;
    description: string;
    coordinates?: ActivityCoordinates;
}

// Firestore rejeita qualquer campo com valor undefined (addDoc/updateDoc
// lançam erro) — nunca passar coordinates: undefined direto no objeto,
// omitir a chave inteira quando não houver coordenada.
function withOptionalCoordinates<T extends { coordinates?: ActivityCoordinates }>(input: T) {
    const { coordinates, ...rest } = input;
    return coordinates ? { ...rest, coordinates } : rest;
}

export async function createActivity(input: CreateActivityInput) {
    await addDoc(collection(db, 'activities'), {
        ...withOptionalCoordinates(input),
        completed: false,
        createdAt: serverTimestamp(),
    });
}

export async function toggleActivityComplete(activityId: string, currentStatus: boolean) {
    await updateDoc(doc(db, 'activities', activityId), { completed: !currentStatus });
}

interface UpdateActivityInput {
    time: string;
    location: string;
    description: string;
    coordinates?: ActivityCoordinates;
}

export async function updateActivity(activityId: string, input: UpdateActivityInput) {
    await updateDoc(doc(db, 'activities', activityId), withOptionalCoordinates(input));
}

export async function deleteActivity(activityId: string) {
    await deleteDoc(doc(db, 'activities', activityId));
}

// Apaga o roteiro inteiro da viagem de uma vez — todas as atividades de
// todos os dias, não só o dia atual. Diferente de deleteActivity (item a
// item, já existia); em lotes de 500 (limite físico do Firestore por batch).
export async function deleteAllActivities(tripId: string) {
    const snap = await getDocs(query(collection(db, 'activities'), where('tripId', '==', tripId)));
    const refs = snap.docs.map((d) => d.ref);

    for (const batchRefs of chunk(refs, BATCH_LIMIT)) {
        const batch = writeBatch(db);
        batchRefs.forEach((ref) => batch.delete(ref));
        await batch.commit();
    }
}
