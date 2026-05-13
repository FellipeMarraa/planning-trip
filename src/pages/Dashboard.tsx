// src/pages/Dashboard.tsx
import { useState } from "react";
import { useUserTrips } from '../hooks/useUserTrips';
import { useAuth } from '../context/AuthContext';
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, MapPin, Plane, Plus, Users, Globe } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import CreateTripDialog from '../components/trip/CreateTripDialog';

export default function Dashboard() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const { trips, loading } = useUserTrips();
    const { user, isGlobalAdmin } = useAuth();
    const navigate = useNavigate();

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0b1222] flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white/10 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0b1222] text-slate-300 pb-20">
            <div className="max-w-6xl mx-auto px-6 space-y-12">

                {/* Header Refinado (Dark) */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em] opacity-80">Workspace</p>
                        <h2 className="text-2xl font-medium tracking-tight text-white">
                            Olá, {user?.displayName?.split(' ')[0]}
                        </h2>
                    </div>

                    {isGlobalAdmin && (
                        <Button
                            onClick={() => setIsCreateOpen(true)}
                            className="bg-blue-600 hover:bg-blue-500 text-white h-11 px-6 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-900/20"
                        >
                            <Plus className="mr-2 h-3.5 w-3.5" />
                            Novo Projeto
                        </Button>
                    )}
                </div>

                {/* Seção de Viagens */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <Globe className="w-4 h-4 text-slate-500" />
                        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Viagens Ativas</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {trips.length === 0 ? (
                            <div className="col-span-full py-20 border-2 border-dashed border-white/[0.05] rounded-[32px] flex flex-col items-center justify-center text-center space-y-4 bg-white/[0.01]">
                                <Plane className="w-8 h-8 text-slate-700 -rotate-45" />
                                <p className="text-xs text-slate-500 font-medium tracking-wide">Nenhum projeto registrado.</p>
                            </div>
                        ) : (
                            trips.map((trip) => (
                                <div
                                    key={trip.id}
                                    onClick={() => navigate(`/trip/${trip.id}`)}
                                    className="group relative bg-white/[0.02] border border-white/[0.06] rounded-[28px] p-6 hover:border-blue-500/40 hover:bg-white/[0.04] transition-all duration-500 cursor-pointer flex flex-col justify-between min-h-[200px]"
                                >
                                    <div className="space-y-5">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <h3 className="text-base font-medium text-white tracking-tight group-hover:text-blue-400 transition-colors">
                                                    {trip.name}
                                                </h3>
                                                <div className="flex items-center gap-1.5">
                                                    <MapPin className="w-3 h-3 text-slate-500" />
                                                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Console Ativo</span>
                                                </div>
                                            </div>
                                            <div className="p-2.5 bg-white/[0.03] rounded-xl border border-white/[0.05] group-hover:bg-blue-500/10 group-hover:border-blue-500/20 transition-all">
                                                <Plane className="w-4 h-4 text-slate-500 group-hover:text-blue-400 -rotate-45 transition-colors" />
                                            </div>
                                        </div>

                                        <div className="pt-4 flex items-center justify-between border-t border-white/[0.03]">
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Período</p>
                                                <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400 tabular-nums">
                                                    <Calendar className="w-3 h-3 text-slate-600" />
                                                    {new Date(trip.startDate).toLocaleDateString('pt-BR')} — {new Date(trip.endDate).toLocaleDateString('pt-BR')}
                                                </div>
                                            </div>

                                            <div className="w-7 h-7 rounded-full border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-slate-500">
                                                <Users className="w-3 h-3" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 flex items-center justify-between opacity-60 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[9px] font-bold text-slate-500 group-hover:text-blue-400 uppercase tracking-[0.2em] transition-colors">Abrir Itinerário</span>
                                        <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <CreateTripDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
        </div>
    );
}