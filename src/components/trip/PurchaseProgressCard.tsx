// src/components/trip/PurchaseProgressCard.tsx
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/common/section-header";
import { ShoppingBag } from "lucide-react";
import type { PurchaseSummary } from "@/lib/purchaseStatus";

const formatBRL = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface PurchaseProgressCardProps {
    summary: PurchaseSummary;
}

// Resposta rápida pra "o que já comprei e o que ainda é só orçamento?".
// Barra por quantidade de itens; valores (comprado / falta comprar) abaixo,
// porque orçamento pendente é estimativa e comprado é o valor real.
export function PurchaseProgressCard({ summary }: PurchaseProgressCardProps) {
    if (summary.totalCount === 0) return null;

    const { purchasedCount, totalCount, percentPurchased, purchasedBRL, pendingBRL, totalBRL, pendingCount } = summary;

    return (
        <Card className="p-5 rounded-2xl border-border space-y-4">
            <div className="flex items-start justify-between gap-3">
                <SectionHeader icon={ShoppingBag}>Compras da viagem</SectionHeader>
                <span className="text-sm font-semibold text-foreground tabular-nums whitespace-nowrap">
                    {purchasedCount} de {totalCount} comprados
                </span>
            </div>

            <div
                role="progressbar"
                aria-label="Itens comprados"
                aria-valuemin={0}
                aria-valuemax={totalCount}
                aria-valuenow={purchasedCount}
                aria-valuetext={`${purchasedCount} de ${totalCount} itens comprados`}
                className="h-2 w-full rounded-full bg-muted overflow-hidden"
            >
                <div
                    className="h-full rounded-full bg-chart-2 transition-all"
                    style={{ width: `${percentPurchased}%` }}
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div>
                    <p className="text-xs text-muted-foreground">Comprado</p>
                    <p className="font-semibold text-foreground tabular-nums">{formatBRL(purchasedBRL)}</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">
                        Pendente{pendingCount > 0 ? ` · ${pendingCount} ${pendingCount === 1 ? 'item' : 'itens'}` : ''}
                    </p>
                    <p className="font-semibold text-foreground tabular-nums">{formatBRL(pendingBRL)}</p>
                    <p className="text-xs text-muted-foreground">valor estimado</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">Total previsto</p>
                    <p className="font-semibold text-foreground tabular-nums">{formatBRL(totalBRL)}</p>
                </div>
            </div>
        </Card>
    );
}
