// src/components/trip/TripAnalytics.tsx
import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { Expense } from '@/types';

interface TripAnalyticsProps {
    expenses: Expense[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f472b6'];

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
        return (
            <div className="bg-white/[0.02] border border-dashed border-white/10 rounded-[32px] p-12 text-center">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em]">
                    Aguardando dados para análise de categorias
                </p>
            </div>
        );
    }

    const formatBRL = (value: any) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            maximumFractionDigits: 0
        }).format(Number(value));
    };

    return (
        <div className="bg-white/[0.02] border border-white/5 rounded-[32px] p-8 shadow-2xl">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-10 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Composição de Gastos por Categoria
            </h3>

            <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                {/* Lado Esquerdo: Gráfico Maior e Limpo */}
                <div className="w-full md:w-1/2 h-[300px] flex items-center justify-center relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={categoryData}
                                cx="50%"
                                cy="50%"
                                innerRadius={85}
                                outerRadius={110}
                                paddingAngle={10}
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
                                    backgroundColor: '#0f172a',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    color: '#fff'
                                }}
                                itemStyle={{ color: '#fff' }}
                                formatter={(value) => formatBRL(value)}
                            />
                        </PieChart>
                    </ResponsiveContainer>

                    {/* Texto Central do Donut */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Total</span>
                        <span className="text-xl font-medium text-white tracking-tighter">
                            {formatBRL(categoryData.reduce((acc, curr) => acc + curr.value, 0))}
                        </span>
                    </div>
                </div>

                {/* Lado Direito: Legenda de Alto Nível */}
                <div className="w-full md:w-1/2 space-y-4">
                    {categoryData.map((entry, index) => (
                        <div key={entry.name} className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                />
                                <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">
                                    {entry.name}
                                </span>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-white tabular-nums tracking-tight">
                                    {formatBRL(entry.value)}
                                </p>
                                <p className="text-[9px] font-bold text-slate-600 tabular-nums uppercase">
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