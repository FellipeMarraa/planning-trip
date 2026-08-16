// src/components/trip/BalancesSummary.tsx
import { SectionHeader } from "@/components/common/section-header";
import { useUserProfiles } from "@/hooks/useUserProfiles";
import { getMemberName, isGhostUid } from "@/lib/members";
import { Scale } from "lucide-react";
import type { Trip } from '@/types';

interface BalancesSummaryProps {
    trip: Trip;
    balances: Record<string, number>;
    onSelectMember: (uid: string) => void;
}

const formatBRL = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(value));

export function BalancesSummary({ trip, balances, onSelectMember }: BalancesSummaryProps) {
    const participants = trip.participants || [];
    const profiles = useUserProfiles(participants.filter((uid) => !isGhostUid(uid)));

    return (
        <div className="bg-card border border-border rounded-3xl p-6">
            <SectionHeader icon={Scale} className="mb-4">Divisão de gastos</SectionHeader>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {participants.map((uid) => {
                    const balance = balances[uid] || 0;
                    const isCredit = balance > 0.01;
                    const isDebt = balance < -0.01;

                    return (
                        <button
                            key={uid}
                            onClick={() => onSelectMember(uid)}
                            className="text-left p-4 rounded-2xl bg-muted/40 border border-border hover:border-primary/30 transition-colors"
                        >
                            <p className="text-sm text-foreground truncate mb-1">{getMemberName(uid, trip, profiles)}</p>
                            <p className={`text-lg font-semibold tabular-nums ${isCredit ? 'text-chart-2' : isDebt ? 'text-destructive' : 'text-muted-foreground'}`}>
                                {isDebt ? '-' : isCredit ? '+' : ''}{formatBRL(balance)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {isCredit ? 'a receber' : isDebt ? 'a pagar' : 'quite'}
                            </p>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
