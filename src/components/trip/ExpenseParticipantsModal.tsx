// src/components/trip/ExpenseParticipantsModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useUserProfiles } from "@/hooks/useUserProfiles";
import { getMemberName, isGhostUid } from "@/lib/members";
import { Users } from "lucide-react";
import type { Expense, Trip } from '@/types';

interface ExpenseParticipantsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    trip: Trip;
    expense: Expense | null;
}

const formatBRL = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export function ExpenseParticipantsModal({ open, onOpenChange, trip, expense }: ExpenseParticipantsModalProps) {
    const profiles = useUserProfiles((trip.participants || []).filter((uid) => !isGhostUid(uid)));

    if (!expense) return null;

    const participants = expense.participants || [];
    const share = expense.amountBRL / (participants.length || 1);

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
                        participants.map((uid) => (
                            <div key={uid} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/40">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-sm text-foreground truncate">{getMemberName(uid, trip, profiles)}</span>
                                    {uid === expense.paidBy && (
                                        <Badge variant="default" className="font-medium">Pagou</Badge>
                                    )}
                                </div>
                                <span className="text-sm font-semibold text-foreground tabular-nums flex-shrink-0">
                                    {formatBRL(share)}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
