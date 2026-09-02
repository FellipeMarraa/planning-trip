// src/lib/reportClientError.ts
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';

// Sem backend próprio (ver docs/ARCHITECTURE.md/ROADMAP.md — fora de escopo),
// então diferente do CashZ (que passa por /api/log-error), grava direto no
// Firestore. `firestore.rules` só permite create autoatribuído — nunca em
// nome de outro uid — e só o admin global lê/apaga depois.
export async function reportClientError(message: string, stack?: string): Promise<void> {
    try {
        if (import.meta.env.DEV) {
            console.warn('Log de erro ignorado no modo dev:', message);
            return;
        }

        const user = auth.currentUser;
        if (!user) return;

        await addDoc(collection(db, 'client_logs'), {
            userId: user.uid,
            userEmail: user.email || null,
            error: message,
            stack: stack || 'N/A',
            url: window.location.href,
            userAgent: navigator.userAgent,
            createdAt: serverTimestamp(),
        });
    } catch (e) {
        console.error('Falha ao reportar erro:', e);
    }
}
