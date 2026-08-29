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
  configuracionDelCiudadano,
  configurarRenovacion,
  irAAutenticar,
  leerToken,
  renovar,
  solicitar,
} from '@sgtm/api-client';
import type { ConfiguracionDeIdentidad, DatosDelToken } from '@sgtm/api-client';
import { olvidarLoDeLaSesion } from './olvidos';
import { NINGUNO, SIN_PROVEEDOR, permisosDelClaim } from './permisos';
import type { PermisosEfectivos } from './permisos';

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
 * 4. **Y con la cache se olvida lo que la aplicacion guarda en memoria**
 *    (`olvidos.ts`). Ni cerrar sesion —sin `finDeSesion` configurado— ni cambiar
 *    de municipalidad recargan la pagina, asi que una variable de modulo
 *    sobrevive a los dos y se lleva al operador siguiente lo del anterior.
 *
 * ── Las dos poblaciones, y por que las atiende el mismo proveedor ──────────
 *
 * Desde ADR-0020 hay **dos realms**: el del funcionario y el del ciudadano, con
 * emisores distintos. El ciclo de la sesion —PKCE, canje, renovacion que no
 * desmonta nada— es exactamente el mismo para los dos, y copiarlo habria
 * duplicado las tres cosas que, duplicadas, divergen sin que nada se ponga rojo.
 * Lo que cambia es de **que** proveedor sale la configuracion y **si se piden
 * permisos**, y las dos cosas caben en una prop.
 */

export type EstadoDeSesion = 'sin-proveedor' | 'anonima' | 'entrando' | 'abierta';

export interface Sesion {
  readonly estado: EstadoDeSesion;
  readonly datos: DatosDelToken | null;
  /**
   * Lo que este usuario puede ver y hacer. Sin proveedor de identidad no hay
   * permisos que aplicar —se trabaja como contra el proxy—; con proveedor, la
   * matriz se pide a `GET /seguridad/sesion/permisos`, y hasta que llega —o si
   * falla— no se ve nada: la autorizacion del manual es de negacion por omision.
   */
  readonly permisos: PermisosEfectivos;
  /** Faltan menos de un minuto para que el token expire. */
  readonly porExpirar: boolean;
  readonly entrar: () => void;
  readonly salir: () => void;
  readonly cambiarDeMunicipalidad: (municipalidad: string) => Promise<void>;
}

const Contexto = createContext<Sesion | null>(null);

/** Se avisa un minuto antes; se renueva cuando queda un cuarto de la vida del token. */
const AVISO_ANTES_MS = 60_000;

/**
 * A quien autentica esta sesion.
 *
 * `funcionario` es lo de siempre y el valor por omision: el back-office. El
 * `ciudadano` es el portal (ADR-0020), y no es una variante cosmetica —usa otro
 * realm, otro emisor y otra vuelta— sino la otra mitad de una separacion que el
 * backend hace estructural con dos cadenas de seguridad.
 */
export type QuienEntra = 'funcionario' | 'ciudadano';

export function ProveedorDeSesion({
  children,
  quienEntra = 'funcionario',
}: {
  readonly children: ReactNode;
  readonly quienEntra?: QuienEntra;
}) {
  const configuracion = useMemo(
    () => (quienEntra === 'ciudadano' ? configuracionDelCiudadano() : configuracionDeIdentidad()),
    [quienEntra],
  );
  const clientes = useQueryClient();
  const [estado, fijarEstado] = useState<EstadoDeSesion>(
    configuracion === null ? 'sin-proveedor' : 'entrando',
  );
  const [datos, fijarDatos] = useState<DatosDelToken | null>(null);
  const [matriz, fijarMatriz] = useState<PermisosEfectivos>(NINGUNO);
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

  // La matriz de permisos no viene en el token (solo autentica): se pide a
  // `GET /seguridad/sesion/permisos` (ADR-0013). Se refresca cada vez que cambia
  // el token —renovacion incluida—, asi un cambio de permisos entra sin re-login.
  // Si la peticion falla, NINGUNO: negacion por omision, no menu completo que
  // falla en cada pulsacion.
  //
  // Se llama con `solicitar` y no con `pedirOperacion`: este proveedor esta en
  // el arranque, y `pedirOperacion` arrastra el mapa de las 136 operaciones al
  // paquete inicial (se pasaba del presupuesto por 0,1 KB). El contrato lo
  // sigue guardando la prueba del backend.
  //
  // **Y no se piden para el ciudadano** (ADR-0020): `GET /seguridad/sesion/permisos`
  // es un endpoint de funcionario, y el token del ciudadano no autentica en el
  // —la cadena general valida contra el otro emisor—. Pedirlo seria una peticion
  // que siempre da 401, en cada arranque del portal, para acabar en la misma
  // matriz vacia que ya se fija aqui. El ciudadano no tiene fila en `usuario`ni
  // matriz que aplicar: lo que puede ver lo decide su documento, no un permiso.
  useEffect(() => {
    if (configuracion === null || datos === null || quienEntra === 'ciudadano') {
      fijarMatriz(NINGUNO);
      return;
    }
    let vivo = true;
    void (async () => {
      try {
        const cuerpo = await solicitar<unknown>('/seguridad/sesion/permisos');
        if (vivo) fijarMatriz(permisosDelClaim(cuerpo));
      } catch {
        if (vivo) fijarMatriz(NINGUNO);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [configuracion, datos, quienEntra]);

  const permisos: PermisosEfectivos = useMemo(() => {
    if (configuracion === null) return SIN_PROVEEDOR;
    return datos === null ? NINGUNO : matriz;
  }, [configuracion, datos, matriz]);

  const sesion: Sesion = useMemo(
    () => ({
      estado,
      datos,
      permisos,
      porExpirar,
      entrar: () => {
        if (configuracion === null) return;
        // La ruta de vuelta va con la peticion: al volver, se sigue donde se estaba.
        void irAAutenticar(configuracion, `${window.location.pathname}${window.location.search}`);
      },
      salir: () => {
        // Primero la cache: la sesion siguiente no puede ver ni una fila de esta.
        clientes.clear();
        // Y lo que no esta en la cache: la memoria de la aplicacion. Sin
        // `finDeSesion` configurado esto **no recarga la pagina**, asi que una
        // variable de modulo sobrevive al cambio de operador (ver `olvidos.ts`).
        olvidarLoDeLaSesion();
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
        // Este camino **no recarga nunca**, que es justo el motivo de vaciar la
        // cache a mano. Lo que vive en memoria necesita lo mismo.
        olvidarLoDeLaSesion();
        const nueva = await renovar(configuracion, municipalidad);
        fijarDatos(leerToken(nueva.token));
        programar(nueva.dura, () => void renovarAhora());
      },
    }),
    [estado, datos, permisos, porExpirar, configuracion, clientes, programar, renovarAhora],
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
