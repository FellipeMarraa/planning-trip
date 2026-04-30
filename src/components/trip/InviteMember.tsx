import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus } from "lucide-react";

export function InviteMember() {
    return (
        <div className="flex items-center gap-2 p-4 bg-white rounded-lg border shadow-sm">
            <div className="flex-1">
                <h4 className="text-sm font-semibold">Viajar com alguém</h4>
                <p className="text-xs text-muted-foreground">Adicione o e-mail do seu acompanhante</p>
            </div>
            <div className="flex gap-2">
                <Input placeholder="email@exemplo.com" className="w-64" />
                <Button size="sm">
                    <UserPlus className="w-4 h-4 mr-2" /> Convidar
                </Button>
            </div>
        </div>
    );
}