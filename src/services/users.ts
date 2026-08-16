// src/services/users.ts
import { db } from '@/config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import type { UserProfile } from '@/types';

export async function upsertUserProfile(user: User) {
    await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
    }, { merge: true });
}

export async function getUserProfiles(uids: string[]): Promise<Record<string, UserProfile>> {
    const entries = await Promise.all(
        uids.map(async (uid) => {
            const snap = await getDoc(doc(db, 'users', uid));
            return [uid, snap.exists() ? (snap.data() as UserProfile) : null] as const;
        })
    );

    return entries.reduce<Record<string, UserProfile>>((acc, [uid, profile]) => {
        if (profile) acc[uid] = profile;
        return acc;
    }, {});
}
