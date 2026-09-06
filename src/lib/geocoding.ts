// src/lib/geocoding.ts
// Geocoding gratuito via Nominatim (OpenStreetMap) — sem chave de API, sem
// variável de ambiente, chamado direto do client (não passa por api/, ao
// contrário do provedor de IA: aqui não há segredo pra proteger nem custo
// por token, ver docs/ARCHITECTURE.md). Política de uso do Nominatim pede
// no máximo ~1 requisição/segundo — quem chama searchAddress deve fazer
// debounce (LocationPicker.tsx faz 600ms), esta função não implementa
// throttling sozinha.
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

export interface AddressResult {
    label: string;
    lat: number;
    lng: number;
}

export async function searchAddress(query: string): Promise<AddressResult[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    try {
        const url = `${NOMINATIM_BASE}/search?format=json&limit=5&q=${encodeURIComponent(trimmed)}`;
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) return [];

        const data = await res.json();
        if (!Array.isArray(data)) return [];

        return data
            .map((item: any) => ({
                label: typeof item?.display_name === 'string' ? item.display_name : '',
                lat: Number(item?.lat),
                lng: Number(item?.lon),
            }))
            .filter((r) => r.label && Number.isFinite(r.lat) && Number.isFinite(r.lng));
    } catch (error) {
        console.error('Erro ao buscar endereço:', error);
        return [];
    }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
    try {
        const url = `${NOMINATIM_BASE}/reverse?format=json&lat=${lat}&lon=${lng}`;
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) return null;

        const data = await res.json();
        return typeof data?.display_name === 'string' ? data.display_name : null;
    } catch (error) {
        console.error('Erro ao buscar endereço reverso:', error);
        return null;
    }
}
