import { useEffect, useState } from 'react';
import { db } from '@/config/firebase';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { sendChatMessage } from '../services/aiChatService';

export interface SuggestedActivity {
    dateId: string;
    time: string;
    location: string;
    description: string;
}

export interface AIMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    suggestedActivities?: SuggestedActivity[] | null;
}

export function useAIChat(tripId?: string) {
    const [threadId, setThreadId] = useState<string | undefined>(undefined);
    const [messages, setMessages] = useState<AIMessage[]>([]);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!threadId) return;

        const q = query(
            collection(db, 'ai_messages'),
            where('threadId', '==', threadId),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setMessages(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as AIMessage[]);
        }, (err) => {
            console.error('Erro ao ler mensagens do assistente:', err);
        });

        return () => unsubscribe();
    }, [threadId]);

    async function send(message: string) {
        setSending(true);
        setError(null);
        try {
            const result = await sendChatMessage({ message, threadId, tripId });
            setThreadId(result.threadId);
        } catch (err) {
            console.error('Erro ao enviar mensagem ao assistente:', err);
            setError(err instanceof Error ? err.message : 'Falha ao enviar mensagem');
        } finally {
            setSending(false);
        }
    }

    return { messages, send, sending, error };
}
