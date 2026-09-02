import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/context/ToastContext';
import { createActivity } from '@/services/activities';
import { CalendarPlus, Check, ListChecks } from 'lucide-react';
import type { SuggestedActivity } from '../types';

// Nunca a IA escreve isto sozinha — cada item (ou o roteiro inteiro, no
// botão "Adicionar tudo") exige o clique do usuário aqui, que chama o
// service já existente (services/activities.ts), o mesmo usado pelo
// formulário manual de atividade.
export function SuggestedItineraryCard({ tripId, activities }: { tripId: string; activities: SuggestedActivity[] }) {
    const { showError } = useToast();
    const [addedIndexes, setAddedIndexes] = useState<Set<number>>(new Set());
    const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
    const [addingAll, setAddingAll] = useState(false);

    // Nunca espalhar `activity` no payload — é dado derivado da resposta da
    // IA (texto livre), então um valor de `tripId` embutido nele por
    // injeção de prompt poderia sobrescrever o tripId de confiança (vindo
    // da URL) e redirecionar a escrita pra outra viagem do usuário. Cada
    // campo é copiado explicitamente.
    function addOne(activity: SuggestedActivity) {
        return createActivity({
            tripId,
            dateId: activity.dateId,
            time: activity.time,
            location: activity.location,
            description: activity.description,
        });
    }

    async function handleAdd(activity: SuggestedActivity, index: number) {
        setLoadingIndex(index);
        try {
            await addOne(activity);
            setAddedIndexes((prev) => new Set(prev).add(index));
        } catch (error) {
            console.error('Erro ao adicionar sugestão ao roteiro:', error);
            showError('Não foi possível adicionar este item ao roteiro.');
        } finally {
            setLoadingIndex(null);
        }
    }

    // Viagem de muitos dias: clicar item a item é inviável. Adiciona tudo
    // que ainda não foi adicionado de uma vez (em paralelo — poucas dezenas
    // de itens no máximo, não precisa do padrão de writeBatch em lote usado
    // pra exclusão em massa).
    async function handleAddAll() {
        const pending = activities
            .map((activity, index) => ({ activity, index }))
            .filter(({ index }) => !addedIndexes.has(index));
        if (pending.length === 0) return;

        setAddingAll(true);
        const results = await Promise.allSettled(pending.map(({ activity }) => addOne(activity)));

        const succeededIndexes = pending
            .filter((_, i) => results[i].status === 'fulfilled')
            .map(({ index }) => index);
        if (succeededIndexes.length > 0) {
            setAddedIndexes((prev) => new Set([...prev, ...succeededIndexes]));
        }

        const failedCount = results.filter((r) => r.status === 'rejected').length;
        if (failedCount > 0) {
            results.forEach((r) => { if (r.status === 'rejected') console.error('Erro ao adicionar sugestão ao roteiro:', r.reason); });
            showError(failedCount === pending.length
                ? 'Não foi possível adicionar o roteiro.'
                : `${failedCount} item(ns) não foram adicionados. Tente de novo.`);
        }

        setAddingAll(false);
    }

    const pendingCount = activities.length - addedIndexes.size;

    return (
        <div className="space-y-2">
            {activities.length > 1 && (
                <Button
                    size="sm"
                    className="w-full"
                    disabled={pendingCount === 0 || addingAll}
                    onClick={handleAddAll}
                >
                    {pendingCount === 0 ? <Check className="h-4 w-4" /> : <ListChecks className="h-4 w-4" />}
                    {addingAll ? 'Adicionando roteiro...' : pendingCount === 0 ? 'Roteiro completo adicionado' : `Adicionar roteiro completo (${pendingCount})`}
                </Button>
            )}
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
                            disabled={added || loadingIndex === index || addingAll}
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
