import { auth } from '@/config/firebase';

interface SendChatMessageInput {
    message: string;
    threadId?: string;
    tripId?: string;
}

interface SendChatMessageResult {
    threadId: string;
}

export async function sendChatMessage(input: SendChatMessageInput): Promise<SendChatMessageResult> {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error('Usuário não autenticado');

    const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify(input),
    });

    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? 'Falha ao falar com o assistente de viagem');
    }

    return res.json();
}
