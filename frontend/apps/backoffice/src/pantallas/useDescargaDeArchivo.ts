import { useState } from 'react';
import { descargarOperacion } from '@sgtm/api-client';
import type { IdDeOperacion, ParametrosDe } from '@sgtm/api-client';

/**
 * Descarga un archivo —PDF, XLS o RTF— de una operacion de lectura del contrato.
 *
 * Es la puerta lateral de `descargarOperacion` (#71): la unica pantalla que la
 * usa hoy es el reporte de la ficha del contribuyente, que el backend sirve en
 * tres formatos segun el parametro `formato`. **Un archivo a la vez**, igual
 * que `useEscritura` deja enviar un intento a la vez: pedir el XLS mientras el
 * PDF todavia esta en camino no tiene ningun beneficio y sí la posibilidad de
 * confundir cual descarga fue cual.
 */
export interface DescargaDeArchivo {
  /** El formato que esta en camino, o `null` si no hay ninguna descarga en curso. */
  readonly enCurso: string | null;
  readonly error: unknown;
  readonly descargar: (formato: string) => void;
}

export function useDescargaDeArchivo<O extends IdDeOperacion>(
  operacion: O,
  parametros: Omit<ParametrosDe<O>, 'formato'>,
): DescargaDeArchivo {
  const [enCurso, fijarEnCurso] = useState<string | null>(null);
  const [error, fijarError] = useState<unknown>(null);

  return {
    enCurso,
    error,
    descargar: (formato: string) => {
      if (enCurso !== null) return;
      fijarEnCurso(formato);
      fijarError(null);
      descargarOperacion(operacion, { ...parametros, formato } as ParametrosDe<O>)
        .then(({ blob, nombreDeArchivo }) => guardarArchivo(blob, nombreDeArchivo))
        .catch((fallo: unknown) => fijarError(fallo))
        .finally(() => fijarEnCurso(null));
    },
  };
}

/**
 * Le entrega el archivo al navegador para que lo guarde.
 *
 * Un enlace `download` que nunca se ve: es el mecanismo estandar para guardar
 * un `Blob` que no vino de una URL real, y se retira apenas se pulsa.
 */
function guardarArchivo(blob: Blob, nombreDeArchivo: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreDeArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  // Revocar en el mismo turno puede cortar la descarga a mitad en algunos
  // navegadores: el click la inicia de forma asincrona.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
