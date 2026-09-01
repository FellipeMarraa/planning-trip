import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { AiMessage } from '../types';

// where(userId) + where(threadId): a regra do Firestore checa userId, e uma
// QUERY (list) só passa se algum where já filtrar exatamente o campo que a
// regra usa — sem isso, "Missing or insufficient permissions" na lista
// inteira, mesmo que cada doc individualmente pertencesse ao usuário.
export function listenToMessages(threadId: string, uid: string, callback: (messages: AiMessage[]) => void): () => void {
    const q = query(
        collection(db, 'ai_messages'),
        where('userId', '==', uid),
        where('threadId', '==', threadId),
        orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as AiMessage[]);
    }, (error) => {
        console.error('Erro ao ler mensagens do assistente:', error);
    });
}
