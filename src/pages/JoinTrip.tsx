// src/pages/JoinTrip.tsx
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInvite } from '@/services/invites';
import { joinTripByInvite } from '@/services/trips';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function JoinTrip() {
    const { inviteId } = useParams();
    const { user } = useAuth();
    const { showError } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        const processJoin = async () => {
            if (!user || !inviteId) return;

            try {
                const invite = await getInvite(inviteId);
                if (!invite) {
                    showError("Este link de convite não é válido ou já foi removido.");
                    navigate('/');
                    return;
                }

                await joinTripByInvite(invite.tripId, invite.role, user.uid);
                navigate(`/trip/${invite.tripId}`);
            } catch (error) {
                const code = (error as { code?: string })?.code || 'desconhecido';
                console.error("Erro ao entrar na viagem:", error);
                showError(`Não foi possível entrar na viagem (${code}). Peça um novo link de convite.`);
                navigate('/');
            }
        };

        processJoin();
    }, [user, inviteId, navigate, showError]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Validando convite...</p>
            </div>
        </div>
    );
}
