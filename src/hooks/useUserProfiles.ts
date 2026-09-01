// src/hooks/useUserProfiles.ts
import { useEffect, useState } from 'react';
import { db } from '@/config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { UserProfile } from '@/types';

export function useUserProfiles(uids: string[]) {
    const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
    const [error, setError] = useState<string | null>(null);

    const key = uids.slice().sort().join(',');

    useEffect(() => {
        if (uids.length === 0) {
            setProfiles({});
            setError(null);
            return;
        }

        setError(null);

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
            }, (err) => {
                // Mesmo padrão de erro surfaced de useTrip.ts (ver ERROR_HANDLING.md
                // seção 2) — sem isso, um perfil que a regra negasse acesso ficava
                // silenciosamente ausente, sem avisar o usuário. Um erro em qualquer
                // uid da lista já é suficiente pra avisar (não precisa saber qual).
                console.error("Erro ao observar perfil de membro:", err);
                setError("Não foi possível carregar todos os perfis de membros.");
            })
        );

        return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    return { profiles, error };
}
