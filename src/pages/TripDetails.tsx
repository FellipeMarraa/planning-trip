// src/pages/TripDetails.tsx
import {useMemo, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {useTrip} from '@/hooks/useTrip';
import {useExchange} from '@/hooks/useExchange';
import {useAuth} from '@/context/AuthContext';
import {db} from '@/config/firebase';
import {collection, deleteDoc, doc, getDocs, query, where, writeBatch} from 'firebase/firestore';
import {Card} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Filter,
    LayoutDashboard,
    Map,
    MoreHorizontal,
    Pencil,
    Plus,
    Share2,
    ShieldAlert,
    Trash2,
    TrendingDown,
    TrendingUp,
    X
} from "lucide-react";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AddExpenseDialog from '@/components/trip/AddExpenseDialog';
import TripAnalytics from '@/components/trip/TripAnalytics';
import type {Expense} from '@/types';

export default function TripDetails() {
    const { tripId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
    const [expenseToEdit, setExpenseToEdit] = useState<Expense | undefined>(undefined);
    const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
    const [isDeleteTripOpen, setIsDeleteTripOpen] = useState(false);

    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterCurrency, setFilterCurrency] = useState<string>('all');

    const { trip, expenses, loading } = useTrip(tripId || '');
    const { rates: currentRates } = useExchange();

    const isAdmin = trip?.roles?.[user?.uid || ''] === 'ADM_TRIP';

    const filteredExpenses = useMemo(() => {
        return expenses.filter(expense => {
            const matchCategory = filterCategory === 'all' || expense.category === filterCategory;
            const matchCurrency = filterCurrency === 'all' || expense.currency === filterCurrency;
            return matchCategory && matchCurrency;
        });
    }, [expenses, filterCategory, filterCurrency]);

    const categories = useMemo(() => {
        const set = new Set(expenses.map(e => e.category));
        return Array.from(set).sort();
    }, [expenses]);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;
    const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
    const paginatedExpenses = filteredExpenses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    if (loading) return null;

    const totalBRLRealizado = expenses.reduce((acc, curr) => acc + (Number(curr.amountBRL) || 0), 0);
    const totalBRLMercado = expenses.reduce((acc, curr) => {
        const taxaHoje = currentRates[curr.currency] || 1;
        return acc + (Number(curr.amountOriginal) * taxaHoje);
    }, 0);

    const variacao = totalBRLRealizado > 0 ? ((totalBRLMercado / totalBRLRealizado - 1) * 100) : 0;

    const handleDeleteExpense = async () => {
        if (!expenseToDelete) return;
        try {
            await deleteDoc(doc(db, 'expenses', expenseToDelete.id));
            setExpenseToDelete(null);
        } catch (error) { console.error("Erro ao deletar:", error); }
    };

    const handleDeleteTrip = async () => {
        if (!tripId) return;
        try {
            const batch = writeBatch(db);
            const expensesQty = query(collection(db, 'expenses'), where('tripId', '==', tripId));
            const expensesSnaps = await getDocs(expensesQty);
            expensesSnaps.forEach((d) => batch.delete(d.ref));
            batch.delete(doc(db, 'trips', tripId));
            await batch.commit();
            navigate('/');
        } catch (error) { console.error("Erro ao deletar viagem:", error); }
    };

    const resetFilters = () => {
        setFilterCategory('all');
        setFilterCurrency('all');
        setCurrentPage(1);
    };

    const copyInviteLink = (role: 'adm_trip' | 'member') => {
        const url = `${window.location.origin}/join/${tripId}/${role}`;
        navigator.clipboard.writeText(url);
        alert(`Link de convite para ${role.toUpperCase()} copiado!`);
    };

    const formatDate = (dateStr: string | undefined) => {
        if (!dateStr) return '--/--/----';
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    };

    return (
        <div className="min-h-screen w-full bg-[#0b1222] text-slate-300 pb-20 font-sans overflow-y-auto">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8">

                {/* Topbar: Nav + Gestão */}
                <div className="flex items-center justify-between">
                    <nav className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">
                        <button onClick={() => navigate('/')} className="hover:text-blue-500 transition-colors uppercase italic">Portfólio</button>
                        <span className="opacity-30">/</span>
                        <span className="text-white">{trip?.name}</span>
                    </nav>

                    {isAdmin && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-slate-500 hover:text-white hover:bg-white/5">
                                    <MoreHorizontal className="w-5 h-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 bg-[#0f172a] border-white/10 text-slate-300">
                                <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-slate-500">Gestão do Console</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => copyInviteLink('adm_trip')} className="cursor-pointer focus:bg-white/5 focus:text-white">
                                    <Share2 className="w-4 h-4 mr-2 text-blue-500" /> Convite Admin
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => copyInviteLink('member')} className="cursor-pointer focus:bg-white/5 focus:text-white">
                                    <Share2 className="w-4 h-4 mr-2 text-emerald-500" /> Convite Membro
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem onClick={() => setIsDeleteTripOpen(true)} className="text-red-500 focus:bg-red-500/10 focus:text-red-400 cursor-pointer">
                                    <Trash2 className="w-4 h-4 mr-2" /> Deletar Projeto
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                {/* Header Técnico */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <h1 className="text-2xl font-bold tracking-tight text-white uppercase italic">{trip?.name}</h1>
                            <Button
                                onClick={() => navigate(`/trip/${tripId}/itinerary`)}
                                className="h-7 px-4 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 text-[9px] font-bold uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all"
                            >
                                <Map className="w-3 h-3 mr-1.5" /> Explorer Mode
                            </Button>
                        </div>
                        <div className="flex items-center gap-3 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                            <Calendar className="w-4 h-4 text-blue-500/50" />
                            {formatDate(trip?.startDate)} — {formatDate(trip?.endDate)}
                        </div>
                    </div>
                    {isAdmin && (
                        <Button
                            onClick={() => { setExpenseToEdit(undefined); setIsAddExpenseOpen(true); }}
                            className="bg-white text-black hover:bg-slate-200 h-10 px-8 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-white/5"
                        >
                            <Plus className="w-3.5 h-3.5 mr-2" /> Novo Lançamento
                        </Button>
                    )}
                </div>

                {/* KPIs: Estilo Glassmorphism */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="bg-white/[0.02] border-white/5 p-5 border-l-2 border-l-blue-500">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1 block">Total Realizado</span>
                        <span className="text-xl font-medium tabular-nums text-white">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalBRLRealizado)}
                        </span>
                    </Card>

                    <Card className="bg-white/[0.04] border-white/10 p-5 shadow-2xl">
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-[9px] font-bold text-blue-400 uppercase tracking-[0.2em] block">Custo de Mercado</span>
                            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                        </div>
                        <span className="text-xl font-medium tabular-nums text-white">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalBRLMercado)}
                        </span>
                    </Card>

                    <Card className="bg-white/[0.02] border-white/5 p-5">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1 block">Eficiência Cambial</span>
                        <div className="flex items-center gap-2">
                            {totalBRLRealizado > 0 ? (
                                <>
                                    <span className={`text-xl font-medium tabular-nums ${variacao > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                        {variacao > 0 ? '+' : ''}{variacao.toFixed(2)}%
                                    </span>
                                    {variacao > 0 ? <TrendingUp className="w-4 h-4 text-red-500/50" /> : <TrendingDown className="w-4 h-4 text-emerald-500/50" />}
                                </>
                            ) : <span className="text-xl font-medium text-slate-700">0.00%</span>}
                        </div>
                    </Card>
                </div>

                {/* Análise Visual: Adaptada para o Analytics Dark */}
                <TripAnalytics expenses={expenses} />

                {/* Toolbar de Filtros */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white/[0.02] border border-white/5 p-3 rounded-2xl shadow-sm">
                    <div className="hidden sm:flex items-center gap-2 text-slate-600 mr-2 border-r border-white/5 pr-4">
                        <Filter className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Filtros</span>
                    </div>

                    <div className="grid grid-cols-1 sm:flex sm:flex-row gap-3 w-full">
                        <Select value={filterCategory} onValueChange={(v) => {setFilterCategory(v); setCurrentPage(1);}}>
                            <SelectTrigger className="w-full sm:w-[180px] h-9 text-[10px] font-bold uppercase bg-white/[0.03] border-white/5 text-slate-300">
                                <SelectValue placeholder="Categoria" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0f172a] border-white/10 text-slate-300">
                                <SelectItem value="all">Todas Categorias</SelectItem>
                                {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={filterCurrency} onValueChange={(v) => {setFilterCurrency(v); setCurrentPage(1);}}>
                            <SelectTrigger className="w-full sm:w-[140px] h-9 text-[10px] font-bold uppercase bg-white/[0.03] border-white/5 text-slate-300">
                                <SelectValue placeholder="Moeda" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0f172a] border-white/10 text-slate-300">
                                <SelectItem value="all">Todas Moedas</SelectItem>
                                <SelectItem value="EUR">Euro (€)</SelectItem>
                                <SelectItem value="GBP">Libra (£)</SelectItem>
                                <SelectItem value="USD">Dólar ($)</SelectItem>
                                <SelectItem value="BRL">Real (R$)</SelectItem>
                            </SelectContent>
                        </Select>

                        {(filterCategory !== 'all' || filterCurrency !== 'all') && (
                            <Button
                                variant="ghost"
                                onClick={resetFilters}
                                className="h-9 px-3 text-[10px] font-bold uppercase text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                            >
                                <X className="w-3.5 h-3.5 mr-2" /> Limpar
                            </Button>
                        )}
                    </div>
                </div>

                {/* Tabela de Extrato: Estilo Console */}
                <div className="bg-white/[0.02] border border-white/5 rounded-[24px] overflow-hidden shadow-2xl">
                    <div className="px-6 py-5 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
                        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                            <LayoutDashboard className="w-4 h-4 text-blue-500/50" /> Log de Transações
                        </h3>
                    </div>

                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                            <tr className="text-[9px] uppercase tracking-[0.2em] text-slate-500 border-b border-white/5">
                                <th className="px-6 py-4 font-bold">Descrição</th>
                                <th className="px-6 py-4 font-bold">Categoria</th>
                                <th className="px-6 py-4 font-bold text-right">Montante</th>
                                <th className="px-6 py-4 font-bold text-right text-white">Liquidado (BRL)</th>
                                <th className="px-6 py-4 w-10"></th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.02]">
                            {paginatedExpenses.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center text-[11px] text-slate-600 font-medium uppercase tracking-widest italic">
                                        Nenhum registro no log de segurança.
                                    </td>
                                </tr>
                            ) : (
                                paginatedExpenses.map((expense) => (
                                    <tr key={expense.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-medium text-slate-200">{expense.description}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-white/5 text-slate-500 border border-white/5">
                                                    {expense.category}
                                                </span>
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <span className="text-xs text-slate-500 tabular-nums font-medium">
                                                    {expense.amountOriginal} {expense.currency}
                                                </span>
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <span className="text-sm font-bold text-white tabular-nums tracking-tight">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(expense.amountBRL)}
                                                </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {isAdmin && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0 text-slate-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="bg-[#0f172a] border-white/10 text-slate-300">
                                                        <DropdownMenuItem onClick={() => { setExpenseToEdit(expense); setIsAddExpenseOpen(true); }} className="focus:bg-white/5">
                                                            <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-red-500 focus:bg-red-500/10 focus:text-red-400" onClick={() => setExpenseToDelete(expense)}>
                                                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>

                    {/* Paginação */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 bg-white/[0.01] border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                Log <span className="text-white">{paginatedExpenses.length}</span> de <span className="text-white">{filteredExpenses.length}</span>
                            </p>
                            <div className="flex items-center gap-3">
                                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-8 w-8 p-0 border-white/5 bg-transparent hover:bg-white/5 text-white">
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <div className="text-[10px] font-bold text-slate-400 tabular-nums">PAG {currentPage} / {totalPages}</div>
                                <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-8 w-8 p-0 border-white/5 bg-transparent hover:bg-white/5 text-white">
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modais: Devem ser ajustados para o estilo Dark também no seu arquivo de componente respectivo */}
            {trip && <AddExpenseDialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen} trip={trip} expenseToEdit={expenseToEdit} />}

            <AlertDialog open={!!expenseToDelete} onOpenChange={() => setExpenseToDelete(null)}>
                <AlertDialogContent className="bg-[#0b1222] border-white/10 text-slate-300 rounded-[24px]">
                    <AlertDialogHeader><AlertDialogTitle className="text-white font-bold tracking-tight uppercase italic">Confirmar Remoção?</AlertDialogTitle></AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="rounded-xl border-white/5 bg-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Abortar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteExpense} className="rounded-xl bg-red-600 hover:bg-red-700 text-[10px] font-bold uppercase tracking-widest text-white">Remover Permanentemente</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isDeleteTripOpen} onOpenChange={setIsDeleteTripOpen}>
                <AlertDialogContent className="bg-[#0b1222] border-red-900/30 text-slate-300 rounded-[24px]">
                    <AlertDialogHeader>
                        <ShieldAlert className="w-12 h-12 text-red-600 mb-2" />
                        <AlertDialogTitle className="text-white font-bold tracking-tight uppercase italic">Destruir Projeto?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-500">Esta ação irá expurgar todos os dados e roteiros permanentemente.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="rounded-xl border-white/5 bg-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Abortar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteTrip} className="rounded-xl bg-red-600 hover:bg-red-700 text-[10px] font-bold uppercase tracking-widest text-white">Confirmar Destruição</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}