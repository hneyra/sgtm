import { useCallback, useEffect, useRef, useState } from 'react';
import { ErrorDeApi } from './cliente';

/**
 * Una lectura del backend, con los cuatro estados que la pantalla ya dibuja:
 * cargando, con datos, sin resultados y caída.
 *
 * Lo que hace que sirva y no sea un `useEffect` con `fetch` dentro:
 *
 * - **Cancela la petición anterior.** Teclear en el buscador dispara una por
 *   pulsación, y sin esto la que vuelve tarde pisa a la que volvió pronto: la
 *   tabla acabaría enseñando el resultado de una búsqueda que ya no es la que
 *   está escrita.
 * - **Descarta la respuesta si el componente ya se fue**, que es lo que evita
 *   el aviso de React y, peor, un `setState` sobre una pantalla desmontada.
 * - **Distingue cancelar de fallar.** Cambiar de pantalla aborta, y abortar no
 *   es un error que haya que dibujar.
 */
export type Estado<T> = {
  datos: T | null;
  cargando: boolean;
  error: ErrorDeApi | null;
  /** Vuelve a pedir lo mismo, sin cambiar nada. Es el «Reintentar» de la pantalla. */
  reintentar: () => void;
};

export function useRecurso<T>(
  pedir: (senal: AbortSignal) => Promise<T>,
  /** Lo que hace que la petición sea otra. Mismo criterio que un `useEffect`. */
  llaves: readonly unknown[],
  /** Con `false` no se pide nada: el filtro obligatorio todavía está en blanco. */
  activo = true,
): Estado<T> {
  const [datos, setDatos] = useState<T | null>(null);
  const [cargando, setCargando] = useState(activo);
  const [error, setError] = useState<ErrorDeApi | null>(null);
  const [intento, setIntento] = useState(0);

  /* La función cambia en cada render —cierra sobre los filtros— así que no
     puede ser una llave del efecto: lo que decide es `llaves`. */
  const pedirRef = useRef(pedir);
  pedirRef.current = pedir;

  useEffect(() => {
    if (!activo) {
      setDatos(null);
      setCargando(false);
      setError(null);
      return;
    }
    const control = new AbortController();
    let vigente = true;
    setCargando(true);
    setError(null);

    pedirRef
      .current(control.signal)
      .then((r) => {
        if (!vigente) return;
        setDatos(r);
        setCargando(false);
      })
      .catch((fallo: unknown) => {
        if (!vigente) return;
        if (fallo instanceof DOMException && fallo.name === 'AbortError') return;
        setError(
          fallo instanceof ErrorDeApi
            ? fallo
            : new ErrorDeApi('ERROR_INTERNO', 'No se pudo completar la operación', 0),
        );
        setDatos(null);
        setCargando(false);
      });

    return () => {
      vigente = false;
      control.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...llaves, activo, intento]);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);
  return { datos, cargando, error, reintentar };
}

/** Rebota un valor: una petición por pausa de tecleo, no por pulsación. */
export function useRebote<T>(valor: T, ms = 320): T {
  const [reposado, setReposado] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setReposado(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return reposado;
}
