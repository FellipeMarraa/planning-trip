// src/components/trip/AddExpenseDialog.tsx
import { useEffect, useState } from 'react';
import { createExpense, updateExpense } from '@/services/expenses';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/common/money-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, CreditCard, RotateCcw, Sparkles, Zap } from "lucide-react";
import { useExchange } from "@/hooks/useExchange.ts";
import { useUserProfiles } from "@/hooks/useUserProfiles";
import { useAuth } from "@/context/AuthContext";
import { getMemberName } from "@/lib/members";
import { cn } from "@/lib/utils";
import { CURRENCIES, type CurrencyCode } from "@/lib/currencies";
import { EXPENSE_CATEGORIES } from "@/lib/categories";
import type { Expense, Trip } from '@/types';

interface AddExpenseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    trip: Trip;
    expenseToEdit?: Expense;
}

type CurrencyType = CurrencyCode;

export default function AddExpenseDialog({ open, onOpenChange, trip, expenseToEdit }: AddExpenseDialogProps) {
    const { rates: liveRates } = useExchange();
    const { user } = useAuth();
    const profiles = useUserProfiles(trip.participants || []);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        description: '',
        category: 'Alimentação',
        currency: 'BRL' as CurrencyType,
        unitValue: 0,
        spread: 0,
        baseRate: 1, // cotação de compra, editável — congelada na despesa ao salvar
        paidBy: user?.uid || '',
        participants: trip.participants || [],
    });

    useEffect(() => {
        if (expenseToEdit) {
            const isEditingBRL = expenseToEdit.currency === 'BRL';
            const spread = isEditingBRL ? 0 : (expenseToEdit.spreadApplied || 1.6);
            const fallbackBaseRate = expenseToEdit.exchangeRateUsed
                ? expenseToEdit.exchangeRateUsed / (1 + spread / 100)
                : liveRates[expenseToEdit.currency] || 1;

            setFormData({
                description: expenseToEdit.description,
                category: expenseToEdit.category,
                currency: expenseToEdit.currency as CurrencyType,
                unitValue: expenseToEdit.amountOriginal,
                spread,
                baseRate: isEditingBRL ? 1 : (expenseToEdit.baseRateAtTime || fallbackBaseRate),
                paidBy: expenseToEdit.paidBy || user?.uid || '',
                participants: expenseToEdit.participants?.length ? expenseToEdit.participants : (trip.participants || []),
            });
        } else {
            setFormData({
                description: '',
                category: 'Alimentação',
                currency: 'BRL',
                unitValue: 0,
                spread: 0,
                baseRate: 1,
                paidBy: user?.uid || '',
                participants: trip.participants || [],
            });
        }
    }, [expenseToEdit, open]);

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
    const realRate = isBRL ? 1 : formData.baseRate * (1 + formData.spread / 100);
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
            baseRateAtTime: formData.baseRate,
            spreadApplied: formData.spread,
            amountBRL: totalBRL,
            paidBy: formData.paidBy,
            participants: formData.participants,
        };

        try {
            if (expenseToEdit) {
                await updateExpense(expenseToEdit.id, payload);
            } else {
                await createExpense(payload);
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

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-muted-foreground">Moeda</Label>
                                <Select
                                    value={formData.currency}
                                    onValueChange={(v: CurrencyType) => setFormData({
                                        ...formData,
                                        currency: v,
                                        baseRate: v === 'BRL' ? 1 : (liveRates[v] || 1),
                                        spread: v === 'BRL' ? 0 : (formData.spread || 1.6),
                                    })}
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

                        {!isBRL && (
                            <>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-medium text-muted-foreground">Cotação de compra (R$ por {formData.currency})</Label>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({...formData, baseRate: currentMarketRate})}
                                            className="text-xs text-primary hover:underline flex items-center gap-1"
                                        >
                                            <RotateCcw className="w-3 h-3" /> usar atual
                                        </button>
                                    </div>
                                    <MoneyInput
                                        className="h-10"
                                        prefix="R$"
                                        decimals={4}
                                        value={formData.baseRate}
                                        onValueChange={(v) => setFormData({...formData, baseRate: v})}
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground">Cotação de mercado agora: R$ {currentMarketRate.toFixed(4)}</p>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-sm font-medium text-muted-foreground">Taxa de conversão</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({...formData, spread: 1.6})}
                                            className={`flex items-center justify-center gap-2 h-9 rounded-lg text-xs font-medium transition-colors border ${formData.spread === 1.6 ? 'bg-primary/15 border-primary text-primary' : 'bg-muted/50 border-border text-muted-foreground'}`}
                                        >
                                            <Zap className="w-3.5 h-3.5" /> Wise (1,6%)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({...formData, spread: 6.38})}
                                            className={`flex items-center justify-center gap-2 h-9 rounded-lg text-xs font-medium transition-colors border ${formData.spread === 6.38 ? 'bg-destructive/15 border-destructive text-destructive' : 'bg-muted/50 border-border text-muted-foreground'}`}
                                        >
                                            <CreditCard className="w-3.5 h-3.5" /> Cartão BR (6,38%)
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="bg-primary/5 border border-primary/15 rounded-2xl p-5 space-y-3">
                            {!isBRL && (
                                <div className="flex items-center justify-between border-b border-border pb-3">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-muted-foreground">Taxa final</span>
                                        <span className="text-sm font-semibold text-primary tabular-nums">R$ {realRate.toFixed(2)}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs text-muted-foreground">Cotação usada</span>
                                        <p className="text-sm text-muted-foreground tabular-nums leading-none">R$ {formData.baseRate.toFixed(4)}</p>
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
