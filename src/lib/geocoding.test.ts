import { describe, it, expect, vi, afterEach } from 'vitest';
import { searchAddress, reverseGeocode } from './geocoding';

function mockFetchOnce(body: unknown, ok = true) {
    globalThis.fetch = vi.fn().mockResolvedValue({
        ok,
        json: async () => body,
    }) as unknown as typeof fetch;
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('searchAddress', () => {
    it('retorna [] pra query vazia sem chamar fetch', async () => {
        globalThis.fetch = vi.fn();
        const result = await searchAddress('   ');
        expect(result).toEqual([]);
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('parseia a resposta do Nominatim em AddressResult[]', async () => {
        mockFetchOnce([
            { display_name: 'Torre Eiffel, Paris, França', lat: '48.8584', lon: '2.2945' },
        ]);

        const result = await searchAddress('Torre Eiffel');
        expect(result).toEqual([{ label: 'Torre Eiffel, Paris, França', lat: 48.8584, lng: 2.2945 }]);
    });

    it('descarta resultados sem display_name ou coordenada inválida', async () => {
        mockFetchOnce([
            { display_name: '', lat: '1', lon: '2' },
            { display_name: 'Local válido', lat: 'não-numero', lon: '2' },
        ]);

        const result = await searchAddress('teste');
        expect(result).toEqual([]);
    });

    it('retorna [] quando a resposta HTTP não é ok', async () => {
        mockFetchOnce({}, false);
        const result = await searchAddress('teste');
        expect(result).toEqual([]);
    });

    it('retorna [] quando fetch lança (rede offline etc.)', async () => {
        globalThis.fetch = vi.fn().mockRejectedValue(new Error('network error'));
        const result = await searchAddress('teste');
        expect(result).toEqual([]);
    });
});

describe('reverseGeocode', () => {
    it('retorna o display_name da resposta', async () => {
        mockFetchOnce({ display_name: 'Rua Exemplo, 123' });
        const result = await reverseGeocode(48.8584, 2.2945);
        expect(result).toBe('Rua Exemplo, 123');
    });

    it('retorna null quando a resposta não é ok', async () => {
        mockFetchOnce({}, false);
        const result = await reverseGeocode(0, 0);
        expect(result).toBeNull();
    });

    it('retorna null quando fetch lança', async () => {
        globalThis.fetch = vi.fn().mockRejectedValue(new Error('network error'));
        const result = await reverseGeocode(0, 0);
        expect(result).toBeNull();
    });
});
