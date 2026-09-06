// src/components/trip/AddExpenseDialog.tsx
import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { createExpense, updateExpense } from '@/services/expenses';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/common/money-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Check, Loader2, Sparkles, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getMemberName } from "@/lib/members";
import { cn } from "@/lib/utils";
import { CURRENCIES, type CurrencyCode } from "@/lib/currencies";
import { EXPENSE_CATEGORIES } from "@/lib/categories";
import { resizeReceiptToBase64 } from "@/lib/image";
import type { Expense, Trip, UserProfile } from '@/types';

const nowForInput = () => format(new Date(), "yyyy-MM-dd'T'HH:mm");

interface AddExpenseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    trip: Trip;
    profiles: Record<string, UserProfile>;
    rates: Record<string, number>;
    expenseToEdit?: Expense;
}

type CurrencyType = CurrencyCode;

export default function AddExpenseDialog({ open, onOpenChange, trip, profiles, rates: liveRates, expenseToEdit }: AddExpenseDialogProps) {
    const { user } = useAuth();
    const { showError } = useToast();
    const [loading, setLoading] = useState(false);
    const [processingReceipt, setProcessingReceipt] = useState(false);
    const receiptInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        description: '',
        category: 'Alimentação',
        currency: 'BRL' as CurrencyType,
        unitValue: 0,
        paidBy: user?.uid || '',
        participants: trip.participants || [],
        date: nowForInput(),
        // null = sem comprovante (ou removido); string = base64 (novo ou o que já existia)
        receiptBase64: null as string | null,
    });

    useEffect(() => {
        if (expenseToEdit) {
            setFormData({
                description: expenseToEdit.description,
                category: expenseToEdit.category,
                currency: expenseToEdit.currency as CurrencyType,
                unitValue: expenseToEdit.amountOriginal,
                paidBy: expenseToEdit.paidBy || user?.uid || '',
                participants: expenseToEdit.participants?.length ? expenseToEdit.participants : (trip.participants || []),
                // Despesa antiga sem `date` (campo só passou a ser gravado
                // em 2026-09-02) cai no "agora" — usuário ajusta se lembrar.
                date: expenseToEdit.date || nowForInput(),
                receiptBase64: expenseToEdit.receiptBase64 || null,
            });
        } else {
            setFormData({
                description: '',
                category: 'Alimentação',
                currency: 'BRL',
                unitValue: 0,
                paidBy: user?.uid || '',
                participants: trip.participants || [],
                date: nowForInput(),
                receiptBase64: null,
            });
        }
    }, [expenseToEdit, open]);

    const handleReceiptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        setProcessingReceipt(true);
        try {
            const base64 = await resizeReceiptToBase64(file);
            setFormData((prev) => ({ ...prev, receiptBase64: base64 }));
        } catch (error) {
            console.error('Erro ao processar comprovante:', error);
            showError(error instanceof Error ? error.message : 'Não foi possível processar a imagem.');
        } finally {
            setProcessingReceipt(false);
        }
    };

    const toggleParticipant = (uid: string) => {
        setFormData((prev) => ({
            ...prev,
            participants: prev.participants.includes(uid)
                ? prev.participants.filter((p) => p !== uid)
                : [...prev.participants, uid],
        }));
    };

    const categoryOptions = EXPENSE_CATEGORIES.includes(formData.category as typeof EXPENSE_CATEGORIES[number])
        ? EXPENSE_CATEGORIES
        : [...EXPENSE_CATEGORIES, formData.category];

    const isBRL = formData.currency === 'BRL';
    const currentMarketRate = liveRates[formData.currency] || 1;
    // Moeda != BRL é sempre "carteira de câmbio" — se você registra em
    // EUR/GBP/etc. é porque precisa ter esse dinheiro físico no destino,
    // nunca uma conversão nova na hora (ver lib/currencyWallet.ts,
    // useWalletExpenses.ts filtra por currency != 'BRL'). Por isso a
    // cotação é sempre a de mercado, sem spread editável — não existe mais
    // "taxa de cartão/Wise escolhida na hora" separada da carteira.
    const realRate = isBRL ? 1 : currentMarketRate;
    const totalBRL = formData.unitValue * realRate;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (totalBRL <= 0 || formData.participants.length === 0) return;

        setLoading(true);
        const payload = {
            tripId: trip.id,
            description: formData.description,
            category: formData.category,
            amountOriginal: formData.unitValue,
            currency: formData.currency,
            exchangeRateUsed: realRate,
            baseRateAtTime: realRate,
            spreadApplied: 0,
            amountBRL: totalBRL,
            paidBy: formData.paidBy,
            participants: formData.participants,
            date: formData.date,
        };

        try {
            if (expenseToEdit) {
                // Edição sempre manda o campo explícito (string novo/mantido,
                // ou null pra remover) — updateExpense trata null como
                // "apagar comprovante existente" (deleteField).
                await updateExpense(expenseToEdit.id, { ...payload, receiptBase64: formData.receiptBase64 });
            } else {
                await createExpense({
                    ...payload,
                    ...(formData.receiptBase64 ? { receiptBase64: formData.receiptBase64 } : {}),
                });
            }
            onOpenChange(false);
        } catch (error) {
            console.error("Erro ao salvar despesa:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[400px] max-h-[90vh] rounded-3xl p-0 overflow-hidden flex flex-col">
                <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
                    <DialogHeader className="p-6 border-b border-border bg-muted/40 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Sparkles className="w-4 h-4 text-primary" />
                            </div>
                            <DialogTitle className="text-base font-semibold text-foreground">
                                {expenseToEdit ? 'Editar despesa' : 'Nova despesa'}
                            </DialogTitle>
                        </div>
                    </DialogHeader>

                    <div className="p-6 space-y-5 overflow-y-auto scrollbar-none flex-1 min-h-0">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-muted-foreground">Descrição</Label>
                            <Input
                                className="h-10"
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                                placeholder="Ex: Restaurante, bilhete de trem..."
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-muted-foreground">Categoria</Label>
                            <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                                <SelectTrigger className="h-10 w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {categoryOptions.map((cat) => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-muted-foreground">Data e hora</Label>
                            <Input
                                type="datetime-local"
                                className="h-10"
                                value={formData.date}
                                onChange={(e) => setFormData({...formData, date: e.target.value})}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-muted-foreground">Moeda</Label>
                                <Select
                                    value={formData.currency}
                                    onValueChange={(v: CurrencyType) => setFormData({...formData, currency: v})}
                                >
                                    <SelectTrigger className="h-10 w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CURRENCIES.map((c) => (
                                            <SelectItem key={c.code} value={c.code}>{c.label} ({c.symbol})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-muted-foreground">Valor ({formData.currency})</Label>
                                <MoneyInput
                                    className="h-10"
                                    prefix={CURRENCIES.find(c => c.code === formData.currency)?.symbol}
                                    value={formData.unitValue}
                                    onValueChange={(v) => setFormData({...formData, unitValue: v})}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-muted-foreground">Quem pagou</Label>
                            <Select value={formData.paidBy} onValueChange={(v) => setFormData({...formData, paidBy: v})}>
                                <SelectTrigger className="h-10 w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {(trip.participants || []).map((uid) => (
                                        <SelectItem key={uid} value={uid}>{getMemberName(uid, trip, profiles)}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-muted-foreground">Dividir com</Label>
                            <div className="flex flex-wrap gap-2">
                                {(trip.participants || []).map((uid) => {
                                    const selected = formData.participants.includes(uid);
                                    return (
                                        <button
                                            key={uid}
                                            type="button"
                                            onClick={() => toggleParticipant(uid)}
                                            className={cn(
                                                "flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium border transition-colors",
                                                selected ? "bg-primary/15 border-primary text-primary" : "bg-muted/50 border-border text-muted-foreground"
                                            )}
                                        >
                                            {selected && <Check className="w-3 h-3" />}
                                            {getMemberName(uid, trip, profiles)}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-muted-foreground">Comprovante</Label>
                            <input
                                ref={receiptInputRef}
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={handleReceiptChange}
                            />
                            {formData.receiptBase64 ? (
                                <div className="relative w-fit">
                                    <img
                                        src={formData.receiptBase64}
                                        alt="Comprovante"
                                        className="h-24 w-24 object-cover rounded-xl border border-border"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setFormData({...formData, receiptBase64: null})}
                                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm"
                                        aria-label="Remover comprovante"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={processingReceipt}
                                    onClick={() => receiptInputRef.current?.click()}
                                >
                                    {processingReceipt ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Camera className="mr-2 h-4 w-4" />
                                    )}
                                    Anexar foto
                                </Button>
                            )}
                        </div>

                        <div className="bg-primary/5 border border-primary/15 rounded-2xl p-5 space-y-3">
                            {!isBRL && (
                                <div className="flex items-center justify-between border-b border-border pb-3">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-muted-foreground">Cotação de mercado</span>
                                        <span className="text-sm font-semibold text-primary tabular-nums">R$ {realRate.toFixed(4)}</span>
                                    </div>
                                </div>
                            )}
                            <div>
                                <span className="text-xs text-muted-foreground">Total em BRL</span>
                                <p className="text-2xl font-semibold text-foreground tabular-nums">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalBRL)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-muted/40 border-t border-border flex gap-3 flex-shrink-0">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="flex-1">Cancelar</Button>
                        <Button
                            type="submit"
                            disabled={loading || totalBRL <= 0 || formData.participants.length === 0}
                            className="flex-[2] h-11 rounded-xl shadow-sm"
                        >
                            {loading ? "Salvando..." : (expenseToEdit ? "Salvar alteração" : "Adicionar despesa")}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
