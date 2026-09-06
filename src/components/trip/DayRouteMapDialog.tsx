// src/components/trip/DayRouteMapDialog.tsx
import { useMemo } from 'react';
import { Navigation, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Activity } from '@/types';
import { getLocatedActivitiesSorted } from '@/lib/dayRoute';
import { buildGoogleMapsRouteUrl } from '@/lib/mapLinks';
import { DayRouteMap } from './DayRouteMap';

interface DayRouteMapDialogProps {
    open: boolean;
    onClose: () => void;
    activities: Activity[];
    dayLabel?: string;
}

// Painel próprio (não o Dialog do shadcn) — mesmo padrão de tela cheia no
// mobile do AiAssistantWidget.tsx (ver UI_UX.md seção 4.1): um mapa precisa
// de espaço de verdade pra ser usável, e é onde o app já concentra o uso
// real (mobile). Mounta o mapa só quando `open` — nunca fica competindo com
// o roteiro/atividades por trás (achado real corrigido: antes o mapa vinha
// sempre renderizado inline e um bug de medida do Leaflet fazia ele cobrir
// a tela inteira, tornando o roteiro inacessível). O wrapper `fixed` +
// `z-50` também estabelece um novo contexto de empilhamento — os
// z-index internos do Leaflet (até 1000, painéis/controles) ficam contidos
// aqui dentro, nunca competindo com o resto da página.
export function DayRouteMapDialog({ open, onClose, activities, dayLabel }: DayRouteMapDialogProps) {
    const routeUrl = useMemo(() => {
        const located = getLocatedActivitiesSorted(activities);
        return buildGoogleMapsRouteUrl(located.map((a) => a.coordinates));
    }, [activities]);

    if (!open) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
            <div className={cn(
                "fixed z-50 flex flex-col bg-background border border-border shadow-2xl overflow-hidden",
                "inset-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
                "sm:inset-8 sm:rounded-3xl sm:pt-0 sm:pb-0"
            )}>
                <div className="flex items-center justify-between gap-3 p-4 border-b border-border shrink-0">
                    <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-foreground">Mapa do dia</h3>
                        {dayLabel && <p className="text-xs text-muted-foreground capitalize truncate">{dayLabel}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {routeUrl && (
                            <a
                                href={routeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-sm hover:opacity-90 transition-opacity"
                            >
                                <Navigation className="w-3.5 h-3.5" /> Rota<span className="hidden sm:inline"> no Google Maps</span>
                            </a>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Fechar mapa"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="flex-1 min-h-0">
                    <DayRouteMap activities={activities} />
                </div>
            </div>
        </>
    );
}
