// src/hooks/useUserProfiles.ts
import { useEffect, useState } from 'react';
import { db } from '@/config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { UserProfile } from '@/types';

export function useUserProfiles(uids: string[]) {
    const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});

    const key = uids.slice().sort().join(',');

    useEffect(() => {
        if (uids.length === 0) {
            setProfiles({});
            return;
        }

        const unsubscribes = uids.map((uid) =>
            onSnapshot(doc(db, 'users', uid), (snap) => {
                setProfiles((prev) => {
                    if (!snap.exists()) {
                        if (!(uid in prev)) return prev;
                        const next = { ...prev };
                        delete next[uid];
                        return next;
                    }
                    return { ...prev, [uid]: snap.data() as UserProfile };
                });
            }, (error) => {
                console.error("Erro ao observar perfil de membro:", error);
            })
        );

        return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    return profiles;
}
