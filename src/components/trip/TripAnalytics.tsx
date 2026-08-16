// src/components/trip/TripAnalytics.tsx
import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import { SectionHeader } from '@/components/common/section-header';
import { EmptyState } from '@/components/common/empty-state';
import type { Expense } from '@/types';

interface TripAnalyticsProps {
    expenses: Expense[];
}

const COLORS = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
];

export default function TripAnalytics({ expenses }: TripAnalyticsProps) {

    const categoryData = useMemo(() => {
        const data: Record<string, number> = {};
        let total = 0;

        expenses.forEach(exp => {
            data[exp.category] = (data[exp.category] || 0) + exp.amountBRL;
            total += exp.amountBRL;
        });

        return Object.entries(data)
            .map(([name, value]) => ({
                name,
                value,
                percent: ((value / total) * 100).toFixed(1)
            }))
            .sort((a, b) => b.value - a.value);
    }, [expenses]);

    if (!expenses || expenses.length === 0) {
        return <EmptyState icon={PieChartIcon} message="Aguardando gastos para gerar a análise" className="rounded-3xl" />;
    }

    const formatBRL = (value: any) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            maximumFractionDigits: 0
        }).format(Number(value));
    };

    return (
        <div className="bg-card border border-border rounded-3xl p-8">
            <SectionHeader className="mb-8">Gastos por categoria</SectionHeader>

            <div className="flex flex-col md:flex-row items-center justify-between gap-10">
                <div className="w-full md:w-1/2 h-[280px] flex items-center justify-center relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={categoryData}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={105}
                                paddingAngle={6}
                                dataKey="value"
                                stroke="none"
                            >
                                {categoryData.map((_, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                        className="outline-none"
                                    />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--popover)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    color: 'var(--popover-foreground)'
                                }}
                                itemStyle={{ color: 'var(--popover-foreground)' }}
                                formatter={(value) => formatBRL(value)}
                            />
                        </PieChart>
                    </ResponsiveContainer>

                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xs text-muted-foreground">Total</span>
                        <span className="text-xl font-semibold text-foreground tracking-tight">
                            {formatBRL(categoryData.reduce((acc, curr) => acc + curr.value, 0))}
                        </span>
                    </div>
                </div>

                <div className="w-full md:w-1/2 space-y-3.5">
                    {categoryData.map((entry, index) => (
                        <div key={entry.name} className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                />
                                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                                    {entry.name}
                                </span>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-semibold text-foreground tabular-nums">
                                    {formatBRL(entry.value)}
                                </p>
                                <p className="text-xs text-muted-foreground tabular-nums">
                                    {entry.percent}%
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
