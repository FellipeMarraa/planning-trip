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
    const { user } = useAuth();
    const navigate = useNavigate();

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-slate-900/10 border-t-slate-900 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-20">
            <div className="max-w-6xl mx-auto px-6 pt-12 space-y-12">

                {/* Header: Refinado e direto */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.15em]">Visão Geral</p>
                        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                            Bom dia, {user?.displayName?.split(' ')[0]}
                        </h2>
                    </div>

                    <Button
                        onClick={() => setIsCreateOpen(true)}
                        className="bg-slate-900 hover:bg-slate-800 text-white h-11 px-6 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all active:scale-95 shadow-sm"
                    >
                        <Plus className="mr-2 h-3.5 w-3.5" />
                        Novo Projeto
                    </Button>
                </div>

                {/* Seção de Viagens */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <Globe className="w-4 h-4 text-slate-400" />
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Suas Viagens Ativas</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {trips.length === 0 ? (
                            <div className="col-span-full py-20 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-center space-y-4">
                                <div className="p-4 bg-slate-100 rounded-full">
                                    <Plane className="w-6 h-6 text-slate-400 -rotate-45" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900">Nenhum projeto encontrado</p>
                                    <p className="text-xs text-slate-500">Comece criando seu primeiro roteiro de viagem.</p>
                                </div>
                            </div>
                        ) : (
                            trips.map((trip) => (
                                <div
                                    key={trip.id}
                                    onClick={() => navigate(`/trip/${trip.id}`)}
                                    className="group relative bg-white border border-slate-200/60 rounded-2xl p-6 hover:border-blue-500/30 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] transition-all cursor-pointer flex flex-col justify-between min-h-[200px]"
                                >
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <h3 className="text-base font-semibold text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">
                                                    {trip.name}
                                                </h3>
                                                <div className="flex items-center gap-1.5">
                                                    <MapPin className="w-3 h-3 text-slate-400" />
                                                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Itinerário Ativo</span>
                                                </div>
                                            </div>
                                            <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                                                <Plane className="w-4 h-4 text-slate-400 group-hover:text-blue-500 -rotate-45 transition-colors" />
                                            </div>
                                        </div>

                                        <div className="pt-4 flex items-center justify-between">
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Cronograma</p>
                                                <div className="flex items-center gap-2 text-[11px] font-medium text-slate-700 tabular-nums">
                                                    <Calendar className="w-3 h-3 text-slate-300" />
                                                    {new Date(trip.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} — {new Date(trip.endDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                                </div>
                                            </div>

                                            <div className="flex -space-x-1.5">
                                                {[1].map((_, i) => (
                                                    <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-slate-400 shadow-sm">
                                                        <Users className="w-2.5 h-2.5" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-600 uppercase tracking-[0.1em] transition-colors">Acessar Console</span>
                                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
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