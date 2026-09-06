// src/lib/mapLinks.ts
export interface RoutePoint {
    lat: number;
    lng: number;
}

// Deep-link pro Google Maps em vez de navegação turn-by-turn própria — real
// GPS/trânsito/replanejamento sempre exigiria um serviço pago de directions
// (Google/Mapbox/OpenRouteService), fora do princípio de zero custo
// recorrente já validado nesta feature (tiles OSM + Nominatim). Origem
// deixada em branco = Google Maps usa a localização atual do usuário
// automaticamente (permissão de GPS do próprio app/site do Maps) — é
// exatamente "guiar de onde o usuário estiver" sem o app precisar saber a
// posição dele.
//
// Limite de waypoints: a URL simples (`api=1`, sem chave de API paga) não
// tem um teto documentado oficialmente, mas na prática Google Maps começa a
// ignorar/truncar acima de ~9-10 pontos totais — corta defensivamente pra
// nunca gerar um link que abre com menos paradas do que o usuário esperava
// sem avisar.
const MAX_WAYPOINTS = 8; // + 1 destino = 9 pontos no total

export function buildGoogleMapsRouteUrl(points: RoutePoint[]): string | null {
    if (points.length === 0) return null;

    if (points.length === 1) {
        const { lat, lng } = points[0];
        return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }

    const destination = points[points.length - 1];
    const waypoints = points.slice(0, -1).slice(0, MAX_WAYPOINTS);
    const waypointsParam = encodeURIComponent(waypoints.map((p) => `${p.lat},${p.lng}`).join('|'));

    return `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}&waypoints=${waypointsParam}`;
}
