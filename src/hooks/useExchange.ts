// src/hooks/useExchange.ts
import { useState, useEffect } from 'react';

export const useExchange = () => {
    const [rates, setRates] = useState<Record<string, number>>({
        EUR: 6.12,
        GBP: 7.34,
        USD: 5.45,
        BRL: 1
    });

    const fetchRates = async () => {
        try {
            // Usando a AwesomeAPI (Gratuita e sem Key para moedas principais)
            const response = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,GBP-BRL');
            const data = await response.json();

            setRates({
                USD: parseFloat(data.USDBRL.bid),
                EUR: parseFloat(data.EURBRL.bid),
                GBP: parseFloat(data.GBPBRL.bid),
                BRL: 1
            });
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