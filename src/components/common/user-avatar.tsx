import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
    photoURL?: string | null;
    name?: string | null;
    className?: string;
}

// Mesmo padrão do CashZ: sem foto (ou foto que falha ao carregar — o
// AvatarFallback do Radix cobre os dois casos sozinho), mostra a primeira
// letra do nome.
export function UserAvatar({ photoURL, name, className }: UserAvatarProps) {
    const initial = name?.trim()?.[0]?.toUpperCase() || '?';

    return (
        <Avatar className={cn("border border-border", className)}>
            {photoURL && <AvatarImage src={photoURL} alt="" referrerPolicy="no-referrer" />}
            <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
    );
}
