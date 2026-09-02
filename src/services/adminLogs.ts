// src/services/adminLogs.ts
import { db } from '@/config/firebase';
import { deleteDoc, doc } from 'firebase/firestore';

// Sem backend próprio — apaga direto do client (firestore.rules só permite
// pro admin global). Recebe os ids já carregados pela UI (limit(30) no
// listener) em vez de fazer uma query própria sem teto — nunca uma leitura
// ilimitada só pra apagar.
export async function clearClientLogs(logIds: string[]): Promise<void> {
    await Promise.all(logIds.map((id) => deleteDoc(doc(db, 'client_logs', id))));
}
