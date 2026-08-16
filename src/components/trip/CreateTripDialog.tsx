// src/components/trip/CreateTripDialog.tsx
import { useState } from 'react';
import { createTrip } from '@/services/trips';
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
import { CURRENCIES, type CurrencyCode } from "@/lib/currencies";

interface CreateTripDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type BaseCurrency = CurrencyCode;

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
            await createTrip({
                name: formData.name,
                startDate: formData.startDate,
                endDate: formData.endDate,
                ownerId: user.uid,
                baseCurrency: formData.baseCurrency,
            });

            onOpenChange(false);
            setFormData({ name: '', startDate: '', endDate: '', baseCurrency: 'EUR' });
        } catch (error) {
            console.error("Erro ao criar viagem:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[420px] w-[95vw] p-0 overflow-hidden rounded-3xl">
                <form onSubmit={handleSubmit}>

                    <DialogHeader className="p-6 pb-5 border-b border-border bg-muted/40">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-primary rounded-xl shadow-sm">
                                <Plane className="w-5 h-5 text-primary-foreground -rotate-45" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">Nova viagem</DialogTitle>
                                <p className="text-sm text-muted-foreground mt-0.5">Defina o básico para começar a planejar</p>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-6 space-y-5">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-muted-foreground">Destino ou título</Label>
                            <Input
                                placeholder="Ex: Eurotrip de primavera"
                                className="h-11 rounded-lg"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                                    <CalendarIcon className="w-3.5 h-3.5" /> Ida
                                </Label>
                                <Input
                                    type="date"
                                    className="h-11 rounded-lg"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                                    <CalendarIcon className="w-3.5 h-3.5" /> Volta
                                </Label>
                                <Input
                                    type="date"
                                    className="h-11 rounded-lg"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                                <Wallet2 className="w-3.5 h-3.5" /> Moeda de referência
                            </Label>
                            <Select
                                value={formData.baseCurrency}
                                onValueChange={(v: string) => setFormData({ ...formData, baseCurrency: v as BaseCurrency })}
                            >
                                <SelectTrigger className="w-full h-11 rounded-lg">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-lg">
                                    {CURRENCIES.map((c) => (
                                        <SelectItem key={c.code} value={c.code} className="text-xs">{c.label} ({c.symbol})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Os gastos serão consolidados em reais a partir desta moeda.</p>
                        </div>
                    </div>

                    <DialogFooter className="p-6 flex flex-row gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="flex-1 h-11 rounded-lg"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="flex-1 h-11 rounded-lg shadow-sm"
                        >
                            {loading ? "Criando..." : "Criar viagem"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
