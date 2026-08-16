// src/components/trip/ExpenseTable.tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/common/section-header";
import { EmptyState } from "@/components/common/empty-state";
import { useUserProfiles } from "@/hooks/useUserProfiles";
import { getMemberName, isGhostUid } from "@/lib/members";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { ChevronLeft, ChevronRight, MoreHorizontal, Pencil, Trash2, Wallet } from "lucide-react";
import type { Expense, Trip } from '@/types';

interface ExpenseTableProps {
    trip: Trip;
    expenses: Expense[];
    totalCount: number;
    canEdit: boolean;
    currentPage: number;
    totalPages: number;
    currentRates: Record<string, number>;
    onPageChange: (page: number) => void;
    onEdit: (expense: Expense) => void;
    onDelete: (expense: Expense) => void;
}

const formatBRL = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export function ExpenseTable({ trip, expenses, totalCount, canEdit, currentPage, totalPages, currentRates, onPageChange, onEdit, onDelete }: ExpenseTableProps) {
    const profiles = useUserProfiles((trip.participants || []).filter((uid) => !isGhostUid(uid)));

    return (
        <div className="bg-card border border-border rounded-3xl overflow-hidden">
            <div className="px-6 py-5 border-b border-border bg-muted/30">
                <SectionHeader>Despesas</SectionHeader>
            </div>

            <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                    <tr className="text-xs text-muted-foreground border-b border-border">
                        <th className="px-6 py-3 font-medium">Descrição</th>
                        <th className="px-6 py-3 font-medium">Categoria</th>
                        <th className="px-6 py-3 font-medium">Pago por</th>
                        <th className="px-6 py-3 font-medium text-right">Origem</th>
                        <th className="px-6 py-3 font-medium text-right text-foreground">Total (BRL)</th>
                        <th className="px-6 py-3 w-10"></th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                    {expenses.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="p-0">
                                <EmptyState icon={Wallet} message="Nenhuma despesa registrada" dashed={false} />
                            </td>
                        </tr>
                    ) : (
                        expenses.map((expense) => (
                            <tr key={expense.id} className="hover:bg-muted/30 transition-colors group">
                                <td className="px-6 py-4">
                                    <p className="text-sm font-medium text-foreground">{expense.description}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {expense.currency === 'BRL' ? 'Sem conversão' : expense.spreadApplied ? `Spread: ${expense.spreadApplied}%` : 'Taxa não informada'}
                                    </p>
                                </td>
                                <td className="px-6 py-4">
                                    <Badge variant="outline" className="font-medium">
                                        {expense.category}
                                    </Badge>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm text-muted-foreground truncate">
                                        {expense.paidBy ? getMemberName(expense.paidBy, trip, profiles) : '—'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right whitespace-nowrap">
                                    <span className="text-sm text-muted-foreground tabular-nums">
                                        {expense.amountOriginal} {expense.currency}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right whitespace-nowrap">
                                    <span className="text-sm font-semibold text-foreground tabular-nums">
                                        {formatBRL(expense.amountBRL)}
                                    </span>
                                    <p className="text-xs text-muted-foreground tabular-nums">
                                        Hoje: {formatBRL(expense.amountOriginal * (currentRates[expense.currency] || 0))}
                                    </p>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {canEdit && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity outline-none">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => onEdit(expense)}>
                                                    <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem variant="destructive" onClick={() => onDelete(expense)}>
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

            {totalPages > 1 && (
                <div className="px-6 py-4 bg-muted/30 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-muted-foreground">
                        Mostrando <span className="text-foreground font-medium">{expenses.length}</span> de {totalCount}
                    </p>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)} className="h-8 w-8 p-0 rounded-lg">
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <div className="text-xs text-muted-foreground tabular-nums">{currentPage} / {totalPages}</div>
                        <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)} className="h-8 w-8 p-0 rounded-lg">
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
