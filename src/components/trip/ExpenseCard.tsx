// src/components/trip/ExpenseCard.tsx
import { MoreVertical, Pencil, Receipt, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BookingRefLine, PurchaseCheck } from "@/components/trip/purchase-status-parts";
import { getMemberName } from "@/lib/members";
import { formatDateTimeBR } from "@/lib/dates";
import { isPurchased } from "@/lib/purchaseStatus";
import { cn } from "@/lib/utils";
import type { Expense, Trip, UserProfile } from "@/types";

const formatBRL = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface ExpenseCardProps {
    expense: Expense;
    trip: Trip;
    profiles: Record<string, UserProfile>;
    canEdit: boolean;
    currentRates: Record<string, number>;
    isDomesticBRL: boolean;
    onEdit: (expense: Expense) => void;
    onDelete: (expense: Expense) => void;
    onViewParticipants: (expense: Expense) => void;
    onViewReceipt: (expense: Expense) => void;
    onTogglePurchased: (expense: Expense) => void;
}

// Despesa em formato de cartão — usado no celular no lugar da linha da tabela
// (que tem 7 colunas, largura mínima de 700px e deixava as ações escondidas na
// última coluna). Mesmos dados e mesmos handlers da tabela; as ações viram um
// menu "⋮" sempre alcançável, sem rolar pro lado.
export function ExpenseCard({ expense, trip, profiles, canEdit, currentRates, isDomesticBRL, onEdit, onDelete, onViewParticipants, onViewReceipt, onTogglePurchased }: ExpenseCardProps) {
    const purchased = isPurchased(expense);
    const hasReceipt = !!expense.receiptBase64;
    const isForeign = expense.currency !== 'BRL';

    return (
        <li className="flex items-start gap-1 pl-3 pr-2 py-3">
            <PurchaseCheck
                purchased={purchased}
                description={expense.description}
                canEdit={canEdit}
                onToggle={() => onTogglePurchased(expense)}
            />

            <div className="min-w-0 flex-1 space-y-1.5 pt-1">
                <div>
                    <p className="text-sm font-medium text-foreground break-words">{expense.description}</p>
                    <p className={cn("text-xs font-medium", purchased ? "text-chart-2" : "text-muted-foreground")}>
                        {purchased ? 'Comprado' : 'Pendente'}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Badge variant="outline" className="font-medium">{expense.category}</Badge>
                    <span className="text-xs text-muted-foreground tabular-nums">{formatDateTimeBR(expense.date)}</span>
                </div>

                <p className="text-xs text-muted-foreground">
                    Pago por: {expense.paidBy ? getMemberName(expense.paidBy, trip, profiles) : '—'}
                </p>

                <BookingRefLine value={expense.bookingRef} className="max-w-full" />

                <div className="pt-0.5">
                    <p className="text-base font-semibold text-foreground tabular-nums">{formatBRL(expense.amountBRL)}</p>
                    {isForeign && (
                        <p className="text-xs text-muted-foreground tabular-nums">
                            {expense.amountOriginal} {expense.currency}
                            {expense.spreadApplied ? ` · Spread: ${expense.spreadApplied}%` : ''}
                            {!isDomesticBRL && ` · Hoje: ${formatBRL(expense.amountOriginal * (currentRates[expense.currency] || 0))}`}
                        </p>
                    )}
                </div>
            </div>

            {(canEdit || hasReceipt) && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            aria-label={`Mais ações de ${expense.description}`}
                            className="h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors outline-none"
                        >
                            <MoreVertical className="h-5 w-5" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                        {hasReceipt && (
                            <DropdownMenuItem onClick={() => onViewReceipt(expense)}>
                                <Receipt className="w-4 h-4 mr-2 text-primary" /> Ver comprovante
                            </DropdownMenuItem>
                        )}
                        {canEdit && (
                            <>
                                <DropdownMenuItem onClick={() => onViewParticipants(expense)}>
                                    <Users className="w-4 h-4 mr-2 text-primary" /> Participantes
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onEdit(expense)}>
                                    <Pencil className="w-4 h-4 mr-2 text-primary" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onClick={() => onDelete(expense)}>
                                    <Trash2 className="w-4 h-4 mr-2" /> Excluir
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </li>
    );
}
