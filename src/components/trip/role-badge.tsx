// src/components/trip/role-badge.tsx
import { Crown, Pencil, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/types";

const ROLE_CONFIG: Record<UserRole, { label: string; icon: typeof Crown; variant: "default" | "secondary" | "outline" }> = {
    OWNER: { label: "Dono", icon: Crown, variant: "default" },
    EDITOR: { label: "Editor", icon: Pencil, variant: "secondary" },
    VIEWER: { label: "Visualizador", icon: Eye, variant: "outline" },
};

export function RoleBadge({ role }: { role: UserRole }) {
    const { label, icon: Icon, variant } = ROLE_CONFIG[role];
    return (
        <Badge variant={variant} className="gap-1 font-medium">
            <Icon className="w-3 h-3" /> {label}
        </Badge>
    );
}
