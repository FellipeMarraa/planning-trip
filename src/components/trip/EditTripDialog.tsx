// src/components/trip/EditTripDialog.tsx
import { useEffect, useState } from 'react';
import { updateTripDetails } from '@/services/trips';
import { useToast } from '@/context/ToastContext';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Calendar as CalendarIcon, Wallet2 } from "lucide-react";
import { CURRENCIES, type CurrencyCode } from "@/lib/currencies";
import type { Trip } from '@/types';

interface EditTripDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    trip: Trip;
}

export default function EditTripDialog({ open, onOpenChange, trip }: EditTripDialogProps) {
    const { showError } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: trip.name,
        startDate: trip.startDate,
        endDate: trip.endDate,
        baseCurrency: (trip.baseCurrency || 'EUR') as CurrencyCode,
    });

    useEffect(() => {
        setFormData({
            name: trip.name,
            startDate: trip.startDate,
            endDate: trip.endDate,
            baseCurrency: (trip.baseCurrency || 'EUR') as CurrencyCode,
        });
    }, [trip, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await updateTripDetails(trip.id, formData);
            onOpenChange(false);
        } catch (error) {
            console.error("Erro ao atualizar viagem:", error);
            showError("Não foi possível salvar as alterações. Tente novamente.");
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
                                <Pencil className="w-5 h-5 text-primary-foreground" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">Editar viagem</DialogTitle>
                                <p className="text-sm text-muted-foreground mt-0.5">Atualize nome, datas e moeda</p>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-6 space-y-5">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-muted-foreground">Destino ou título</Label>
                            <Input
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
                                onValueChange={(v: CurrencyCode) => setFormData({ ...formData, baseCurrency: v })}
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
                            {loading ? "Salvando..." : "Salvar alterações"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
