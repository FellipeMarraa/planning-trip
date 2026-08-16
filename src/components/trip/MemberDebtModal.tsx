// src/components/trip/MemberDebtModal.tsx
import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUserProfiles } from "@/hooks/useUserProfiles";
import { getMemberName, isGhostUid } from "@/lib/members";
import { useAuth } from "@/context/AuthContext";
import { Scale, Trash2 } from "lucide-react";
import type { Expense, Settlement, Trip } from '@/types';

interface MemberDebtModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    trip: Trip;
    memberUid: string | null;
    expenses: Expense[];
    settlements: Settlement[];
    onSettle: (from: string, to: string, amount: number) => void;
    onDeleteSettlement: (settlementId: string) => void;
    canEdit: boolean;
}

const formatBRL = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export function MemberDebtModal({ open, onOpenChange, trip, memberUid, expenses, settlements, onSettle, onDeleteSettlement, canEdit }: MemberDebtModalProps) {
    const { user } = useAuth();
    const profiles = useUserProfiles((trip.participants || []).filter((uid) => !isGhostUid(uid)));

    const relatedSettlements = useMemo(
        () => settlements.filter((s) => s.from === memberUid || s.to === memberUid),
        [settlements, memberUid]
    );

    const { debts, credits } = useMemo(() => {
        if (!memberUid) return { debts: [] as [string, number][], credits: [] as [string, number][] };

        const owed: Record<string, number> = {};
        const owedToMe: Record<string, number> = {};

        expenses.forEach((exp) => {
            const participants = exp.participants || [];
            const share = (Number(exp.amountBRL) || 0) / (participants.length || 1);
            if (!participants.includes(memberUid)) return;

            if (exp.paidBy === memberUid) {
                participants.forEach((uid) => {
                    if (uid !== memberUid) owedToMe[uid] = (owedToMe[uid] || 0) + share;
                });
            } else {
                owed[exp.paidBy] = (owed[exp.paidBy] || 0) + share;
            }
        });

        settlements.forEach((s) => {
            if (s.from === memberUid && owed[s.to] !== undefined) owed[s.to] -= s.amount;
            if (s.to === memberUid && owedToMe[s.from] !== undefined) owedToMe[s.from] -= s.amount;
        });

        return {
            debts: Object.entries(owed).filter(([, amount]) => amount > 0.01),
            credits: Object.entries(owedToMe).filter(([, amount]) => amount > 0.01),
        };
    }, [memberUid, expenses, settlements]);

    if (!memberUid) return null;
    const memberName = getMemberName(memberUid, trip, profiles);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[420px] max-h-[85vh] rounded-3xl p-0 overflow-hidden flex flex-col">
                <DialogHeader className="p-6 border-b border-border bg-muted/40 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Scale className="w-4 h-4 text-primary" />
                        </div>
                        <DialogTitle className="text-base font-semibold text-foreground">{memberName}</DialogTitle>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-6 overflow-y-auto scrollbar-none flex-1 min-h-0">
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Deve para</p>
                        {debts.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Nenhuma dívida pendente.</p>
                        ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-none">
                                {debts.map(([creditorUid, amount]) => (
                                    <div key={creditorUid} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/40">
                                        <div>
                                            <p className="text-sm text-foreground">{getMemberName(creditorUid, trip, profiles)}</p>
                                            <p className="text-sm font-semibold text-destructive tabular-nums">{formatBRL(amount)}</p>
                                        </div>
                                        {user?.uid === creditorUid && (
                                            <Button size="sm" variant="outline" onClick={() => onSettle(memberUid, creditorUid, amount)}>
                                                Marquei como recebido
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Recebe de</p>
                        {credits.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Ninguém deve para este membro.</p>
                        ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-none">
                                {credits.map(([debtorUid, amount]) => (
                                    <div key={debtorUid} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/40">
                                        <div>
                                            <p className="text-sm text-foreground">{getMemberName(debtorUid, trip, profiles)}</p>
                                            <p className="text-sm font-semibold text-chart-2 tabular-nums">{formatBRL(amount)}</p>
                                        </div>
                                        {user?.uid === memberUid && (
                                            <Button size="sm" variant="outline" onClick={() => onSettle(debtorUid, memberUid, amount)}>
                                                Marquei como recebido
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Acertos registrados</p>
                        {relatedSettlements.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Nenhum pagamento registrado ainda.</p>
                        ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-none">
                                {relatedSettlements.map((s) => (
                                    <div key={s.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/40">
                                        <p className="text-sm text-muted-foreground">
                                            <span className="text-foreground">{getMemberName(s.from, trip, profiles)}</span> pagou{' '}
                                            <span className="text-foreground">{getMemberName(s.to, trip, profiles)}</span>
                                            <span className="tabular-nums"> · {formatBRL(s.amount)}</span>
                                        </p>
                                        {(canEdit || user?.uid === s.to) && (
                                            <button
                                                type="button"
                                                onClick={() => onDeleteSettlement(s.id)}
                                                className="h-8 w-8 flex items-center justify-center text-muted-foreground active:text-destructive active:bg-destructive/10 rounded-lg transition-colors flex-shrink-0"
                                                aria-label="Excluir acerto"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 bg-muted/40 border-t border-border flex-shrink-0">
                    <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="w-full">Fechar</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
