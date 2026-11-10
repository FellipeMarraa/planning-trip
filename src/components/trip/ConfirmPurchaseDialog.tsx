// src/components/trip/ConfirmPurchaseDialog.tsx
import { useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/common/money-input";
import { CURRENCIES } from "@/lib/currencies";
import { BOOKING_REF_MAX_LENGTH, normalizeBookingRef } from "@/lib/bookingRef";
import { buildPurchaseValueUpdate } from "@/lib/purchaseStatus";
import type { ConfirmPurchasePatch } from "@/services/expenses";
import type { Expense } from '@/types';

const formatBRL = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface ConfirmPurchaseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    expense: Expense | null;
    // Cotação de mercado do momento da moeda da despesa (undefined se indisponível).
    marketRate: number | undefined;
    // Devolve true se salvou — o diálogo só fecha nesse caso (o erro, se houver,
    // já foi mostrado pelo chamador).
    onConfirm: (expense: Expense, patch: ConfirmPurchasePatch) => Promise<boolean>;
}

// Passo entre "Pendente" e "Comprado": no fluxo real o usuário compra e só então
// atualiza o valor estimado pelo real — então o valor já vem preenchido com a
// estimativa (confirmar sem mexer = 1 toque) e o código/link da reserva é
// opcional. O estado vive em ConfirmPurchaseForm, que só monta com o diálogo
// aberto (Radix desmonta o conteúdo ao fechar) — assim cada abertura começa
// com os valores da despesa sem precisar de useEffect pra "resetar".
export function ConfirmPurchaseDialog({ open, onOpenChange, expense, marketRate, onConfirm }: ConfirmPurchaseDialogProps) {
    return (
        <Dialog open={open && !!expense} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[400px] rounded-3xl p-0 overflow-hidden">
                {expense && (
                    <ConfirmPurchaseForm
                        key={expense.id}
                        expense={expense}
                        marketRate={marketRate}
                        onCancel={() => onOpenChange(false)}
                        onConfirm={async (patch) => {
                            const saved = await onConfirm(expense, patch);
                            if (saved) onOpenChange(false);
                        }}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

function ConfirmPurchaseForm({ expense, marketRate, onCancel, onConfirm }: {
    expense: Expense;
    marketRate: number | undefined;
    onCancel: () => void;
    onConfirm: (patch: ConfirmPurchasePatch) => Promise<void>;
}) {
    const [value, setValue] = useState(expense.amountOriginal);
    const [bookingRef, setBookingRef] = useState(expense.bookingRef ?? '');
    const [saving, setSaving] = useState(false);

    const symbol = CURRENCIES.find((c) => c.code === expense.currency)?.symbol ?? expense.currency;
    const isForeign = expense.currency !== 'BRL';
    const valueUpdate = buildPurchaseValueUpdate(expense, value, marketRate);
    const previewBRL = valueUpdate?.amountBRL ?? expense.amountBRL;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!(value > 0) || saving) return;

        const nextRef = normalizeBookingRef(bookingRef);
        const previousRef = normalizeBookingRef(expense.bookingRef);

        setSaving(true);
        try {
            await onConfirm({
                ...(valueUpdate ?? {}),
                // undefined = não mexe; só grava/remove quando mudou.
                bookingRef: nextRef === previousRef ? undefined : nextRef,
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col">
            <DialogHeader className="p-6 border-b border-border bg-muted/40">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <ShoppingBag className="w-4 h-4 text-primary" />
                    </div>
                    <DialogTitle className="text-base font-semibold text-foreground">Confirmar compra</DialogTitle>
                </div>
                <DialogDescription className="text-sm text-muted-foreground pt-1">
                    {expense.description}
                </DialogDescription>
            </DialogHeader>

            <div className="p-6 space-y-5">
                <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Valor real ({expense.currency})</Label>
                    <MoneyInput
                        className="h-10"
                        prefix={symbol}
                        value={value}
                        onValueChange={setValue}
                        required
                    />
                    <p className="text-xs text-muted-foreground tabular-nums">
                        Estimado: {symbol} {expense.amountOriginal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        {isForeign && ` · ${valueUpdate ? 'novo total' : 'total'} ≈ ${formatBRL(previewBRL)}`}
                    </p>
                </div>

                <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Código ou link da reserva (opcional)</Label>
                    <Input
                        className="h-10"
                        value={bookingRef}
                        maxLength={BOOKING_REF_MAX_LENGTH}
                        onChange={(e) => setBookingRef(e.target.value)}
                        placeholder="Ex: ABC123 ou https://booking.com/..."
                    />
                </div>
            </div>

            <div className="p-4 bg-muted/40 border-t border-border flex gap-3">
                <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">Cancelar</Button>
                <Button type="submit" disabled={saving || !(value > 0)} className="flex-[2] h-11 rounded-xl shadow-sm">
                    {saving ? "Salvando..." : "Marcar como comprado"}
                </Button>
            </div>
        </form>
    );
}
