// src/pages/JoinTrip.tsx
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { joinTripByInvite } from '@/services/trips';
import { useAuth } from '@/context/AuthContext';

export default function JoinTrip() {
    const { tripId, role } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const processJoin = async () => {
            if (!user || !tripId || !role) return;

            try {
                await joinTripByInvite(tripId, role, user.uid);
                navigate(`/trip/${tripId}`);
            } catch (error) {
                console.error("Erro ao entrar na viagem:", error);
                navigate('/');
            }
        };

        processJoin();
    }, [user, tripId, role, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Validando convite...</p>
            </div>
        </div>
    );
}
