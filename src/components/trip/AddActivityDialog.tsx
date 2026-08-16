// src/components/trip/AddActivityDialog.tsx
import { useState } from 'react';
import { createActivity } from '@/services/activities';
import { useToast } from '@/context/ToastContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlignLeft, Clock, MapPin, Sparkles } from "lucide-react";

interface AddActivityDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tripId: string;
    dateId: string;
}

export default function AddActivityDialog({ open, onOpenChange, tripId, dateId }: AddActivityDialogProps) {
    const { showError } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        time: '',
        location: '',
        description: '',
    });

    const formattedDate = dateId ? dateId.split('-').reverse().join('/') : '--/--/----';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createActivity({ tripId, dateId, ...formData });
            setFormData({ time: '', location: '', description: '' });
            onOpenChange(false);
        } catch (error) {
            console.error("Erro ao salvar atividade:", error);
            showError("Não foi possível salvar a atividade. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[400px] rounded-3xl p-0 overflow-hidden">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-5">
                        <DialogHeader className="space-y-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Sparkles className="w-4 h-4 text-primary" />
                                <DialogTitle className="text-base font-semibold text-foreground">
                                    Adicionar atividade
                                </DialogTitle>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Planeje sua próxima parada para o dia <span className="text-primary font-medium">{formattedDate}</span>.
                            </p>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5" /> Horário
                                </Label>
                                <Input
                                    type="time"
                                    className="h-10"
                                    value={formData.time}
                                    onChange={e => setFormData({...formData, time: e.target.value})}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5" /> Local
                                </Label>
                                <Input
                                    placeholder="Nome do local ou atração"
                                    className="h-10"
                                    value={formData.location}
                                    onChange={e => setFormData({...formData, location: e.target.value})}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <AlignLeft className="w-3.5 h-3.5" /> Notas
                                </Label>
                                <Textarea
                                    placeholder="Ex: reserva confirmada, levar ingressos..."
                                    className="min-h-[90px] resize-none"
                                    value={formData.description}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-muted/40 border-t border-border">
                        <Button
                            disabled={loading}
                            className="w-full h-10 rounded-lg shadow-sm"
                        >
                            {loading ? "Salvando..." : "Adicionar ao roteiro"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
