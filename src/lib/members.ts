// src/lib/members.ts
import type { Trip, UserProfile } from '@/types';

export function isGhostUid(uid: string) {
    return uid.startsWith('ghost_');
}

export function getMemberName(uid: string, trip: Trip, profiles: Record<string, UserProfile>): string {
    if (isGhostUid(uid)) {
        return trip.ghosts?.[uid]?.name || 'Convidado';
    }
    return profiles[uid]?.displayName || profiles[uid]?.email || uid;
}
