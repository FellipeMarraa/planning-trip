import { describe, it, expect } from 'vitest';
import { BOOKING_REF_MAX_LENGTH, normalizeBookingRef, parseBookingRef } from './bookingRef';

describe('parseBookingRef', () => {
    it('vazio/ausente = sem referência', () => {
        expect(parseBookingRef(undefined)).toBeNull();
        expect(parseBookingRef(null)).toBeNull();
        expect(parseBookingRef('   ')).toBeNull();
    });

    it('código de confirmação vira texto', () => {
        expect(parseBookingRef('  ABC123  ')).toEqual({ kind: 'text', label: 'ABC123' });
    });

    it('link http(s) vira url clicável, com o domínio (sem www) como rótulo', () => {
        expect(parseBookingRef('https://www.booking.com/confirmation/xyz?a=1')).toEqual({
            kind: 'url',
            href: 'https://www.booking.com/confirmation/xyz?a=1',
            label: 'booking.com',
        });
        expect(parseBookingRef('http://airbnb.com/r/1')).toMatchObject({ kind: 'url', label: 'airbnb.com' });
    });

    it('nunca gera link para protocolo perigoso — fica como texto', () => {
        expect(parseBookingRef('javascript:alert(1)')).toEqual({ kind: 'text', label: 'javascript:alert(1)' });
        expect(parseBookingRef('data:text/html,<script>1</script>')).toMatchObject({ kind: 'text' });
    });

    it('URL sem protocolo ou malformada fica como texto', () => {
        expect(parseBookingRef('booking.com/xyz')).toMatchObject({ kind: 'text' });
        expect(parseBookingRef('https://')).toMatchObject({ kind: 'text' });
    });
});

describe('normalizeBookingRef', () => {
    it('vazio vira null', () => {
        expect(normalizeBookingRef('')).toBeNull();
        expect(normalizeBookingRef('   ')).toBeNull();
        expect(normalizeBookingRef(undefined)).toBeNull();
    });

    it('faz trim e respeita o tamanho máximo', () => {
        expect(normalizeBookingRef('  X1  ')).toBe('X1');
        expect(normalizeBookingRef('a'.repeat(BOOKING_REF_MAX_LENGTH + 50))).toHaveLength(BOOKING_REF_MAX_LENGTH);
    });
});
