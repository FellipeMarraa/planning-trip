// src/pages/Dashboard.tsx
import { useState } from "react";
import { useUserTrips } from '../hooks/useUserTrips';
import { useAuth } from '../context/AuthContext';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Calendar, MapPin, Users, ArrowRight, PlaneTakeoff, User as UserIcon } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import CreateTripDialog from '../components/trip/CreateTripDialog';

export default function Dashboard() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const { trips, loading } = useUserTrips();
    const { user } = useAuth();
    const navigate = useNavigate();

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4 bg-[#0f172a]">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">Sincronizando...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-100 space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto px-4 sm:px-6 mb-10">
            {/* Header com Foto de Perfil */}
            <div className="flex items-center justify-between pt-8">
                <div className="flex items-center gap-4">
                    {/* Container da Foto com efeito Glow Suave */}
                    <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 rounded-2xl blur-sm"></div>
                        <div className="relative w-14 h-14 rounded-2xl border border-slate-700 bg-slate-800 flex items-center justify-center overflow-hidden shadow-2xl">
                            {user?.photoURL ? (
                                <img
                                    src={user.photoURL}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer" // Importante para carregar fotos do Google
                                />
                            ) : (
                                <UserIcon className="w-6 h-6 text-slate-500" />
                            )}
                        </div>
                    </div>

                    <div>
                        <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] mb-0.5 italic">Dashboard</p>
                        <h2 className="text-2xl font-extrabold tracking-tighter">
                            Olá, {user?.displayName?.split(' ')[0] || 'Viajante'}
                        </h2>
                    </div>
                </div>

                <Button
                    onClick={() => setIsCreateOpen(true)}
                    className="rounded-2xl h-14 w-14 bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all border border-indigo-400/30"
                >
                    <Plus className="w-7 h-7 text-white" />
                </Button>
            </div>

            {/* Listagem de Viagens */}
            {trips.length === 0 ? (
                <Card className="bg-slate-900/40 border-slate-800 border-dashed py-16 ring-1 ring-white/5 shadow-2xl">
                    <CardContent className="flex flex-col items-center text-center space-y-6">
                        <div className="p-5 bg-slate-800/50 rounded-3xl border border-slate-700/50 text-slate-500">
                            <PlaneTakeoff className="w-10 h-10" />
                        </div>
                        <div className="space-y-2">
                            <p className="text-slate-100 text-lg font-bold italic">Nenhum roteiro ainda</p>
                            <p className="text-xs text-slate-400 max-w-[240px] leading-relaxed">
                                Comece a planear a sua Lua de Mel agora mesmo.
                            </p>
                        </div>
                        <Button
                            onClick={() => setIsCreateOpen(true)}
                            className="bg-slate-100 hover:bg-white text-slate-950 text-[10px] font-black uppercase tracking-widest px-10 h-11 rounded-xl"
                        >
                            Criar Viagem
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {trips.map((trip) => (
                        <Card
                            key={trip.id}
                            onClick={() => navigate(`/trip/${trip.id}`)}
                            className="group bg-slate-900/60 border-slate-800 hover:border-indigo-500/50 transition-all cursor-pointer ring-1 ring-white/5 overflow-hidden rounded-[2rem] shadow-xl"
                        >
                            <CardContent className="p-0">
                                <div className="p-6 space-y-5">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1.5 text-slate-100">
                                            <h3 className="text-xl font-bold group-hover:text-indigo-400 transition-colors tracking-tight italic">{trip.name}</h3>
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Eurotrip 2025</span>
                                            </div>
                                        </div>
                                        <div className="p-2.5 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                                            <Calendar className="w-4 h-4 text-slate-400" />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 pt-4 border-t border-slate-800/30">
                                        <div className="flex-1 space-y-0.5">
                                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Período</p>
                                            <p className="text-xs text-slate-300 font-bold tabular-nums italic">
                                                {new Date(trip.startDate).toLocaleDateString()} — {new Date(trip.endDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex -space-x-3">
                                            <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center shadow-lg">
                                                <Users className="w-3.5 h-3.5 text-slate-500" />
                                            </div>
                                            <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-indigo-600/20 flex items-center justify-center shadow-lg">
                                                <Users className="w-3.5 h-3.5 text-indigo-400" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-slate-800/20 px-6 py-4 flex justify-between items-center group-hover:bg-indigo-500/10 transition-all border-t border-slate-800/20">
                                    <span className="text-[10px] font-black text-slate-500 group-hover:text-indigo-400 uppercase tracking-[0.2em]">Ver Detalhes</span>
                                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <CreateTripDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
        </div>
    );
}