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
                    'EUR': 6.12, // Valores sutilmente atualizados
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
            <DialogContent className="bg-[#0f172a] border-slate-800 text-slate-100 max-w-[400px] w-[95vw] p-0 overflow-hidden rounded-[2.5rem] ring-1 ring-white/5 shadow-2xl animate-in zoom-in-95 duration-200">
                <form onSubmit={handleSubmit}>
                    {/* Header com tom Slate mais claro */}
                    <DialogHeader className="p-7 pb-6 border-b border-slate-800/50 bg-slate-900/40">
                        <div className="flex items-center gap-4">
                            <div className="p-3.5 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-inner">
                                <Plane className="w-6 h-6 text-indigo-400 -rotate-45" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black uppercase tracking-tighter italic leading-none text-white">Novo Roteiro</DialogTitle>
                                <p className="text-[10px] text-slate-500 font-bold tracking-[0.2em] uppercase mt-1.5">Configuração inicial</p>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-7 space-y-7">
                        {/* Input Título */}
                        <div className="space-y-2.5">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Título da Viagem</Label>
                            <Input
                                placeholder="Ex: Lua de Mel 2026"
                                className="bg-slate-950 border-slate-800 h-14 text-sm rounded-2xl focus-visible:ring-indigo-500/50 transition-all placeholder:text-slate-700 text-slate-100 border-opacity-50"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                required
                            />
                        </div>

                        {/* Grid Datas */}
                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-2.5">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 flex items-center gap-2">
                                    <CalendarIcon className="w-3 h-3 text-indigo-500" /> Início
                                </Label>
                                <Input
                                    type="date"
                                    className="bg-slate-950 border-slate-800 text-xs h-14 rounded-2xl [color-scheme:dark] text-slate-100 border-opacity-50"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="space-y-2.5">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 flex items-center gap-2">
                                    <CalendarIcon className="w-3 h-3 text-indigo-500" /> Fim
                                </Label>
                                <Input
                                    type="date"
                                    className="bg-slate-950 border-slate-800 text-xs h-14 rounded-2xl [color-scheme:dark] text-slate-100 border-opacity-50"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                                    required
                                />
                            </div>
                        </div>

                        {/* Select Moeda */}
                        <div className="space-y-2.5">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 flex w-full items-center gap-2">
                                <Wallet2 className="w-3 h-3 text-indigo-500" /> Moeda Principal
                            </Label>
                            <Select
                                value={formData.baseCurrency}
                                onValueChange={(v: BaseCurrency | null) => {
                                    if (v) setFormData({...formData, baseCurrency: v});
                                }}
                            >
                                <SelectTrigger className="w-40 bg-slate-950 border-slate-800 h-14 text-xs rounded-2xl text-slate-100 border-opacity-50">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100 rounded-2xl shadow-2xl">
                                    <SelectItem value="EUR" className="text-xs focus:bg-indigo-600 focus:text-white transition-colors">Euro (€)</SelectItem>
                                    <SelectItem value="GBP" className="text-xs focus:bg-indigo-600 focus:text-white transition-colors">Libra (£)</SelectItem>
                                    <SelectItem value="USD" className="text-xs focus:bg-indigo-600 focus:text-white transition-colors">Dólar ($)</SelectItem>
                                    <SelectItem value="BRL" className="text-xs focus:bg-indigo-600 focus:text-white transition-colors">Real (R$)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Footer com botões robustos */}
                    <DialogFooter className="p-7 bg-slate-900/40 border-t border-slate-800/50 flex flex-row gap-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="flex-1 min-h-[52px] text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white hover:bg-slate-800 rounded-2xl transition-all"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="flex-1 min-h-[52px] bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-indigo-500/20 active:scale-[0.97] transition-all"
                        >
                            {loading ? "Gravando..." : "Confirmar"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}