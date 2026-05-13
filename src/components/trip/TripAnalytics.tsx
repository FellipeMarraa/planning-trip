// src/components/trip/TripAnalytics.tsx
import { useMemo } from 'react';
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid
} from 'recharts';
import type { Expense } from '@/types';

interface TripAnalyticsProps {
    expenses: Expense[];
}

const COLORS = ['#0f172a', '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function TripAnalytics({ expenses }: TripAnalyticsProps) {

    const categoryData = useMemo(() => {
        const data: Record<string, number> = {};
        expenses.forEach(exp => {
            data[exp.category] = (data[exp.category] || 0) + exp.amountBRL;
        });
        return Object.entries(data)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [expenses]);

    const currencyData = useMemo(() => {
        const data: Record<string, number> = {};
        expenses.forEach(exp => {
            data[exp.currency] = (data[exp.currency] || 0) + exp.amountBRL;
        });
        return Object.entries(data).map(([name, value]) => ({ name, value }));
    }, [expenses]);

    // Importante: Se a lista estiver vazia, ele não renderiza nada
    if (!expenses || expenses.length === 0) {
        return (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-md p-8 text-center text-slate-400 text-xs">
                Aguardando dados para gerar análise visual...
            </div>
        );
    }

    const formatBRL = (value: any) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(Number(value));
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            {/* Gráfico de Categorias */}
            <div className="bg-white p-6 rounded-md border border-slate-200 shadow-sm min-h-[350px]">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-6">
                    Distribuição por Categoria (BRL)
                </h3>
                <div style={{ width: '100%', height: 250 }}>
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie
                                data={categoryData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {categoryData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={formatBRL} />
                            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Gráfico de Moedas */}
            <div className="bg-white p-6 rounded-md border border-slate-200 shadow-sm min-h-[350px]">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-6">
                    Volume por Moeda (BRL)
                </h3>
                <div style={{ width: '100%', height: 250 }}>
                    <ResponsiveContainer>
                        <BarChart data={currencyData} layout="vertical" margin={{ left: -10, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                fontSize={10}
                                fontWeight="bold"
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip cursor={{ fill: '#f8fafc' }} formatter={formatBRL} />
                            <Bar dataKey="value" fill="#0f172a" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}