import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetDocs, mockBatchDelete, mockBatchCommit } = vi.hoisted(() => ({
    mockGetDocs: vi.fn(),
    mockBatchDelete: vi.fn(),
    mockBatchCommit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/config/firebase', () => ({ db: {} }));

vi.mock('firebase/firestore', () => ({
    doc: vi.fn((_db, collectionName: string, id: string) => ({ __ref: true, collectionName, id })),
    collection: vi.fn((_db, name: string) => ({ __collection: true, name })),
    query: vi.fn((...args: unknown[]) => args),
    where: vi.fn((field: string, op: string, value: unknown) => ({ field, op, value })),
    getDocs: mockGetDocs,
    writeBatch: vi.fn(() => ({ delete: mockBatchDelete, commit: mockBatchCommit })),
    addDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    serverTimestamp: vi.fn(),
}));

import { deleteAllActivities } from './activities';

function fakeSnap(count: number) {
    return {
        docs: Array.from({ length: count }, (_, i) => ({ ref: { __ref: true, id: `act${i}` } })),
    };
}

beforeEach(() => {
    mockGetDocs.mockReset();
    mockBatchDelete.mockClear();
    mockBatchCommit.mockClear();
});

describe('deleteAllActivities', () => {
    it('não faz nenhum commit se não há atividades', async () => {
        mockGetDocs.mockResolvedValueOnce(fakeSnap(0));

        await deleteAllActivities('trip1');

        expect(mockBatchCommit).not.toHaveBeenCalled();
        expect(mockBatchDelete).not.toHaveBeenCalled();
    });

    it('apaga tudo num único lote quando cabe no limite', async () => {
        mockGetDocs.mockResolvedValueOnce(fakeSnap(3));

        await deleteAllActivities('trip1');

        expect(mockBatchDelete).toHaveBeenCalledTimes(3);
        expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    });

    it('divide em lotes de até 500 quando passa do limite', async () => {
        mockGetDocs.mockResolvedValueOnce(fakeSnap(600));

        await deleteAllActivities('trip1');

        expect(mockBatchDelete).toHaveBeenCalledTimes(600);
        expect(mockBatchCommit).toHaveBeenCalledTimes(2);
    });
});
