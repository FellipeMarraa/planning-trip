// src/components/common/empty-state.tsx
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
    icon: LucideIcon;
    message: string;
    dashed?: boolean;
    className?: string;
}

export function EmptyState({ icon: Icon, message, dashed = true, className }: EmptyStateProps) {
    return (
        <div className={cn(
            "py-14 rounded-2xl flex flex-col items-center justify-center text-center gap-3",
            dashed ? "border-2 border-dashed border-border bg-muted/30" : "",
            className
        )}>
            <Icon className="w-7 h-7 text-muted-foreground/50 stroke-[1.5px]" />
            <p className="text-sm text-muted-foreground">{message}</p>
        </div>
    );
}
