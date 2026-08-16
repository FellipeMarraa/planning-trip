// src/pages/Dashboard.tsx
import { useState } from "react";
import { useUserTrips } from '../hooks/useUserTrips';
import { useAuth } from '../context/AuthContext';
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/common/section-header";
import { EmptyState } from "@/components/common/empty-state";
import { ArrowRight, Calendar, Clock, Plane, Plus } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import CreateTripDialog from '../components/trip/CreateTripDialog';
import { formatDateBR, getTripCountdown } from '@/lib/dates';
import { cn } from '@/lib/utils';

export default function Dashboard() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const { trips, loading } = useUserTrips();
    const { user } = useAuth();
    const navigate = useNavigate();

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="pb-16 space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Bem-vindo de volta</p>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                        Olá, {user?.displayName?.split(' ')[0]}
                    </h1>
                </div>

                <Button
                    onClick={() => setIsCreateOpen(true)}
                    className="h-11 px-6 rounded-xl font-medium shadow-sm"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Nova viagem
                </Button>
            </div>

            <div className="space-y-5">
                <SectionHeader>Minhas viagens</SectionHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {trips.length === 0 ? (
                        <EmptyState icon={Plane} message="Você ainda não tem nenhuma viagem" className="col-span-full" />
                    ) : (
                        trips.map((trip) => {
                            const { durationDays, status, daysUntilStart } = getTripCountdown(trip.startDate, trip.endDate);
                            const countdownLabel = status === 'finished'
                                ? 'Finalizada'
                                : status === 'ongoing'
                                    ? 'Em andamento'
                                    : `Faltam ${daysUntilStart} dia${daysUntilStart === 1 ? '' : 's'}`;

                            return (
                                <div
                                    key={trip.id}
                                    onClick={() => navigate(`/trip/${trip.id}`)}
                                    className="group relative bg-card border border-border rounded-3xl p-6 hover:border-primary/40 hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[190px]"
                                >
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-start">
                                            <h3 className="text-lg font-semibold text-foreground tracking-tight group-hover:text-primary transition-colors">
                                                {trip.name}
                                            </h3>
                                            <div className="p-2.5 bg-muted rounded-xl group-hover:bg-primary/10 transition-colors">
                                                <Plane className="w-4 h-4 text-muted-foreground group-hover:text-primary -rotate-45 transition-colors" />
                                            </div>
                                        </div>

                                        <div className="pt-4 space-y-2 border-t border-border">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {formatDateBR(trip.startDate)} — {formatDateBR(trip.endDate)}
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-muted-foreground">{durationDays} dia{durationDays === 1 ? '' : 's'} de viagem</span>
                                                <span className={cn(
                                                    "flex items-center gap-1 font-medium",
                                                    status === 'ongoing' ? "text-primary" : status === 'finished' ? "text-muted-foreground/60" : "text-muted-foreground"
                                                )}>
                                                    <Clock className="w-3 h-3" /> {countdownLabel}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-5 flex items-center justify-between opacity-70 group-hover:opacity-100 transition-opacity">
                                        <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">Ver detalhes</span>
                                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <CreateTripDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
        </div>
    );
}
