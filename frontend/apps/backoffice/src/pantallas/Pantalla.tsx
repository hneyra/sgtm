import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Aviso, Esqueleto } from '@sgtm/design-system';
import { ProblemaDeApi, descriptorDe } from '@sgtm/api-client';
import type { ValorDeCampo } from '@sgtm/api-client';
import { opcionPorRuta, pantallaDe, seccionesDe } from '../catalogo';
import {
  conOrden,
  conCambio,
  leerBusqueda,
  operacionDe,
  registroQueFalta,
  PAGINA,
} from './busqueda';
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
  const estructura = opcion ? pantallaDe(opcion.id) : undefined;

  if (!estructura) {
    return (
      <Aviso
        titulo="Esa opción no existe en el catálogo"
        detalle="El sistema tiene 134 opciones, las del manual. Usa Ctrl K para buscar la que necesitas."
      />
    );
  }

  return <Contenido key={estructura.id} estructura={estructura} />;
}

type Estructura = NonNullable<ReturnType<typeof pantallaDe>>;

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
  const operacion = operacionDe(estructura);
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
  const { moduloId = '', ranura = '' } = useParams();

  const estado = leerBusqueda(busqueda);
  const operacion = operacionDe(estructura);
  // El registro que abre esta pantalla, si abre alguno: `codRefCatastral`, `placa`…
  const registro =
    operacion === undefined ? undefined : descriptorDe(operacion).parametrosDeRuta[0];
  // Sin registro no hay peticion, asi que tampoco hay carga que esperar: lo que
  // toca es decir que falta elegir uno.
  const cargando = consulta.isPending && faltaRegistro === undefined;
  const datos = consulta.data;
  const valores: Readonly<Record<string, ValorDeCampo>> = datos?.campos ?? {};
  const secciones = seccionesDe(estructura, pestana);

  if (consulta.isError) {
    const problema = consulta.error instanceof ProblemaDeApi ? consulta.error : null;
    return (
      <Aviso
        tipo="error"
        // El backend redacta el mensaje en castellano y en lenguaje del dominio
        // (RNF-080); aqui no se reescribe ni se sustituye por uno generico.
        titulo={problema?.titulo ?? 'No se pudieron cargar los datos'}
        detalle={problema?.detalle ?? 'Vuelve a intentarlo; si persiste, avisa a soporte.'}
        traza={problema?.traza}
      />
    );
  }

  return (
    <>
      {estructura.desc && <p className="sgtm-descripcion">{estructura.desc}</p>}

      {estructura.kind === 'dash' && (
        <Indicadores kpis={datos?.kpis} paneles={datos?.paneles} cargando={cargando} />
      )}

      {estructura.kind === 'portal' && <Portal pasos={estructura.steps ?? []} />}

      {faltaRegistro !== undefined && (
        <Aviso
          titulo="Elige un registro para abrirlo"
          detalle={`Esta pantalla abre un registro por su «${faltaRegistro}». Búscalo abajo y ábrelo desde la tabla; el enlace que quede en la barra de direcciones es el de ese registro.`}
        />
      )}

      {estructura.filtros && (
        <Filtros
          campos={estructura.filtros}
          buscado={estado.filtros}
          cargando={consulta.isFetching}
          // Buscar reescribe la URL: es donde vive lo buscado. Y devuelve a la
          // primera pagina, porque la pagina 7 de otra busqueda no es ninguna.
          onBuscar={(valores) => {
            const siguiente = conCambio(new URLSearchParams(busqueda), {
              ...vaciar(estado.filtros),
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
          {...(estado.orden === undefined ? {} : { orden: estado.orden })}
          sentido={estado.sentido}
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

      {estructura.acciones && <BarraDeAcciones acciones={estructura.acciones} />}
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
