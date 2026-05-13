// src/components/trip/AddExpenseDialog.tsx
import { useState, useEffect } from 'react';
import { db } from '@/config/firebase.ts';
import { addDoc, collection, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useExchange } from '@/hooks/useExchange';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Banknote, Calculator, Info } from "lucide-react";
import type { Trip, Expense } from '@/types';

interface AddExpenseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    trip: Trip;
    expenseToEdit?: Expense; // Prop opcional para modo edição
}

type CurrencyType = 'EUR' | 'GBP' | 'USD' | 'BRL';

export default function AddExpenseDialog({
                                             open,
                                             onOpenChange,
                                             trip,
                                             expenseToEdit
                                         }: AddExpenseDialogProps) {
    const { rates: liveRates } = useExchange();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        description: '',
        category: 'Alimentação',
        currency: 'EUR' as CurrencyType,
        unitValue: 0,
        quantity: 1,
    });

    // Efeito para preencher o formulário caso seja Edição
    useEffect(() => {
        if (expenseToEdit && open) {
            setFormData({
                description: expenseToEdit.description,
                category: expenseToEdit.category,
                currency: expenseToEdit.currency as CurrencyType,
                unitValue: expenseToEdit.amountOriginal,
                quantity: 1, // Resetamos quantity para 1 ou conforme sua lógica
            });
        } else if (open) {
            // Resetar para novo lançamento
            setFormData({
                description: '',
                category: 'Alimentação',
                currency: 'EUR',
                unitValue: 0,
                quantity: 1,
            });
        }
    }, [expenseToEdit, open]);

    // Cálculo técnico utilizando taxas em tempo real
    const currentRate = liveRates[formData.currency] || 1;
    const totalBRL = formData.unitValue * formData.quantity * currentRate;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (totalBRL <= 0) return;

        setLoading(true);
        try {
            const expenseData = {
                description: formData.description,
                category: formData.category,
                amountOriginal: formData.unitValue * formData.quantity,
                currency: formData.currency,
                exchangeRateAtTime: currentRate,
                amountBRL: totalBRL,
                updatedAt: serverTimestamp()
            };

            if (expenseToEdit) {
                // MODO EDIÇÃO
                await updateDoc(doc(db, 'expenses', expenseToEdit.id), expenseData);
            } else {
                // MODO CRIAÇÃO
                await addDoc(collection(db, 'expenses'), {
                    ...expenseData,
                    tripId: trip.id,
                    createdAt: serverTimestamp()
                });
            }

            onOpenChange(false);
        } catch (error) {
            console.error("Erro ao processar lançamento:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-[420px] w-[95vw] p-0 overflow-hidden rounded-xl shadow-2xl border-none ring-1 ring-slate-200">
                <form onSubmit={handleSubmit}>

                    <DialogHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-900 rounded-lg shadow-sm">
                                <Banknote className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-[15px] font-bold tracking-tight text-slate-900">
                                    {expenseToEdit ? 'Editar Lançamento' : 'Novo Lançamento'}
                                </DialogTitle>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                    {expenseToEdit ? 'Atualização de ativo financeiro' : 'Registro no extrato consolidado'}
                                </p>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-6 space-y-5">
                        <div className="space-y-2">
                            <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-0.5">Descrição do Item</Label>
                            <Input
                                placeholder="Ex: Jantar em Paris"
                                className="bg-white border-slate-200 h-10 rounded-md text-[13px] focus-visible:ring-blue-600/20 focus-visible:border-blue-600 shadow-none"
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-0.5">Moeda</Label>
                                <Select
                                    value={formData.currency}
                                    onValueChange={(v: string) => setFormData({...formData, currency: v as CurrencyType})}
                                >
                                    <SelectTrigger className="w-full bg-white border-slate-200 h-10 rounded-md text-[12px] font-medium border-slate-200 shadow-none">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="EUR">Euro (€)</SelectItem>
                                        <SelectItem value="GBP">Libra (£)</SelectItem>
                                        <SelectItem value="USD">Dólar ($)</SelectItem>
                                        <SelectItem value="BRL">Real (R$)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-0.5">Valor Unitário</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="bg-white border-slate-200 rounded-md text-[13px] tabular-nums shadow-none"
                                    value={formData.unitValue || ''}
                                    onChange={e => setFormData({...formData, unitValue: Number(e.target.value)})}
                                    required
                                />
                            </div>
                        </div>

                        <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                                <div className="flex items-center gap-2">
                                    <Calculator className="w-3.5 h-3.5 text-blue-600" />
                                    <span className="text-[10px] font-bold text-blue-900 uppercase tracking-widest">Liquidação BRL</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                                        Taxa Live: R$ {currentRate.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-bold text-blue-400 uppercase tracking-tight">Valor convertido</span>
                                    <p className="text-xl font-bold text-blue-900 tabular-nums tracking-tight">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalBRL)}
                                    </p>
                                </div>
                                <Info className="w-4 h-4 text-blue-200" />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-center gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="w-full flex-1 h-10 text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || totalBRL <= 0}
                            className="w-full flex-1 h-10 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold uppercase tracking-widest rounded-md shadow-sm transition-all active:scale-95"
                        >
                            {loading ? "Processando..." : expenseToEdit ? "Salvar Alterações" : "Confirmar"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}