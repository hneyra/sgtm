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
import { NO_DISPONIBLE, SIN_PERMISO, estadoDePantalla, textoDeError } from './estados';
import { useCatalogoVisible } from '../app/sesion/useCatalogoVisible';
import { useEscritura } from './escritura';
import { useFocoTrasGuardar } from './foco';
import { avisoDe } from './avisos';
import { escrituraDe } from './escrituras';
import { useEjercicio } from '../app/ejercicio';
import { conexionDe } from './conexiones';
import type { Conexion } from './conexiones';
import { useDatosDeOperacion } from './useDatosDeOperacion';
import { useDatosDePantalla } from './useDatosDePantalla';
import { BarraDeAcciones } from './bloques/BarraDeAcciones';
import { Filtros } from './bloques/Filtros';
import { Formulario } from './bloques/Formulario';
import { Indicadores } from './bloques/Indicadores';
import { Portal } from './bloques/Portal';
import { FechaDeCalculo } from './bloques/FechaDeCalculo';
import { Reporte } from './bloques/Reporte';
import { useDescargaDeArchivo } from './useDescargaDeArchivo';
import { ActualizacionDeCatastro } from './catastro/ActualizacionDeCatastro';
import { ValoresUnitarios } from './catastro/ValoresUnitarios';
import { Depreciacion } from './catastro/Depreciacion';
import { TablaDePantalla } from './bloques/TablaDePantalla';
import { Versionado } from './bloques/Versionado';
import { Totales } from './bloques/Totales';
import { PermisosMatrix } from './seguridad/PermisosMatrix';
import { MiembrosDeGrupo } from './seguridad/MiembrosDeGrupo';
import { Respaldos } from './seguridad/Respaldos';

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

/** Las pantallas cuyo recurso trae version y vigencia. Hoy, las cuatro fichas. */
const VERSIONADAS: ReadonlySet<string> = new Set([
  'ficha_urbana',
  'ficha_economica',
  'ficha_bienes',
  'ficha_rural',
]);

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
/**
 * Opciones cuyo cuerpo no cabe en ninguno de los dos caminos comunes —campos
 * planos o tabla de solo lectura— y viven en su propio componente.
 *
 *   permisos                 (#70) su cuerpo es una lista de niveles, no
 *                            campos planos ni una tabla de solo lectura, y
 *                            necesita los dos verbos de su ruta a la vez
 *                            —leer para cargar la matriz, escribir para
 *                            guardarla—.
 *   miembros                 (#70) escribe un booleano (`activo`), y
 *                            `CampoDelCuerpo` solo sabe de texto y enteros.
 *   respaldo                 (#70) su verbo es `POST` pero el controlador
 *                            solo consulta: la aplicacion no puede ejecutar
 *                            copias de seguridad (ARQ-03 §4), asi que sus
 *                            botones se quedan deshabilitados en vez de
 *                            conectarse a una escritura que no hace lo que
 *                            dice.
 *   actualizacion_catastro   (#71) guarda una lista de construcciones, no
 *                            campos planos, y necesita el `GET` de
 *                            `ficha_urbana` para no borrar pisos que no se
 *                            estan tocando.
 *   valores_unitarios,       (#71) el backend publica una fila por
 *   depreciacion             partida/estado y tramo; el prototipo dibuja
 *                            una matriz. Agrupar y cruzar eso no es un
 *                            adaptador de los que ya existen, y las dos
 *                            siguen bloqueadas por D-02a en su contenido,
 *                            no en su forma.
 *
 * Viven en su propio componente en vez de forzar al renderizador comun a
 * saber de listas, de booleanos o de un verbo que miente.
 */
const COMPONENTES_PROPIOS: Readonly<
  Record<string, (props: { readonly estructura: Estructura }) => React.JSX.Element>
> = {
  permisos: PermisosMatrix,
  miembros: MiembrosDeGrupo,
  respaldo: Respaldos,
  actualizacion_catastro: ActualizacionDeCatastro,
  valores_unitarios: ValoresUnitarios,
  depreciacion: Depreciacion,
};

function Contenido({ estructura }: { readonly estructura: Estructura }) {
  const Propio = COMPONENTES_PROPIOS[estructura.id];
  if (Propio !== undefined) {
    return <Propio estructura={estructura} />;
  }
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
  // La ficha de un predio se abre por su codigo. Sin codigo no hay peticion, y
  // lo que toca decir es que falta elegir uno —no dibujar un esqueleto para
  // siempre—.
  const { consulta, falta } = useDatosDeOperacion(conexion);
  return (
    <Bloques
      estructura={estructura}
      consulta={consulta}
      {...(falta === undefined ? {} : { faltaRegistro: falta })}
    />
  );
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
  // Que campos puede mandar esta opcion, y si lo que guarda es global a la
  // sesion. Sin declaracion, el formulario no se escribe y solo viaja la
  // observacion: negacion por omision, como la autorizacion del manual.
  const declarada = escrituraDe(estructura.id);
  const aviso = avisoDe(estructura.id);
  const trabajo = useEjercicio();
  // La unica pantalla que descarga un archivo en vez de dibujar JSON (#71). El
  // hook se llama siempre —no se puede llamar a un hook a veces— y se pasa al
  // bloque de reporte solo cuando esta es la pantalla, para que las otras doce
  // sigan con su boton deshabilitado de siempre.
  const descargaDeFicha = useDescargaDeArchivo('ficha_contribuyente_reporte', {
    codigo: codigo ?? '',
  });
  const escritura = useEscritura(
    operacion !== undefined && escribe(operacion) && puedeEscribirAqui ? operacion : undefined,
    operacion === undefined ? {} : parametrosDeBusqueda(operacion, codigo, busqueda),
    {
      campos: declarada?.campos ?? {},
      ...(declarada?.cambiaElEjercicio === true ? { alGuardar: trabajo.adoptar } : {}),
    },
  );
  // El registro que abre esta pantalla, si abre alguno: `codRefCatastral`, `placa`…
  const registro =
    operacion === undefined ? undefined : descriptorDe(operacion).parametrosDeRuta[0];
  // Sin peticion no hay carga que esperar, y hay dos formas de no tener
  // peticion: que falte el registro que abre la pantalla, o que la operacion
  // escriba —esas no se piden al abrir—. Sin este `pide`, una pantalla que
  // escribe se quedaba con todos sus campos en esqueleto y deshabilitados para
  // siempre, porque su consulta nunca deja de estar pendiente.
  const cargando = pide && consulta.isPending && faltaRegistro === undefined;
  const datos = consulta.data;
  const valores: Readonly<Record<string, ValorDeCampo>> = datos?.campos ?? {};
  const secciones = seccionesDe(estructura, pestana);
  // Las cuatro fichas: su backend versiona y nunca sobrescribe (#18). Se sabe
  // aqui y no por el catalogo porque es una propiedad de la operacion, no del
  // dibujo —el prototipo no tiene forma de expresarla—.
  const esVersionada = VERSIONADAS.has(estructura.id);
  // Tras cobrar, el foco vuelve al campo de identificacion: entra el siguiente
  // contribuyente y hay que poder teclear su documento sin buscar donde.
  const refDeBusqueda = useFocoTrasGuardar(escritura.enviada);

  // El error y el sin permiso son de la pantalla entera, no de un bloque: hay
  // una peticion por pantalla, y no puede fallar la tabla y no el formulario.
  // **Ninguno de los dos dibuja la estructura**: entrar sin permiso no puede
  // filtrar ni el titulo ni los campos de lo que hay detras (REQ-03 §5).
  if (estado === 'sin-permiso') {
    return <Aviso tipo="sin-permiso" titulo={SIN_PERMISO.titulo} detalle={SIN_PERMISO.detalle} />;
  }

  // La operacion esta en el contrato pero el backend todavia no la sirve (404).
  // No es un error: ni traza que dictar ni «Reintentar» —daria el mismo 404
  // hasta que se publique el endpoint—. Tampoco dibuja la estructura, igual que
  // el sin permiso: no hay datos que ensenar.
  if (estado === 'no-disponible') {
    return <Aviso titulo={NO_DISPONIBLE.titulo} detalle={NO_DISPONIBLE.detalle} />;
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

      {/* A que fecha estan los datos que vienen debajo. Va aqui y no dentro de
          la banda de totales porque es de la respuesta: una pantalla que ensena
          cifras en una tabla y no tiene banda las ensenaba sin fecha (regla 9). */}
      <FechaDeCalculo {...(datos?.fechaCalculo ? { fecha: datos.fechaCalculo } : {})} />

      {/* Lo que esta pantalla **no** manda, dicho antes de que alguien lo
          teclee. Sale de la escritura declarada, no del catalogo: es una
          propiedad de la operacion, no del dibujo. */}
      {declarada?.nota !== undefined && (
        <Aviso titulo="Cómo funciona esta pantalla" detalle={declarada.nota} />
      )}

      {/* Y lo que hay que saber **de lo que se esta mirando**: que es una copia
          de trabajo y el padron todavia no la recoge (#80). */}
      {aviso !== undefined && <Aviso titulo={aviso.titulo} detalle={aviso.detalle} />}

      {estructura.kind === 'dash' && (
        <Indicadores kpis={datos?.kpis} paneles={datos?.paneles} cargando={cargando} />
      )}

      {estructura.kind === 'portal' && <Portal pasos={estructura.steps ?? []} />}

      {/* Que version se esta viendo va **antes** que sus datos: es lo que dice
          de cuando son los numeros que vienen debajo. Solo lo traen las
          pantallas cuyo backend no sobrescribe. */}
      {(datos?.versionado !== undefined || (cargando && esVersionada)) && (
        <Versionado
          {...(datos?.versionado ? { datos: datos.versionado } : {})}
          cargando={cargando}
        />
      )}

      {estado === 'sin-registro' && (
        <Aviso
          titulo="Elige un registro para abrirlo"
          detalle={`Esta pantalla abre un registro por su «${faltaRegistro}». Búscalo arriba, o pega el enlace de la ficha: el registro abierto va en la dirección, así que ese enlace se puede compartir.`}
        />
      )}

      {estructura.filtros && (
        <div ref={refDeBusqueda}>
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
        </div>
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
        <Totales estructura={estructura.totales} datos={datos?.totales} cargando={cargando} />
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
          escribibles={escritura.campos}
          borrador={escritura.borrador}
          onCampo={escritura.fijarCampo}
          errorPorCampo={escritura.errorPorCampo}
          onAlternar={(clave, cerrada) =>
            fijarCerradas((previas) => ({ ...previas, [clave]: cerrada }))
          }
        />
      )}

      {estructura.kind === 'report' && estructura.reporte && (
        <Reporte
          estructura={estructura.reporte}
          datos={datos?.reporte}
          cargando={cargando}
          {...(estructura.id === 'ficha_contribuyente_reporte'
            ? { descargas: descargaDeFicha }
            : {})}
        />
      )}

      {cargando && !estructura.kind && !estructura.tabla && secciones.length === 0 && (
        <Esqueleto alto={120} />
      )}

      {estructura.acciones && (
        <BarraDeAcciones
          acciones={estructura.acciones}
          escritura={escritura}
          // Sobre cuantos actua: lo cuenta el backend —«47 valores»— y aqui solo
          // se traslada. Contar las filas dibujadas diria «20», que es cuantas
          // caben en la pagina, no cuantas se van a emitir.
          {...(datos?.tabla?.conteo === undefined ? {} : { alcance: datos.tabla.conteo })}
        />
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
