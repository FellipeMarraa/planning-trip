// src/hooks/useWalletShares.ts
import { useEffect, useState } from 'react';
import { db } from '@/config/firebase';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import type { WalletShareDeclaration } from '@/types';

// Firestore não faz OR entre campos numa query só — dois listeners
// separados (o que eu declarei / o que declararam pra mim), combinados
// aqui. Mútuo (pool ativo) é calculado à parte, ver lib/walletShares.ts.
export function useWalletShares() {
    const { user } = useAuth();
    const [declaredByMe, setDeclaredByMe] = useState<WalletShareDeclaration[]>([]);
    const [declaredToMe, setDeclaredToMe] = useState<WalletShareDeclaration[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        let byMeLoaded = false;
        let toMeLoaded = false;
        const checkLoaded = () => { if (byMeLoaded && toMeLoaded) setLoading(false); };

        const byMeQuery = query(collection(db, 'wallet_shares'), where('fromUid', '==', user.uid), limit(50));
        const unsubByMe = onSnapshot(byMeQuery, (snapshot) => {
            setDeclaredByMe(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as WalletShareDeclaration[]);
            byMeLoaded = true;
            checkLoaded();
        }, (err) => {
            console.error('Erro ao carregar compartilhamentos declarados:', err);
            byMeLoaded = true;
            checkLoaded();
        });

        const toMeQuery = query(collection(db, 'wallet_shares'), where('toUid', '==', user.uid), limit(50));
        const unsubToMe = onSnapshot(toMeQuery, (snapshot) => {
            setDeclaredToMe(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as WalletShareDeclaration[]);
            toMeLoaded = true;
            checkLoaded();
        }, (err) => {
            console.error('Erro ao carregar compartilhamentos recebidos:', err);
            toMeLoaded = true;
            checkLoaded();
        });

        return () => {
            unsubByMe();
            unsubToMe();
        };
    }, [user]);

    return { declaredByMe, declaredToMe, loading };
}
