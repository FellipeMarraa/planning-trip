// src/components/trip/EditTripDialog.tsx
import { useEffect, useState } from 'react';
import { updateTripDetails } from '@/services/trips';
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
import { Pencil, Calendar as CalendarIcon } from "lucide-react";
import type { Trip } from '@/types';

interface EditTripDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    trip: Trip;
}

export default function EditTripDialog({ open, onOpenChange, trip }: EditTripDialogProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: trip.name,
        startDate: trip.startDate,
        endDate: trip.endDate,
    });

    useEffect(() => {
        setFormData({ name: trip.name, startDate: trip.startDate, endDate: trip.endDate });
    }, [trip, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await updateTripDetails(trip.id, formData);
            onOpenChange(false);
        } catch (error) {
            console.error("Erro ao atualizar viagem:", error);
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
                                <p className="text-sm text-muted-foreground mt-0.5">Atualize nome e datas</p>
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
