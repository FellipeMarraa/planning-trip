import { describe, it, expect } from 'vitest';
import { sortParticipantsByBalance } from './BalancesSummary';

describe('sortParticipantsByBalance', () => {
    it('coloca créditos primeiro (maior a receber primeiro), depois débitos (maior a pagar primeiro), e quite por último', () => {
        const balances = {
            quite: 0,
            devedorGrande: -500,
            credorPequeno: 50,
            devedorPequeno: -50,
            credorGrande: 500,
        };
        const result = sortParticipantsByBalance(Object.keys(balances), balances);

        expect(result).toEqual(['credorGrande', 'credorPequeno', 'devedorGrande', 'devedorPequeno', 'quite']);
    });

    it('trata valores dentro de +-0.01 como quite (arredondamento de ponto flutuante)', () => {
        const balances = { a: 0.005, b: -0.005 };
        const result = sortParticipantsByBalance(['a', 'b'], balances);

        // Ambos "quite" — ordem original preservada (sort estável)
        expect(result).toEqual(['a', 'b']);
    });

    it('participante sem saldo no mapa é tratado como quite', () => {
        const balances = { credor: 100 };
        const result = sortParticipantsByBalance(['semSaldo', 'credor'], balances);

        expect(result).toEqual(['credor', 'semSaldo']);
    });

    it('não muta o array de participantes original', () => {
        const original = ['a', 'b'];
        sortParticipantsByBalance(original, { a: -10, b: 10 });

        expect(original).toEqual(['a', 'b']);
    });
});
