// src/pages/Dashboard.tsx
import {useState} from "react";
import {useUserTrips} from '../hooks/useUserTrips';
import {useAuth} from '../context/AuthContext';
import {Button} from "@/components/ui/button";
import {ArrowRight, Calendar, MapPin, Plane, Plus, Users} from "lucide-react";
import {useNavigate} from 'react-router-dom';
import CreateTripDialog from '../components/trip/CreateTripDialog';

export default function Dashboard() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const { trips, loading } = useUserTrips();
    const { user } = useAuth();
    const navigate = useNavigate();

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f1f5f9] flex flex-col items-center justify-center gap-3">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f1f5f9] text-slate-900 space-y-10">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <p className="text-[10px] text-blue-600 font-bold uppercase tracking-[0.2em] mb-1 italic opacity-70">Vision Console</p>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                        Olá, {user?.displayName?.split(' ')[0]}
                    </h2>
                </div>

                <Button
                    onClick={() => setIsCreateOpen(true)}
                    className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg h-12 px-8 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all active:scale-95"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Projeto
                </Button>
            </div>

            {/* Grid de Viagens */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                {trips.map((trip) => (
                    <div
                        key={trip.id}
                        onClick={() => navigate(`/trip/${trip.id}`)}
                        className="group bg-white border border-slate-200/60 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-pointer overflow-hidden flex flex-col"
                    >
                        <div className="p-6 flex-grow space-y-6">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1.5">
                                    <h3 className="text-lg font-bold text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors uppercase italic">
                                        {trip.name}
                                    </h3>
                                    <div className="flex items-center gap-1.5 text-slate-400">
                                        <MapPin className="w-3.5 h-3.5" />
                                        <span className="text-[9px] font-bold uppercase tracking-widest">Ativo</span>
                                    </div>
                                </div>
                                <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100 text-slate-300 group-hover:text-blue-500 transition-colors">
                                    <Plane className="w-5 h-5 -rotate-45" />
                                </div>
                            </div>

                            <div className="flex items-center gap-6 pt-4 border-t border-slate-50">
                                <div className="flex-1">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Check-in / Out</p>
                                    <div className="flex items-center gap-2 text-slate-600 font-semibold text-xs tabular-nums">
                                        <Calendar className="w-3.5 h-3.5 opacity-40" />
                                        {new Date(trip.startDate).toLocaleDateString()} — {new Date(trip.endDate).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="flex -space-x-2">
                                    <div className="w-7 h-7 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-slate-400 shadow-sm">
                                        <Users className="w-3 h-3" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50/50 flex justify-between items-center border-t border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 group-hover:text-blue-600 uppercase tracking-widest transition-colors italic">Painel de Controle</span>
                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                        </div>
                    </div>
                ))}
            </div>

            <CreateTripDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
        </div>
    );
}