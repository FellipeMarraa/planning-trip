import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * linkGhostToUser/leaveTripAsGhost fazem I/O real no Firestore (getDoc/
 * getDocs/writeBatch/updateDoc) — sem emulador (Java 21+ não disponível
 * nesta máquina, ver docs/TESTS.md), testa mockando o SDK no boundary:
 * simula os snapshots que o Firestore devolveria e verifica exatamente
 * quais writes (`batch.update`/`updateDoc`) a função monta a partir deles.
 * Foi exatamente a falta desse teste que deixou `linkGhostToUser` migrar só
 * `expenses` (não `settlements`) sem ninguém notar — ver ARCHITECTURE.md
 * seção 5 e o commit que corrigiu isso.
 */

// vi.mock é hoisted pro topo do arquivo — as referências usadas dentro da
// factory precisam vir de vi.hoisted(), senão dá ReferenceError (TDZ).
const { mockBatchUpdate, mockBatchCommit, mockUpdateDoc, mockGetDoc, mockGetDocs } = vi.hoisted(() => ({
    mockBatchUpdate: vi.fn(),
    mockBatchCommit: vi.fn().mockResolvedValue(undefined),
    mockUpdateDoc: vi.fn().mockResolvedValue(undefined),
    mockGetDoc: vi.fn(),
    mockGetDocs: vi.fn(),
}));

vi.mock('@/config/firebase', () => ({ db: {} }));

vi.mock('firebase/firestore', () => ({
    doc: vi.fn((_db, collectionName: string, id: string) => ({ __ref: true, collectionName, id })),
    collection: vi.fn((_db, name: string) => ({ __collection: true, name })),
    query: vi.fn((...args: unknown[]) => args),
    where: vi.fn((field: string, op: string, value: unknown) => ({ field, op, value })),
    getDoc: mockGetDoc,
    getDocs: mockGetDocs,
    writeBatch: vi.fn(() => ({ update: mockBatchUpdate, delete: vi.fn(), commit: mockBatchCommit })),
    updateDoc: mockUpdateDoc,
    deleteField: vi.fn(() => '__deleteField__'),
    arrayUnion: vi.fn((v: unknown) => ({ __arrayUnion: v })),
    arrayRemove: vi.fn((v: unknown) => ({ __arrayRemove: v })),
    addDoc: vi.fn(),
    serverTimestamp: vi.fn(),
}));

import { linkGhostToUser, leaveTripAsGhost, joinTripByInvite } from './trips';

function expenseDoc(id: string, data: Record<string, unknown>) {
    return { ref: { __ref: true, id }, data: () => data };
}

function settlementDoc(id: string, data: Record<string, unknown>) {
    return { ref: { __ref: true, id }, data: () => data };
}

beforeEach(() => {
    mockBatchUpdate.mockClear();
    mockBatchCommit.mockClear();
    mockUpdateDoc.mockClear();
    mockGetDoc.mockReset();
    mockGetDocs.mockReset();
});

describe('linkGhostToUser', () => {
    it('migra despesa em que o fantasma é quem pagou', async () => {
        mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ participants: ['owner', 'ghost_1'] }) });
        mockGetDocs
            .mockResolvedValueOnce({ docs: [expenseDoc('exp1', { paidBy: 'ghost_1', participants: ['owner', 'ghost_1'] })] })
            .mockResolvedValueOnce({ docs: [] });

        await linkGhostToUser('trip1', 'ghost_1', 'real1');

        expect(mockBatchUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'exp1' }),
            { paidBy: 'real1', participants: ['owner', 'real1'] }
        );
    });

    it('migra despesa em que o fantasma só divide (não pagou)', async () => {
        mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ participants: ['owner', 'ghost_1'] }) });
        mockGetDocs
            .mockResolvedValueOnce({ docs: [expenseDoc('exp1', { paidBy: 'owner', participants: ['owner', 'ghost_1'] })] })
            .mockResolvedValueOnce({ docs: [] });

        await linkGhostToUser('trip1', 'ghost_1', 'real1');

        expect(mockBatchUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'exp1' }),
            { paidBy: 'owner', participants: ['owner', 'real1'] }
        );
    });

    it('migra settlement em que o fantasma é quem deve (from)', async () => {
        mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ participants: ['owner', 'ghost_1'] }) });
        mockGetDocs
            .mockResolvedValueOnce({ docs: [] })
            .mockResolvedValueOnce({ docs: [settlementDoc('s1', { from: 'ghost_1', to: 'owner' })] });

        await linkGhostToUser('trip1', 'ghost_1', 'real1');

        expect(mockBatchUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ id: 's1' }),
            { from: 'real1', to: 'owner' }
        );
    });

    it('migra settlement em que o fantasma é quem recebe (to)', async () => {
        mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ participants: ['owner', 'ghost_1'] }) });
        mockGetDocs
            .mockResolvedValueOnce({ docs: [] })
            .mockResolvedValueOnce({ docs: [settlementDoc('s1', { from: 'owner', to: 'ghost_1' })] });

        await linkGhostToUser('trip1', 'ghost_1', 'real1');

        expect(mockBatchUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ id: 's1' }),
            { from: 'owner', to: 'real1' }
        );
    });

    it('remove o fantasma de participants e do mapa de ghosts no final', async () => {
        mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ participants: ['owner', 'ghost_1'] }) });
        mockGetDocs.mockResolvedValueOnce({ docs: [] }).mockResolvedValueOnce({ docs: [] });

        await linkGhostToUser('trip1', 'ghost_1', 'real1');

        expect(mockUpdateDoc).toHaveBeenCalledWith(
            expect.objectContaining({ collectionName: 'trips', id: 'trip1' }),
            { participants: ['owner'], 'ghosts.ghost_1': '__deleteField__' }
        );
    });

    it('não faz nada se a viagem não existe mais', async () => {
        mockGetDoc.mockResolvedValueOnce({ exists: () => false });

        await linkGhostToUser('trip1', 'ghost_1', 'real1');

        expect(mockGetDocs).not.toHaveBeenCalled();
        expect(mockUpdateDoc).not.toHaveBeenCalled();
    });
});

describe('leaveTripAsGhost', () => {
    beforeEach(() => {
        vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('11111111-1111-1111-1111-111111111111');
    });

    it('migra despesa em que o usuário é quem pagou', async () => {
        mockGetDocs
            .mockResolvedValueOnce({ docs: [expenseDoc('exp1', { paidBy: 'user1', participants: ['user1', 'owner'] })] })
            .mockResolvedValueOnce({ docs: [] });
        mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ participants: ['user1', 'owner'] }) });

        await leaveTripAsGhost('trip1', 'user1', 'Fulano');

        const ghostUid = 'ghost_11111111-1111-1111-1111-111111111111';
        expect(mockBatchUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'exp1' }),
            { paidBy: ghostUid, participants: [ghostUid, 'owner'] }
        );
    });

    it('migra settlement em que o usuário participa (from e to)', async () => {
        mockGetDocs
            .mockResolvedValueOnce({ docs: [] })
            .mockResolvedValueOnce({ docs: [settlementDoc('s1', { from: 'user1', to: 'owner' })] });
        mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ participants: ['user1', 'owner'] }) });

        await leaveTripAsGhost('trip1', 'user1', 'Fulano');

        const ghostUid = 'ghost_11111111-1111-1111-1111-111111111111';
        expect(mockBatchUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ id: 's1' }),
            { from: ghostUid, to: 'owner' }
        );
    });

    it('troca o uid por um fantasma em participants, adiciona ghosts, remove o role', async () => {
        mockGetDocs.mockResolvedValueOnce({ docs: [] }).mockResolvedValueOnce({ docs: [] });
        mockGetDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ participants: ['user1', 'owner'] }) });

        await leaveTripAsGhost('trip1', 'user1', 'Fulano');

        const ghostUid = 'ghost_11111111-1111-1111-1111-111111111111';
        expect(mockUpdateDoc).toHaveBeenCalledWith(
            expect.objectContaining({ collectionName: 'trips', id: 'trip1' }),
            {
                participants: ['owner', ghostUid],
                [`ghosts.${ghostUid}`]: { name: 'Fulano' },
                'roles.user1': '__deleteField__',
            }
        );
    });

    it('já migrou despesas/acertos mesmo se a viagem sumiu entre as etapas (não faz o updateDoc final)', async () => {
        mockGetDocs
            .mockResolvedValueOnce({ docs: [expenseDoc('exp1', { paidBy: 'user1', participants: ['user1'] })] })
            .mockResolvedValueOnce({ docs: [] });
        mockGetDoc.mockResolvedValueOnce({ exists: () => false });

        await leaveTripAsGhost('trip1', 'user1', 'Fulano');

        expect(mockBatchUpdate).toHaveBeenCalled();
        expect(mockUpdateDoc).not.toHaveBeenCalled();
    });
});

describe('joinTripByInvite', () => {
    it('adiciona o próprio uid como EDITOR (normaliza o role pra maiúsculo)', async () => {
        await joinTripByInvite('trip1', 'editor', 'user1');

        expect(mockUpdateDoc).toHaveBeenCalledWith(
            expect.objectContaining({ collectionName: 'trips', id: 'trip1' }),
            { participants: { __arrayUnion: 'user1' }, 'roles.user1': 'EDITOR' }
        );
    });

    it('adiciona o próprio uid como VIEWER', async () => {
        await joinTripByInvite('trip1', 'VIEWER', 'user1');

        expect(mockUpdateDoc).toHaveBeenCalledWith(
            expect.objectContaining({ collectionName: 'trips', id: 'trip1' }),
            { participants: { __arrayUnion: 'user1' }, 'roles.user1': 'VIEWER' }
        );
    });

    it('rejeita role que não seja editor/viewer (ex.: tentar entrar como OWNER) sem tocar o Firestore', async () => {
        await expect(joinTripByInvite('trip1', 'owner', 'user1')).rejects.toThrow('Papel de convite inválido');
        expect(mockUpdateDoc).not.toHaveBeenCalled();
    });

    it('rejeita role vazio ou lixo', async () => {
        await expect(joinTripByInvite('trip1', '', 'user1')).rejects.toThrow('Papel de convite inválido');
        await expect(joinTripByInvite('trip1', 'hacker', 'user1')).rejects.toThrow('Papel de convite inválido');
        expect(mockUpdateDoc).not.toHaveBeenCalled();
    });
});
