// src/components/trip/ExpenseParticipantsModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { getMemberName } from "@/lib/members";
import { CheckCircle2, UserX, Users } from "lucide-react";
import { computeEqualShare } from "@/hooks/useTripBalances";
import { getExpenseRemaining } from "@/lib/settlementAllocation";
import type { Expense, Settlement, Trip, UserProfile } from '@/types';

interface ExpenseParticipantsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    trip: Trip;
    profiles: Record<string, UserProfile>;
    expense: Expense | null;
    settlements: Settlement[];
    canEdit: boolean;
    onRemoveParticipant: (uid: string) => void;
    onMarkAsPaid: (uid: string, amount: number) => void;
}

const formatBRL = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export function ExpenseParticipantsModal({ open, onOpenChange, trip, profiles, expense, settlements, canEdit, onRemoveParticipant, onMarkAsPaid }: ExpenseParticipantsModalProps) {
    if (!expense) return null;

    const participants = expense.participants || [];
    const share = computeEqualShare(expense.amountBRL, participants.length);
    // Quem pagou não pode ser removido por aqui — mudar o pagador é uma
    // decisão diferente, feita editando a despesa inteira.
    const canRemove = (uid: string) => canEdit && participants.length > 1 && uid !== expense.paidBy;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[400px] max-h-[85vh] rounded-3xl p-0 overflow-hidden flex flex-col">
                <DialogHeader className="p-6 border-b border-border bg-muted/40 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Users className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-semibold text-foreground">{expense.description}</DialogTitle>
                            <p className="text-sm text-muted-foreground mt-0.5">{formatBRL(expense.amountBRL)}</p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-2 overflow-y-auto scrollbar-none flex-1 min-h-0">
                    {participants.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">
                            Essa despesa não tem participantes definidos.
                        </p>
                    ) : (
                        participants.map((uid) => {
                            const isPayer = uid === expense.paidBy;
                            // Quanto falta essa pessoa pagar dessa despesa específica —
                            // já descontando qualquer acerto (total ou parcial) já
                            // registrado. Quem pagou não deve a si mesmo.
                            const remaining = isPayer ? 0 : getExpenseRemaining(expense, uid, settlements);
                            const isPaid = !isPayer && remaining <= 0.01;

                            return (
                                <div key={uid} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/40">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-sm text-foreground truncate">{getMemberName(uid, trip, profiles)}</span>
                                        {isPayer && (
                                            <Badge variant="default" className="font-medium">Pagou</Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {isPaid ? (
                                            <Badge variant="outline" className="font-medium text-chart-2 border-chart-2/30 gap-1">
                                                <CheckCircle2 className="w-3 h-3" /> Pago
                                            </Badge>
                                        ) : (
                                            <span className="text-sm font-semibold text-foreground tabular-nums">
                                                {formatBRL(isPayer ? share : remaining)}
                                            </span>
                                        )}
                                        {canEdit && !isPayer && !isPaid && (
                                            <button
                                                type="button"
                                                onClick={() => onMarkAsPaid(uid, remaining)}
                                                className="p-1 text-muted-foreground hover:text-chart-2 transition-colors"
                                                aria-label={`Marcar ${getMemberName(uid, trip, profiles)} como pago nesta despesa`}
                                            >
                                                <CheckCircle2 className="w-4 h-4" />
                                            </button>
                                        )}
                                        {canRemove(uid) && (
                                            <button
                                                type="button"
                                                onClick={() => onRemoveParticipant(uid)}
                                                className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                                                aria-label={`Remover ${getMemberName(uid, trip, profiles)} desta despesa`}
                                            >
                                                <UserX className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
