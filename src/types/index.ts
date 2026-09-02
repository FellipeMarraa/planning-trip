export type UserRole = 'OWNER' | 'EDITOR' | 'VIEWER';

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    photoURL: string;
    photoBase64?: string;
    isAdmin?: boolean;
}

export interface Trip {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    ownerId: string;
    participants: string[]; // Array de UIDs dos usuários (Ex: você e sua esposa) — inclui uids fantasma (ghost_*)
    baseCurrency: string; // Moeda de referência da viagem (ex: 'EUR', 'BRL')
    exchangeRates: { [key: string]: number };
    createdAt: number;
    roles: {
        [uid: string]: UserRole; // Mapeia o UID para o papel na viagem
    };
    ghosts?: {
        [ghostUid: string]: { name: string }; // Membros sem login, uid no formato ghost_<uuid>
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
    paidBy: string;
    participants: string[]; // Uids (ou ghost_*) que dividem esta despesa
    date: string;

    spreadApplied?: number;      // O % de taxa aplicado (ex: 1.6)
    exchangeRateUsed?: number;   // A taxa final com spread (ex: 5.91)
    baseRateAtTime?: number;
}

// A quais cotas específicas (despesa + participante) um acerto se refere —
// metadado de exibição só, nunca usado no cálculo do saldo total
// (computeTripBalances/firestore.rules continuam usando só Settlement.amount,
// cru). A soma dos `amount` aqui sempre bate com o `amount` do Settlement.
export interface SettlementAllocation {
    expenseId: string;
    uid: string;
    amount: number;
}

export interface Settlement {
    id: string;
    tripId: string;
    from: string; // uid de quem pagou a dívida
    to: string;   // uid de quem recebeu
    amount: number; // em BRL
    createdAt: number;
    allocations?: SettlementAllocation[]; // ausente = acerto "livre" (dado anterior a essa feature, ou sem cota específica)
}

export interface Activity {
    id: string;
    tripId: string;
    dateId: string;
    time: string;
    location: string;
    description: string;
    completed: boolean;
}