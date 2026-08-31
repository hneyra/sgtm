import { Suspense, lazy } from 'react';
import { Esqueleto } from '@sgtm/design-system';

/**
 * La puerta del mapa catastral: **lo único de él que viaja en el arranque**
 * (#500, ADR-0022).
 *
 * Detrás de este `lazy` van la superficie, su lienzo y —un escalón más abajo,
 * con su propio `import()`— Leaflet entero. Quien entra a mirar un recibo no
 * descarga un motor de mapas, que es la condición con la que ADR-0022 §4 acepta
 * la primera dependencia pesada del frontend.
 *
 * Es un archivo aparte y no un `lazy` dentro de `App.tsx` por lo mismo que
 * `Atencion` e `Inicio`: el `Suspense` con su hueco tiene que envolver al
 * componente entero, y así el enrutador se lee como lo que es —una ruta, un
 * elemento—.
 */
const MapaCatastral = lazy(async () => ({
  default: (await import('./MapaCatastral')).MapaCatastral,
}));

export function Mapa() {
  return (
    <Suspense fallback={<Esqueleto alto={320} />}>
      <MapaCatastral />
    </Suspense>
  );
}
