// src/pages/JoinTrip.tsx
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '@/config/firebase';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';

export default function JoinTrip() {
    const { tripId, role } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const processJoin = async () => {
            if (!user || !tripId || !role) return;

            try {
                const tripRef = doc(db, 'trips', tripId);
                const tripSnap = await getDoc(tripRef);

                if (tripSnap.exists()) {
                    // Adiciona o UID aos participantes e define o cargo no objeto roles
                    await updateDoc(tripRef, {
                        participants: arrayUnion(user.uid),
                        [`roles.${user.uid}`]: role.toUpperCase() // 'ADM_TRIP' ou 'MEMBER'
                    });
                }
                navigate(`/trip/${tripId}`);
            } catch (error) {
                console.error("Erro ao entrar na viagem:", error);
                navigate('/');
            }
        };

        processJoin();
    }, [user, tripId, role, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Validando Convite...</p>
            </div>
        </div>
    );
}