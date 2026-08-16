// src/hooks/useExchange.ts
import { useState, useEffect } from 'react';
import { CURRENCIES } from '@/lib/currencies';

const FALLBACK_RATES: Record<string, number> = {
    BRL: 1,
    USD: 5.45,
    EUR: 6.12,
    GBP: 7.34,
    JPY: 0.036,
    CHF: 6.4,
    CAD: 3.95,
    AUD: 3.55,
    CNY: 0.75,
    ARS: 0.006,
};

const FOREIGN_CODES = CURRENCIES.map(c => c.code).filter(code => code !== 'BRL');

export const useExchange = () => {
    const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);

    const fetchRates = async () => {
        try {
            // Usando a AwesomeAPI (Gratuita e sem Key para moedas principais)
            const pairs = FOREIGN_CODES.map(code => `${code}-BRL`).join(',');
            const response = await fetch(`https://economia.awesomeapi.com.br/last/${pairs}`);
            const data = await response.json();

            const nextRates: Record<string, number> = { BRL: 1 };
            FOREIGN_CODES.forEach(code => {
                const bid = data[`${code}BRL`]?.bid;
                nextRates[code] = bid ? parseFloat(bid) : FALLBACK_RATES[code];
            });

            setRates(nextRates);
        } catch (error) {
            console.error("Erro ao atualizar cotações reais:", error);
            // Mantém os valores padrão caso a API falhe (fallback)
        }
    };

    useEffect(() => {
        fetchRates();
    }, []);

    return { rates, fetchRates };
};
