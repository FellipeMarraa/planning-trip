import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import fs from 'node:fs';
import {
    initializeTestEnvironment,
    assertSucceeds,
    assertFails,
    type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, deleteDoc, getDoc, addDoc, collection } from 'firebase/firestore';

/**
 * Testa firestore.rules direto contra o Firestore Emulator — ver docs/TESTS.md
 * seção 4. Precisa do emulador rodando (`npm run test:rules` sobe/derruba
 * sozinho via `firebase emulators:exec`; exige Java 21+ local). Cobertura
 * representativa das regras de maior risco, não exaustiva de toda coleção —
 * próxima regra nova segue o mesmo padrão "1 caso permite + 1 nega".
 */

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
        projectId: 'planning-trip-rules-test',
        firestore: {
            rules: fs.readFileSync('firestore.rules', 'utf8'),
            host: 'localhost',
            port: 8080,
        },
    });
});

afterAll(async () => {
    await testEnv.cleanup();
});

beforeEach(async () => {
    await testEnv.clearFirestore();
});

function asUser(uid: string) {
    return testEnv.authenticatedContext(uid, { email: `${uid}@example.com` }).firestore();
}

async function seed(fn: (db: import('firebase/firestore').Firestore) => Promise<void>) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
        await fn(context.firestore());
    });
}

function baseTrip(overrides: Record<string, unknown> = {}) {
    return {
        name: 'Itália 2027',
        startDate: '2027-06-01',
        endDate: '2027-06-15',
        ownerId: 'owner-1',
        participants: ['owner-1', 'editor-1'],
        roles: { 'owner-1': 'OWNER', 'editor-1': 'EDITOR' },
        baseCurrency: 'EUR',
        exchangeRates: { EUR: 6 },
        ...overrides,
    };
}

describe('firestore.rules — trips create (isCashzPremium)', () => {
    it('usuário com plano CashZ ativo cria a própria viagem', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'users', 'user-1'), { plan: 'premium' });
        });

        await assertSucceeds(
            setDoc(doc(asUser('user-1'), 'trips', 'trip-1'), {
                name: 'Viagem', startDate: '2027-01-01', endDate: '2027-01-10',
                ownerId: 'user-1', participants: ['user-1'], roles: { 'user-1': 'OWNER' },
                baseCurrency: 'BRL', exchangeRates: {},
            })
        );
    });

    it('usuário sem plano CashZ ativo não cria viagem', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'users', 'user-1'), { plan: 'free' });
        });

        await assertFails(
            setDoc(doc(asUser('user-1'), 'trips', 'trip-1'), {
                name: 'Viagem', startDate: '2027-01-01', endDate: '2027-01-10',
                ownerId: 'user-1', participants: ['user-1'], roles: { 'user-1': 'OWNER' },
                baseCurrency: 'BRL', exchangeRates: {},
            })
        );
    });

    it('plano premium expirado não cria viagem', async () => {
        const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        await seed(async (db) => {
            await setDoc(doc(db, 'users', 'user-1'), { plan: 'premium', planExpiresAt: past });
        });

        await assertFails(
            setDoc(doc(asUser('user-1'), 'trips', 'trip-1'), {
                name: 'Viagem', startDate: '2027-01-01', endDate: '2027-01-10',
                ownerId: 'user-1', participants: ['user-1'], roles: { 'user-1': 'OWNER' },
                baseCurrency: 'BRL', exchangeRates: {},
            })
        );
    });
});

describe('firestore.rules — trips read (isolamento por participante)', () => {
    it('participante lê a viagem', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'trips', 'trip-1'), baseTrip());
        });

        await assertSucceeds(getDoc(doc(asUser('editor-1'), 'trips', 'trip-1')));
    });

    it('não-participante não lê a viagem', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'trips', 'trip-1'), baseTrip());
        });

        await assertFails(getDoc(doc(asUser('stranger-1'), 'trips', 'trip-1')));
    });
});

describe('firestore.rules — trips update: edição normal', () => {
    it('editor edita o nome da viagem', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'trips', 'trip-1'), baseTrip());
        });

        await assertSucceeds(
            updateDoc(doc(asUser('editor-1'), 'trips', 'trip-1'), { name: 'Itália e França 2027' })
        );
    });

    it('viewer não edita a viagem', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'trips', 'trip-1'), baseTrip({
                participants: ['owner-1', 'viewer-1'],
                roles: { 'owner-1': 'OWNER', 'viewer-1': 'VIEWER' },
            }));
        });

        await assertFails(
            updateDoc(doc(asUser('viewer-1'), 'trips', 'trip-1'), { name: 'Hack' })
        );
    });
});

describe('firestore.rules — trips update: auto-join via convite', () => {
    it('usuário novo entra como EDITOR adicionando só a si mesmo', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'trips', 'trip-1'), baseTrip());
        });

        await assertSucceeds(
            updateDoc(doc(asUser('new-user'), 'trips', 'trip-1'), {
                participants: ['owner-1', 'editor-1', 'new-user'],
                roles: { 'owner-1': 'OWNER', 'editor-1': 'EDITOR', 'new-user': 'EDITOR' },
            })
        );
    });

    it('usuário novo não consegue se auto-promover a OWNER', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'trips', 'trip-1'), baseTrip());
        });

        await assertFails(
            updateDoc(doc(asUser('new-user'), 'trips', 'trip-1'), {
                participants: ['owner-1', 'editor-1', 'new-user'],
                roles: { 'owner-1': 'OWNER', 'editor-1': 'EDITOR', 'new-user': 'OWNER' },
            })
        );
    });

    it('usuário novo não consegue adicionar outra pessoa junto', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'trips', 'trip-1'), baseTrip());
        });

        await assertFails(
            updateDoc(doc(asUser('new-user'), 'trips', 'trip-1'), {
                participants: ['owner-1', 'editor-1', 'new-user', 'stowaway'],
                roles: { 'owner-1': 'OWNER', 'editor-1': 'EDITOR', 'new-user': 'EDITOR', 'stowaway': 'VIEWER' },
            })
        );
    });
});

describe('firestore.rules — trips update: sair como fantasma', () => {
    it('participante (não-dono) sai da viagem virando fantasma', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'trips', 'trip-1'), baseTrip());
        });

        await assertSucceeds(
            updateDoc(doc(asUser('editor-1'), 'trips', 'trip-1'), {
                participants: ['owner-1', 'ghost_abc'],
                roles: { 'owner-1': 'OWNER' },
                ghosts: { ghost_abc: { name: 'Editor Um' } },
            })
        );
    });

    it('dono não consegue sair da viagem por essa rota', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'trips', 'trip-1'), baseTrip());
        });

        await assertFails(
            updateDoc(doc(asUser('owner-1'), 'trips', 'trip-1'), {
                participants: ['editor-1', 'ghost_abc'],
                roles: { 'editor-1': 'EDITOR' },
                ghosts: { ghost_abc: { name: 'Dono' } },
            })
        );
    });
});

describe('firestore.rules — trips update: transferir dono', () => {
    it('dono atual transfere pra um participante existente', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'trips', 'trip-1'), baseTrip());
        });

        await assertSucceeds(
            updateDoc(doc(asUser('owner-1'), 'trips', 'trip-1'), {
                ownerId: 'editor-1',
                roles: { 'owner-1': 'EDITOR', 'editor-1': 'OWNER' },
            })
        );
    });

    it('quem não é dono não consegue transferir a posse', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'trips', 'trip-1'), baseTrip());
        });

        await assertFails(
            updateDoc(doc(asUser('editor-1'), 'trips', 'trip-1'), {
                ownerId: 'editor-1',
                roles: { 'owner-1': 'EDITOR', 'editor-1': 'OWNER' },
            })
        );
    });

    it('dono não consegue transferir pra alguém que não é participante', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'trips', 'trip-1'), baseTrip());
        });

        await assertFails(
            updateDoc(doc(asUser('owner-1'), 'trips', 'trip-1'), {
                ownerId: 'stranger-1',
                roles: { 'owner-1': 'EDITOR', 'stranger-1': 'OWNER' },
            })
        );
    });
});

describe('firestore.rules — trips delete', () => {
    it('editor exclui a viagem', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'trips', 'trip-1'), baseTrip());
        });

        await assertSucceeds(deleteDoc(doc(asUser('editor-1'), 'trips', 'trip-1')));
    });

    it('viewer não exclui a viagem', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'trips', 'trip-1'), baseTrip({
                participants: ['owner-1', 'viewer-1'],
                roles: { 'owner-1': 'OWNER', 'viewer-1': 'VIEWER' },
            }));
        });

        await assertFails(deleteDoc(doc(asUser('viewer-1'), 'trips', 'trip-1')));
    });
});

describe('firestore.rules — expenses (canEdit)', () => {
    it('editor cria despesa', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'trips', 'trip-1'), baseTrip());
        });

        await assertSucceeds(
            addDoc(collection(asUser('editor-1'), 'expenses'), {
                tripId: 'trip-1', description: 'Hotel', category: 'Hospedagem',
                amountOriginal: 100, currency: 'EUR', amountBRL: 600,
                paidBy: 'editor-1', participants: ['owner-1', 'editor-1'], date: '2027-06-02',
            })
        );
    });

    it('viewer não cria despesa', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'trips', 'trip-1'), baseTrip({
                participants: ['owner-1', 'viewer-1'],
                roles: { 'owner-1': 'OWNER', 'viewer-1': 'VIEWER' },
            }));
        });

        await assertFails(
            addDoc(collection(asUser('viewer-1'), 'expenses'), {
                tripId: 'trip-1', description: 'Hotel', category: 'Hospedagem',
                amountOriginal: 100, currency: 'EUR', amountBRL: 600,
                paidBy: 'viewer-1', participants: ['owner-1', 'viewer-1'], date: '2027-06-02',
            })
        );
    });

    it('não cria despesa com amountBRL zero ou negativo', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'trips', 'trip-1'), baseTrip());
        });

        await assertFails(
            addDoc(collection(asUser('editor-1'), 'expenses'), {
                tripId: 'trip-1', description: 'Hotel', category: 'Hospedagem',
                amountOriginal: 100, currency: 'EUR', amountBRL: 0,
                paidBy: 'editor-1', participants: ['owner-1', 'editor-1'], date: '2027-06-02',
            })
        );
    });

    it('não cria despesa sem nenhum participante', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'trips', 'trip-1'), baseTrip());
        });

        await assertFails(
            addDoc(collection(asUser('editor-1'), 'expenses'), {
                tripId: 'trip-1', description: 'Hotel', category: 'Hospedagem',
                amountOriginal: 100, currency: 'EUR', amountBRL: 600,
                paidBy: 'editor-1', participants: [], date: '2027-06-02',
            })
        );
    });

    it('não cria despesa com paidBy de alguém que não é participante da viagem', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'trips', 'trip-1'), baseTrip());
        });

        await assertFails(
            addDoc(collection(asUser('editor-1'), 'expenses'), {
                tripId: 'trip-1', description: 'Hotel', category: 'Hospedagem',
                amountOriginal: 100, currency: 'EUR', amountBRL: 600,
                paidBy: 'stranger-1', participants: ['owner-1', 'editor-1'], date: '2027-06-02',
            })
        );
    });

    it('não cria despesa sem data', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'trips', 'trip-1'), baseTrip());
        });

        await assertFails(
            addDoc(collection(asUser('editor-1'), 'expenses'), {
                tripId: 'trip-1', description: 'Hotel', category: 'Hospedagem',
                amountOriginal: 100, currency: 'EUR', amountBRL: 600,
                paidBy: 'editor-1', participants: ['owner-1', 'editor-1'], date: '',
            })
        );
    });
});

describe('firestore.rules — settlements create (canEdit gerencia qualquer par de participantes)', () => {
    it('quem recebe registra o próprio acerto', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'trips', 'trip-1'), baseTrip());
        });

        await assertSucceeds(
            addDoc(collection(asUser('editor-1'), 'settlements'), {
                tripId: 'trip-1', from: 'owner-1', to: 'editor-1', amount: 50,
            })
        );
    });

    it('editor registra acerto em que ele é quem pagou (from), não só quem recebeu', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'trips', 'trip-1'), baseTrip());
        });

        await assertSucceeds(
            addDoc(collection(asUser('editor-1'), 'settlements'), {
                tripId: 'trip-1', from: 'editor-1', to: 'owner-1', amount: 50,
            })
        );
    });

    it('editor registra acerto entre DUAS outras pessoas (nem from nem to é ele) — "marcar como pago" em nome de outro', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'trips', 'trip-1'), baseTrip({
                participants: ['owner-1', 'editor-1', 'viewer-1'],
                roles: { 'owner-1': 'OWNER', 'editor-1': 'EDITOR', 'viewer-1': 'VIEWER' },
            }));
        });

        await assertSucceeds(
            addDoc(collection(asUser('editor-1'), 'settlements'), {
                tripId: 'trip-1', from: 'viewer-1', to: 'owner-1', amount: 30,
            })
        );
    });

    it('viewer não registra nenhum acerto, nem o próprio', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'trips', 'trip-1'), baseTrip({
                participants: ['owner-1', 'viewer-1'],
                roles: { 'owner-1': 'OWNER', 'viewer-1': 'VIEWER' },
            }));
        });

        await assertFails(
            addDoc(collection(asUser('viewer-1'), 'settlements'), {
                tripId: 'trip-1', from: 'viewer-1', to: 'owner-1', amount: 30,
            })
        );
    });

    it('não cria acerto com valor zero ou negativo', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'trips', 'trip-1'), baseTrip());
        });

        await assertFails(
            addDoc(collection(asUser('editor-1'), 'settlements'), {
                tripId: 'trip-1', from: 'owner-1', to: 'editor-1', amount: 0,
            })
        );
    });

    it('não cria acerto de alguém pagando pra si mesmo (from == to)', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'trips', 'trip-1'), baseTrip());
        });

        await assertFails(
            addDoc(collection(asUser('editor-1'), 'settlements'), {
                tripId: 'trip-1', from: 'editor-1', to: 'editor-1', amount: 50,
            })
        );
    });

    it('não cria acerto de alguém (from) que não é participante da viagem', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'trips', 'trip-1'), baseTrip());
        });

        await assertFails(
            addDoc(collection(asUser('editor-1'), 'settlements'), {
                tripId: 'trip-1', from: 'stranger-1', to: 'editor-1', amount: 50,
            })
        );
    });

    it('não cria acerto pra alguém (to) que não é participante da viagem', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'trips', 'trip-1'), baseTrip());
        });

        await assertFails(
            addDoc(collection(asUser('editor-1'), 'settlements'), {
                tripId: 'trip-1', from: 'owner-1', to: 'stranger-1', amount: 50,
            })
        );
    });
});

describe('firestore.rules — users/{uid} whitelist de campos (trust boundary do plano CashZ)', () => {
    it('próprio usuário atualiza displayName/photoBase64 (campos permitidos)', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'users', 'user-1'), {
                uid: 'user-1', email: 'user-1@example.com', displayName: 'Nome', photoURL: '',
            });
        });

        await assertSucceeds(
            updateDoc(doc(asUser('user-1'), 'users', 'user-1'), {
                displayName: 'Nome Novo', photoBase64: 'data:image/jpeg;base64,xyz',
            })
        );
    });

    it('client não consegue escrever o próprio campo `plan` (só o Admin SDK do CashZ pode)', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'users', 'user-1'), {
                uid: 'user-1', email: 'user-1@example.com', displayName: 'Nome', photoURL: '', plan: 'free',
            });
        });

        // Achado de segurança da sessão: sem essa whitelist, o client poderia se
        // auto-promover a premium direto no Firestore, contornando o CashZ.
        await assertFails(
            updateDoc(doc(asUser('user-1'), 'users', 'user-1'), { plan: 'premium' })
        );
    });

    it('usuário não edita o perfil de outra pessoa', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'users', 'user-2'), {
                uid: 'user-2', email: 'user-2@example.com', displayName: 'Outro', photoURL: '',
            });
        });

        await assertFails(
            updateDoc(doc(asUser('user-1'), 'users', 'user-2'), { displayName: 'Hackeado' })
        );
    });
});

describe('firestore.rules — ai_threads/ai_messages/ai_usage: só o backend escreve', () => {
    it('client não cria ai_threads direto', async () => {
        await assertFails(
            setDoc(doc(asUser('user-1'), 'ai_threads', 'thread-1'), { userId: 'user-1', title: 'x' })
        );
    });

    it('dono da conversa consegue arquivar (único campo liberado)', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'ai_threads', 'thread-1'), { userId: 'user-1', title: 'x', archived: false });
        });

        await assertSucceeds(
            updateDoc(doc(asUser('user-1'), 'ai_threads', 'thread-1'), { archived: true })
        );
    });

    it('dono da conversa não consegue editar outro campo além de archived', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'ai_threads', 'thread-1'), { userId: 'user-1', title: 'x', archived: false });
        });

        await assertFails(
            updateDoc(doc(asUser('user-1'), 'ai_threads', 'thread-1'), { title: 'Hackeado' })
        );
    });

    it('client não escreve ai_messages', async () => {
        await assertFails(
            setDoc(doc(asUser('user-1'), 'ai_messages', 'msg-1'), { userId: 'user-1', text: 'x' })
        );
    });

    it('client não lê nem escreve ai_usage', async () => {
        await assertFails(getDoc(doc(asUser('user-1'), 'ai_usage', 'global')));
        await assertFails(setDoc(doc(asUser('user-1'), 'ai_usage', 'global'), { cost: 0 }));
    });
});

describe('firestore.rules — invites (create por canEdit, sem update/delete)', () => {
    it('editor cria convite pra própria viagem', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'trips', 'trip-1'), baseTrip());
        });

        await assertSucceeds(
            setDoc(doc(asUser('editor-1'), 'invites', 'invite-1'), { tripId: 'trip-1', role: 'EDITOR' })
        );
    });

    it('viewer não cria convite', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'trips', 'trip-1'), baseTrip({
                participants: ['owner-1', 'viewer-1'],
                roles: { 'owner-1': 'OWNER', 'viewer-1': 'VIEWER' },
            }));
        });

        await assertFails(
            setDoc(doc(asUser('viewer-1'), 'invites', 'invite-1'), { tripId: 'trip-1', role: 'EDITOR' })
        );
    });

    it('convite não pode ser editado nem excluído por ninguém', async () => {
        await seed(async (db) => {
            await setDoc(doc(db, 'invites', 'invite-1'), { tripId: 'trip-1', role: 'EDITOR' });
        });

        await assertFails(updateDoc(doc(asUser('editor-1'), 'invites', 'invite-1'), { role: 'VIEWER' }));
        await assertFails(deleteDoc(doc(asUser('editor-1'), 'invites', 'invite-1')));
    });
});
