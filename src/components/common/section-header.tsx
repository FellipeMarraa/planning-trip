// src/components/common/section-header.tsx
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
    icon?: LucideIcon;
    children: React.ReactNode;
    pulse?: boolean;
    className?: string;
}

export function SectionHeader({ icon: Icon, children, pulse, className }: SectionHeaderProps) {
    return (
        <h3 className={cn("text-sm font-semibold text-foreground flex items-center gap-2", className)}>
            {pulse && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
            {Icon && <Icon className="w-4 h-4 text-primary" />}
            {children}
        </h3>
    );
}
