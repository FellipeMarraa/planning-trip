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
    date: string; // 'yyyy-MM-ddTHH:mm' (input datetime-local) — despesas anteriores a 2026-09-02 podem não ter esse campo, ver docs/DATABASE.md

    spreadApplied?: number;      // O % de taxa aplicado (ex: 1.6)
    exchangeRateUsed?: number;   // A taxa final com spread (ex: 5.91)
    baseRateAtTime?: number;
    receiptBase64?: string;      // comprovante/recibo, mesmo padrão do avatar (base64 direto, sem Firebase Storage)

    // Presente só quando a despesa é "prometida" à carteira de câmbio
    // pessoal do pagador (ver CurrencyLot abaixo) — planejamento, não
    // consumo real: nunca afeta amountBRL/o cálculo de saldo (sempre
    // cotação de mercado). Moeda/valor prometido são os campos que a
    // despesa já tem (currency/amountOriginal), sem duplicar.
    paidFromWallet?: boolean;
}

// Um lote de moeda estrangeira comprado por um participante, pra uma viagem
// específica (não persiste entre viagens — decisão de produto). É
// planejamento ("quanto já comprei" vs. "quanto as despesas marcadas
// carteira precisam"), não um caixa com consumo/reversão — ver
// src/lib/currencyWallet.ts (summarizeWalletDemand) e ARCHITECTURE.md.
export interface CurrencyLot {
    id: string;
    tripId: string;
    ownerUid: string;        // dono do lote — uid real ou ghost_*
    currency: string;        // mesmo CurrencyCode de lib/currencies.ts
    amountPurchased: number; // quanto foi comprado nesse lote
    ratePaidBRL: number;     // R$ por unidade, pago de verdade nesse lote (informativo)
    purchaseDate: string;    // yyyy-MM-dd
    createdAt: number;
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
    coordinates?: { lat: number; lng: number }; // opcional — atividades antigas/sem localização escolhida no picker não têm
}