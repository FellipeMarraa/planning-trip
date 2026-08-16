// src/components/common/stat-card.tsx
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
    label: string;
    value: React.ReactNode;
    hint?: string;
    icon?: LucideIcon;
    accent?: "primary" | "none";
    pulse?: boolean;
    valueClassName?: string;
    className?: string;
}

export function StatCard({ label, value, hint, icon: Icon, accent = "none", pulse, valueClassName, className }: StatCardProps) {
    return (
        <Card className={cn(
            "p-5 rounded-2xl border-border",
            accent === "primary" && "border-l-4 border-l-primary",
            className
        )}>
            <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
                {pulse && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                {Icon && <Icon className="w-4 h-4 text-muted-foreground/70" />}
            </div>
            <span className={cn("text-2xl font-semibold tabular-nums text-foreground leading-none", valueClassName)}>
                {value}
            </span>
            {hint && <p className="text-xs text-muted-foreground mt-2">{hint}</p>}
        </Card>
    );
}
