// src/services/activities.ts
import { db } from '@/config/firebase';
import { addDoc, collection, deleteDoc, deleteField, doc, getDocs, query, serverTimestamp, updateDoc, where, writeBatch } from 'firebase/firestore';

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

// Firestore rejeita qualquer campo com valor undefined (addDoc lança erro) —
// nunca passar coordinates: undefined direto no objeto, omitir a chave
// inteira quando não houver coordenada. Documento novo não tem campo antigo
// pra apagar, então "sem coordenada" aqui é só "nunca escrever a chave"
// (diferente de updateActivity, que precisa poder REMOVER uma coordenada
// já existente — ver deleteField() abaixo).
export async function createActivity(input: CreateActivityInput) {
    const { coordinates, ...rest } = input;
    await addDoc(collection(db, 'activities'), {
        ...rest,
        ...(coordinates ? { coordinates } : {}),
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

// Diferente de createActivity: o formulário de edição sempre reflete o
// estado completo e atual da atividade (AddActivityDialog rehidrata tudo do
// activityToEdit ao abrir) — então coordinates ausente aqui significa "o
// usuário removeu a localização", não "não mexeu nela". updateDoc simplesmente
// omitir a chave deixaria o valor antigo intacto no Firestore (updateDoc só
// atualiza os campos presentes no objeto) — precisa do sentinel deleteField()
// pra remover de verdade um campo que já existia.
export async function updateActivity(activityId: string, input: UpdateActivityInput) {
    const { coordinates, ...rest } = input;
    await updateDoc(doc(db, 'activities', activityId), {
        ...rest,
        coordinates: coordinates ?? deleteField(),
    });
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
