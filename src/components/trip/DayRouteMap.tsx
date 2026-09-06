// src/components/trip/DayRouteMap.tsx
import { useMemo } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import type { Activity } from '@/types';
import { MapAutoResize } from './MapAutoResize';

interface DayRouteMapProps {
    activities: Activity[];
}

// Mapa do dia — só as atividades com coordenada, na ordem do horário (mesma
// ordem que useActivities já traz via orderBy('time')). Linha reta ligando
// os pontos, não rota de rua/GPS real (exigiria serviço pago de directions).
// Renderizado sob demanda dentro de um Dialog (ver DayRouteMapDialog.tsx) —
// não mais fixo na tela: ficar sempre aberto competindo com o roteiro e as
// outras atividades era o achado real reportado ("mapa flutuando em cima de
// tudo, impossível acessar o resto"). Retorna null com menos de 1 ponto.
export function DayRouteMap({ activities }: DayRouteMapProps) {
    const located = useMemo(
        () => activities
            .filter((a): a is Activity & { coordinates: NonNullable<Activity['coordinates']> } => !!a.coordinates)
            .sort((a, b) => a.time.localeCompare(b.time)),
        [activities]
    );

    if (located.length === 0) return null;

    const center: [number, number] = [located[0].coordinates.lat, located[0].coordinates.lng];
    const path: [number, number][] = located.map((a) => [a.coordinates.lat, a.coordinates.lng]);

    return (
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapAutoResize />
            {/* Leaflet desenha em canvas/SVG fora do CSSOM — não resolve var()
                do token de tema (ver UI_UX.md seção 2), cor literal é a única
                opção aqui, exceção documentada só pra camadas do mapa. */}
            {path.length > 1 && <Polyline positions={path} pathOptions={{ color: '#6366f1', weight: 3 }} />}
            {located.map((a) => (
                <Marker key={a.id} position={[a.coordinates.lat, a.coordinates.lng]}>
                    <Popup>
                        <span className="font-medium">{a.time}</span> — {a.location}
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
