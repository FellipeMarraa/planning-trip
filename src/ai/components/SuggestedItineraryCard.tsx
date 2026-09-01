import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/context/ToastContext';
import { createActivity } from '@/services/activities';
import { CalendarPlus, Check } from 'lucide-react';
import type { SuggestedActivity } from '../types';

// Nunca a IA escreve isto sozinha — cada item exige o clique do usuário
// aqui, que chama o service já existente (services/activities.ts), o mesmo
// usado pelo formulário manual de atividade.
export function SuggestedItineraryCard({ tripId, activities }: { tripId: string; activities: SuggestedActivity[] }) {
    const { showError } = useToast();
    const [addedIndexes, setAddedIndexes] = useState<Set<number>>(new Set());
    const [loadingIndex, setLoadingIndex] = useState<number | null>(null);

    async function handleAdd(activity: SuggestedActivity, index: number) {
        setLoadingIndex(index);
        try {
            // Nunca espalhar `activity` no payload — é dado derivado da
            // resposta da IA (texto livre), então um valor de `tripId`
            // embutido nele por injeção de prompt poderia sobrescrever o
            // tripId de confiança (vindo da URL) e redirecionar a escrita
            // pra outra viagem do usuário. Cada campo é copiado explicitamente.
            await createActivity({
                tripId,
                dateId: activity.dateId,
                time: activity.time,
                location: activity.location,
                description: activity.description,
            });
            setAddedIndexes((prev) => new Set(prev).add(index));
        } catch (error) {
            console.error('Erro ao adicionar sugestão ao roteiro:', error);
            showError('Não foi possível adicionar este item ao roteiro.');
        } finally {
            setLoadingIndex(null);
        }
    }

    return (
        <div className="space-y-2">
            {activities.map((activity, index) => {
                const added = addedIndexes.has(index);
                return (
                    <Card key={index} className="p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{activity.location}</p>
                            <p className="text-xs text-muted-foreground">{activity.dateId} · {activity.time}</p>
                            <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                        </div>
                        <Button
                            size="sm"
                            variant={added ? 'ghost' : 'outline'}
                            disabled={added || loadingIndex === index}
                            onClick={() => handleAdd(activity, index)}
                        >
                            {added ? <Check className="h-4 w-4" /> : <CalendarPlus className="h-4 w-4" />}
                            {added ? 'Adicionado' : 'Adicionar'}
                        </Button>
                    </Card>
                );
            })}
        </div>
    );
}
