import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTrip } from '@/hooks/useTrip';
import { useActivities } from '@/hooks/useActivities';
import { useTripRole } from '@/hooks/useTripRole';
import { useToast } from '@/context/ToastContext';
import { addDays, differenceInDays, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, ChevronLeft, CheckCircle2, Circle, Clock, MapPin, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { deleteActivity, toggleActivityComplete } from '@/services/activities';
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
    const { activities, error: activitiesError } = useActivities(tripId || '');
    const { canEdit } = useTripRole(trip);
    const { showError } = useToast();

    useEffect(() => {
        if (activitiesError) showError(activitiesError);
    }, [activitiesError, showError]);

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
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
        } catch {
            return [];
        }
    }, [trip]);

    const activeDay = tripDays[currentStep];
    const dayActivities = activities.filter(a => a.dateId === activeDay?.id);

    const handleToggleComplete = async (id: string, currentStatus: boolean) => {
        await toggleActivityComplete(id, currentStatus);
    };

    const handleDeleteConfirm = async () => {
        if (activityToDelete) {
            try {
                await deleteActivity(activityToDelete);
            } finally {
                setActivityToDelete(null);
            }
        }
    };

    if (tripLoading) return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="h-screen bg-background text-foreground font-sans overflow-hidden flex flex-col">

            {/* Página não usa Layout.tsx (imersiva, ver App.tsx isItinerary) —
                sem o padding de safe area de lá, header/footer ficavam embaixo
                da barra de status/gesture bar num PWA instalado. */}
            <header className="flex-shrink-0 bg-background border-b border-border pt-[calc(1.5rem+env(safe-area-inset-top))]">
                <div className="max-w-3xl mx-auto px-6 flex items-center justify-between mb-6">
                    <button onClick={() => navigate(`/trip/${tripId}`)} className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="text-center">
                        <h1 className="text-sm font-semibold text-foreground">{trip?.name}</h1>
                        <p className="text-xs text-primary font-medium mt-0.5">Roteiro da viagem</p>
                    </div>
                    <div className="w-9" />
                </div>

                <div className="max-w-3xl mx-auto px-6 pt-4 overflow-x-auto scrollbar-none">
                    <div className="flex gap-4 pb-4">
                        {tripDays.map((day, idx) => (
                            <button
                                key={day.id}
                                onClick={() => setCurrentStep(idx)}
                                className={`flex-shrink-0 flex flex-col items-center gap-2 transition-all duration-300 ${currentStep === idx ? 'scale-105' : 'opacity-40 hover:opacity-60'}`}
                            >
                                <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center text-xs font-semibold transition-colors ${currentStep === idx ? 'bg-primary border-primary text-primary-foreground shadow-sm' : 'bg-muted border-border text-muted-foreground'}`}>
                                    {day.dayNumber}
                                </div>
                                <span className="text-[10px] font-medium tabular-nums text-muted-foreground">{day.id.split('-').reverse().slice(0,2).join('/')}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="flex-grow flex flex-col items-center justify-center p-4 min-h-0">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="w-full max-w-xl flex flex-col max-h-full"
                    >
                        <div className="mb-5 flex justify-between items-end px-2">
                            <div>
                                <h2 className="text-xl font-semibold text-foreground capitalize leading-none">{activeDay?.label}</h2>
                                <p className="text-primary/80 text-xs font-medium mt-2 capitalize">{activeDay?.weekDay}</p>
                            </div>
                            {canEdit && (
                                <Button
                                    onClick={() => setIsAddOpen(true)}
                                    className="rounded-full h-9 px-5 shadow-sm"
                                >
                                    <Plus className="w-3.5 h-3.5 mr-2" /> Adicionar
                                </Button>
                            )}
                        </div>

                        <div className="bg-card border border-border rounded-3xl flex flex-col min-h-0 flex-grow relative">

                            <div className="flex-grow overflow-y-auto p-4 space-y-3 scrollbar-none mask-fade-y">
                                {dayActivities.length === 0 ? (
                                    <EmptyState icon={CalendarDays} message="Nenhuma atividade neste dia" dashed={false} className="h-full opacity-60" />
                                ) : (
                                    dayActivities.map(act => (
                                        <div key={act.id} className={`group flex items-start gap-4 p-4 rounded-2xl border transition-colors ${act.completed ? 'bg-chart-2/5 border-chart-2/15' : 'bg-muted/40 border-border'}`}>
                                            <button
                                                onClick={() => canEdit && handleToggleComplete(act.id, act.completed)}
                                                disabled={!canEdit}
                                                className={`mt-1 transition-colors ${act.completed ? 'text-chart-2' : 'text-muted-foreground hover:text-primary'} ${!canEdit ? 'cursor-default' : ''}`}
                                            >
                                                {act.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                            </button>

                                            <div className="flex-grow min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <span className="text-xs font-medium text-primary tabular-nums flex items-center gap-1.5">
                                                        <Clock className="w-3 h-3" /> {act.time}
                                                    </span>
                                                    {canEdit && (
                                                        <button
                                                            onClick={() => setActivityToDelete(act.id)}
                                                            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors bg-muted rounded-lg active:scale-90"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                                <h4 className={`text-sm font-medium mt-1 truncate ${act.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                                    {act.location}
                                                </h4>
                                                {act.description && (
                                                    <p className={`text-sm mt-1.5 leading-relaxed break-words ${act.completed ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}>
                                                        {act.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div className="h-4" />
                            </div>

                            <div className="flex-shrink-0 p-5 bg-muted/30 rounded-b-3xl border-t border-border flex items-center justify-between">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <MapPin className="w-3.5 h-3.5" />
                                    <span className="text-xs font-medium">{dayActivities.length} atividades</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    Dia {activeDay?.dayNumber} de {tripDays.length}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </main>

            <footer className="flex-shrink-0 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-w-xl mx-auto w-full grid grid-cols-2 gap-4">
                <Button
                    variant="outline"
                    disabled={currentStep === 0}
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    className="h-12 rounded-2xl"
                >
                    Anterior
                </Button>
                <Button
                    disabled={currentStep === tripDays.length - 1}
                    onClick={() => setCurrentStep(prev => prev + 1)}
                    className="h-12 rounded-2xl"
                >
                    Próximo
                </Button>
            </footer>

            <AddActivityDialog
                open={isAddOpen}
                onOpenChange={setIsAddOpen}
                tripId={tripId || ''}
                dateId={activeDay?.id || ''}
            />

            <AlertDialog open={!!activityToDelete} onOpenChange={() => setActivityToDelete(null)}>
                <AlertDialogContent className="max-w-[320px] rounded-3xl p-6">
                    <AlertDialogHeader className="space-y-2">
                        <AlertDialogTitle className="text-sm font-medium text-foreground text-center">
                            Remover atividade?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-center">
                            Esta ação é permanente e removerá o item do seu roteiro.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="flex gap-3 mt-6">
                        <AlertDialogCancel className="flex-1 h-9 rounded-lg">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={handleDeleteConfirm}
                            className="flex-1 h-9 rounded-lg"
                        >
                            Remover
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
