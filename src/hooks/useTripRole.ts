// src/hooks/useTripRole.ts
import { useAuth } from '@/context/AuthContext';
import type { Trip, UserRole } from '@/types';

export function useTripRole(trip: Trip | null | undefined) {
    const { user } = useAuth();

    const role: UserRole | null = trip && user
        ? (trip.roles?.[user.uid] ?? (trip.ownerId === user.uid ? 'OWNER' : null))
        : null;

    return {
        role,
        canEdit: role === 'OWNER' || role === 'EDITOR',
        isOwner: role === 'OWNER',
    };
}
