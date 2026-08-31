import { Suspense, lazy } from 'react';
import { Esqueleto } from '@sgtm/design-system';

/**
 * La puerta de la ficha 360°: **lo único de ella que viaja en el arranque**
 * (#297, ADR-0016 §2).
 *
 * `FichaDeAtencion` trae dentro su tabla de composición, sus seis rejillas, su
 * barra de pestañas y su prosa, y el arranque anda pegado a su presupuesto
 * —`yarn comprobar-compilaciones` publica la cifra del día—. Se carga como el
 * inicio, como las cabeceras-resumen y como los formularios de alta: `lazy`, con
 * un `Suspense` que ocupa su sitio, para que lo que crezca aquí no lo pague
 * quien entra por un enlace a una pantalla de otro módulo y no abre nunca una
 * ficha.
 *
 * Es un archivo aparte y no un `lazy` dentro de `App.tsx` por lo mismo que
 * `Inicio`: el `Suspense` con su hueco tiene que envolver al componente entero,
 * y así el enrutador se lee como lo que es —una ruta, un elemento—.
 */
const FichaDeAtencion = lazy(async () => ({
  default: (await import('./FichaDeAtencion')).FichaDeAtencion,
}));

export function Atencion() {
  return (
    <Suspense fallback={<Esqueleto alto={260} />}>
      <FichaDeAtencion />
    </Suspense>
  );
}
