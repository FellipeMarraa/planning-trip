// src/components/trip/MemberDebtModal.tsx
import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/common/money-input";
import { getMemberName } from "@/lib/members";
import { useAuth } from "@/context/AuthContext";
import { Scale, Trash2 } from "lucide-react";
import { computeEqualShare } from "@/hooks/useTripBalances";
import type { Expense, Settlement, Trip, UserProfile } from '@/types';

interface MemberDebtModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    trip: Trip;
    profiles: Record<string, UserProfile>;
    memberUid: string | null;
    expenses: Expense[];
    settlements: Settlement[];
    onSettle: (from: string, to: string, amount: number) => void;
    onDeleteSettlement: (settlementId: string) => void;
    canEdit: boolean;
}

interface DebtItem {
    expenseId: string;
    description: string;
    share: number;
}

interface DebtGroup {
    uid: string;
    total: number;
    items: DebtItem[];
}

const formatBRL = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export function MemberDebtModal({ open, onOpenChange, trip, profiles, memberUid, expenses, settlements, onSettle, onDeleteSettlement, canEdit }: MemberDebtModalProps) {
    const { user } = useAuth();
    const [settlingKey, setSettlingKey] = useState<string | null>(null);
    const [settleAmount, setSettleAmount] = useState(0);

    const startSettle = (key: string, maxAmount: number) => {
        setSettlingKey(key);
        setSettleAmount(maxAmount);
    };

    const confirmSettle = (from: string, to: string, maxAmount: number) => {
        const amount = Math.min(Math.max(settleAmount, 0.01), maxAmount);
        onSettle(from, to, amount);
        setSettlingKey(null);
    };

    const relatedSettlements = useMemo(
        () => settlements.filter((s) => s.from === memberUid || s.to === memberUid),
        [settlements, memberUid]
    );

    const { debts, credits } = useMemo(() => {
        if (!memberUid) return { debts: [] as DebtGroup[], credits: [] as DebtGroup[] };

        const owed: Record<string, DebtGroup> = {};
        const owedToMe: Record<string, DebtGroup> = {};

        expenses.forEach((exp) => {
            const participants = exp.participants || [];
            if (!participants.includes(memberUid)) return;
            const share = computeEqualShare(exp.amountBRL, participants.length);
            const item = { expenseId: exp.id, description: exp.description, share };

            if (exp.paidBy === memberUid) {
                participants.forEach((uid) => {
                    if (uid === memberUid) return;
                    if (!owedToMe[uid]) owedToMe[uid] = { uid, total: 0, items: [] };
                    owedToMe[uid].total += share;
                    owedToMe[uid].items.push(item);
                });
            } else {
                const payer = exp.paidBy;
                if (!owed[payer]) owed[payer] = { uid: payer, total: 0, items: [] };
                owed[payer].total += share;
                owed[payer].items.push(item);
            }
        });

        settlements.forEach((s) => {
            if (s.from === memberUid && owed[s.to]) owed[s.to].total -= s.amount;
            if (s.to === memberUid && owedToMe[s.from]) owedToMe[s.from].total -= s.amount;
        });

        return {
            debts: Object.values(owed).filter((g) => g.total > 0.01),
            credits: Object.values(owedToMe).filter((g) => g.total > 0.01),
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
                            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-none">
                                {debts.map((group) => (
                                    <div key={group.uid} className="p-3 rounded-xl bg-muted/40 space-y-2">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-sm text-foreground">{getMemberName(group.uid, trip, profiles)}</p>
                                                <p className="text-sm font-semibold text-destructive tabular-nums">{formatBRL(group.total)}</p>
                                            </div>
                                            {canEdit && user?.uid === group.uid && (
                                                settlingKey === `debt-${group.uid}` ? null : (
                                                    <Button size="sm" variant="outline" onClick={() => startSettle(`debt-${group.uid}`, group.total)}>
                                                        Registrar pagamento
                                                    </Button>
                                                )
                                            )}
                                        </div>
                                        {canEdit && user?.uid === group.uid && settlingKey === `debt-${group.uid}` && (
                                            <div className="flex items-center gap-2 p-2 rounded-lg bg-background border border-border">
                                                <MoneyInput
                                                    value={settleAmount}
                                                    onValueChange={setSettleAmount}
                                                    prefix="R$"
                                                    className="h-9 text-sm"
                                                />
                                                <Button size="sm" className="h-9 flex-shrink-0" onClick={() => confirmSettle(memberUid, group.uid, group.total)}>
                                                    Confirmar
                                                </Button>
                                                <Button size="sm" variant="ghost" className="h-9 flex-shrink-0" onClick={() => setSettlingKey(null)}>
                                                    Cancelar
                                                </Button>
                                            </div>
                                        )}
                                        <div className="space-y-1 max-h-24 overflow-y-auto scrollbar-none">
                                            {group.items.map((item, idx) => (
                                                <div key={`${item.expenseId}-${idx}`} className="flex items-center justify-between gap-2 text-xs text-muted-foreground pl-1 border-l-2 border-border">
                                                    <span className="truncate pl-2">{item.description}</span>
                                                    <span className="tabular-nums flex-shrink-0">{formatBRL(item.share)}</span>
                                                </div>
                                            ))}
                                        </div>
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
                            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-none">
                                {credits.map((group) => (
                                    <div key={group.uid} className="p-3 rounded-xl bg-muted/40 space-y-2">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-sm text-foreground">{getMemberName(group.uid, trip, profiles)}</p>
                                                <p className="text-sm font-semibold text-chart-2 tabular-nums">{formatBRL(group.total)}</p>
                                            </div>
                                            {canEdit && user?.uid === memberUid && (
                                                settlingKey === `credit-${group.uid}` ? null : (
                                                    <Button size="sm" variant="outline" onClick={() => startSettle(`credit-${group.uid}`, group.total)}>
                                                        Registrar pagamento
                                                    </Button>
                                                )
                                            )}
                                        </div>
                                        {canEdit && user?.uid === memberUid && settlingKey === `credit-${group.uid}` && (
                                            <div className="flex items-center gap-2 p-2 rounded-lg bg-background border border-border">
                                                <MoneyInput
                                                    value={settleAmount}
                                                    onValueChange={setSettleAmount}
                                                    prefix="R$"
                                                    className="h-9 text-sm"
                                                />
                                                <Button size="sm" className="h-9 flex-shrink-0" onClick={() => confirmSettle(group.uid, memberUid, group.total)}>
                                                    Confirmar
                                                </Button>
                                                <Button size="sm" variant="ghost" className="h-9 flex-shrink-0" onClick={() => setSettlingKey(null)}>
                                                    Cancelar
                                                </Button>
                                            </div>
                                        )}
                                        <div className="space-y-1 max-h-24 overflow-y-auto scrollbar-none">
                                            {group.items.map((item, idx) => (
                                                <div key={`${item.expenseId}-${idx}`} className="flex items-center justify-between gap-2 text-xs text-muted-foreground pl-1 border-l-2 border-border">
                                                    <span className="truncate pl-2">{item.description}</span>
                                                    <span className="tabular-nums flex-shrink-0">{formatBRL(item.share)}</span>
                                                </div>
                                            ))}
                                        </div>
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
                                        {canEdit && (
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
