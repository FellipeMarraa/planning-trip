// src/components/trip/LinkGhostModal.tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUserProfiles } from "@/hooks/useUserProfiles";
import { getMemberName, isGhostUid } from "@/lib/members";
import { cn } from "@/lib/utils";
import { Link2 } from "lucide-react";
import type { Trip } from '@/types';

interface LinkGhostModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    trip: Trip;
    ghostUid: string | null;
    onConfirm: (ghostUid: string, realUid: string) => void;
}

export function LinkGhostModal({ open, onOpenChange, trip, ghostUid, onConfirm }: LinkGhostModalProps) {
    const realParticipants = (trip.participants || []).filter((uid) => !isGhostUid(uid));
    const profiles = useUserProfiles(realParticipants);
    const [selectedUid, setSelectedUid] = useState<string | null>(null);

    const ghostName = ghostUid ? getMemberName(ghostUid, trip, profiles) : '';

    const handleConfirm = () => {
        if (!ghostUid || !selectedUid) return;
        onConfirm(ghostUid, selectedUid);
        setSelectedUid(null);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[400px] rounded-3xl p-0 overflow-hidden">
                <DialogHeader className="p-6 border-b border-border bg-muted/40">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Link2 className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-semibold text-foreground">Vincular convidado</DialogTitle>
                            <p className="text-sm text-muted-foreground mt-0.5">"{ghostName}" vai virar este usuário</p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-2 max-h-[280px] overflow-y-auto scrollbar-none">
                    {realParticipants.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">
                            Nenhum outro membro com login nesta viagem ainda.
                        </p>
                    ) : (
                        realParticipants.map((uid) => (
                            <button
                                key={uid}
                                type="button"
                                onClick={() => setSelectedUid(uid)}
                                className={cn(
                                    "w-full flex items-center gap-2.5 p-3 rounded-xl border text-left transition-colors",
                                    selectedUid === uid ? "bg-primary/10 border-primary" : "bg-muted/40 border-border hover:border-primary/30"
                                )}
                            >
                                <span className="text-sm text-foreground truncate">{getMemberName(uid, trip, profiles)}</span>
                            </button>
                        ))
                    )}
                </div>

                <div className="p-4 bg-muted/40 border-t border-border flex gap-3">
                    <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="flex-1">Cancelar</Button>
                    <Button
                        type="button"
                        disabled={!selectedUid}
                        onClick={handleConfirm}
                        className="flex-[2] h-11 rounded-xl shadow-sm"
                    >
                        Vincular
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
