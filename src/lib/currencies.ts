// src/lib/currencies.ts
export const CURRENCIES = [
    { code: 'BRL', label: 'Real', symbol: 'R$' },
    { code: 'USD', label: 'Dólar americano', symbol: '$' },
    { code: 'EUR', label: 'Euro', symbol: '€' },
    { code: 'GBP', label: 'Libra esterlina', symbol: '£' },
    { code: 'JPY', label: 'Iene', symbol: '¥' },
    { code: 'CHF', label: 'Franco suíço', symbol: 'CHF' },
    { code: 'CAD', label: 'Dólar canadense', symbol: 'C$' },
    { code: 'AUD', label: 'Dólar australiano', symbol: 'A$' },
    { code: 'CNY', label: 'Yuan chinês', symbol: '¥' },
    { code: 'ARS', label: 'Peso argentino', symbol: '$' },
] as const;

export type CurrencyCode = typeof CURRENCIES[number]['code'];
