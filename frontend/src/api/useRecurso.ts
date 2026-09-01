import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { alCambiarLaSesion, ErrorDeApi, sesionActual } from './cliente';
import { reintentarLaSesion } from './sesion';

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
  /* Cambiar de credencial vuelve a pedirlo todo: una lectura que se quedó con
     un 401 no se arregla sola cuando la sesión pasa a valer. */
  const sesion = useSyncExternalStore(alCambiarLaSesion, sesionActual, sesionActual);

  /* La función cambia en cada render —cierra sobre los filtros— así que no
     puede ser una llave del efecto: lo que decide es `llaves`. */
  const pedirRef = useRef(pedir);
  pedirRef.current = pedir;

  /* Lo que se pidió la última vez, para saber si la petición nueva es OTRA
     pregunta o la misma. La diferencia decide qué pasa con lo que hay dibujado:
     con otra pregunta, lo anterior es la respuesta a algo que ya no se está
     preguntando y tiene que irse; con la misma —un reintento, o un cambio de
     credencial— se deja mientras se recarga, porque parpadear a vacío y volver
     es peor que esperar. Sin esta distinción, una pantalla que no gatea por
     `cargando` dibuja lo de antes bajo el rótulo nuevo: medido en la matriz de
     accesos, la ficha decía «Seguridad» y la cabecera seguía contando los 21
     permisos del grupo anterior hasta que llegaba la respuesta. */
  const llavesPrevias = useRef<readonly unknown[] | null>(null);

  useEffect(() => {
    if (!activo) {
      setDatos(null);
      setCargando(false);
      setError(null);
      return;
    }
    const previas = llavesPrevias.current;
    const otraPregunta = previas === null || previas.length !== llaves.length || llaves.some((v, i) => !Object.is(v, previas[i]));
    llavesPrevias.current = llaves;

    const control = new AbortController();
    let vigente = true;
    if (otraPregunta) setDatos(null);
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
        /* Un token que dejó de valer no es un error que enseñar: se vuelve a la
           puerta. Con la sesión de Keycloak viva, el navegador va y vuelve sin
           enseñar nada. Si no hay puerta —local, u origen no seguro— sigue el
           camino de siempre y la pantalla lo dice. */
        if (fallo instanceof ErrorDeApi && fallo.codigo === 'NO_AUTENTICADO' && reintentarLaSesion()) return;
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
  }, [...llaves, activo, intento, sesion]);

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
