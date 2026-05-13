export type UserRole = 'ADM_TRIP' | 'MEMBER';

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    photoURL: string;
}

export interface Trip {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    ownerId: string;
    participants: string[]; // Array de UIDs dos usuários (Ex: você e sua esposa)
    baseCurrencies: string[]; // Ex: ['EUR', 'GBP']
    exchangeRates: { [key: string]: number };
    createdAt: number;
    roles: {
        [uid: string]: UserRole; // Mapeia o UID para o papel na viagem
    };
}

export interface Expense {
    id: string;
    tripId: string;
    description: string;
    category: string;
    amountOriginal: number;
    currency: string;
    amountBRL: number;
    exchangeRateAtTime: number;
    paidBy: string;
    status: 'pago' | 'pendente' | 'reservar';
    date: string;
}