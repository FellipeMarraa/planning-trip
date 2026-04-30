// src/pages/TripDetails.tsx
import {useParams} from 'react-router-dom';
import {useTrip} from '../hooks/useTrip'; // Hook que criamos antes
import {useExchange} from '../hooks/useExchange';
import {Card, CardContent} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Calendar, CreditCard, TrendingUp, Wallet} from "lucide-react";

export default function TripDetails() {
    const { tripId } = useParams();
    const { trip, expenses, loading } = useTrip(tripId || '');
    const { convertToBRL } = useExchange();

    if (loading) return <div className="p-8 text-center text-zinc-500 animate-pulse">Carregando painel financeiro...</div>;

    const totalBRL = expenses.reduce((acc, curr) => acc + curr.amountBRL, 0);

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            {/* Header com Info da Viagem */}
            <div className="flex flex-col gap-1 px-2">
                <h1 className="text-3xl font-black text-white tracking-tighter">{trip?.name}</h1>
                <div className="flex items-center gap-3 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {trip?.startDate}</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-800" />
                    <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-emerald-500" /> Câmbio Automático</span>
                </div>
            </div>

            {/* Cards de Resumo Financeiro */}
            <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
                <Card className="bg-zinc-900 border-zinc-800 shadow-xl ring-1 ring-white/5">
                    <CardContent className="p-4 space-y-1">
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Gasto Total (Realizado)</p>
                        <p className="text-xl font-bold text-white tracking-tight">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalBRL)}
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-indigo-600/10 border-indigo-500/20 shadow-xl ring-1 ring-indigo-500/10">
                    <CardContent className="p-4 space-y-1">
                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Por Viajante</p>
                        <p className="text-xl font-bold text-indigo-100 tracking-tight">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalBRL / 2)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Lista de Gastos - UX Mobile Focus */}
            <div className="space-y-3">
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                    <CreditCard className="w-3 h-3" /> Histórico de Lançamentos
                </h3>

                {expenses.map((expense) => (
                    <Card key={expense.id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors ring-1 ring-white/5">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-zinc-100">{expense.description}</p>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[9px] border-zinc-800 text-zinc-500 bg-zinc-950 px-1.5 py-0">
                                        {expense.category}
                                    </Badge>
                                    <span className="text-[10px] text-zinc-600 font-medium">{expense.date}</span>
                                </div>
                            </div>

                            <div className="text-right space-y-0.5">
                                {/* Exibição Dual: Moeda Original e BRL */}
                                <p className="text-xs font-bold text-zinc-400">
                                    {expense.amountOriginal} <span className="text-[10px] opacity-70">{expense.currency}</span>
                                </p>
                                <p className="text-sm font-black text-emerald-500 tracking-tight">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(expense.amountBRL)}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Floating Action Button para novo gasto no mobile */}
            <button className="fixed bottom-6 right-6 w-14 h-14 bg-white text-zinc-950 rounded-2xl shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-50 border border-white/20">
                <Wallet className="w-6 h-6" />
            </button>
        </div>
    );
}