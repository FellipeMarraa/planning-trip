import { describe, it, expect } from 'vitest';
import { buildGoogleMapsRouteUrl } from './mapLinks';

describe('buildGoogleMapsRouteUrl', () => {
    it('retorna null pra lista vazia', () => {
        expect(buildGoogleMapsRouteUrl([])).toBeNull();
    });

    it('um único ponto vira só destination, sem waypoints', () => {
        const url = buildGoogleMapsRouteUrl([{ lat: 48.8584, lng: 2.2945 }]);
        expect(url).toBe('https://www.google.com/maps/dir/?api=1&destination=48.8584,2.2945');
    });

    it('vários pontos: último vira destination, os anteriores viram waypoints em ordem', () => {
        const url = buildGoogleMapsRouteUrl([
            { lat: 1, lng: 2 },
            { lat: 3, lng: 4 },
            { lat: 5, lng: 6 },
        ]);
        expect(url).toBe('https://www.google.com/maps/dir/?api=1&destination=5,6&waypoints=1%2C2%7C3%2C4');
    });

    it('nunca inclui origin (Google Maps usa localização atual do usuário)', () => {
        const url = buildGoogleMapsRouteUrl([{ lat: 1, lng: 2 }, { lat: 3, lng: 4 }]);
        expect(url).not.toContain('origin=');
    });

    it('corta waypoints além do limite defensivo, mas mantém o destino real', () => {
        const points = Array.from({ length: 12 }, (_, i) => ({ lat: i, lng: i }));
        const url = buildGoogleMapsRouteUrl(points);

        expect(url).toContain('destination=11,11'); // último ponto, sempre preservado
        const waypointsParam = new URL(url!).searchParams.get('waypoints')!;
        expect(waypointsParam.split('|')).toHaveLength(8); // MAX_WAYPOINTS
    });
});
