// src/components/trip/ExpenseTable.tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/common/section-header";
import { EmptyState } from "@/components/common/empty-state";
import { useUserProfiles } from "@/hooks/useUserProfiles";
import { getMemberName, isGhostUid } from "@/lib/members";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Pencil, Trash2, Users, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Expense, Trip } from '@/types';

export type ExpenseSortKey = 'description' | 'category' | 'amountOriginal' | 'amountBRL';
export type SortDirection = 'asc' | 'desc';

interface ExpenseTableProps {
    trip: Trip;
    expenses: Expense[];
    totalCount: number;
    canEdit: boolean;
    currentPage: number;
    totalPages: number;
    currentRates: Record<string, number>;
    sortKey: ExpenseSortKey | null;
    sortDirection: SortDirection;
    onSort: (key: ExpenseSortKey) => void;
    onPageChange: (page: number) => void;
    onEdit: (expense: Expense) => void;
    onDelete: (expense: Expense) => void;
    onViewParticipants: (expense: Expense) => void;
}

const formatBRL = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export function ExpenseTable({ trip, expenses, totalCount, canEdit, currentPage, totalPages, currentRates, sortKey, sortDirection, onSort, onPageChange, onEdit, onDelete, onViewParticipants }: ExpenseTableProps) {
    const profiles = useUserProfiles((trip.participants || []).filter((uid) => !isGhostUid(uid)));

    const SortableHeader = ({ column, label, align }: { column: ExpenseSortKey; label: string; align?: 'right' }) => (
        <th className={cn("px-6 py-3 font-medium", align === 'right' && "text-right")}>
            <button
                type="button"
                onClick={() => onSort(column)}
                className={cn("flex items-center gap-1 hover:text-foreground transition-colors", align === 'right' && "ml-auto")}
            >
                {label}
                {sortKey === column ? (
                    sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                ) : (
                    <ChevronDown className="w-3 h-3 opacity-30" />
                )}
            </button>
        </th>
    );

    return (
        <div className="bg-card border border-border rounded-3xl overflow-hidden">
            <div className="px-6 py-5 border-b border-border bg-muted/30">
                <SectionHeader>Despesas</SectionHeader>
            </div>

            <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                    <tr className="text-xs text-muted-foreground border-b border-border">
                        <SortableHeader column="description" label="Descrição" />
                        <SortableHeader column="category" label="Categoria" />
                        <th className="px-6 py-3 font-medium">Pago por</th>
                        <SortableHeader column="amountOriginal" label="Origem" align="right" />
                        <SortableHeader column="amountBRL" label="Total (BRL)" align="right" />
                        {canEdit && <th className="px-6 py-3 text-right font-medium">Ações</th>}
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                    {expenses.length === 0 ? (
                        <tr>
                            <td colSpan={canEdit ? 6 : 5} className="p-0">
                                <EmptyState icon={Wallet} message="Nenhuma despesa registrada" dashed={false} />
                            </td>
                        </tr>
                    ) : (
                        expenses.map((expense) => (
                            <tr key={expense.id} className="hover:bg-muted/30 transition-colors">
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
                                {canEdit && (
                                    <td className="px-6 py-4 text-right whitespace-nowrap">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                type="button"
                                                onClick={() => onViewParticipants(expense)}
                                                className="h-9 w-9 flex items-center justify-center text-muted-foreground active:text-primary active:bg-primary/10 rounded-lg transition-colors"
                                                aria-label="Ver participantes"
                                            >
                                                <Users className="h-4 w-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onEdit(expense)}
                                                className="h-9 w-9 flex items-center justify-center text-muted-foreground active:text-primary active:bg-primary/10 rounded-lg transition-colors"
                                                aria-label="Editar despesa"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onDelete(expense)}
                                                className="h-9 w-9 flex items-center justify-center text-muted-foreground active:text-destructive active:bg-destructive/10 rounded-lg transition-colors"
                                                aria-label="Excluir despesa"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                )}
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
