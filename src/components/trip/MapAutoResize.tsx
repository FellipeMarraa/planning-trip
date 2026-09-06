// src/components/trip/MapAutoResize.tsx
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

// Leaflet mede o tamanho do container no mount — se o layout ainda não
// estabilizou nesse instante (flex/animação do framer-motion, Dialog ainda
// abrindo), o cálculo sai errado e o mapa desenha tiles/controles fora dos
// limites do próprio container, cobrindo o resto da tela (achado real:
// "mapa flutuando em cima de tudo, impossível acessar o roteiro"). Um
// ResizeObserver recalcula sempre que o container muda de tamanho de
// verdade — mais robusto que um setTimeout fixo, que quebra se a animação
// demorar mais que o timeout escolhido. Usado por LocationPicker.tsx e
// DayRouteMap.tsx — qualquer mapa novo dentro de layout dinâmico deve
// incluir este componente como filho do MapContainer.
export function MapAutoResize() {
    const map = useMap();

    useEffect(() => {
        map.invalidateSize();

        const container = map.getContainer();
        const observer = new ResizeObserver(() => map.invalidateSize());
        observer.observe(container);

        return () => observer.disconnect();
    }, [map]);

    return null;
}
