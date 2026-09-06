// src/lib/dayRoute.ts
import type { Activity } from '@/types';

export type LocatedActivity = Activity & { coordinates: NonNullable<Activity['coordinates']> };

// Única fonte de verdade pra "atividades do dia com localização, em ordem de
// horário" — usado por DayRouteMap.tsx (marcadores/linha) e
// DayRouteMapDialog.tsx (link de rota) — evita duplicar o mesmo
// filter+sort em dois lugares e arriscar divergir se um dia mudar.
export function getLocatedActivitiesSorted(activities: Activity[]): LocatedActivity[] {
    return activities
        .filter((a): a is LocatedActivity => !!a.coordinates)
        .sort((a, b) => a.time.localeCompare(b.time));
}
