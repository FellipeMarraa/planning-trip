// api/ai/_lib/geocoding.ts
// Mirror server-side de src/lib/geocoding.ts (Admin SDK não importa src/,
// mesmo motivo de CURRENCY_CODES/EXPENSE_CATEGORIES duplicados em prompt.ts).
// Usado só pra enriquecer sugestão de roteiro da IA com coordenada — nunca
// confia em lat/lng que o próprio modelo eventualmente inventasse (mesmo
// princípio de "nunca invente número" já aplicado a amountBRL/datas em
// sanitizeSuggested* de chat.ts): o modelo só emite texto de local, a
// coordenada vem sempre de uma geocodificação real feita aqui.
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const FETCH_TIMEOUT_MS = 3000;

export interface GeocodedPoint {
    lat: number;
    lng: number;
}

export async function geocodeLocation(query: string): Promise<GeocodedPoint | null> {
    const trimmed = query.trim();
    if (!trimmed) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
        const url = `${NOMINATIM_BASE}/search?format=json&limit=1&q=${encodeURIComponent(trimmed)}`;
        const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
        if (!res.ok) return null;

        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) return null;

        const lat = Number(data[0]?.lat);
        const lng = Number(data[0]?.lon);
        return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
    } catch (error) {
        console.error('Erro ao geocodificar localização sugerida pela IA:', error instanceof Error ? error.message : error);
        return null;
    } finally {
        clearTimeout(timeout);
    }
}

// Nominatim pede ~1 req/s de uso justo — geocodifica sequencialmente (nunca
// Promise.all) com um respiro entre chamadas. Teto de itens processados:
// roteiro sugerido de uma vez costuma ser um punhado de paradas (um dia),
// não uma lista arbitrária — acima disso o restante fica sem coordenada
// (a sugestão continua válida, só sem ponto no mapa até edição manual).
const MAX_GEOCODED_ITEMS = 8;
const THROTTLE_MS = 1100;

export async function geocodeSequentially(queries: string[]): Promise<(GeocodedPoint | null)[]> {
    const results: (GeocodedPoint | null)[] = [];
    for (let i = 0; i < queries.length; i++) {
        if (i >= MAX_GEOCODED_ITEMS) {
            results.push(null);
            continue;
        }
        if (i > 0) await new Promise((resolve) => setTimeout(resolve, THROTTLE_MS));
        results.push(await geocodeLocation(queries[i]));
    }
    return results;
}
