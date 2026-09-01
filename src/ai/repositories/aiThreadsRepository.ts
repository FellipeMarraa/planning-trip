import { collection, doc, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { AiThread } from '../types';

export function listenToThreads(uid: string, callback: (threads: AiThread[]) => void): () => void {
    const q = query(
        collection(db, 'ai_threads'),
        where('userId', '==', uid),
        where('archived', '==', false),
        orderBy('updatedAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as AiThread[]);
    }, (error) => {
        console.error('Erro ao ler conversas do assistente:', error);
    });
}

// Escrita direta permitida por firestore.rules só pro campo `archived` do
// próprio dono — o resto da thread (título, tripId, mensagens) continua
// só-servidor. "Arquivar" é só ocultar da lista, não apaga o histórico.
export async function archiveThread(threadId: string): Promise<void> {
    await updateDoc(doc(db, 'ai_threads', threadId), { archived: true });
}
