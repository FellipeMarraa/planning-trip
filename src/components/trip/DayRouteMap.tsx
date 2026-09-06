// src/components/trip/DayRouteMap.tsx
import { useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import type { Activity } from '@/types';
import { MapAutoResize } from './MapAutoResize';

interface DayRouteMapProps {
    activities: Activity[];
}

// Cores literais (não token OKLCH do tema, ver nota abaixo do Polyline):
// primeira parada em verde, última em vermelho (convenção comum de rota,
// tipo Google Maps), paradas do meio na cor primária real do app
// (--primary: oklch(0.62 0.16 40) ≈ laranja, aproximado aqui em hex).
const START_COLOR = '#10b981';
const END_COLOR = '#f43f5e';
const MID_COLOR = '#ea580c';

function numberedIcon(n: number, color: string) {
    return L.divIcon({
        className: '', // sem isso o Leaflet aplica sua própria classe com background/border padrão por cima
        html: `<div style="
            width: 26px; height: 26px; border-radius: 9999px;
            background: ${color}; color: white; font-weight: 700; font-size: 12px;
            display: flex; align-items: center; justify-content: center;
            border: 2px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.4);
        ">${n}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        popupAnchor: [0, -13],
    });
}

// Mapa do dia — só as atividades com coordenada, na ordem do horário (mesma
// ordem que useActivities já traz via orderBy('time')). Linha reta ligando
// os pontos, não rota de rua/GPS real (exigiria serviço pago de directions).
// Cada marcador é numerado (1, 2, 3...) na ordem do horário — achado real:
// com marcadores idênticos não dava pra saber qual parada era a primeira ou
// a próxima só olhando a linha traçada.
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
            {path.length > 1 && <Polyline positions={path} pathOptions={{ color: MID_COLOR, weight: 3 }} />}
            {located.map((a, index) => {
                const color = index === 0 ? START_COLOR : index === located.length - 1 ? END_COLOR : MID_COLOR;
                return (
                    <Marker key={a.id} position={[a.coordinates.lat, a.coordinates.lng]} icon={numberedIcon(index + 1, color)}>
                        <Popup>
                            <span className="font-medium">{index + 1}. {a.time}</span> — {a.location}
                        </Popup>
                    </Marker>
                );
            })}
        </MapContainer>
    );
}
