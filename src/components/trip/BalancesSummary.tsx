// src/components/trip/BalancesSummary.tsx
import { useState } from 'react';
import { SectionHeader } from "@/components/common/section-header";
import { Button } from "@/components/ui/button";
import { getMemberName } from "@/lib/members";
import { ChevronLeft, ChevronRight, Lock, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Trip, UserProfile } from '@/types';

interface BalancesSummaryProps {
    trip: Trip;
    profiles: Record<string, UserProfile>;
    balances: Record<string, number>;
    currentUserUid: string;
    canViewAll: boolean;
    onSelectMember: (uid: string) => void;
}

const formatBRL = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(value));

const MEMBERS_PER_PAGE = 4;

function balanceGroup(uid: string, balances: Record<string, number>): 0 | 1 | 2 {
    const value = balances[uid] || 0;
    if (value > 0.01) return 0;  // a receber
    if (value < -0.01) return 1; // a pagar
    return 2;                    // quite
}

// Ordem pedida: quem deve receber mais primeiro, depois quem deve pagar mais,
// e só por fim quem está quite (não deve nem recebe nada). Um sort único por
// valor bruto decrescente colocaria os "quite" no meio (entre créditos e
// débitos) e ordenaria os devedores do menor pro maior devedor — errado nos
// dois casos. Por isso agrupa por categoria (crédito/débito/quite) e só então
// ordena por magnitude dentro de cada grupo. Exportado como função pura pra
// ser testável sem infra de teste de componente (mesmo padrão de
// computeTripBalances em useTripBalances.ts).
export function sortParticipantsByBalance(participants: string[], balances: Record<string, number>): string[] {
    return [...participants].sort((a, b) => {
        const groupA = balanceGroup(a, balances);
        const groupB = balanceGroup(b, balances);
        if (groupA !== groupB) return groupA - groupB;
        if (groupA === 0) return (balances[b] || 0) - (balances[a] || 0); // maior crédito primeiro
        if (groupA === 1) return (balances[a] || 0) - (balances[b] || 0); // maior débito primeiro
        return 0;
    });
}

export function BalancesSummary({ trip, profiles, balances, currentUserUid, canViewAll, onSelectMember }: BalancesSummaryProps) {
    const participants = sortParticipantsByBalance(trip.participants || [], balances);
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.max(1, Math.ceil(participants.length / MEMBERS_PER_PAGE));
    const page = Math.min(currentPage, totalPages);
    const paginatedParticipants = participants.slice((page - 1) * MEMBERS_PER_PAGE, page * MEMBERS_PER_PAGE);

    return (
        <div className="bg-card border border-border rounded-3xl p-6">
            <SectionHeader icon={Scale} className="mb-4">Divisão de gastos</SectionHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {paginatedParticipants.map((uid) => {
                    const balance = balances[uid] || 0;
                    const isCredit = balance > 0.01;
                    const isDebt = balance < -0.01;
                    const isOwnCard = uid === currentUserUid;
                    const isLocked = !canViewAll && !isOwnCard;

                    const cardContent = (
                        <>
                            <p className="text-sm text-foreground truncate mb-1">{getMemberName(uid, trip, profiles)}</p>
                            {isLocked ? (
                                <>
                                    <p className="text-lg font-semibold text-muted-foreground/30 tracking-widest">••••••</p>
                                    <p className="text-xs text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                                        <Lock className="w-3 h-3" /> privado
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className={`text-lg font-semibold tabular-nums truncate ${isCredit ? 'text-chart-2' : isDebt ? 'text-destructive' : 'text-muted-foreground'}`}>
                                        {isDebt ? '-' : isCredit ? '+' : ''}{formatBRL(balance)}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {isCredit ? 'a receber' : isDebt ? 'a pagar' : 'quite'}
                                    </p>
                                </>
                            )}
                        </>
                    );

                    if (isLocked) {
                        return (
                            <div key={uid} className="min-w-0 text-left p-4 rounded-2xl bg-muted/20 border border-border cursor-not-allowed">
                                {cardContent}
                            </div>
                        );
                    }

                    return (
                        <button
                            key={uid}
                            onClick={() => onSelectMember(uid)}
                            className={cn(
                                "min-w-0 text-left p-4 rounded-2xl bg-muted/40 border border-border hover:border-primary/30 transition-colors",
                                isOwnCard && !canViewAll && "border-primary/30"
                            )}
                        >
                            {cardContent}
                        </button>
                    );
                })}
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between gap-4 mt-4 pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                        Página <span className="text-foreground font-medium">{page}</span> de {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setCurrentPage(page - 1)} className="h-8 w-8 p-0 rounded-lg">
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setCurrentPage(page + 1)} className="h-8 w-8 p-0 rounded-lg">
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
