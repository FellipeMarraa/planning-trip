import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { createExpense } from '@/services/expenses';
import { formatDateTimeBR } from '@/lib/dates';
import { Check, Receipt } from 'lucide-react';
import type { SuggestedExpense } from '../types';
import type { Trip } from '@/types';

const formatBRL = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

// Mesmo princípio de SuggestedItineraryCard/SuggestedTripCard: nunca
// espalhar o objeto vindo da IA no payload de escrita — cada campo copiado
// explicitamente. paidBy é sempre quem está conversando (nunca um uid que a
// IA poderia ter incluído), participants é todo mundo da viagem dividindo
// igual — mesmo default do formulário manual (AddExpenseDialog.tsx).
export function SuggestedExpenseCard({ trip, expense }: { trip: Trip; expense: SuggestedExpense }) {
    const { user } = useAuth();
    const { showError } = useToast();
    const [creating, setCreating] = useState(false);
    const [created, setCreated] = useState(false);

    async function handleCreate() {
        if (!user) return;
        setCreating(true);
        try {
            await createExpense({
                tripId: trip.id,
                description: expense.description,
                category: expense.category,
                amountOriginal: expense.amountBRL,
                currency: 'BRL',
                exchangeRateUsed: 1,
                baseRateAtTime: 1,
                spreadApplied: 0,
                amountBRL: expense.amountBRL,
                paidBy: user.uid,
                participants: trip.participants || [],
                date: expense.date,
            });
            setCreated(true);
        } catch (error) {
            console.error('Erro ao criar despesa sugerida pela IA:', error);
            showError('Não foi possível adicionar a despesa. Tente novamente.');
        } finally {
            setCreating(false);
        }
    }

    return (
        <Card className="p-3 space-y-2">
            <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary shrink-0" />
                <p className="text-sm font-medium text-foreground truncate">{expense.description}</p>
            </div>
            <p className="text-xs text-muted-foreground">
                {formatBRL(expense.amountBRL)} · {expense.category} · {formatDateTimeBR(expense.date)}
            </p>

            {created ? (
                <Button size="sm" variant="ghost" className="w-full" disabled>
                    <Check className="h-4 w-4" /> Adicionada
                </Button>
            ) : (
                <Button size="sm" className="w-full" disabled={creating} onClick={handleCreate}>
                    {creating ? 'Adicionando...' : 'Adicionar despesa'}
                </Button>
            )}
        </Card>
    );
}
