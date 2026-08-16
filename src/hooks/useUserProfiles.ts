// src/hooks/useUserProfiles.ts
import { useEffect, useState } from 'react';
import { getUserProfiles } from '@/services/users';
import type { UserProfile } from '@/types';

export function useUserProfiles(uids: string[]) {
    const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});

    const key = uids.slice().sort().join(',');

    useEffect(() => {
        if (uids.length === 0) return;
        getUserProfiles(uids).then(setProfiles).catch((error) => {
            console.error("Erro ao buscar perfis de membros:", error);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    return profiles;
}
