import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { listenToThreads, archiveThread } from '../repositories/aiThreadsRepository';
import type { AiThread } from '../types';

export function useAIThreads() {
    const { user } = useAuth();
    const [threads, setThreads] = useState<AiThread[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const unsubscribe = listenToThreads(user.uid, (data) => {
            setThreads(data);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    return { threads, isLoading, archiveThread };
}
