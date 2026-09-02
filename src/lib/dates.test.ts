import { describe, it, expect } from 'vitest';
import { compareTripsByProximity } from './dates';
import { formatISO } from 'date-fns';

function daysFromNow(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return formatISO(d, { representation: 'date' });
}

function trip(startOffset: number, endOffset: number) {
    return { startDate: daysFromNow(startOffset), endDate: daysFromNow(endOffset) };
}

describe('compareTripsByProximity', () => {
    it('viagem em andamento vem antes de futura e finalizada', () => {
        const ongoing = trip(-2, 2);
        const upcoming = trip(5, 10);
        const finished = trip(-20, -10);
        const sorted = [finished, upcoming, ongoing].sort(compareTripsByProximity);
        expect(sorted).toEqual([ongoing, upcoming, finished]);
    });

    it('entre futuras, a que começa mais cedo vem primeiro', () => {
        const soon = trip(3, 8);
        const later = trip(20, 25);
        const sorted = [later, soon].sort(compareTripsByProximity);
        expect(sorted).toEqual([soon, later]);
    });

    it('entre finalizadas, a mais recente vem primeiro', () => {
        const recentlyFinished = trip(-10, -5);
        const longAgo = trip(-60, -50);
        const sorted = [longAgo, recentlyFinished].sort(compareTripsByProximity);
        expect(sorted).toEqual([recentlyFinished, longAgo]);
    });

    it('entre em andamento, a que termina antes vem primeiro', () => {
        const endingSoon = trip(-5, 1);
        const endingLater = trip(-3, 10);
        const sorted = [endingLater, endingSoon].sort(compareTripsByProximity);
        expect(sorted).toEqual([endingSoon, endingLater]);
    });
});
