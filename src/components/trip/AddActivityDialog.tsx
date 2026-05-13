// src/components/trip/AddActivityDialog.tsx
import {useState} from 'react';
import {db} from '@/config/firebase.ts';
import {addDoc, collection, serverTimestamp} from 'firebase/firestore';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {AlignLeft, Clock, MapPin, Sparkles} from "lucide-react";

interface AddActivityDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tripId: string;
    dateId: string; // Formato yyyy-MM-dd recebido do pai
}

export default function AddActivityDialog({ open, onOpenChange, tripId, dateId }: AddActivityDialogProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        time: '',
        location: '',
        description: '',
    });

    // Lógica para formatar yyyy-MM-dd em DD/MM/YYYY
    const formattedDate = dateId ? dateId.split('-').reverse().join('/') : '--/--/----';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await addDoc(collection(db, 'activities'), {
                tripId,
                dateId,
                time: formData.time,
                location: formData.location,
                description: formData.description,
                completed: false,
                createdAt: serverTimestamp()
            });
            setFormData({ time: '', location: '', description: '' });
            onOpenChange(false);
        } catch (error) {
            console.error("Erro ao salvar atividade:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-[#0b1222] border-white/[0.06] text-slate-200 max-w-[380px] rounded-2xl shadow-2xl p-0 overflow-hidden outline-none">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-6">
                        <DialogHeader className="space-y-1">
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="w-4 h-4 text-blue-500/70" />
                                <DialogTitle className="text-base font-medium tracking-tight text-white">
                                    Adicionar Checkpoint
                                </DialogTitle>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                                Planeje sua próxima parada para o dia <span className="text-blue-400 font-medium">{formattedDate}</span>.
                            </p>
                        </DialogHeader>

                        <div className="space-y-5">
                            {/* Horário */}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 flex items-center gap-2">
                                    <Clock className="w-3 h-3" /> Horário
                                </Label>
                                <Input
                                    type="time"
                                    className="h-10 bg-white/[0.03] border-white/[0.08] text-sm text-slate-200 focus-visible:ring-blue-500/30 transition-all outline-none"
                                    value={formData.time}
                                    onChange={e => setFormData({...formData, time: e.target.value})}
                                    required
                                />
                            </div>

                            {/* Local */}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 flex items-center gap-2">
                                    <MapPin className="w-3 h-3" /> Destino
                                </Label>
                                <Input
                                    placeholder="Nome do local ou atração"
                                    className="h-10 bg-white/[0.03] border-white/[0.08] text-sm text-slate-200 placeholder:text-slate-700 focus-visible:ring-blue-500/30 transition-all outline-none"
                                    value={formData.location}
                                    onChange={e => setFormData({...formData, location: e.target.value})}
                                    required
                                />
                            </div>

                            {/* Detalhes */}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 flex items-center gap-2">
                                    <AlignLeft className="w-3 h-3" /> Notas
                                </Label>
                                <Textarea
                                    placeholder="Ex: Reserva confirmada, levar ingressos..."
                                    className="bg-white/[0.03] border-white/[0.08] text-sm text-slate-200 placeholder:text-slate-700 min-h-[90px] resize-none focus-visible:ring-blue-500/30 transition-all outline-none"
                                    value={formData.description}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-white/[0.02] border-t border-white/[0.05]">
                        <Button
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs h-10 rounded-lg transition-all shadow-lg shadow-blue-900/20"
                        >
                            {loading ? "Processando..." : "Salvar no Roteiro"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}