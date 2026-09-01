// src/services/users.ts
import { db } from '@/config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { resizeImageToBase64 } from '@/lib/image';

export async function upsertUserProfile(user: User) {
    // Nunca toca `photoBase64` aqui: é a foto customizada do upload próprio
    // (uploadAvatar) e não pode ser apagada só porque o usuário logou de novo.
    await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
    }, { merge: true });
}

export async function uploadAvatar(uid: string, file: File): Promise<void> {
    const photoBase64 = await resizeImageToBase64(file);
    await setDoc(doc(db, 'users', uid), { photoBase64 }, { merge: true });
}
