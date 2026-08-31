import { Suspense, lazy } from 'react';
import { Esqueleto } from '@sgtm/design-system';

/**
 * La puerta del inicio: **lo unico de la pregunta que viaja en el arranque**.
 *
 * `InicioDeAtencion` trae dentro su abanico de tres consultas, su heuristica y
 * su prosa, y el arranque anda pegado a su presupuesto de 150 KB
 * (`yarn comprobar-compilaciones` publica la cifra del dia). Se carga como se cargan las cabeceras-resumen
 * y los formularios de alta —`lazy`, con un `Suspense` que ocupa su sitio— para
 * que lo que crezca aqui no lo pague quien entra por un enlace compartido a una
 * ficha y no pasa nunca por `/`.
 *
 * Es un archivo aparte y no un `lazy` dentro de `App.tsx` por lo mismo que
 * `PanelDeAlta` es un componente y no una expresion en linea: el `Suspense` con
 * su hueco tiene que envolver al componente entero, y aqui ademas deja el
 * enrutador leyendose como lo que es —una ruta, un elemento—.
 */
const InicioDeAtencion = lazy(async () => ({
  default: (await import('./InicioDeAtencion')).InicioDeAtencion,
}));

export function Inicio() {
  return (
    <Suspense fallback={<Esqueleto alto={220} />}>
      <InicioDeAtencion />
    </Suspense>
  );
}
