// src/pages/JoinTrip.tsx
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { joinTripByInvite } from '@/services/trips';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function JoinTrip() {
    const { tripId, role } = useParams();
    const { user } = useAuth();
    const { showError } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        const processJoin = async () => {
            if (!user || !tripId || !role) return;

            try {
                await joinTripByInvite(tripId, role, user.uid);
                navigate(`/trip/${tripId}`);
            } catch (error) {
                const code = (error as { code?: string })?.code || 'desconhecido';
                console.error("Erro ao entrar na viagem:", error);
                showError(`Não foi possível entrar na viagem (${code}). Peça um novo link de convite.`);
                navigate('/');
            }
        };

        processJoin();
    }, [user, tripId, role, navigate, showError]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Validando convite...</p>
            </div>
        </div>
    );
}
