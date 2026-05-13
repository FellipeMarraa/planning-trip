import {useMemo, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {useTrip} from '@/hooks/useTrip';
import {useActivities} from '@/hooks/useActivities';
import {addDays, differenceInDays, format, parseISO} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {AnimatePresence, motion} from 'framer-motion';
import {CalendarDays, CheckCircle2, ChevronLeft, Circle, Clock, MapPin, Plus, Trash2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {db} from '@/config/firebase';
import {deleteDoc, doc, updateDoc} from 'firebase/firestore';
import AddActivityDialog from '@/components/trip/AddActivityDialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function TripItineraryPage() {
    const { tripId } = useParams();
    const navigate = useNavigate();

    const { trip, loading: tripLoading } = useTrip(tripId || '');
    const { activities } = useActivities(tripId || '');

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    // Estados para o ConfirmDialog de deleção
    const [activityToDelete, setActivityToDelete] = useState<string | null>(null);

    const tripDays = useMemo(() => {
        if (!trip?.startDate || !trip?.endDate) return [];
        try {
            const start = parseISO(trip.startDate);
            const end = parseISO(trip.endDate);
            const totalDays = differenceInDays(end, start) + 1;

            return Array.from({ length: totalDays }).map((_, i) => {
                const date = addDays(start, i);
                return {
                    id: format(date, 'yyyy-MM-dd'),
                    date,
                    label: format(date, "dd 'de' MMMM", { locale: ptBR }),
                    weekDay: format(date, "EEEE", { locale: ptBR }),
                    dayNumber: i + 1
                };
            });
        } catch (e) { return []; }
    }, [trip]);

    const activeDay = tripDays[currentStep];
    const dayActivities = activities.filter(a => a.dateId === activeDay?.id);

    const toggleComplete = async (id: string, currentStatus: boolean) => {
        await updateDoc(doc(db, 'activities', id), { completed: !currentStatus });
    };

    const handleDeleteConfirm = async () => {
        if (activityToDelete) {
            try {
                await deleteDoc(doc(db, 'activities', activityToDelete));
            } finally {
                setActivityToDelete(null);
            }
        }
    };

    if (tripLoading) return (
        <div className="min-h-screen bg-[#0b1222] flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="h-screen bg-[#0b1222] text-slate-300 font-sans overflow-hidden flex flex-col">

            {/* Header / Wizard Nav */}
            <header className="flex-shrink-0 bg-[#0b1222] border-b border-white/[0.04] pt-6">
                <div className="max-w-3xl mx-auto px-6 flex items-center justify-between mb-6">
                    <button onClick={() => navigate(`/trip/${tripId}`)} className="p-2 hover:bg-white/[0.05] rounded-full text-slate-500 hover:text-white transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="text-center">
                        <h1 className="text-[10px] font-bold text-white uppercase tracking-[0.3em]">{trip?.name}</h1>
                        <p className="text-[9px] text-blue-500 font-bold uppercase tracking-widest mt-1 opacity-80">Checkpoints de Missão</p>
                    </div>
                    <div className="w-9" />
                </div>

                <div className="max-w-3xl mx-auto px-6 pt-4 overflow-x-auto no-scrollbar">
                    <div className="flex gap-4 pb-4">
                        {tripDays.map((day, idx) => (
                            <button
                                key={day.id}
                                onClick={() => setCurrentStep(idx)}
                                className={`flex-shrink-0 flex flex-col items-center gap-2 transition-all duration-300 ${currentStep === idx ? 'scale-105' : 'opacity-30 hover:opacity-50'}`}
                            >
                                <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center text-xs font-bold transition-colors ${currentStep === idx ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.2)]' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                                    D{day.dayNumber}
                                </div>
                                <span className="text-[8px] font-black uppercase tracking-tighter tabular-nums">{day.id.split('-').reverse().slice(0,2).join('/')}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Conteúdo Central */}
            <main className="flex-grow flex flex-col items-center justify-center p-4 min-h-0">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="w-full max-w-xl flex flex-col max-h-full"
                    >
                        <div className="mb-6 flex justify-between items-end px-2">
                            <div>
                                <h2 className="text-xl font-medium text-white tracking-tight capitalize leading-none">{activeDay?.label}</h2>
                                <p className="text-blue-500/80 text-[10px] font-bold uppercase tracking-widest mt-2">{activeDay?.weekDay}</p>
                            </div>
                            <Button
                                onClick={() => setIsAddOpen(true)}
                                className="bg-white text-black hover:bg-slate-200 rounded-full h-9 px-5 text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95"
                            >
                                <Plus className="w-3.5 h-3.5 mr-2" /> Adicionar
                            </Button>
                        </div>

                        <div className="bg-white/[0.02] border border-white/[0.06] rounded-[32px] flex flex-col min-h-0 flex-grow relative shadow-2xl">

                            <div className="flex-grow overflow-y-auto p-4 space-y-3 no-scrollbar mask-gradient">
                                {dayActivities.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-20 opacity-40">
                                        <CalendarDays className="w-10 h-10 text-slate-500 stroke-[1px]" />
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Cronograma vazio</p>
                                    </div>
                                ) : (
                                    dayActivities.map(act => (
                                        <div key={act.id} className={`group flex items-start gap-4 p-4 rounded-2xl border transition-all duration-300 ${act.completed ? 'bg-emerald-500/[0.02] border-emerald-500/10' : 'bg-white/[0.03] border-white/5 hover:border-white/10'}`}>
                                            <button
                                                onClick={() => toggleComplete(act.id, act.completed)}
                                                className={`mt-1 transition-all ${act.completed ? 'text-emerald-500' : 'text-slate-600 hover:text-blue-400'}`}
                                            >
                                                {act.completed ? <CheckCircle2 className="w-5 h-5 shadow-[0_0_10px_rgba(16,185,129,0.2)]" /> : <Circle className="w-5 h-5" />}
                                            </button>

                                            <div className="flex-grow min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <span className="text-[9px] font-bold text-blue-400 tabular-nums uppercase tracking-[0.1em] flex items-center gap-1.5">
                                                        <Clock className="w-3 h-3" /> {act.time}
                                                    </span>
                                                    <button
                                                        onClick={() => setActivityToDelete(act.id)}
                                                        className="p-1.5 text-slate-600 hover:text-red-400 transition-colors bg-white/5 rounded-lg active:scale-90"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                                <h4 className={`text-sm font-medium mt-1 truncate ${act.completed ? 'line-through text-slate-600' : 'text-slate-200'}`}>
                                                    {act.location}
                                                </h4>
                                                {act.description && (
                                                    <p className={`text-[11px] mt-1.5 leading-relaxed break-words ${act.completed ? 'text-slate-700' : 'text-slate-500'}`}>
                                                        {act.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div className="h-4" />
                            </div>

                            <div className="flex-shrink-0 p-5 bg-white/[0.01] rounded-b-[32px] border-t border-white/[0.04] flex items-center justify-between">
                                <div className="flex items-center gap-2 text-slate-500">
                                    <MapPin className="w-3 h-3" />
                                    <span className="text-[9px] font-bold uppercase tracking-[0.1em]">{dayActivities.length} Checkpoints</span>
                                </div>
                                <div className="text-[9px] font-black uppercase text-slate-600 tracking-tighter">
                                    Step {activeDay?.dayNumber} / {tripDays.length}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Navegação Inferior */}
            <footer className="flex-shrink-0 p-6 max-w-xl mx-auto w-full grid grid-cols-2 gap-4">
                <button
                    disabled={currentStep === 0}
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    className="h-12 rounded-2xl border border-white/[0.05] text-slate-500 font-bold uppercase tracking-widest text-[10px] disabled:opacity-5 hover:bg-white/[0.02] transition-all"
                >
                    Anterior
                </button>
                <button
                    disabled={currentStep === tripDays.length - 1}
                    onClick={() => setCurrentStep(prev => prev + 1)}
                    className="h-12 rounded-2xl bg-white text-black font-bold uppercase tracking-widest text-[10px] disabled:opacity-10 hover:bg-slate-200 transition-all active:scale-95"
                >
                    Próximo
                </button>
            </footer>

            <AddActivityDialog
                open={isAddOpen}
                onOpenChange={setIsAddOpen}
                tripId={tripId || ''}
                dateId={activeDay?.id || ''}
            />

            {/* Confirm Dialog Refinado */}
            <AlertDialog open={!!activityToDelete} onOpenChange={() => setActivityToDelete(null)}>
                <AlertDialogContent className="bg-[#0b1222] border-white/[0.08] text-slate-200 max-w-[300px] rounded-[24px] p-6 shadow-2xl outline-none">
                    <AlertDialogHeader className="space-y-2">
                        <AlertDialogTitle className="text-sm font-medium text-white tracking-tight text-center">
                            Remover atividade?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-500 text-[11px] leading-relaxed text-center">
                            Esta ação é permanente e removerá o checkpoint do seu roteiro.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="flex gap-3 mt-6">
                        <AlertDialogCancel className="flex-1 h-9 bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] hover:text-white text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-all border-none outline-none">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            className="flex-1 h-9 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-all border-none outline-none"
                        >
                            Remover
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .mask-gradient {
                    mask-image: linear-gradient(to bottom, 
                        transparent 0%, 
                        black 5%, 
                        black 90%, 
                        transparent 100%
                    );
                }
            `}</style>
        </div>
    );
}