// src/components/trip/ReceiptModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Receipt } from "lucide-react";
import type { Expense } from '@/types';

interface ReceiptModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    expense: Expense | null;
}

export function ReceiptModal({ open, onOpenChange, expense }: ReceiptModalProps) {
    if (!expense || !expense.receiptBase64) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[480px] max-h-[90vh] rounded-3xl p-0 overflow-hidden flex flex-col">
                <DialogHeader className="p-6 border-b border-border bg-muted/40 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Receipt className="w-4 h-4 text-primary" />
                        </div>
                        <DialogTitle className="text-base font-semibold text-foreground">{expense.description}</DialogTitle>
                    </div>
                </DialogHeader>

                <div className="p-4 overflow-auto flex-1 min-h-0 flex items-center justify-center bg-muted/20">
                    <img
                        src={expense.receiptBase64}
                        alt={`Comprovante de ${expense.description}`}
                        className="max-w-full max-h-full rounded-xl border border-border"
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
