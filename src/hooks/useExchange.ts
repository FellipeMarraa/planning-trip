import { useState, useEffect } from 'react';

export const useExchange = () => {
    const [rates, setRates] = useState({ EUR: 6.10, GBP: 7.25, USD: 5.40 }); // Valores exemplo (IA buscará reais)

    const convertToBRL = (amount: number, currency: string) => {
        const rate = rates[currency as keyof typeof rates] || 1;
        return amount * rate;
    };

    return { rates, convertToBRL };
};