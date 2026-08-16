// src/components/trip/TripMembers.tsx
import { useState } from 'react';
import { SectionHeader } from "@/components/common/section-header";
import { RoleBadge } from "@/components/trip/role-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMemberName, isGhostUid } from "@/lib/members";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronLeft, ChevronRight, Eye, Link2, MoreHorizontal, Pencil, Plus, User as UserIcon, Users as UsersIcon, UserX, X } from "lucide-react";
import type { Trip, UserProfile, UserRole } from '@/types';

interface TripMembersProps {
    trip: Trip;
    profiles: Record<string, UserProfile>;
    canEdit: boolean;
    onChangeRole: (uid: string, role: Exclude<UserRole, 'OWNER'>) => void;
    onRemoveMember: (uid: string) => void;
    onAddGhost: (name: string) => void;
    onLinkGhost: (ghostUid: string) => void;
    onRenameGhost: (ghostUid: string, name: string) => void;
}

const MEMBERS_PER_PAGE = 4;

export function TripMembers({ trip, profiles, canEdit, onChangeRole, onRemoveMember, onAddGhost, onLinkGhost, onRenameGhost }: TripMembersProps) {
    const participants = trip.participants || [];
    const [ghostName, setGhostName] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [editingGhostUid, setEditingGhostUid] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    const totalPages = Math.max(1, Math.ceil(participants.length / MEMBERS_PER_PAGE));
    const page = Math.min(currentPage, totalPages);
    const paginatedParticipants = participants.slice((page - 1) * MEMBERS_PER_PAGE, page * MEMBERS_PER_PAGE);

    const handleAddGhost = (e: React.FormEvent) => {
        e.preventDefault();
        if (!ghostName.trim()) return;
        onAddGhost(ghostName.trim());
        setGhostName('');
    };

    const startEditingGhost = (uid: string, currentName: string) => {
        setEditingGhostUid(uid);
        setEditingName(currentName);
    };

    const handleSaveGhostName = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingGhostUid || !editingName.trim()) return;
        onRenameGhost(editingGhostUid, editingName.trim());
        setEditingGhostUid(null);
    };

    return (
        <div className="bg-card border border-border rounded-2xl p-6">
            <SectionHeader icon={UsersIcon} className="mb-4">Membros da viagem</SectionHeader>
            <div className="space-y-2">
                {paginatedParticipants.map((uid) => {
                    const isGhost = isGhostUid(uid);
                    const memberRole = trip.roles?.[uid] ?? (trip.ownerId === uid ? 'OWNER' : 'VIEWER');
                    const isMemberOwner = memberRole === 'OWNER';
                    const name = getMemberName(uid, trip, profiles);
                    const photoURL = !isGhost ? profiles[uid]?.photoURL : undefined;

                    const isEditingName = editingGhostUid === uid;

                    return (
                        <div key={uid} className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-xl bg-muted/40">
                            {isEditingName ? (
                                <form onSubmit={handleSaveGhostName} className="flex items-center gap-2 min-w-0 flex-1">
                                    <Input
                                        autoFocus
                                        className="h-8"
                                        value={editingName}
                                        onChange={(e) => setEditingName(e.target.value)}
                                    />
                                    <button type="submit" className="p-1 text-primary hover:text-primary/80 flex-shrink-0" aria-label="Salvar nome">
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button type="button" onClick={() => setEditingGhostUid(null)} className="p-1 text-muted-foreground hover:text-foreground flex-shrink-0" aria-label="Cancelar">
                                        <X className="w-4 h-4" />
                                    </button>
                                </form>
                            ) : (
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-7 h-7 rounded-full border border-border bg-muted overflow-hidden flex-shrink-0">
                                        {photoURL ? (
                                            <img src={photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-sm text-foreground truncate">{name}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {isGhost ? (
                                    <Badge variant="outline" className="font-medium">Convidado</Badge>
                                ) : (
                                    <RoleBadge role={memberRole} />
                                )}
                                {canEdit && !isEditingName && (isGhost || !isMemberOwner) && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button aria-label="Mais opções do membro" className="p-1 text-muted-foreground hover:text-foreground transition-colors outline-none">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {isGhost ? (
                                                <>
                                                    <DropdownMenuItem onClick={() => startEditingGhost(uid, name)}>
                                                        <Pencil className="mr-2 h-3.5 w-3.5" /> Editar nome
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => onLinkGhost(uid)}>
                                                        <Link2 className="mr-2 h-3.5 w-3.5" /> Vincular a um usuário
                                                    </DropdownMenuItem>
                                                </>
                                            ) : (
                                                <>
                                                    {memberRole !== 'EDITOR' && (
                                                        <DropdownMenuItem onClick={() => onChangeRole(uid, 'EDITOR')}>
                                                            <Pencil className="mr-2 h-3.5 w-3.5" /> Tornar editor
                                                        </DropdownMenuItem>
                                                    )}
                                                    {memberRole !== 'VIEWER' && (
                                                        <DropdownMenuItem onClick={() => onChangeRole(uid, 'VIEWER')}>
                                                            <Eye className="mr-2 h-3.5 w-3.5" /> Tornar visualizador
                                                        </DropdownMenuItem>
                                                    )}
                                                </>
                                            )}
                                            <DropdownMenuItem variant="destructive" onClick={() => onRemoveMember(uid)}>
                                                <UserX className="mr-2 h-3.5 w-3.5" /> Remover
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between gap-4 mt-4 pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                        Página <span className="text-foreground font-medium">{page}</span> de {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setCurrentPage(page - 1)} className="h-8 w-8 p-0 rounded-lg">
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setCurrentPage(page + 1)} className="h-8 w-8 p-0 rounded-lg">
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {canEdit && (
                <form onSubmit={handleAddGhost} className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                    <Input
                        placeholder="Nome do convidado (sem login)"
                        className="h-9"
                        value={ghostName}
                        onChange={(e) => setGhostName(e.target.value)}
                    />
                    <Button type="submit" variant="outline" size="sm" className="h-9 px-3 flex-shrink-0">
                        <Plus className="w-3.5 h-3.5" />
                    </Button>
                </form>
            )}
        </div>
    );
}
