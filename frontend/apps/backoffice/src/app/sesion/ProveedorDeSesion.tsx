import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  canjearSiVuelve,
  cerrarSesion,
  configuracionDeIdentidad,
  configurarRenovacion,
  irAAutenticar,
  leerToken,
  renovar,
} from '@sgtm/api-client';
import type { ConfiguracionDeIdentidad, DatosDelToken } from '@sgtm/api-client';

/**
 * La sesion de trabajo: quien entra, cuanto le dura y como se renueva.
 *
 * Tres decisiones que no son negociables y que este componente hace cumplir:
 *
 * 1. **El token vive en memoria.** No pasa por `localStorage`, ni por
 *    `sessionStorage`, ni por la URL —la barra de direcciones se limpia en
 *    cuanto se canjea el codigo—. Recargar vuelve a autenticar.
 * 2. **La renovacion no desmonta nada.** El manual describe fichas y
 *    declaraciones que se llenan en varios minutos: si al renovar se cambiara
 *    lo que hay en pantalla, el formulario a medio llenar se perderia, que es
 *    el defecto que mas duele de los que se pueden cometer aqui.
 * 3. **Cambiar de municipalidad vacia la cache antes de pedir nada** con el
 *    token nuevo. Mostrar una fila de la municipalidad anterior es una fuga
 *    para el usuario aunque el backend este correcto (FRO-01 §4).
 */

export type EstadoDeSesion = 'sin-proveedor' | 'anonima' | 'entrando' | 'abierta';

export interface Sesion {
  readonly estado: EstadoDeSesion;
  readonly datos: DatosDelToken | null;
  /** Faltan menos de un minuto para que el token expire. */
  readonly porExpirar: boolean;
  readonly entrar: () => void;
  readonly salir: () => void;
  readonly cambiarDeMunicipalidad: (municipalidad: string) => Promise<void>;
}

const Contexto = createContext<Sesion | null>(null);

/** Se avisa un minuto antes; se renueva cuando queda un cuarto de la vida del token. */
const AVISO_ANTES_MS = 60_000;

export function ProveedorDeSesion({ children }: { readonly children: ReactNode }) {
  const configuracion = useMemo(() => configuracionDeIdentidad(), []);
  const clientes = useQueryClient();
  const [estado, fijarEstado] = useState<EstadoDeSesion>(
    configuracion === null ? 'sin-proveedor' : 'entrando',
  );
  const [datos, fijarDatos] = useState<DatosDelToken | null>(null);
  const [porExpirar, fijarPorExpirar] = useState(false);
  const temporizadores = useRef<number[]>([]);

  const programar = useCallback((dura: number, renovarAhora: () => void) => {
    for (const t of temporizadores.current) window.clearTimeout(t);
    const vida = Math.max(dura * 1000, 10_000);
    temporizadores.current = [
      window.setTimeout(() => fijarPorExpirar(true), Math.max(vida - AVISO_ANTES_MS, 1_000)),
      window.setTimeout(renovarAhora, vida * 0.75),
    ];
  }, []);

  const renovarAhora = useCallback(async (): Promise<boolean> => {
    if (configuracion === null) return false;
    try {
      const sesion = await renovar(configuracion);
      // Nada se desmonta al renovar: solo cambian los datos del token. El
      // formulario a medio llenar sigue donde estaba.
      fijarDatos(leerToken(sesion.token));
      fijarPorExpirar(false);
      programar(sesion.dura, () => void renovarAhora());
      return true;
    } catch {
      fijarEstado('anonima');
      return false;
    }
  }, [configuracion, programar]);

  useEffect(() => {
    if (configuracion === null) return;
    configurarRenovacion(renovarAhora);

    void (async () => {
      try {
        const vuelta = await canjearSiVuelve(configuracion);
        if (vuelta !== null) {
          fijarDatos(leerToken(vuelta.sesion.token));
          fijarEstado('abierta');
          programar(vuelta.sesion.dura, () => void renovarAhora());
          if (vuelta.volverA !== window.location.pathname) {
            window.history.replaceState({}, '', vuelta.volverA);
          }
          return;
        }
        // Sin codigo en la URL: puede haber refresh token de una sesion viva.
        const sesion = await renovar(configuracion);
        fijarDatos(leerToken(sesion.token));
        fijarEstado('abierta');
        programar(sesion.dura, () => void renovarAhora());
      } catch {
        fijarEstado('anonima');
      }
    })();

    return () => {
      configurarRenovacion(null);
      for (const t of temporizadores.current) window.clearTimeout(t);
    };
  }, [configuracion, programar, renovarAhora]);

  const sesion: Sesion = useMemo(
    () => ({
      estado,
      datos,
      porExpirar,
      entrar: () => {
        if (configuracion === null) return;
        // La ruta de vuelta va con la peticion: al volver, se sigue donde se estaba.
        void irAAutenticar(configuracion, `${window.location.pathname}${window.location.search}`);
      },
      salir: () => {
        // Primero la cache: la sesion siguiente no puede ver ni una fila de esta.
        clientes.clear();
        fijarDatos(null);
        fijarEstado('anonima');
        cerrarSesion(configuracion);
      },
      cambiarDeMunicipalidad: async (municipalidad: string) => {
        if (configuracion === null) return;
        // **El orden importa**: primero se vacia y despues se pide. Al reves, la
        // respuesta de la municipalidad anterior seguiria en la cache cuando la
        // primera pantalla de la nueva se dibuje.
        clientes.clear();
        const nueva = await renovar(configuracion, municipalidad);
        fijarDatos(leerToken(nueva.token));
        programar(nueva.dura, () => void renovarAhora());
      },
    }),
    [estado, datos, porExpirar, configuracion, clientes, programar, renovarAhora],
  );

  return <Contexto.Provider value={sesion}>{children}</Contexto.Provider>;
}

export function useSesion(): Sesion {
  const sesion = useContext(Contexto);
  if (sesion === null) throw new Error('useSesion fuera de ProveedorDeSesion');
  return sesion;
}

/** La configuracion del proveedor, para quien necesite saber si lo hay. */
export type { ConfiguracionDeIdentidad };
