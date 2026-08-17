// src/pages/TripDetails.tsx
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useTrip } from '@/hooks/useTrip';
import { useExchange } from '@/hooks/useExchange';
import { useTripRole } from '@/hooks/useTripRole';
import { useSettlements } from '@/hooks/useSettlements';
import { useTripBalances } from '@/hooks/useTripBalances';
import { useUserProfiles } from '@/hooks/useUserProfiles';
import { isGhostUid } from '@/lib/members';
import { cn } from '@/lib/utils';
import { addGhostMember, changeMemberRole, deleteTripCascade, leaveTripAsGhost, linkGhostToUser, removeMember, renameGhostMember } from '@/services/trips';
import { createInvite } from '@/services/invites';
import { deleteExpense } from '@/services/expenses';
import { createSettlement, deleteSettlement } from '@/services/settlements';
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/common/stat-card";
import { TripMembers } from "@/components/trip/TripMembers";
import { LinkGhostModal } from "@/components/trip/LinkGhostModal";
import { BalancesSummary } from "@/components/trip/BalancesSummary";
import { MemberDebtModal } from "@/components/trip/MemberDebtModal";
import { ExpenseFilters } from "@/components/trip/ExpenseFilters";
import { ExpenseTable, type ExpenseSortKey, type SortDirection } from "@/components/trip/ExpenseTable";
import { ExpenseParticipantsModal } from "@/components/trip/ExpenseParticipantsModal";
import {
    Calendar,
    LogOut,
    Map,
    MoreHorizontal,
    Pencil,
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
import EditTripDialog from '@/components/trip/EditTripDialog';
import TripAnalytics from '@/components/trip/TripAnalytics';
import { formatDateBR } from '@/lib/dates';
import type { Expense, UserRole } from '@/types';

export default function TripDetails() {
    const { tripId } = useParams();
    const navigate = useNavigate();

    const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
    const [expenseToEdit, setExpenseToEdit] = useState<Expense | undefined>(undefined);
    const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
    const [expenseToView, setExpenseToView] = useState<Expense | null>(null);
    const [isDeleteTripOpen, setIsDeleteTripOpen] = useState(false);
    const [isLeaveTripOpen, setIsLeaveTripOpen] = useState(false);
    const [isEditTripOpen, setIsEditTripOpen] = useState(false);

    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterCurrency, setFilterCurrency] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState<ExpenseSortKey | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const [ghostToLink, setGhostToLink] = useState<string | null>(null);
    const [memberToInspect, setMemberToInspect] = useState<string | null>(null);

    const { user } = useAuth();
    const { showError, showSuccess } = useToast();
    const { trip, expenses, loading, error } = useTrip(tripId || '');
    const { rates: currentRates } = useExchange();
    const { role, canEdit, isOwner } = useTripRole(trip);
    const { settlements } = useSettlements(tripId || '');
    const balances = useTripBalances(trip?.participants || [], expenses, settlements);
    // Busca única dos perfis, compartilhada com todos os componentes da página
    // (evita 6+ listeners independentes pros mesmos usuários).
    const profiles = useUserProfiles((trip?.participants || []).filter((uid) => !isGhostUid(uid)));

    // Visualizador só vê despesas em que participou; owner/editor vê tudo.
    const visibleExpenses = useMemo(() => {
        if (canEdit) return expenses;
        return expenses.filter(expense => (expense.participants || []).includes(user?.uid || ''));
    }, [expenses, canEdit, user?.uid]);

    const filteredExpenses = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return visibleExpenses.filter(expense => {
            const matchCategory = filterCategory === 'all' || expense.category === filterCategory;
            const matchCurrency = filterCurrency === 'all' || expense.currency === filterCurrency;
            const matchSearch = query === '' || expense.description.toLowerCase().includes(query);
            return matchCategory && matchCurrency && matchSearch;
        });
    }, [visibleExpenses, filterCategory, filterCurrency, searchQuery]);

    const sortedExpenses = useMemo(() => {
        if (!sortKey) return filteredExpenses;
        const sorted = [...filteredExpenses].sort((a, b) => {
            const aValue = a[sortKey];
            const bValue = b[sortKey];
            if (typeof aValue === 'number' && typeof bValue === 'number') return aValue - bValue;
            return String(aValue).localeCompare(String(bValue), 'pt-BR');
        });
        return sortDirection === 'asc' ? sorted : sorted.reverse();
    }, [filteredExpenses, sortKey, sortDirection]);

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
    // Viagem com referência em BRL: comparação de cotação não faz sentido.
    const isDomesticBRL = trip?.baseCurrency === 'BRL';

    // Se o usuário aparece em alguma despesa/acerto, sair "de vez" deixaria
    // dívidas/créditos órfãos — nesse caso ele é substituído por um fantasma.
    const hasFinancialFootprint = useMemo(() => {
        if (!user?.uid) return false;
        return expenses.some((exp) => exp.paidBy === user.uid || (exp.participants || []).includes(user.uid))
            || settlements.some((s) => s.from === user.uid || s.to === user.uid);
    }, [expenses, settlements, user?.uid]);

    const totalPages = Math.ceil(sortedExpenses.length / itemsPerPage);
    const paginatedExpenses = sortedExpenses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    if (loading) return null;

    if (error) {
        return (
            <div className="max-w-md mx-auto mt-20 text-center space-y-4">
                <div className="w-12 h-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                    <ShieldAlert className="w-6 h-6 text-destructive" />
                </div>
                <p className="text-foreground font-medium">{error}</p>
                <Button variant="outline" onClick={() => navigate('/')}>Voltar para minhas viagens</Button>
            </div>
        );
    }

    const handleDeleteExpense = async () => {
        if (!expenseToDelete) return;
        try {
            await deleteExpense(expenseToDelete.id);
            setExpenseToDelete(null);
        } catch (err) {
            console.error("Erro ao excluir despesa:", err);
            showError("Não foi possível excluir a despesa. Tente novamente.");
        }
    };

    const handleDeleteTrip = async () => {
        if (!tripId) return;
        try {
            await deleteTripCascade(tripId);
            navigate('/');
        } catch (err) {
            console.error("Erro ao excluir viagem:", err);
            showError("Não foi possível excluir a viagem. Tente novamente.");
        }
    };

    const handleLeaveTrip = async () => {
        if (!tripId || !user?.uid) return;
        try {
            if (hasFinancialFootprint) {
                const myName = profiles[user.uid]?.displayName || user.displayName || 'Ex-participante';
                await leaveTripAsGhost(tripId, user.uid, myName);
            } else {
                await removeMember(tripId, user.uid);
            }
            navigate('/');
        } catch (err) {
            console.error("Erro ao sair da viagem:", err);
            showError("Não foi possível sair da viagem. Tente novamente.");
        }
    };

    const resetFilters = () => {
        setFilterCategory('all');
        setFilterCurrency('all');
        setSearchQuery('');
        setCurrentPage(1);
    };

    const handleSort = (key: ExpenseSortKey) => {
        if (sortKey === key) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDirection('asc');
        }
    };

    const copyInviteLink = async (role: 'EDITOR' | 'VIEWER') => {
        if (!tripId || !user?.uid) return;
        try {
            const inviteId = await createInvite(tripId, role, user.uid);
            const url = `${window.location.origin}/join/${inviteId}`;
            await navigator.clipboard.writeText(url);
            showSuccess(`Link de convite para ${role === 'EDITOR' ? 'editor' : 'visualizador'} copiado!`);
        } catch (error) {
            console.error("Erro ao criar convite:", error);
            showError("Não foi possível gerar o link de convite.");
        }
    };

    const handleChangeRole = async (uid: string, newRole: Exclude<UserRole, 'OWNER'>) => {
        if (!tripId) return;
        try {
            await changeMemberRole(tripId, uid, newRole);
        } catch (err) {
            console.error("Erro ao trocar papel do membro:", err);
            showError("Não foi possível trocar o papel do membro.");
        }
    };

    const handleRemoveMember = async (uid: string) => {
        if (!tripId) return;
        try {
            await removeMember(tripId, uid);
        } catch (err) {
            console.error("Erro ao remover membro:", err);
            showError("Não foi possível remover o membro.");
        }
    };

    const handleAddGhost = async (name: string) => {
        if (!tripId) return;
        try {
            await addGhostMember(tripId, name);
        } catch (err) {
            console.error("Erro ao adicionar convidado:", err);
            showError("Não foi possível adicionar o convidado.");
        }
    };

    const handleRenameGhost = async (ghostUid: string, name: string) => {
        if (!tripId) return;
        try {
            await renameGhostMember(tripId, ghostUid, name);
        } catch (err) {
            console.error("Erro ao renomear convidado:", err);
            showError("Não foi possível renomear o convidado.");
        }
    };

    const handleLinkGhost = async (ghostUid: string, realUid: string) => {
        if (!tripId) return;
        try {
            await linkGhostToUser(tripId, ghostUid, realUid);
            setGhostToLink(null);
        } catch (err) {
            console.error("Erro ao vincular convidado:", err);
            showError("Não foi possível vincular o convidado.");
        }
    };

    const handleSettle = async (from: string, to: string, amount: number) => {
        if (!tripId) return;
        try {
            await createSettlement(tripId, from, to, amount);
        } catch (err) {
            console.error("Erro ao registrar pagamento:", err);
            showError("Não foi possível registrar o pagamento.");
        }
    };

    const handleDeleteSettlement = async (settlementId: string) => {
        try {
            await deleteSettlement(settlementId);
        } catch (err) {
            console.error("Erro ao excluir acerto:", err);
            showError("Não foi possível excluir o acerto.");
        }
    };

    return (
        <div className="w-full pb-16 space-y-7">
            <div className="flex items-center justify-between">
                <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                    <button onClick={() => navigate('/')} className="hover:text-primary transition-colors">Minhas viagens</button>
                    <span className="opacity-40">/</span>
                    <span className="text-foreground font-medium">{trip?.name}</span>
                </nav>

                {role && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button aria-label="Gerenciar viagem" className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors outline-none">
                                <MoreHorizontal className="w-5 h-5" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Gerenciar viagem</DropdownMenuLabel>
                            {canEdit && (
                                <>
                                    <DropdownMenuItem onClick={() => setIsEditTripOpen(true)}>
                                        <Pencil className="w-4 h-4 mr-2 text-primary" /> Editar viagem
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => copyInviteLink('EDITOR')}>
                                        <Share2 className="w-4 h-4 mr-2 text-primary" /> Convidar editor
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => copyInviteLink('VIEWER')}>
                                        <Share2 className="w-4 h-4 mr-2 text-chart-2" /> Convidar visualizador
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem variant="destructive" onClick={() => setIsDeleteTripOpen(true)}>
                                        <Trash2 className="w-4 h-4 mr-2" /> Excluir viagem
                                    </DropdownMenuItem>
                                </>
                            )}
                            {!isOwner && (
                                <>
                                    {canEdit && <DropdownMenuSeparator />}
                                    <DropdownMenuItem variant="destructive" onClick={() => setIsLeaveTripOpen(true)}>
                                        <LogOut className="w-4 h-4 mr-2" /> Sair da viagem
                                    </DropdownMenuItem>
                                </>
                            )}
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
                        {formatDateBR(trip?.startDate)} — {formatDateBR(trip?.endDate)}
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
                    profiles={profiles}
                    canEdit={canEdit}
                    onChangeRole={handleChangeRole}
                    onRemoveMember={handleRemoveMember}
                    onAddGhost={handleAddGhost}
                    onLinkGhost={setGhostToLink}
                    onRenameGhost={handleRenameGhost}
                />
            )}

            <div className={cn("grid grid-cols-1 gap-4", !isDomesticBRL && "sm:grid-cols-3")}>
                <StatCard
                    label="Total desembolsado"
                    value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalBRLRealizado)}
                    hint="Base acumulada com taxas"
                    accent="primary"
                />
                {!isDomesticBRL && (
                    <>
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
                    </>
                )}
            </div>

            <TripAnalytics expenses={expenses} />

            {trip && (
                <BalancesSummary
                    trip={trip}
                    profiles={profiles}
                    balances={balances}
                    currentUserUid={user?.uid || ''}
                    canViewAll={canEdit}
                    onSelectMember={setMemberToInspect}
                />
            )}

            <ExpenseFilters
                categories={categories}
                filterCategory={filterCategory}
                filterCurrency={filterCurrency}
                searchQuery={searchQuery}
                onCategoryChange={(v) => { setFilterCategory(v); setCurrentPage(1); }}
                onCurrencyChange={(v) => { setFilterCurrency(v); setCurrentPage(1); }}
                onSearchChange={(v) => { setSearchQuery(v); setCurrentPage(1); }}
                onReset={resetFilters}
            />

            {trip && (
                <ExpenseTable
                    trip={trip}
                    profiles={profiles}
                    expenses={paginatedExpenses}
                    totalCount={sortedExpenses.length}
                    canEdit={canEdit}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    currentRates={currentRates}
                    isDomesticBRL={isDomesticBRL}
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
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
                    profiles={profiles}
                    expense={expenseToView}
                />
            )}

            {trip && (
                <AddExpenseDialog
                    open={isAddExpenseOpen}
                    onOpenChange={setIsAddExpenseOpen}
                    trip={trip}
                    profiles={profiles}
                    rates={currentRates}
                    expenseToEdit={expenseToEdit}
                />
            )}

            {trip && (
                <EditTripDialog
                    open={isEditTripOpen}
                    onOpenChange={setIsEditTripOpen}
                    trip={trip}
                />
            )}

            {trip && (
                <LinkGhostModal
                    open={!!ghostToLink}
                    onOpenChange={() => setGhostToLink(null)}
                    trip={trip}
                    profiles={profiles}
                    ghostUid={ghostToLink}
                    onConfirm={handleLinkGhost}
                />
            )}

            {trip && (
                <MemberDebtModal
                    open={!!memberToInspect}
                    onOpenChange={() => setMemberToInspect(null)}
                    trip={trip}
                    profiles={profiles}
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

            <AlertDialog open={isLeaveTripOpen} onOpenChange={setIsLeaveTripOpen}>
                <AlertDialogContent className="rounded-3xl max-w-[420px] border-destructive/30">
                    <AlertDialogHeader>
                        <LogOut className="w-12 h-12 text-destructive mb-2 mx-auto" />
                        <AlertDialogTitle className="text-foreground text-center">Sair da viagem?</AlertDialogTitle>
                        <AlertDialogDescription className="text-center">
                            {hasFinancialFootprint
                                ? "Você deixará de ter acesso a esta viagem. Como você tem despesas ou acertos registrados, seu nome será mantido como convidado (sem login) para preservar dívidas e saldos. Para voltar, será preciso um novo convite."
                                : "Você deixará de ter acesso a esta viagem. Para voltar, será preciso um novo convite."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-3 mt-4">
                        <AlertDialogCancel className="rounded-xl h-11 flex-1">Cancelar</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={handleLeaveTrip} className="rounded-xl h-11 flex-1">Sair da viagem</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
