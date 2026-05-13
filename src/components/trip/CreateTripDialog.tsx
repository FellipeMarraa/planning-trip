// src/components/trip/CreateTripDialog.tsx
import { useState } from 'react';
import { db } from '@/config/firebase.ts';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
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
import { Plane, Calendar as CalendarIcon, Wallet2 } from "lucide-react";

interface CreateTripDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type BaseCurrency = 'EUR' | 'GBP' | 'USD' | 'BRL';

export default function CreateTripDialog({ open, onOpenChange }: CreateTripDialogProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        startDate: '',
        endDate: '',
        baseCurrency: 'EUR' as BaseCurrency
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.uid) return;

        setLoading(true);
        try {
            await addDoc(collection(db, 'trips'), {
                name: formData.name,
                startDate: formData.startDate,
                endDate: formData.endDate,
                ownerId: user.uid,
                participants: [user.uid],
                roles: { [user.uid]: 'ADM_TRIP' },
                baseCurrency: formData.baseCurrency,
                exchangeRates: {
                    'EUR': 6.12,
                    'GBP': 7.34,
                    'USD': 5.45
                },
                createdAt: serverTimestamp()
            });

            onOpenChange(false);
            setFormData({ name: '', startDate: '', endDate: '', baseCurrency: 'EUR' });
        } catch (error) {
            console.error("Erro ao gravar viagem:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/*
               Mudança principal: Fundo Branco (White) com anel de borda Slate-200.
               Arredondamento reduzido para 2xl (mais sóbrio).
            */}
            <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-[420px] w-[95vw] p-0 overflow-hidden rounded-2xl shadow-2xl shadow-slate-200/50 border-none ring-1 ring-slate-200">
                <form onSubmit={handleSubmit}>

                    {/* Header: Off-white sutil (Slate-50) para separação visual elegante */}
                    <DialogHeader className="p-6 pb-5 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-blue-600 rounded-xl shadow-md shadow-blue-100">
                                <Plane className="w-5 h-5 text-white -rotate-45" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-semibold tracking-tight text-slate-900">Configurar Viagem</DialogTitle>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-0.5">Parâmetros iniciais do roteiro</p>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-6 space-y-6">
                        {/* Campo: Nome */}
                        <div className="space-y-2">
                            <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-0.5">Destino ou Título</Label>
                            <Input
                                placeholder="Ex: Eurotrip Primavera"
                                className="bg-white border-slate-200 h-11 text-sm rounded-lg focus-visible:ring-blue-600/20 focus-visible:border-blue-600 transition-all placeholder:text-slate-300"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                required
                            />
                        </div>

                        {/* Grid: Datas */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-0.5 flex items-center gap-1.5">
                                    <CalendarIcon className="w-3 h-3" /> Partida
                                </Label>
                                <Input
                                    type="date"
                                    className="bg-white border-slate-200 text-xs h-11 rounded-lg focus-visible:ring-blue-600/20"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-0.5 flex items-center gap-1.5">
                                    <CalendarIcon className="w-3 h-3" /> Retorno
                                </Label>
                                <Input
                                    type="date"
                                    className="bg-white border-slate-200 text-xs h-11 rounded-lg focus-visible:ring-blue-600/20"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                                    required
                                />
                            </div>
                        </div>

                        {/* Campo: Moeda Principal */}
                        <div className="space-y-2">
                            <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-0.5 flex items-center gap-1.5">
                                <Wallet2 className="w-3 h-3" /> Moeda de Referência
                            </Label>
                            <Select
                                value={formData.baseCurrency}
                                onValueChange={(v: string) => {
                                    setFormData({ ...formData, baseCurrency: v as BaseCurrency });
                                }}
                            >
                                <SelectTrigger className="w-full bg-white border-slate-200 h-11 text-xs rounded-lg focus:ring-blue-600/20">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-slate-200 rounded-lg shadow-xl">
                                    <SelectItem value="EUR" className="text-xs">Euro (€)</SelectItem>
                                    <SelectItem value="GBP" className="text-xs">Libra (£)</SelectItem>
                                    <SelectItem value="USD" className="text-xs">Dólar ($)</SelectItem>
                                    <SelectItem value="BRL" className="text-xs">Real (R$)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-[10px] text-slate-400 italic ml-1">* Todos os gastos serão consolidados nesta moeda.</p>
                        </div>
                    </div>

                    {/* Footer: Cinza claro (Slate-50) para um fechamento limpo */}
                    <DialogFooter className="p-6 bg-slate-50/80 border-t border-slate-100 flex flex-row gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="flex-1 h-11 text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="flex-1 h-11 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold uppercase tracking-widest rounded-lg shadow-md transition-all active:scale-[0.97]"
                        >
                            {loading ? "Processando..." : "Confirmar"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}