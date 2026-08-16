// src/pages/TripDetails.tsx
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTrip } from '@/hooks/useTrip';
import { useExchange } from '@/hooks/useExchange';
import { useTripRole } from '@/hooks/useTripRole';
import { useSettlements } from '@/hooks/useSettlements';
import { useTripBalances } from '@/hooks/useTripBalances';
import { addGhostMember, changeMemberRole, deleteTripCascade, linkGhostToUser, removeMember } from '@/services/trips';
import { deleteExpense } from '@/services/expenses';
import { createSettlement, deleteSettlement } from '@/services/settlements';
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/common/stat-card";
import { TripMembers } from "@/components/trip/TripMembers";
import { LinkGhostModal } from "@/components/trip/LinkGhostModal";
import { BalancesSummary } from "@/components/trip/BalancesSummary";
import { MemberDebtModal } from "@/components/trip/MemberDebtModal";
import { ExpenseFilters } from "@/components/trip/ExpenseFilters";
import { ExpenseTable } from "@/components/trip/ExpenseTable";
import { ExpenseParticipantsModal } from "@/components/trip/ExpenseParticipantsModal";
import {
    Calendar,
    Map,
    MoreHorizontal,
    Plus,
    Share2,
    ShieldAlert,
    Trash2,
    TrendingDown,
    TrendingUp,
} from "lucide-react";
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
import type { Expense, UserRole } from '@/types';

export default function TripDetails() {
    const { tripId } = useParams();
    const navigate = useNavigate();

    const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
    const [expenseToEdit, setExpenseToEdit] = useState<Expense | undefined>(undefined);
    const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
    const [expenseToView, setExpenseToView] = useState<Expense | null>(null);
    const [isDeleteTripOpen, setIsDeleteTripOpen] = useState(false);

    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterCurrency, setFilterCurrency] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const [ghostToLink, setGhostToLink] = useState<string | null>(null);
    const [memberToInspect, setMemberToInspect] = useState<string | null>(null);

    const { trip, expenses, loading } = useTrip(tripId || '');
    const { rates: currentRates } = useExchange();
    const { canEdit } = useTripRole(trip);
    const { settlements } = useSettlements(tripId || '');
    const balances = useTripBalances(trip?.participants || [], expenses, settlements);

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

    const totalBRLRealizado = useMemo(() => {
        return expenses.reduce((acc, curr) => acc + (Number(curr.amountBRL) || 0), 0);
    }, [expenses]);

    const totalBRLMercado = useMemo(() => {
        return expenses.reduce((acc, curr) => {
            const taxaComercialHoje = currentRates[curr.currency] || 1;
            return acc + (Number(curr.amountOriginal) * taxaComercialHoje);
        }, 0);
    }, [expenses, currentRates]);

    const variacao = totalBRLRealizado > 0 ? ((totalBRLMercado / totalBRLRealizado - 1) * 100) : 0;

    const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
    const paginatedExpenses = filteredExpenses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    if (loading) return null;

    const handleDeleteExpense = async () => {
        if (!expenseToDelete) return;
        try {
            await deleteExpense(expenseToDelete.id);
            setExpenseToDelete(null);
        } catch (error) { console.error("Erro ao excluir despesa:", error); }
    };

    const handleDeleteTrip = async () => {
        if (!tripId) return;
        try {
            await deleteTripCascade(tripId);
            navigate('/');
        } catch (error) { console.error("Erro ao excluir viagem:", error); }
    };

    const resetFilters = () => {
        setFilterCategory('all');
        setFilterCurrency('all');
        setCurrentPage(1);
    };

    const copyInviteLink = (role: 'editor' | 'viewer') => {
        const url = `${window.location.origin}/join/${tripId}/${role}`;
        navigator.clipboard.writeText(url);
        alert(`Link de convite para ${role === 'editor' ? 'editor' : 'visualizador'} copiado!`);
    };

    const handleChangeRole = async (uid: string, newRole: Exclude<UserRole, 'OWNER'>) => {
        if (!tripId) return;
        try {
            await changeMemberRole(tripId, uid, newRole);
        } catch (error) { console.error("Erro ao trocar papel do membro:", error); }
    };

    const handleRemoveMember = async (uid: string) => {
        if (!tripId) return;
        try {
            await removeMember(tripId, uid);
        } catch (error) { console.error("Erro ao remover membro:", error); }
    };

    const handleAddGhost = async (name: string) => {
        if (!tripId) return;
        try {
            await addGhostMember(tripId, name);
        } catch (error) { console.error("Erro ao adicionar convidado:", error); }
    };

    const handleLinkGhost = async (ghostUid: string, realUid: string) => {
        if (!tripId) return;
        try {
            await linkGhostToUser(tripId, ghostUid, realUid);
            setGhostToLink(null);
        } catch (error) { console.error("Erro ao vincular convidado:", error); }
    };

    const handleSettle = async (from: string, to: string, amount: number) => {
        if (!tripId) return;
        try {
            await createSettlement(tripId, from, to, amount);
        } catch (error) { console.error("Erro ao registrar pagamento:", error); }
    };

    const handleDeleteSettlement = async (settlementId: string) => {
        try {
            await deleteSettlement(settlementId);
        } catch (error) { console.error("Erro ao excluir acerto:", error); }
    };

    const formatDate = (dateStr: string | undefined) => {
        if (!dateStr) return '--/--/----';
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    };

    return (
        <div className="w-full pb-16 space-y-7">
            <div className="flex items-center justify-between">
                <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                    <button onClick={() => navigate('/')} className="hover:text-primary transition-colors">Minhas viagens</button>
                    <span className="opacity-40">/</span>
                    <span className="text-foreground font-medium">{trip?.name}</span>
                </nav>

                {canEdit && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors outline-none">
                                <MoreHorizontal className="w-5 h-5" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Gerenciar viagem</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => copyInviteLink('editor')}>
                                <Share2 className="w-4 h-4 mr-2 text-primary" /> Convidar editor
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => copyInviteLink('viewer')}>
                                <Share2 className="w-4 h-4 mr-2 text-chart-2" /> Convidar visualizador
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => setIsDeleteTripOpen(true)}>
                                <Trash2 className="w-4 h-4 mr-2" /> Excluir viagem
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border pb-7">
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{trip?.name}</h1>
                        <Button
                            variant="outline"
                            onClick={() => navigate(`/trip/${tripId}/itinerary`)}
                            className="h-8 px-4 rounded-full border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
                        >
                            <Map className="w-3.5 h-3.5 mr-1.5" /> Roteiro
                        </Button>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {formatDate(trip?.startDate)} — {formatDate(trip?.endDate)}
                    </div>
                </div>
                {canEdit && (
                    <Button
                        onClick={() => { setExpenseToEdit(undefined); setIsAddExpenseOpen(true); }}
                        className="h-10 px-6 rounded-xl shadow-sm"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Nova despesa
                    </Button>
                )}
            </div>

            {trip && (
                <TripMembers
                    trip={trip}
                    canEdit={canEdit}
                    onChangeRole={handleChangeRole}
                    onRemoveMember={handleRemoveMember}
                    onAddGhost={handleAddGhost}
                    onLinkGhost={setGhostToLink}
                />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                    label="Total desembolsado"
                    value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalBRLRealizado)}
                    hint="Base acumulada com taxas"
                    accent="primary"
                />
                <StatCard
                    label="Cotação comercial"
                    value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalBRLMercado)}
                    hint="Câmbio atualizado agora"
                    pulse
                    className="bg-muted/40"
                />
                <StatCard
                    label="Eficiência cambial"
                    value={totalBRLRealizado > 0 ? `${variacao > 0 ? '+' : ''}${variacao.toFixed(2)}%` : '0,00%'}
                    hint="vs. câmbio comercial"
                    valueClassName={totalBRLRealizado > 0 ? (variacao > 0 ? 'text-destructive' : 'text-chart-2') : 'text-muted-foreground'}
                    icon={totalBRLRealizado > 0 ? (variacao > 0 ? TrendingUp : TrendingDown) : undefined}
                />
            </div>

            <TripAnalytics expenses={expenses} />

            {trip && (
                <BalancesSummary
                    trip={trip}
                    balances={balances}
                    onSelectMember={setMemberToInspect}
                />
            )}

            <ExpenseFilters
                categories={categories}
                filterCategory={filterCategory}
                filterCurrency={filterCurrency}
                onCategoryChange={(v) => { setFilterCategory(v); setCurrentPage(1); }}
                onCurrencyChange={(v) => { setFilterCurrency(v); setCurrentPage(1); }}
                onReset={resetFilters}
            />

            {trip && (
                <ExpenseTable
                    trip={trip}
                    expenses={paginatedExpenses}
                    totalCount={filteredExpenses.length}
                    canEdit={canEdit}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    currentRates={currentRates}
                    onPageChange={setCurrentPage}
                    onEdit={(expense) => { setExpenseToEdit(expense); setIsAddExpenseOpen(true); }}
                    onDelete={setExpenseToDelete}
                    onViewParticipants={setExpenseToView}
                />
            )}

            {trip && (
                <ExpenseParticipantsModal
                    open={!!expenseToView}
                    onOpenChange={() => setExpenseToView(null)}
                    trip={trip}
                    expense={expenseToView}
                />
            )}

            {trip && (
                <AddExpenseDialog
                    open={isAddExpenseOpen}
                    onOpenChange={setIsAddExpenseOpen}
                    trip={trip}
                    expenseToEdit={expenseToEdit}
                />
            )}

            {trip && (
                <LinkGhostModal
                    open={!!ghostToLink}
                    onOpenChange={() => setGhostToLink(null)}
                    trip={trip}
                    ghostUid={ghostToLink}
                    onConfirm={handleLinkGhost}
                />
            )}

            {trip && (
                <MemberDebtModal
                    open={!!memberToInspect}
                    onOpenChange={() => setMemberToInspect(null)}
                    trip={trip}
                    memberUid={memberToInspect}
                    expenses={expenses}
                    settlements={settlements}
                    onSettle={handleSettle}
                    onDeleteSettlement={handleDeleteSettlement}
                    canEdit={canEdit}
                />
            )}

            <AlertDialog open={!!expenseToDelete} onOpenChange={() => setExpenseToDelete(null)}>
                <AlertDialogContent className="rounded-3xl max-w-[360px] p-8">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-foreground text-center">Remover despesa?</AlertDialogTitle>
                        <AlertDialogDescription className="text-center">
                            Essa ação é permanente e não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex gap-3 mt-6">
                        <AlertDialogCancel className="flex-1 rounded-xl h-10">Cancelar</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={handleDeleteExpense} className="flex-1 rounded-xl h-10">Remover</AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isDeleteTripOpen} onOpenChange={setIsDeleteTripOpen}>
                <AlertDialogContent className="rounded-3xl max-w-[420px] border-destructive/30">
                    <AlertDialogHeader>
                        <ShieldAlert className="w-12 h-12 text-destructive mb-2 mx-auto" />
                        <AlertDialogTitle className="text-foreground text-center">Excluir viagem?</AlertDialogTitle>
                        <AlertDialogDescription className="text-center">
                            Todos os dados e o roteiro desta viagem serão apagados permanentemente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-3 mt-4">
                        <AlertDialogCancel className="rounded-xl h-11 flex-1">Cancelar</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={handleDeleteTrip} className="rounded-xl h-11 flex-1">Excluir viagem</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
