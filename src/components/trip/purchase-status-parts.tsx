// src/components/trip/purchase-status-parts.tsx
// Peças visuais do status de compra, compartilhadas pela tabela de despesas e
// pelo painel por categoria — um lugar só pra manter o mesmo comportamento
// (e a mesma regra de link seguro) nos dois.
import { CheckCircle2, CircleDashed, ExternalLink, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseBookingRef } from "@/lib/bookingRef";

// Código/link da reserva. Link só quando é http(s) de verdade (parseBookingRef);
// o resto é texto, truncado pra não estourar a linha.
export function BookingRefLine({ value, className }: { value: string | undefined; className?: string }) {
    const ref = parseBookingRef(value);
    if (!ref) return null;

    return (
        <p className={cn("text-xs text-muted-foreground flex items-center gap-1 max-w-[220px]", className)}>
            <Ticket className="h-3 w-3 flex-shrink-0" aria-hidden />
            {ref.kind === 'url' ? (
                <a
                    href={ref.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline truncate"
                    aria-label={`Abrir reserva em ${ref.label}`}
                >
                    <span className="truncate">{ref.label}</span>
                    <ExternalLink className="h-3 w-3 flex-shrink-0" aria-hidden />
                </a>
            ) : (
                <span className="truncate select-all" title={ref.label}>{ref.label}</span>
            )}
        </p>
    );
}

// Check de status: 1 toque em pendente abre "Confirmar compra"; em comprado
// volta pra pendente (quem decide é o chamador). Quem só visualiza vê o mesmo
// ícone, sem ação. Estado nunca só por cor — formas diferentes (círculo cheio
// com check vs. tracejado) + texto "Comprado"/"Pendente" ao lado.
export function PurchaseCheck({ purchased, description, canEdit, onToggle }: { purchased: boolean; description: string; canEdit: boolean; onToggle: () => void }) {
    const Icon = purchased ? CheckCircle2 : CircleDashed;
    const iconClass = cn("h-5 w-5", purchased ? "text-chart-2" : "text-muted-foreground/70");

    if (!canEdit) {
        return (
            <span className="h-11 w-8 flex items-center justify-center" role="img" aria-label={purchased ? 'Comprado' : 'Pendente'}>
                <Icon className={iconClass} />
            </span>
        );
    }

    return (
        <button
            type="button"
            onClick={onToggle}
            aria-pressed={purchased}
            aria-label={purchased ? `Desmarcar ${description} como comprado` : `Marcar ${description} como comprado`}
            className="h-11 w-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
        >
            <Icon className={iconClass} />
        </button>
    );
}
