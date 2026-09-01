import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { listenToMessages } from '../repositories/aiMessagesRepository';
import { sendChatMessage } from '../services/aiChatService';
import type { AiMessage } from '../types';

export function useAIChat(threadId: string | null, onThreadCreated: (newThreadId: string) => void, tripId?: string) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<AiMessage[]>([]);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!threadId || !user) return;
        return listenToMessages(threadId, user.uid, setMessages);
    }, [threadId, user]);

    async function send(message: string) {
        setSending(true);
        setError(null);
        try {
            const result = await sendChatMessage({ message, threadId: threadId ?? undefined, tripId });
            if (!threadId) onThreadCreated(result.threadId);
        } catch (err) {
            console.error('Erro ao enviar mensagem ao assistente:', err);
            setError(err instanceof Error ? err.message : 'Falha ao enviar mensagem');
        } finally {
            setSending(false);
        }
    }

    return { messages, send, sending, error };
}
