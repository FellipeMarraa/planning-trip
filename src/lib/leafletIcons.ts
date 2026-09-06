// src/lib/leafletIcons.ts
// Gotcha conhecido de Leaflet + bundler (Vite/Webpack): os ícones padrão do
// marcador (Icon.Default) referenciam caminho relativo resolvido em runtime
// via getIconUrl, que quebra fora do build clássico do Leaflet (URL 404,
// marcador aparece quebrado/sem ícone). Fix padrão: importar os PNGs como
// asset (Vite resolve a URL final) e sobrescrever a config default.
// Import feito uma única vez em src/main.tsx, antes de qualquer mapa renderizar.
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

export function setupLeafletDefaultIcons() {
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: markerIcon2x,
        iconUrl: markerIcon,
        shadowUrl: markerShadow,
    });
}
