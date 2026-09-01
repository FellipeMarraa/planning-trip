import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { createTrip } from '@/services/trips';
import { formatDateBR } from '@/lib/dates';
import { Check, Plane } from 'lucide-react';
import type { SuggestedTrip } from '../types';

// Mesmo princípio do SuggestedItineraryCard: nunca espalhar o objeto vindo da
// IA no payload de escrita. `ownerId` é sempre o uid de quem está logado,
// nunca um campo que a IA poderia ter incluído.
export function SuggestedTripCard({ trip }: { trip: SuggestedTrip }) {
    const { user } = useAuth();
    const { showError } = useToast();
    const navigate = useNavigate();
    const [creating, setCreating] = useState(false);
    const [createdTripId, setCreatedTripId] = useState<string | null>(null);

    async function handleCreate() {
        if (!user) return;
        setCreating(true);
        try {
            const tripId = await createTrip({
                name: trip.name,
                startDate: trip.startDate,
                endDate: trip.endDate,
                ownerId: user.uid,
                baseCurrency: trip.baseCurrency,
            });
            setCreatedTripId(tripId);
        } catch (error) {
            console.error('Erro ao criar viagem sugerida pela IA:', error);
            showError('Não foi possível criar a viagem. Tente novamente.');
        } finally {
            setCreating(false);
        }
    }

    return (
        <Card className="p-3 space-y-2">
            <div className="flex items-center gap-2">
                <Plane className="h-4 w-4 text-primary -rotate-45 shrink-0" />
                <p className="text-sm font-medium text-foreground truncate">{trip.name}</p>
            </div>
            <p className="text-xs text-muted-foreground">
                {formatDateBR(trip.startDate)} — {formatDateBR(trip.endDate)} · {trip.baseCurrency}
            </p>

            {createdTripId ? (
                <Button size="sm" variant="ghost" className="w-full" onClick={() => navigate(`/trip/${createdTripId}`)}>
                    <Check className="h-4 w-4" /> Criada — ver viagem
                </Button>
            ) : (
                <Button size="sm" className="w-full" disabled={creating} onClick={handleCreate}>
                    {creating ? 'Criando...' : 'Criar viagem'}
                </Button>
            )}
        </Card>
    );
}
