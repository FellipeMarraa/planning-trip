import {useState} from 'react';
import {db} from '@/config/firebase.ts';
import {addDoc, collection, serverTimestamp} from 'firebase/firestore';
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Banknote, Calculator} from "lucide-react";
import type {Trip} from '@/types';

interface AddExpenseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    trip: Trip;
}

export default function AddExpenseDialog({ open, onOpenChange, trip }: AddExpenseDialogProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        description: '',
        category: 'Atrações turísticas',
        currency: 'EUR' as 'EUR' | 'GBP' | 'USD' | 'BRL',
        unitValue: 0,
        quantity: 1,
    });

    // Cálculo em tempo real para feedback visual (UX)
    const currentRate = trip.exchangeRates[formData.currency] || 1;
    const totalBRL = formData.unitValue * formData.quantity * currentRate;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await addDoc(collection(db, 'expenses'), {
                tripId: trip.id,
                description: formData.description,
                category: formData.category,
                amountOriginal: formData.unitValue * formData.quantity,
                currency: formData.currency,
                amountBRL: totalBRL,
                quantity: formData.quantity,
                createdAt: serverTimestamp()
            });
            onOpenChange(false);
            setFormData({ ...formData, description: '', unitValue: 0, quantity: 1 });
        } catch (error) {
            console.error("Erro ao salvar gasto:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100 max-w-[400px] w-[95vw] p-0 overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/10">
                <form onSubmit={handleSubmit}>
                    <DialogHeader className="p-6 border-b border-zinc-800 bg-zinc-800/30">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                <Banknote className="w-5 h-5 text-emerald-400" />
                            </div>
                            <DialogTitle className="text-sm font-black uppercase tracking-widest italic">Novo Lançamento</DialogTitle>
                        </div>
                    </DialogHeader>

                    <div className="p-6 space-y-5">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">O que foi pago?</Label>
                            <Input
                                placeholder="Ex: Museu do Louvre"
                                className="bg-zinc-950 border-zinc-800 h-11 rounded-xl text-sm"
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Moeda</Label>
                                <Select value={formData.currency} onValueChange={(v: any) => setFormData({...formData, currency: v})}>
                                    <SelectTrigger className="bg-zinc-950 border-zinc-800 h-11 rounded-xl text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                        <SelectItem value="EUR">Euro (€)</SelectItem>
                                        <SelectItem value="GBP">Libra (£)</SelectItem>
                                        <SelectItem value="USD">Dólar ($)</SelectItem>
                                        <SelectItem value="BRL">Real (R$)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Valor Unitário</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    className="bg-zinc-950 border-zinc-800 h-11 rounded-xl text-sm"
                                    value={formData.unitValue || ''}
                                    onChange={e => setFormData({...formData, unitValue: Number(e.target.value)})}
                                    required
                                />
                            </div>
                        </div>

                        {/* Preview da Conversão */}
                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Calculator className="w-4 h-4 text-emerald-500 opacity-60" />
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Conversão Real</span>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-zinc-500 italic">Taxa: R$ {currentRate.toFixed(2)}</p>
                                <p className="text-lg font-black text-emerald-400 tracking-tighter">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalBRL)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-6 bg-zinc-800/30 border-t border-zinc-800 flex flex-row gap-3">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 h-12 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading} className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-500/10">
                            {loading ? "Salvando..." : "Salvar Gasto"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}