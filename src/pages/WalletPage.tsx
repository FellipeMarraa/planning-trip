// src/pages/WalletPage.tsx
import { useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useUserTrips } from '@/hooks/useUserTrips';
import { useCurrencyLots } from '@/hooks/useCurrencyLots';
import { useWalletExpenses } from '@/hooks/useWalletExpenses';
import { summarizeWalletDemand } from '@/lib/currencyWallet';
import { deleteCurrencyLot } from '@/services/currencyLots';
import { CurrencyLotForm } from '@/components/trip/CurrencyLotForm';
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Plus, Trash2, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CurrencyLot } from '@/types';

const formatCurrency = (value: number, currency: string) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);

function CurrencySummaryCard({ summary, currency, lots, onDeleteLot }: {
    summary: ReturnType<typeof summarizeWalletDemand>[number];
    currency: string;
    lots: CurrencyLot[];
    onDeleteLot: (lotId: string) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const covered = summary.shortfall === 0;

    return (
        <div className="border border-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{currency}</span>
                <div className={cn(
                    "flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full",
                    covered ? "bg-chart-2/15 text-chart-2" : "bg-amber-500/15 text-amber-600"
                )}>
                    {covered ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                    {covered ? "Coberto" : `Faltam ${formatCurrency(summary.shortfall, currency)}`}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                    <p className="text-muted-foreground">Comprado</p>
                    <p className="text-sm font-medium text-foreground tabular-nums">{formatCurrency(summary.totalPurchased, currency)}</p>
                </div>
                <div>
                    <p className="text-muted-foreground">Necessário</p>
                    <p className="text-sm font-medium text-foreground tabular-nums">{formatCurrency(summary.totalNeeded, currency)}</p>
                </div>
            </div>

            {summary.items.length > 0 && (
                <div>
                    <button
                        type="button"
                        onClick={() => setExpanded((v) => !v)}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {expanded ? "Ocultar" : "Ver"} despesas ({summary.items.length})
                    </button>
                    {expanded && (
                        <ul className="mt-2 space-y-1">
                            {summary.items.map((item) => (
                                <li key={item.expenseId} className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span className="truncate">{item.description}</span>
                                    <span className="tabular-nums shrink-0 ml-2">{formatCurrency(item.amountNeeded, currency)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {lots.length > 0 && (
                <div className="pt-2 border-t border-border space-y-1">
                    {lots.map((lot) => (
                        <div key={lot.id} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                                {formatCurrency(lot.amountPurchased, currency)} a R$ {lot.ratePaidBRL.toFixed(4)} ({lot.purchaseDate})
                            </span>
                            <button
                                type="button"
                                onClick={() => onDeleteLot(lot.id)}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                                aria-label="Remover compra"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function WalletPage() {
    const { user } = useAuth();
    const { trips } = useUserTrips();
    const { lots } = useCurrencyLots();
    const { expenses } = useWalletExpenses();
    const [lotFormTripId, setLotFormTripId] = useState<string | null>(null);

    // Carteira só faz sentido pra viagem com moeda de referência estrangeira
    // — viagem BRL não tem conceito de "comprar moeda antes", mesmo que
    // alguma despesa avulsa tenha sido lançada noutra moeda por engano.
    const tripSections = useMemo(() => {
        return trips
            .filter((trip) => trip.baseCurrency !== 'BRL')
            .map((trip) => {
                const tripLots = lots.filter((l) => l.tripId === trip.id);
                const tripExpenses = expenses.filter((e) => e.tripId === trip.id);
                const summaries = summarizeWalletDemand(tripLots, tripExpenses);
                return { trip, tripLots, summaries };
            });
    }, [trips, lots, expenses]);

    const handleDeleteLot = async (lotId: string) => {
        try {
            await deleteCurrencyLot(lotId);
        } catch (error) {
            console.error('Erro ao remover compra de câmbio:', error);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-primary" /> Carteira de câmbio
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Planejamento pessoal — quanto você já comprou de cada moeda vs. quanto as despesas marcadas "carteira" precisam. Não afeta a divisão de gastos com o grupo.
                </p>
            </div>

            {tripSections.length === 0 ? (
                <EmptyState
                    icon={Wallet}
                    message="Nenhuma viagem com moeda estrangeira ainda — a carteira só se aplica a viagens que não são em Real (BRL)."
                    dashed={false}
                />
            ) : (
                tripSections.map(({ trip, tripLots, summaries }) => (
                    <div key={trip.id} className="bg-card border border-border rounded-3xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-foreground">{trip.name}</h2>
                            <Button size="sm" variant="outline" onClick={() => setLotFormTripId(trip.id)}>
                                <Plus className="w-3.5 h-3.5 mr-1.5" /> Registrar compra
                            </Button>
                        </div>

                        {summaries.length === 0 ? (
                            <p className="text-xs text-muted-foreground">Nenhuma compra registrada ainda pra essa viagem.</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {summaries.map((summary) => (
                                    <CurrencySummaryCard
                                        key={summary.currency}
                                        summary={summary}
                                        currency={summary.currency}
                                        lots={tripLots.filter((l) => l.currency === summary.currency)}
                                        onDeleteLot={handleDeleteLot}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ))
            )}

            {user && (
                <CurrencyLotForm
                    open={!!lotFormTripId}
                    onOpenChange={(open) => !open && setLotFormTripId(null)}
                    tripId={lotFormTripId || ''}
                    ownerUid={user.uid}
                    ownerLabel="você"
                />
            )}
        </div>
    );
}
