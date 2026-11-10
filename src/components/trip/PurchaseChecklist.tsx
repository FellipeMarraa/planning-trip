// src/components/trip/PurchaseChecklist.tsx
import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ListChecks } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/common/section-header";
import { BookingRefLine, PurchaseCheck } from "@/components/trip/purchase-status-parts";
import { groupPurchasesByCategory, isPurchased } from "@/lib/purchaseStatus";
import { cn } from "@/lib/utils";
import type { Expense } from "@/types";

const formatBRL = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface PurchaseChecklistProps {
    // Despesas que o usuário pode ver (visualizador só enxerga as dele).
    expenses: Expense[];
    canEdit: boolean;
    onTogglePurchased: (expense: Expense) => void;
}

// Visão por categoria — "o que falta comprar em Hospedagem? e em Passagens?".
// Cada grupo lista pendentes primeiro (é o que pede ação) e comprados depois,
// com o mesmo check da tabela. Tudo aberto por padrão: o ponto é deixar o que
// falta explícito em tela; quem quiser enxugar recolhe um grupo ou o painel.
export function PurchaseChecklist({ expenses, canEdit, onTogglePurchased }: PurchaseChecklistProps) {
    const [panelOpen, setPanelOpen] = useState(true);
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

    const groups = useMemo(() => groupPurchasesByCategory(expenses), [expenses]);

    if (groups.length === 0) return null;

    const toggleGroup = (category: string) =>
        setCollapsedGroups((prev) => ({ ...prev, [category]: !prev[category] }));

    return (
        <Card className="p-5 rounded-2xl border-border space-y-4">
            <div className="flex items-center justify-between gap-3">
                <SectionHeader icon={ListChecks}>Por categoria</SectionHeader>
                <button
                    type="button"
                    onClick={() => setPanelOpen((open) => !open)}
                    aria-expanded={panelOpen}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 h-8 px-2 rounded-lg hover:bg-muted transition-colors"
                >
                    {panelOpen ? 'Ocultar' : 'Mostrar'}
                    {panelOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
            </div>

            {panelOpen && (
                <div className="space-y-5">
                    {groups.map(({ category, items, summary }) => {
                        const collapsed = !!collapsedGroups[category];
                        const allDone = summary.pendingCount === 0;

                        return (
                            <section key={category} aria-label={category}>
                                <button
                                    type="button"
                                    onClick={() => toggleGroup(category)}
                                    aria-expanded={!collapsed}
                                    className="w-full flex items-center gap-3 text-left group"
                                >
                                    {collapsed
                                        ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                        : <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                                    <span className="text-sm font-semibold text-foreground">{category}</span>
                                    <span className={cn("text-xs tabular-nums", allDone ? "text-chart-2 font-medium" : "text-muted-foreground")}>
                                        {summary.purchasedCount} de {summary.totalCount} comprados
                                    </span>
                                    <div
                                        role="progressbar"
                                        aria-label={`${category}: itens comprados`}
                                        aria-valuemin={0}
                                        aria-valuemax={summary.totalCount}
                                        aria-valuenow={summary.purchasedCount}
                                        className="ml-auto h-1.5 w-16 sm:w-24 rounded-full bg-muted overflow-hidden flex-shrink-0"
                                    >
                                        <div className="h-full rounded-full bg-chart-2" style={{ width: `${summary.percentPurchased}%` }} />
                                    </div>
                                </button>

                                {!collapsed && (
                                    <ul className="mt-2 divide-y divide-border border-t border-border">
                                        {items.map((expense) => {
                                            const purchased = isPurchased(expense);
                                            return (
                                                <li key={expense.id} className="flex items-center gap-2 py-1.5">
                                                    <PurchaseCheck
                                                        purchased={purchased}
                                                        description={expense.description}
                                                        canEdit={canEdit}
                                                        onToggle={() => onTogglePurchased(expense)}
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <p className={cn("text-sm truncate", purchased ? "text-muted-foreground" : "font-medium text-foreground")}>
                                                            {expense.description}
                                                        </p>
                                                        <p className={cn("text-xs font-medium", purchased ? "text-chart-2" : "text-muted-foreground")}>
                                                            {purchased ? 'Comprado' : 'Pendente'}
                                                        </p>
                                                        <BookingRefLine value={expense.bookingRef} className="max-w-full" />
                                                    </div>
                                                    <div className="text-right flex-shrink-0">
                                                        <p className="text-sm font-semibold text-foreground tabular-nums">{formatBRL(expense.amountBRL)}</p>
                                                        {expense.currency !== 'BRL' && (
                                                            <p className="text-xs text-muted-foreground tabular-nums">
                                                                {expense.amountOriginal} {expense.currency}
                                                            </p>
                                                        )}
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </section>
                        );
                    })}
                </div>
            )}
        </Card>
    );
}
