// src/components/trip/AddExpenseDialog.tsx
import {useEffect, useState} from 'react';
import {db} from '@/config/firebase.ts';
import {addDoc, collection, doc, serverTimestamp, updateDoc} from 'firebase/firestore';
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {CreditCard, Sparkles, Zap} from "lucide-react";
import {useExchange} from "@/hooks/useExchange.ts";
import type {Expense, Trip} from '@/types';

// Definição das Props para evitar o erro TS2304
interface AddExpenseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    trip: Trip;
    expenseToEdit?: Expense;
}

type CurrencyType = 'EUR' | 'GBP' | 'USD' | 'BRL';

export default function AddExpenseDialog({ open, onOpenChange, trip, expenseToEdit }: AddExpenseDialogProps) {
    const { rates: liveRates } = useExchange();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        description: '',
        category: 'Alimentação',
        currency: 'EUR' as CurrencyType,
        unitValue: 0,
        spread: 1.6, // Valor base Wise: 1.1% IOF + ~0.5% Spread
    });

    // Reset ou Preenchimento (Edit) do formulário
    useEffect(() => {
        if (expenseToEdit) {
            setFormData({
                description: expenseToEdit.description,
                category: expenseToEdit.category,
                currency: expenseToEdit.currency as CurrencyType,
                unitValue: expenseToEdit.amountOriginal,
                spread: expenseToEdit.spreadApplied || 1.6
            });
        } else {
            setFormData({
                description: '',
                category: 'Alimentação',
                currency: 'EUR',
                unitValue: 0,
                spread: 1.6
            });
        }
    }, [expenseToEdit, open]);

    // LÓGICA FINANCEIRA WISE
    const baseRate = liveRates[formData.currency] || 1;
    const realRate = baseRate * (1 + formData.spread / 100);
    const totalBRL = formData.unitValue * realRate;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (totalBRL <= 0) return;

        setLoading(true);
        const payload = {
            tripId: trip.id,
            description: formData.description,
            category: formData.category,
            amountOriginal: formData.unitValue,
            currency: formData.currency,
            exchangeRateUsed: realRate,
            spreadApplied: formData.spread,
            amountBRL: totalBRL,
            updatedAt: serverTimestamp()
        };

        try {
            if (expenseToEdit) {
                await updateDoc(doc(db, 'expenses', expenseToEdit.id), payload);
            } else {
                await addDoc(collection(db, 'expenses'), {
                    ...payload,
                    createdAt: serverTimestamp()
                });
            }
            onOpenChange(false);
        } catch (error) {
            console.error("Erro ao processar transação:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-[#0b1222] border-white/[0.06] text-slate-200 max-w-[380px] rounded-2xl p-0 overflow-hidden outline-none shadow-2xl">
                <form onSubmit={handleSubmit}>
                    <DialogHeader className="p-6 border-b border-white/[0.04] bg-white/[0.01]">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600/10 rounded-lg border border-blue-500/20">
                                <Sparkles className="w-4 h-4 text-blue-400" />
                            </div>
                            <div>
                                <DialogTitle className="text-sm font-medium text-white tracking-tight">
                                    {expenseToEdit ? 'Editar Registro' : 'Novo Lançamento'}
                                </DialogTitle>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.15em] mt-0.5 italic">Finance Terminal</p>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-6 space-y-6">
                        {/* Descrição */}
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Descrição do Débito</Label>
                            <Input
                                className="bg-white/[0.03] border-white/[0.08] text-sm h-10 outline-none focus:ring-blue-500/20"
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                                placeholder="Ex: Restaurante, Bilhete de Trem..."
                                required
                            />
                        </div>

                        {/* Valor e Moeda */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Moeda</Label>
                                <Select value={formData.currency} onValueChange={(v: any) => setFormData({...formData, currency: v})}>
                                    <SelectTrigger className="bg-white/[0.03] border-white/[0.08] h-10 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#0f172a] border-white/10 text-slate-300">
                                        <SelectItem value="EUR">Euro (€)</SelectItem>
                                        <SelectItem value="USD">Dólar ($)</SelectItem>
                                        <SelectItem value="GBP">Libra (£)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Valor {formData.currency}</Label>
                                <Input
                                    type="number" step="0.01"
                                    className="bg-white/[0.03] border-white/[0.08] h-10 text-sm tabular-nums outline-none"
                                    value={formData.unitValue || ''}
                                    onChange={e => setFormData({...formData, unitValue: Number(e.target.value)})}
                                    required
                                />
                            </div>
                        </div>

                        {/* Presets de Taxa Wise vs Cartão */}
                        <div className="space-y-3">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 italic">Conversão Rate</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFormData({...formData, spread: 1.6})}
                                    className={`flex items-center justify-center gap-2 h-9 rounded-lg text-[10px] font-bold transition-all border ${formData.spread === 1.6 ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-white/[0.02] border-white/[0.06] text-slate-500'}`}
                                >
                                    <Zap className="w-3 h-3" /> WISE (1.6%)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({...formData, spread: 6.38})}
                                    className={`flex items-center justify-center gap-2 h-9 rounded-lg text-[10px] font-bold transition-all border ${formData.spread === 6.38 ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-white/[0.02] border-white/[0.06] text-slate-500'}`}
                                >
                                    <CreditCard className="w-3 h-3" /> CARTÃO BR (6.38%)
                                </button>
                            </div>
                        </div>

                        {/* Monitor de Liquidação BRL */}
                        <div className="bg-blue-500/[0.03] border border-blue-500/10 rounded-2xl p-5 space-y-4">
                            <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Rate Final</span>
                                    <span className="text-xs font-bold text-blue-400 tabular-nums italic">R$ {realRate.toFixed(2)}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Market</span>
                                    <p className="text-[10px] font-medium text-slate-400 tabular-nums leading-none">R$ {baseRate.toFixed(2)}</p>
                                </div>
                            </div>
                            <div>
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Total em BRL</span>
                                <p className="text-2xl font-medium text-white tabular-nums tracking-tighter">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalBRL)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-white/[0.02] border-t border-white/[0.04] flex gap-3">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 text-[10px] font-bold uppercase text-slate-500">Cancelar</Button>
                        <Button
                            type="submit"
                            disabled={loading || totalBRL <= 0}
                            className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold uppercase tracking-widest h-11 rounded-xl shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
                        >
                            {loading ? "Sincronizando..." : (expenseToEdit ? "Salvar Alteração" : "Efetivar Gasto")}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}