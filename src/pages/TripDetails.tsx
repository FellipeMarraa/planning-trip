// src/pages/TripDetails.tsx
import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTrip } from '@/hooks/useTrip';
import { useExchange } from '@/hooks/useExchange';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/config/firebase';
import { doc, deleteDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Calendar, ChevronLeft, ChevronRight, CreditCard,
    Plus, TrendingDown, TrendingUp, MoreHorizontal,
    Pencil, Trash2, Filter, X, Share2, ShieldAlert, Map
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel
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
import type { Expense } from '@/types';

export default function TripDetails() {
    const { tripId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Estados de Controle de Modais
    const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
    const [expenseToEdit, setExpenseToEdit] = useState<Expense | undefined>(undefined);
    const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
    const [isDeleteTripOpen, setIsDeleteTripOpen] = useState(false);

    // Estados de Filtro
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterCurrency, setFilterCurrency] = useState<string>('all');

    // Hooks de Dados e Câmbio Live
    const { trip, expenses, loading } = useTrip(tripId || '');
    const { rates: currentRates } = useExchange();

    // Verificação de Cargo (Permissões de UI)
    const isAdmin = trip?.roles?.[user?.uid || ''] === 'ADM_TRIP';

    // --- LÓGICA DE FILTRAGEM ---
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
        <div className="h-full w-full bg-[#f8fafc] text-slate-900 pb-20 font-sans overflow-y-auto">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8 pt-8">

                {/* Topbar: Nav + Gestão */}
                <div className="flex items-center justify-between">
                    <nav className="flex items-center gap-2 text-slate-400 text-[11px] font-bold uppercase tracking-[0.15em]">
                        <button onClick={() => navigate('/')} className="hover:text-blue-600 transition-colors">Portfólio</button>
                        <span className="opacity-30">/</span>
                        <span className="text-slate-900">{trip?.name}</span>
                    </nav>

                    {isAdmin && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-900">
                                    <MoreHorizontal className="w-5 h-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-slate-400">Gestão da Viagem</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => copyInviteLink('adm_trip')} className="cursor-pointer text-[12px] font-medium">
                                    <Share2 className="w-4 h-4 mr-2 text-blue-500" /> Convidar Administrador
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => copyInviteLink('member')} className="cursor-pointer text-[12px] font-medium">
                                    <Share2 className="w-4 h-4 mr-2 text-emerald-500" /> Convidar Membro
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setIsDeleteTripOpen(true)} className="text-red-600 focus:text-red-600 cursor-pointer text-[12px] font-medium">
                                    <Trash2 className="w-4 h-4 mr-2" /> Deletar Viagem Completa
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                {/* Header Técnico com Acesso ao Roteiro */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase italic">{trip?.name}</h1>
                            <Button
                                onClick={() => navigate(`/trip/${tripId}/itinerary`)}
                                variant="outline"
                                size="sm"
                                className="h-7 px-3 rounded-full border-blue-100 bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                            >
                                <Map className="w-3 h-3 mr-1.5" /> Ver Roteiro
                            </Button>
                        </div>
                        <div className="flex items-center gap-3 text-slate-500 text-[12px] font-medium">
                            <Calendar className="w-4 h-4 text-slate-300" />
                            {formatDate(trip?.startDate)} — {formatDate(trip?.endDate)}
                        </div>
                    </div>
                    {isAdmin && (
                        <Button
                            onClick={() => { setExpenseToEdit(undefined); setIsAddExpenseOpen(true); }}
                            className="bg-slate-900 hover:bg-slate-800 text-white h-10 px-6 rounded-md text-[11px] font-bold uppercase tracking-widest shadow-sm transition-all active:scale-95 w-full md:w-auto"
                        >
                            <Plus className="w-3.5 h-3.5 mr-2" /> Registrar Débito
                        </Button>
                    )}
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="bg-white border-slate-200 shadow-sm rounded-md p-5 border-l-2 border-l-blue-600">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-1 block">Total Pago (Realizado)</span>
                        <span className="text-xl font-bold tabular-nums text-slate-900">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalBRLRealizado)}
                        </span>
                        <p className="text-[9px] text-slate-400 mt-1 font-medium italic">Base histórica</p>
                    </Card>

                    <Card className="bg-slate-900 border-slate-800 shadow-xl rounded-md p-5 text-white">
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] block">Custo de Mercado (Hoje)</span>
                            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                        </div>
                        <span className="text-xl font-bold tabular-nums">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalBRLMercado)}
                        </span>
                        <p className="text-[9px] text-slate-500 mt-1 font-medium italic italic">Live update</p>
                    </Card>

                    <Card className="bg-white border-slate-200 shadow-sm rounded-md p-5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-1 block">Eficiência Cambial</span>
                        <div className="flex items-center gap-2">
                            {totalBRLRealizado > 0 ? (
                                <>
                                    <span className={`text-xl font-bold tabular-nums ${variacao > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                        {variacao > 0 ? '+' : ''}{variacao.toFixed(2)}%
                                    </span>
                                    {variacao > 0 ? <TrendingUp className="w-4 h-4 text-red-400" /> : <TrendingDown className="w-4 h-4 text-emerald-400" />}
                                </>
                            ) : <span className="text-xl font-bold tabular-nums text-slate-300">0.00%</span>}
                        </div>
                        <p className="text-[9px] text-slate-400 mt-1 font-medium italic">Performance vs Mercado</p>
                    </Card>
                </div>

                {/* Análise Visual */}
                <TripAnalytics expenses={expenses} />

                {/* Toolbar de Filtros */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white border border-slate-200 p-3 rounded-md shadow-sm">
                    <div className="hidden sm:flex items-center gap-2 text-slate-400 mr-2 border-r border-slate-100 pr-4">
                        <Filter className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Filtros</span>
                    </div>

                    <div className="grid grid-cols-1 sm:flex sm:flex-row gap-3 w-full">
                        <Select value={filterCategory} onValueChange={(v) => {setFilterCategory(v); setCurrentPage(1);}}>
                            <SelectTrigger className="w-full sm:w-[180px] h-9 text-[11px] font-medium border-slate-200 bg-slate-50/30">
                                <SelectValue placeholder="Categoria" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas Categorias</SelectItem>
                                {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={filterCurrency} onValueChange={(v) => {setFilterCurrency(v); setCurrentPage(1);}}>
                            <SelectTrigger className="w-full sm:w-[140px] h-9 text-[11px] font-medium border-slate-200 bg-slate-50/30">
                                <SelectValue placeholder="Moeda" />
                            </SelectTrigger>
                            <SelectContent>
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
                                className="h-9 px-3 text-[11px] text-slate-400 hover:text-red-500 gap-2 border border-dashed border-slate-200 sm:border-none"
                            >
                                <X className="w-3.5 h-3.5" />
                                <span className="sm:hidden">Limpar Filtros</span>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Tabela */}
                <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-slate-400" /> Extrato Detalhado de Lançamentos
                        </h3>
                    </div>

                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                            <tr className="text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-100 bg-slate-50/20">
                                <th className="px-6 py-3 font-bold">Descrição</th>
                                <th className="px-6 py-3 font-bold">Categoria</th>
                                <th className="px-6 py-3 font-bold text-right">Original</th>
                                <th className="px-6 py-3 font-bold text-right text-slate-900">Liquidado (BRL)</th>
                                <th className="px-6 py-3 w-10"></th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                            {paginatedExpenses.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-xs text-slate-400 italic">
                                        {expenses.length === 0 ? 'Aguardando lançamentos no banco de dados.' : 'Nenhum resultado encontrado.'}
                                    </td>
                                </tr>
                            ) : (
                                paginatedExpenses.map((expense) => (
                                    <tr key={expense.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <p className="text-[13px] font-semibold text-slate-800">{expense.description}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                                <span className="text-[10px] font-bold uppercase tracking-tighter px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200/50">
                                                    {expense.category}
                                                </span>
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <span className="text-[12px] text-slate-600 tabular-nums font-medium">
                                                    {expense.amountOriginal} {expense.currency}
                                                </span>
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <span className="text-[13px] font-bold text-slate-900 tabular-nums tracking-tight">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(expense.amountBRL)}
                                                </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {isAdmin && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-32">
                                                        <DropdownMenuItem onClick={() => { setExpenseToEdit(expense); setIsAddExpenseOpen(true); }}>
                                                            <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => setExpenseToDelete(expense)}>
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
                        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <p className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                                Mostrando <span className="text-slate-700 font-bold">{paginatedExpenses.length}</span> de <span className="text-slate-700 font-bold">{filteredExpenses.length}</span> resultados
                            </p>
                            <div className="flex items-center gap-4">
                                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-8 w-8 p-0 border-slate-200 bg-white"><ChevronLeft className="w-4 h-4" /></Button>
                                <div className="text-[11px] font-bold text-slate-700 tabular-nums min-w-[60px] text-center whitespace-nowrap">Página {currentPage} / {totalPages}</div>
                                <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-8 w-8 p-0 border-slate-200 bg-white"><ChevronRight className="w-4 h-4" /></Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modais */}
            {trip && <AddExpenseDialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen} trip={trip} expenseToEdit={expenseToEdit} />}
            <AlertDialog open={!!expenseToDelete} onOpenChange={() => setExpenseToDelete(null)}>
                <AlertDialogContent className="rounded-xl border-slate-200 shadow-2xl">
                    <AlertDialogHeader><AlertDialogTitle className="text-slate-900 font-bold tracking-tight">Confirmar exclusão?</AlertDialogTitle></AlertDialogHeader>
                    <AlertDialogFooter className="gap-2"><AlertDialogCancel className="rounded-lg border-slate-200 text-[11px] font-bold uppercase tracking-widest text-slate-400">Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteExpense} className="rounded-lg bg-red-600 hover:bg-red-700 text-[11px] font-bold uppercase tracking-widest">Confirmar Exclusão</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={isDeleteTripOpen} onOpenChange={setIsDeleteTripOpen}>
                <AlertDialogContent className="rounded-xl border-red-100 shadow-2xl">
                    <AlertDialogHeader>
                        <ShieldAlert className="w-12 h-12 text-red-600 mb-2" />
                        <AlertDialogTitle>Apagar Viagem Completa?</AlertDialogTitle>
                        <AlertDialogDescription>Esta ação é irreversível.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Abortar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteTrip} className="bg-red-600 hover:bg-red-700 uppercase font-bold text-[11px]">Sim, Apagar Tudo</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}