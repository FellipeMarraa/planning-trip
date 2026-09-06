import { describe, it, expect } from 'vitest';
import { computeMutualPartnersByTrip } from './walletShares';
import type { WalletShareDeclaration } from '@/types';

function decl(overrides: Partial<WalletShareDeclaration> = {}): WalletShareDeclaration {
    return {
        id: 'trip1_a_b',
        tripId: 'trip1',
        fromUid: 'a',
        toUid: 'b',
        createdAt: 0,
        ...overrides,
    };
}

describe('computeMutualPartnersByTrip', () => {
    it('sem declaração nenhuma: vazio', () => {
        expect(computeMutualPartnersByTrip([], [])).toEqual({});
    });

    it('unilateral (só um lado declarou) não ativa', () => {
        const result = computeMutualPartnersByTrip([decl()], []);
        expect(result).toEqual({});
    });

    it('mútuo (os dois lados declararam) ativa nos dois sentidos', () => {
        const aToB = decl({ id: 'trip1_a_b', fromUid: 'a', toUid: 'b' });
        const bToA = decl({ id: 'trip1_b_a', fromUid: 'b', toUid: 'a' });

        // Do ponto de vista de "a": declaredByMe = [aToB], declaredToMe = [bToA]
        expect(computeMutualPartnersByTrip([aToB], [bToA])).toEqual({ trip1: ['b'] });
        // Do ponto de vista de "b": declaredByMe = [bToA], declaredToMe = [aToB]
        expect(computeMutualPartnersByTrip([bToA], [aToB])).toEqual({ trip1: ['a'] });
    });

    it('viagens diferentes não vazam uma pra outra', () => {
        const tripA = decl({ id: 'trip1_a_b', tripId: 'trip1', fromUid: 'a', toUid: 'b' });
        const reciprocalOtherTrip = decl({ id: 'trip2_b_a', tripId: 'trip2', fromUid: 'b', toUid: 'a' });

        // Mesmo par (a,b), mas a reciprocidade é de outra viagem — não conta.
        expect(computeMutualPartnersByTrip([tripA], [reciprocalOtherTrip])).toEqual({});
    });

    it('não duplica o mesmo parceiro se houver mais de uma declaração equivalente', () => {
        const aToB1 = decl({ id: 'trip1_a_b', fromUid: 'a', toUid: 'b' });
        const bToA = decl({ id: 'trip1_b_a', fromUid: 'b', toUid: 'a' });

        const result = computeMutualPartnersByTrip([aToB1, aToB1], [bToA]);
        expect(result.trip1).toEqual(['b']);
    });
});
