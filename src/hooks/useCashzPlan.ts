import { useEffect, useState } from 'react';
import { db } from '../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

// Espelha, no client, o mesmo cálculo da regra isCashzPremium() do
// firestore.rules — nunca confia só no campo `plan` cacheado, sempre
// recalcula a expiração contra "agora". Serve só pra UI (habilitar/desabilitar
// botão); quem decide de verdade é a regra do Firestore no momento da escrita.
function isPlanActive(plan: string | undefined, planExpiresAt: string | null | undefined): boolean {
    if (!plan || !['premium', 'annual'].includes(plan)) return false;
    if (!planExpiresAt) return true;
    return new Date(planExpiresAt) > new Date();
}

export const useCashzPlan = () => {
    const { user } = useAuth();
    const [plan, setPlan] = useState<string | undefined>(undefined);
    const [planExpiresAt, setPlanExpiresAt] = useState<string | null | undefined>(undefined);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
            const data = snapshot.data();
            setPlan(data?.plan);
            setPlanExpiresAt(data?.planExpiresAt ?? null);
            setLoading(false);
        }, (error) => {
            console.error("Erro ao buscar status de plano:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    return { isPremium: isPlanActive(plan, planExpiresAt), loading };
};
