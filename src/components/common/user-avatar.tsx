import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { generateAvatarDataUri } from "@/lib/avatar";

interface UserAvatarProps {
    photoURL?: string | null;
    name?: string | null;
    className?: string;
}

// Sem foto customizada nem do Google, gera as iniciais localmente (ver
// src/lib/avatar.ts) — antes usava ui-avatars.com (serviço externo), que
// falhava/demorava de vez em quando (ícone do header às vezes não
// carregava). AvatarFallback do Radix continua como último recurso.
export function UserAvatar({ photoURL, name, className }: UserAvatarProps) {
    const displayName = name?.trim() || 'Usuário';
    const initial = displayName[0]?.toUpperCase() || '?';
    const avatarSrc = photoURL || generateAvatarDataUri(displayName);

    return (
        <Avatar className={cn("border border-border", className)}>
            <AvatarImage src={avatarSrc} alt="" referrerPolicy="no-referrer" />
            <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
    );
}
