// src/services/users.ts
import { db } from '@/config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';

export async function upsertUserProfile(user: User) {
    await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
    }, { merge: true });
}
