// src/lib/dates.ts
import { differenceInCalendarDays, parseISO } from 'date-fns';

// Datas de viagem são strings 'yyyy-MM-dd' sem timezone. new Date(str) as
// interpreta como UTC meia-noite, o que no fuso do Brasil (UTC-3) exibe o
// dia anterior. Formata a partir da string, sem passar por Date/timezone.
export function formatDateBR(dateStr: string | undefined): string {
    if (!dateStr) return '--/--/----';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

export type TripCountdownStatus = 'upcoming' | 'ongoing' | 'finished';

export interface TripCountdown {
    durationDays: number;
    status: TripCountdownStatus;
    daysUntilStart: number;
}

// parseISO (diferente de new Date()) interpreta 'yyyy-MM-dd' como meia-noite
// local, então não sofre do mesmo bug de fuso horário.
export function getTripCountdown(startDate: string, endDate: string): TripCountdown {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const today = new Date();

    const durationDays = differenceInCalendarDays(end, start) + 1;
    const daysUntilStart = differenceInCalendarDays(start, today);
    const daysUntilEnd = differenceInCalendarDays(end, today);

    const status: TripCountdownStatus = daysUntilEnd < 0 ? 'finished' : daysUntilStart <= 0 ? 'ongoing' : 'upcoming';

    return { durationDays, status, daysUntilStart };
}
