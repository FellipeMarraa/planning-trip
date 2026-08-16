// src/services/activities.ts
import { db } from '@/config/firebase';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';

interface CreateActivityInput {
    tripId: string;
    dateId: string;
    time: string;
    location: string;
    description: string;
}

export async function createActivity(input: CreateActivityInput) {
    await addDoc(collection(db, 'activities'), {
        ...input,
        completed: false,
        createdAt: serverTimestamp(),
    });
}

export async function toggleActivityComplete(activityId: string, currentStatus: boolean) {
    await updateDoc(doc(db, 'activities', activityId), { completed: !currentStatus });
}

export async function deleteActivity(activityId: string) {
    await deleteDoc(doc(db, 'activities', activityId));
}
