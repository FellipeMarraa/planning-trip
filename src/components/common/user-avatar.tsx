import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
    photoURL?: string | null;
    name?: string | null;
    className?: string;
}

// Mesmo padrão do CashZ (src/components/dashboard/user-menu.tsx): sem foto,
// usa o ui-avatars.com pra gerar uma imagem com as iniciais (primeiro +
// último nome) sobre um fundo colorido — não é lógica local, é um serviço
// externo gratuito (manda só o nome, nunca e-mail/uid). AvatarFallback do
// Radix continua como último recurso (se até a imagem do serviço falhar).
export function UserAvatar({ photoURL, name, className }: UserAvatarProps) {
    const displayName = name?.trim() || 'Usuário';
    const initial = displayName[0]?.toUpperCase() || '?';
    const avatarSrc = photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`;

    return (
        <Avatar className={cn("border border-border", className)}>
            <AvatarImage src={avatarSrc} alt="" referrerPolicy="no-referrer" />
            <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
    );
}
