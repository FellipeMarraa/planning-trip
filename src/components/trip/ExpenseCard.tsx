// src/components/trip/ExpenseCard.tsx
import { Pencil, Receipt, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

// Botão de ação do cartão: alvo de toque de 44px, sempre visível — sem menu
// popover. A 1ª versão usava um menu "⋮" (DropdownMenu) e, num celular real,
// o toque nele não abria nada (não reproduzido em Chromium com toque, build de
// produção e re-renderizações; WebKit não pôde ser testado). Botões diretos não
// dependem de popover/portal e são o mesmo tipo de botão do check, que funciona.
function ActionButton({ label, onClick, destructive, children }: { label: string; onClick: () => void; destructive?: boolean; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            title={label}
            className={cn(
                "h-11 w-11 flex items-center justify-center rounded-lg text-muted-foreground transition-colors",
                destructive ? "active:text-destructive active:bg-destructive/10 hover:text-destructive" : "active:text-primary active:bg-primary/10 hover:text-primary"
            )}
        >
            {children}
        </button>
    );
}

// Despesa em formato de cartão — usado no celular no lugar da linha da tabela
// (que tem 7 colunas, largura mínima de 700px e deixava as ações escondidas na
// última coluna). Mesmos dados e mesmos handlers da tabela.
export function ExpenseCard({ expense, trip, profiles, canEdit, currentRates, isDomesticBRL, onEdit, onDelete, onViewParticipants, onViewReceipt, onTogglePurchased }: ExpenseCardProps) {
    const purchased = isPurchased(expense);
    const hasReceipt = !!expense.receiptBase64;
    const isForeign = expense.currency !== 'BRL';

    return (
        <li className="flex items-start gap-1 pl-3 pr-3 py-3">
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

                {(canEdit || hasReceipt) && (
                    <div className="flex items-center gap-1 -ml-2.5 pt-0.5 border-t border-border/60">
                        {hasReceipt && (
                            <ActionButton label={`Ver comprovante de ${expense.description}`} onClick={() => onViewReceipt(expense)}>
                                <Receipt className="h-5 w-5" />
                            </ActionButton>
                        )}
                        {canEdit && (
                            <>
                                <ActionButton label={`Ver participantes de ${expense.description}`} onClick={() => onViewParticipants(expense)}>
                                    <Users className="h-5 w-5" />
                                </ActionButton>
                                <ActionButton label={`Editar ${expense.description}`} onClick={() => onEdit(expense)}>
                                    <Pencil className="h-5 w-5" />
                                </ActionButton>
                                <ActionButton label={`Excluir ${expense.description}`} onClick={() => onDelete(expense)} destructive>
                                    <Trash2 className="h-5 w-5" />
                                </ActionButton>
                            </>
                        )}
                    </div>
                )}
            </div>
        </li>
    );
}
