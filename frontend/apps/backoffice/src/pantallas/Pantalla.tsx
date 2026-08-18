import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Aviso, Boton, Esqueleto } from '@sgtm/design-system';
import { descriptorDe, escribe } from '@sgtm/api-client';
import type { ValorDeCampo } from '@sgtm/api-client';
import { opcionPorRuta, pantallasDelModulo, seccionesDe } from '../catalogo';
import type { EstructuraDePantalla } from '../catalogo';
import {
  conOrden,
  conCambio,
  leerBusqueda,
  operacionDe,
  parametrosDeBusqueda,
  registroQueFalta,
  PAGINA,
} from './busqueda';
import { SIN_PERMISO, estadoDePantalla, textoDeError } from './estados';
import { useCatalogoVisible } from '../app/sesion/useCatalogoVisible';
import { useEscritura } from './escritura';
import { conexionDe } from './conexiones';
import type { Conexion } from './conexiones';
import { useDatosDeOperacion } from './useDatosDeOperacion';
import { useDatosDePantalla } from './useDatosDePantalla';
import { BarraDeAcciones } from './bloques/BarraDeAcciones';
import { Filtros } from './bloques/Filtros';
import { Formulario } from './bloques/Formulario';
import { Indicadores } from './bloques/Indicadores';
import { Portal } from './bloques/Portal';
import { Reporte } from './bloques/Reporte';
import { TablaDePantalla } from './bloques/TablaDePantalla';
import { Totales } from './bloques/Totales';

/**
 * **El renderizador.** Una sola pantalla para las 134 del manual.
 *
 * FRO-03 §2 lo dice sin rodeos: no se escriben 134 pantallas a mano. El
 * prototipo las declara como datos y este componente compone, en el orden que
 * fija FRO-03 §5, los bloques que cada descriptor declare.
 *
 * La division del trabajo, que es lo unico que hay que entender de este
 * archivo:
 *
 * - **el catalogo** dice que bloques hay y como son (que campos, que columnas);
 * - **la API** dice que dicen (que valores, que filas, que totales).
 *
 * Por eso la pantalla se dibuja entera antes de que llegue la respuesta —el
 * esqueleto ocupa el sitio exacto de cada dato— y por eso conectar el backend
 * no es reescribir nada: es apagar el proxy.
 */
export function Pantalla() {
  const { moduloId = '', ranura = '' } = useParams();
  const opcion = opcionPorRuta(moduloId, ranura);
  const catalogo = useCatalogoVisible();

  // Entrar por la URL a una opcion ajena no puede filtrar **ni el titulo ni los
  // campos** de lo que hay detras: no se dibuja la estructura, y punto. El
  // servidor responde 403 de todos modos —esto es comodidad, no seguridad—.
  if (opcion && !catalogo.puedeVer(opcion.id)) {
    return <Aviso tipo="sin-permiso" titulo={SIN_PERMISO.titulo} detalle={SIN_PERMISO.detalle} />;
  }

  if (!opcion) {
    return (
      <Aviso
        titulo="Esa opción no existe en el catálogo"
        detalle="El sistema tiene 134 opciones, las del manual. Usa Ctrl K para buscar la que necesitas."
      />
    );
  }

  // La estructura de un modulo llega en su propio trozo: entrar en Catastro no
  // descarga Transito.
  return <PantallaDelModulo key={opcion.id} moduloId={moduloId} opcion={opcion.id} />;
}

function PantallaDelModulo({
  moduloId,
  opcion,
}: {
  readonly moduloId: string;
  readonly opcion: string;
}) {
  /* El trozo del modulo se pide como cualquier otra cosa que tarda, y se queda:
     `staleTime` infinito porque el catalogo no cambia mientras la pestana este
     abierta —cambia cuando cambia la aplicacion, y entonces cambia su hash—. */
  const catalogo = useQuery({
    queryKey: ['catalogo', moduloId],
    queryFn: () => pantallasDelModulo(moduloId),
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const estructura = catalogo.data?.[opcion];

  // Mientras llega el trozo, el esqueleto: es lo que se veria de todos modos
  // hasta que respondiera la API.
  if (catalogo.isPending) return <Esqueleto alto={220} />;

  if (!estructura) {
    return (
      <Aviso
        titulo="Esa opción no existe en el catálogo"
        detalle="El sistema tiene 134 opciones, las del manual. Usa Ctrl K para buscar la que necesitas."
      />
    );
  }

  return <Contenido estructura={estructura} />;
}

type Estructura = EstructuraDePantalla;

/**
 * Los dos caminos, y por que hay dos.
 *
 * Una opcion **conectada** declara su operacion tipada y su adaptador
 * (`pantallas/conexiones.ts`); una opcion **sin conectar** pide por
 * `useDatosDePantalla` la forma que comparten las 134. Conviven a proposito:
 * conectar una no puede obligar a conectar las otras 133 el mismo dia.
 *
 * La eleccion se hace aqui, en dos componentes hermanos, y no dentro de uno con
 * un `if`: un hook no se llama a veces.
 */
function Contenido({ estructura }: { readonly estructura: Estructura }) {
  const conexion = conexionDe(estructura.id);
  return conexion === undefined ? (
    <ContenidoDelCatalogo estructura={estructura} />
  ) : (
    <ContenidoConectado estructura={estructura} conexion={conexion} />
  );
}

function ContenidoDelCatalogo({ estructura }: { readonly estructura: Estructura }) {
  const { codigo } = useParams();
  const operacion = operacionDe(estructura.id);
  const consulta = useDatosDePantalla(estructura);
  const falta = operacion === undefined ? undefined : registroQueFalta(operacion, codigo);

  return <Bloques estructura={estructura} consulta={consulta} faltaRegistro={falta} />;
}

function ContenidoConectado({
  estructura,
  conexion,
}: {
  readonly estructura: Estructura;
  readonly conexion: Conexion;
}) {
  const consulta = useDatosDeOperacion(conexion);
  return <Bloques estructura={estructura} consulta={consulta} />;
}

function Bloques({
  estructura,
  consulta,
  faltaRegistro,
}: {
  readonly estructura: Estructura;
  readonly consulta: ReturnType<typeof useDatosDePantalla>;
  /** Nombre del parametro que la pantalla necesita y todavia no tiene. */
  readonly faltaRegistro?: string;
}) {
  const [pestana, fijarPestana] = useState(0);
  const [cerradas, fijarCerradas] = useState<Readonly<Record<string, boolean>>>({});
  const [busqueda, fijarBusqueda] = useSearchParams();
  const navegar = useNavigate();
  const catalogo = useCatalogoVisible();
  const { moduloId = '', ranura = '', codigo } = useParams();

  const busquedaActiva = leerBusqueda(busqueda);
  const operacion = operacionDe(estructura.id);
  // Una operacion que escribe no se pide al abrir la pantalla: abrir «Copias de
  // seguridad» no puede lanzar un respaldo. La pantalla se dibuja de su catalogo
  // y espera a que alguien pulse.
  const pide = operacion !== undefined && !escribe(operacion);
  const estado = estadoDePantalla(consulta, faltaRegistro, pide);
  // Los niveles de accesibilidad apagan **acciones**, no solo opciones: ver una
  // ficha sin poder modificarla es un perfil de consulta, no un error.
  const puedeEscribirAqui = catalogo.puedeEscribir(estructura.id);
  const escritura = useEscritura(
    operacion !== undefined && escribe(operacion) && puedeEscribirAqui ? operacion : undefined,
    operacion === undefined ? {} : parametrosDeBusqueda(operacion, codigo, busqueda),
  );
  // El registro que abre esta pantalla, si abre alguno: `codRefCatastral`, `placa`…
  const registro =
    operacion === undefined ? undefined : descriptorDe(operacion).parametrosDeRuta[0];
  // Sin registro no hay peticion, asi que tampoco hay carga que esperar: lo que
  // toca es decir que falta elegir uno.
  const cargando = consulta.isPending && faltaRegistro === undefined;
  const datos = consulta.data;
  const valores: Readonly<Record<string, ValorDeCampo>> = datos?.campos ?? {};
  const secciones = seccionesDe(estructura, pestana);

  // El error y el sin permiso son de la pantalla entera, no de un bloque: hay
  // una peticion por pantalla, y no puede fallar la tabla y no el formulario.
  // **Ninguno de los dos dibuja la estructura**: entrar sin permiso no puede
  // filtrar ni el titulo ni los campos de lo que hay detras (REQ-03 §5).
  if (estado === 'sin-permiso') {
    return <Aviso tipo="sin-permiso" titulo={SIN_PERMISO.titulo} detalle={SIN_PERMISO.detalle} />;
  }

  if (estado === 'error') {
    // El backend redacta el mensaje en castellano y en lenguaje del dominio
    // (RNF-080); aqui no se reescribe ni se sustituye por uno generico.
    const texto = textoDeError(consulta.error);
    return (
      <Aviso tipo="error" titulo={texto.titulo} detalle={texto.detalle} traza={texto.traza}>
        {/* Reintentar tiene sentido en una consulta y **nunca** en una
            escritura: repetir un cobro es cobrar dos veces (FRO-04 §5). */}
        <Boton onClick={() => void consulta.refetch()}>Reintentar</Boton>
      </Aviso>
    );
  }

  return (
    <>
      {estructura.desc && <p className="sgtm-descripcion">{estructura.desc}</p>}

      {estructura.kind === 'dash' && (
        <Indicadores kpis={datos?.kpis} paneles={datos?.paneles} cargando={cargando} />
      )}

      {estructura.kind === 'portal' && <Portal pasos={estructura.steps ?? []} />}

      {estado === 'sin-registro' && (
        <Aviso
          titulo="Elige un registro para abrirlo"
          detalle={`Esta pantalla abre un registro por su «${faltaRegistro}». Búscalo arriba, o pega el enlace de la ficha: el registro abierto va en la dirección, así que ese enlace se puede compartir.`}
        />
      )}

      {estructura.filtros && (
        <Filtros
          campos={estructura.filtros}
          buscado={busquedaActiva.filtros}
          cargando={consulta.isFetching}
          // Buscar reescribe la URL: es donde vive lo buscado. Y devuelve a la
          // primera pagina, porque la pagina 7 de otra busqueda no es ninguna.
          onBuscar={(valores) => {
            const siguiente = conCambio(new URLSearchParams(busqueda), {
              ...vaciar(busquedaActiva.filtros),
              ...valores,
              [PAGINA]: undefined,
            });

            // Buscar por el identificador del registro **abre** ese registro: se
            // va a la ruta de la ficha, no a la lista filtrada. El resto de la
            // busqueda se conserva, y el enlace que queda es compartible.
            const elegido = registro === undefined ? undefined : valores[registro];
            if (registro !== undefined && elegido !== undefined && elegido !== '') {
              siguiente.delete(registro);
              const consulta = siguiente.toString();
              navegar(
                `/${moduloId}/${ranura}/${encodeURIComponent(elegido)}${consulta === '' ? '' : `?${consulta}`}`,
              );
              return;
            }
            fijarBusqueda(siguiente);
          }}
        />
      )}

      {estructura.tabla && (
        <TablaDePantalla
          estructura={estructura.tabla}
          datos={datos?.tabla}
          cargando={cargando}
          hayFiltros={Object.keys(busquedaActiva.filtros).length > 0}
          {...(busquedaActiva.orden === undefined ? {} : { orden: busquedaActiva.orden })}
          sentido={busquedaActiva.sentido}
          onOrdenar={(clave) => fijarBusqueda(conOrden(new URLSearchParams(busqueda), clave))}
          onPagina={(pagina) =>
            fijarBusqueda(
              conCambio(new URLSearchParams(busqueda), {
                [PAGINA]: pagina <= 1 ? undefined : String(pagina),
              }),
            )
          }
        />
      )}

      {estructura.totales && (
        <Totales
          estructura={estructura.totales}
          datos={datos?.totales}
          fechaCalculo={datos?.fechaCalculo}
          cargando={cargando}
        />
      )}

      {estructura.tabs && estructura.tabs.length > 0 && (
        <div className="sgtm-pestanas" role="tablist" aria-label="Secciones de la pantalla">
          {estructura.tabs.map((tab, i) => (
            <button
              key={tab.label}
              type="button"
              role="tab"
              aria-selected={i === pestana}
              className="sgtm-pestanas__tab"
              data-activa={i === pestana ? '1' : '0'}
              onClick={() => {
                fijarPestana(i);
                // Cambiar de pestana resetea el colapso, como en el prototipo.
                fijarCerradas({});
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {secciones.length > 0 && (
        <Formulario
          secciones={secciones}
          valores={valores}
          cargando={cargando}
          cerradas={cerradas}
          pestana={pestana}
          onAlternar={(clave, cerrada) =>
            fijarCerradas((previas) => ({ ...previas, [clave]: cerrada }))
          }
        />
      )}

      {estructura.kind === 'report' && estructura.reporte && (
        <Reporte estructura={estructura.reporte} datos={datos?.reporte} cargando={cargando} />
      )}

      {cargando && !estructura.kind && !estructura.tabla && secciones.length === 0 && (
        <Esqueleto alto={120} />
      )}

      {estructura.acciones && (
        <BarraDeAcciones acciones={estructura.acciones} escritura={escritura} />
      )}
    </>
  );
}

/**
 * Los filtros de antes, puestos a `undefined`, para que una busqueda nueva
 * **quite** los que ya no estan en vez de dejarlos pegados en la URL.
 */
function vaciar(filtros: Readonly<Record<string, string>>): Record<string, undefined> {
  return Object.fromEntries(Object.keys(filtros).map((nombre) => [nombre, undefined]));
}
