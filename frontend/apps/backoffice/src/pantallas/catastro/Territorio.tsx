import { useId, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Aviso, Boton, Campo, FechaDeCalculo } from '@sgtm/design-system';
import type { Celda, DatosDePantalla, DetalleDeFila } from '@sgtm/api-client';
import type { EstructuraDePantalla } from '../../catalogo';
import { opcionPorId, seccionesDe } from '../../catalogo';
import { useCatalogoVisible } from '../../app/sesion/useCatalogoVisible';
import { useEjercicio } from '../../app/ejercicio';
import { conexionDe } from '../conexiones';
import type { Conexion } from '../conexiones';
import { composicionDe, filtrosDe } from '../composicion';
import { useDatosDeOperacion } from '../useDatosDeOperacion';
import { NO_DISPONIBLE, SIN_PERMISO, estadoDePantalla, textoDeError } from '../estados';
import { avisoDe } from '../prosa';
import { PAGINA, conCambio, conOrden, leerBusqueda } from '../busqueda';
import { BarraDeAcciones } from '../bloques/BarraDeAcciones';
import { Filtros } from '../bloques/Filtros';
import { Formulario } from '../bloques/Formulario';
import { PanelDeAlta } from '../bloques/PanelDeAlta';
import type { AltaAbierta } from '../bloques/PanelDeAlta';
import { TablaDePantalla } from '../bloques/TablaDePantalla';
import { SIN_DATO } from '../seguridad/listado';
import { CodigoCatastral } from './CodigoCatastral';
import { LONGITUD_DEL_CODIGO, conTramoDelCodigo, normalizarCodigoCatastral } from './codigo';

/**
 * **El territorio, en una sola superficie**: sectores, manzanas y vías.
 *
 * Las dos opciones del bloque «Territorio» del catálogo describen el mismo
 * objeto. Un sector se subdivide en manzanas y las manzanas las limitan vías;
 * el código de referencia catastral lleva dentro el tramo de sector y el de
 * manzana, y el domicilio fiscal lleva la vía. Separadas en dos pantallas, pasar
 * de «la manzana 003 del sector 01» a «qué calle la limita» era volver al menú.
 *
 * **Lo que no cambia, y es lo importante**: las dos rutas siguen siendo dos
 * —`/catastro/sectores` y `/catastro/calles`—, con su identificador, su entrada
 * de menú y **su permiso**. Este componente no las fusiona: las dibuja en la
 * misma superficie con la hoja que abre decidida por la ruta. Cambiar de pestaña
 * **navega**, no cambia un `useState`:
 *
 * - el enlace de lo que se está mirando se puede compartir, que es la mitad de
 *   FRO-04 §5;
 * - el permiso lo sigue decidiendo el guardia de `Pantalla`, que se ejecuta al
 *   entrar por la ruta. Con estado local, quien no tiene «Vías y calles» podría
 *   llegar a ella desde la pestaña sin pasar por ningún guardia —el servidor
 *   contestaría 403, pero la pantalla ya habría dibujado su estructura, que es
 *   justo lo que REQ-03 §5 prohíbe—.
 *
 * Y por eso la pestaña de una opción **que este perfil no puede ver no se
 * dibuja**: ofrecerla sería ofrecer un enlace a un aviso de «no tienes permiso».
 *
 * **Ninguna cifra se compone aquí.** El árbol pinta los conteos que
 * `SectorResource` manda, por la misma función que los pintaba en la tabla
 * (`conteo` de `catastro/index.ts`): número, se muestra; nulo, «—». Un `0`
 * significaría «ninguna», que es una afirmación distinta y que nadie ha
 * comprobado.
 */

const SECTORES = 'sectores';
const CALLES = 'calles';

/**
 * Las columnas de la tabla de sectores del catálogo, por lo que significan.
 *
 * El árbol lee **las mismas celdas** que dibujaba la tabla, así que los índices
 * son los del catálogo portado y no una lista nueva. Se nombran porque
 * `fila[4]` no dice nada y porque el día que el prototipo mueva una columna, lo
 * que hay que cambiar es esta tabla y nada más.
 */
const COLUMNA = {
  codigo: 0,
  nombre: 1,
  manzanas: 2,
  lotes: 3,
  predios: 4,
  zona: 5,
  estado: 6,
} as const;

/** Lo que el árbol tiene señalado: un sector, y dentro de él quizá una manzana. */
interface Senalado {
  readonly sector: string;
  readonly manzana?: string;
}

export function Territorio({ estructura }: { readonly estructura: EstructuraDePantalla }) {
  const catalogo = useCatalogoVisible();
  const ruta = useParams();
  const [busqueda, fijarBusqueda] = useSearchParams();
  const { ejercicio } = useEjercicio();

  const hoja = estructura.id === CALLES ? CALLES : SECTORES;
  const puedeVerElTerritorio = catalogo.puedeVer(SECTORES);
  const puedeRegistrarTerritorio = catalogo.puedeRegistrar(SECTORES);

  // La hoja activa pide **su** operación, con la conexión que ya existe: sus
  // parámetros, su lector y su adaptador (`catastro/index.ts`).
  const { consulta } = useDatosDeOperacion(conexionDelTerritorio(estructura.id));

  /* El árbol lee siempre sectores. En la hoja de sectores es **la misma
     consulta** —misma clave de caché, porque los parámetros salen de la misma
     conexión y de la misma URL—, así que no sale ninguna petición de más; en la
     de vías es una segunda, y sin permiso sobre sectores no sale ninguna. */
  const conexionDeSectores = conexionDelTerritorio(SECTORES);
  const parametrosDelArbol = conexionDeSectores.parametros({
    ruta,
    busqueda,
    ejercicio,
    borrador: SIN_BORRADOR,
  });
  const arbol = useQuery<DatosDePantalla>({
    queryKey: ['operacion', SECTORES, parametrosDelArbol],
    queryFn: ({ signal }) => conexionDeSectores.cargar(parametrosDelArbol, signal),
    enabled: puedeVerElTerritorio,
  });

  const [abierto, fijarAbierto] = useState<string | null>(null);
  const [senalado, fijarSenalado] = useState<Senalado | null>(null);
  const [buscadoEnElArbol, fijarBuscadoEnElArbol] = useState('');
  const [altaAbierta, fijarAltaAbierta] = useState<AltaAbierta | null>(null);
  const [cerradas, fijarCerradas] = useState<Readonly<Record<string, boolean>>>({});
  // Lo tecleado del código de referencia catastral. Los tramos de sector y
  // manzana **no viven aquí**: los pone el árbol, y se ven al componer.
  const [tecleado, fijarTecleado] = useState('');

  const estado = estadoDePantalla(consulta);

  /* El error, el sin permiso y el no disponible son de la pantalla entera, y
     **ninguno dibuja la estructura** (FRO-01 §7, REQ-03 §5): ni el árbol, ni las
     pestañas, ni la tabla que hay detrás. Es el mismo reparto que el
     renderizador común, y por el mismo motivo: hay una respuesta por hoja, así
     que no puede fallar la tabla y no el resto. */
  if (estado === 'sin-permiso') {
    return <Aviso tipo="sin-permiso" titulo={SIN_PERMISO.titulo} detalle={SIN_PERMISO.detalle} />;
  }
  if (estado === 'no-disponible') {
    return <Aviso titulo={NO_DISPONIBLE.titulo} detalle={NO_DISPONIBLE.detalle} />;
  }
  if (estado === 'error') {
    const texto = textoDeError(consulta.error);
    return (
      <Aviso tipo="error" titulo={texto.titulo} detalle={texto.detalle} traza={texto.traza}>
        <Boton onClick={() => void consulta.refetch()}>Reintentar</Boton>
      </Aviso>
    );
  }

  const datos = consulta.data;
  const cargando = consulta.isPending;
  const aviso = avisoDe(estructura.id);
  const composicionDelTerritorio = composicionDe(SECTORES);
  const composicionDeLaHoja = composicionDe(estructura.id);
  const filas = arbol.data?.tabla?.filas ?? [];
  const detalles = arbol.data?.tabla?.detalles ?? [];

  return (
    <>
      {estructura.desc && <p className="sgtm-descripcion">{estructura.desc}</p>}

      <FechaDeCalculo {...(datos?.fechaCalculo ? { fecha: datos.fechaCalculo } : {})} />

      {aviso !== undefined && <Aviso titulo={aviso.titulo} detalle={aviso.detalle} />}

      <div className="sgtm-territorio">
        {puedeVerElTerritorio && (
          <Carril
            filas={filas}
            detalles={detalles}
            cargando={arbol.isPending}
            errado={arbol.isError}
            buscado={buscadoEnElArbol}
            onBuscar={fijarBuscadoEnElArbol}
            abierto={abierto}
            senalado={senalado}
            puedeRegistrar={puedeRegistrarTerritorio}
            onSector={(codigo) => {
              fijarSenalado({ sector: codigo });
              fijarAbierto((previo) => (previo === codigo ? null : codigo));
            }}
            onManzana={(sector, manzana) => fijarSenalado({ sector, manzana })}
            onNuevoSector={() => fijarAltaAbierta({ indice: 0 })}
            onNuevaManzana={(sector) => fijarAltaAbierta({ deFila: true, contexto: sector })}
          />
        )}

        <div className="sgtm-territorio__panel">
          <div className="sgtm-pestanas" role="tablist" aria-label="Hojas del territorio">
            {[SECTORES, CALLES]
              // **La guarda del permiso, opción por opción.** Sin ella, la barra
              // ofrece un enlace a una pantalla que contesta «no tienes permiso».
              .filter((opcion) => catalogo.puedeVer(opcion))
              .map((opcion) => {
                const situada = opcionPorId(opcion);
                if (situada === undefined) return null;
                return (
                  <Link
                    key={opcion}
                    to={situada.ruta}
                    role="tab"
                    aria-selected={opcion === hoja}
                    className="sgtm-pestanas__tab"
                    data-activa={opcion === hoja ? '1' : '0'}
                  >
                    {/* El rótulo del catálogo, sin reescribir (RNF-080): la
                        pestaña lleva a **esa** pantalla, y su nombre es su
                        título. */}
                    {situada.title}
                  </Link>
                );
              })}
          </div>

          {hoja === SECTORES ? (
            <HojaDeSectores
              estructura={estructura}
              filas={filas}
              senalado={senalado}
              tecleado={tecleado}
              onTecleado={fijarTecleado}
            />
          ) : (
            <HojaDeVias
              estructura={estructura}
              datos={datos}
              cargando={cargando}
              buscando={consulta.isFetching}
              busqueda={busqueda}
              onBusqueda={fijarBusqueda}
              cerradas={cerradas}
              onAlternar={(clave, cerrada) =>
                fijarCerradas((previas) => ({ ...previas, [clave]: cerrada }))
              }
              puedeRegistrar={catalogo.puedeRegistrar(estructura.id)}
              onAlta={() => fijarAltaAbierta({ indice: 0 })}
            />
          )}
        </div>
      </div>

      {/* Las altas del territorio cuelgan **siempre de `sectores`** cuando son
          de sector o de manzana, y de la hoja activa cuando son de vía: es de
          donde salen sus formularios en `catastro/composicion.ts`, y de donde
          sale el privilegio que el `POST` exige. */}
      {altaAbierta !== null && (
        <PanelDeAlta
          composicion={
            hoja === CALLES && altaAbierta.deFila !== true
              ? composicionDeLaHoja
              : composicionDelTerritorio
          }
          abierta={altaAbierta}
          onCerrar={() => fijarAltaAbierta(null)}
        />
      )}
    </>
  );
}

/**
 * El carril del territorio: buscador, árbol y el alta que lo alimenta.
 *
 * **No es un `role="tree"` de ARIA**, y no por descuido: un árbol ARIA promete
 * navegación con las flechas —arriba, abajo, derecha para desplegar— y prometer
 * lo que no se cumple es peor que no prometerlo (el hallazgo de #296 con la
 * barra de pestañas). Lo que hay es lo que se cumple: una lista de bloques que
 * se despliegan, cada uno con su `aria-expanded`, recorribles con el tabulador.
 */
function Carril({
  filas,
  detalles,
  cargando,
  errado,
  buscado,
  onBuscar,
  abierto,
  senalado,
  puedeRegistrar,
  onSector,
  onManzana,
  onNuevoSector,
  onNuevaManzana,
}: {
  readonly filas: readonly (readonly Celda[])[];
  readonly detalles: readonly DetalleDeFila[];
  readonly cargando: boolean;
  readonly errado: boolean;
  readonly buscado: string;
  readonly onBuscar: (valor: string) => void;
  readonly abierto: string | null;
  readonly senalado: Senalado | null;
  readonly puedeRegistrar: boolean;
  readonly onSector: (codigo: string) => void;
  readonly onManzana: (sector: string, manzana: string) => void;
  readonly onNuevoSector: () => void;
  readonly onNuevaManzana: (sector: string) => void;
}) {
  const alta = composicionDe(SECTORES).altas?.[0];
  const altaDeFila = composicionDe(SECTORES).altaDeFila;
  const visibles = filas
    .map((fila, indice) => ({ fila, detalle: detalles[indice] }))
    .filter(({ fila }) => casa(fila, buscado));

  return (
    <aside className="sgtm-territorio__carril" aria-label="Territorio">
      <Campo
        etiqueta="Buscar sector"
        tipo="text"
        valor={buscado}
        ph="Código o denominación"
        // **Acota lo que el servidor ya devolvió**, no vuelve a pedir: el
        // catálogo territorial de una municipalidad son decenas de sectores y
        // cabe en una respuesta. El filtro que sí viaja es el de la dirección
        // —`?sector=`, que la conexión sigue leyendo—, así que un enlace
        // compartido con él puesto sigue acotando contra el servidor.
        ayuda="Acota los sectores que ya se cargaron."
        onCambio={onBuscar}
      />

      {errado ? (
        <p className="sgtm-territorio__vacio">
          No se pudo leer el catálogo territorial. Vuelve a abrir la pantalla; lo de la derecha
          sigue siendo válido.
        </p>
      ) : cargando ? (
        <p className="sgtm-territorio__vacio">Cargando el territorio…</p>
      ) : visibles.length === 0 ? (
        <p className="sgtm-territorio__vacio">
          {filas.length === 0
            ? 'Todavía no hay sectores registrados.'
            : 'Ningún sector cargado coincide con lo que buscas.'}
        </p>
      ) : (
        <ul className="sgtm-arbol">
          {visibles.map(({ fila, detalle }) => {
            const codigo = celda(fila, COLUMNA.codigo);
            const desplegado = abierto === codigo;
            return (
              <li key={codigo} className="sgtm-arbol__sector">
                <button
                  type="button"
                  className="sgtm-arbol__nodo"
                  aria-expanded={desplegado}
                  data-senalado={
                    senalado?.sector === codigo && senalado.manzana === undefined ? '1' : '0'
                  }
                  onClick={() => onSector(codigo)}
                >
                  <span aria-hidden="true">{desplegado ? '▾' : '▸'}</span>
                  <span className="sgtm-arbol__codigo">{codigo}</span>
                  <span className="sgtm-arbol__nombre">{celda(fila, COLUMNA.nombre)}</span>
                  {/* El conteo **tal como llegó**: `conteo` de `catastro/index.ts`
                      ya decidió que un nulo es «—» y no un cero. */}
                  <span className="sgtm-arbol__conteo">{celda(fila, COLUMNA.predios)} predios</span>
                </button>

                {desplegado && (
                  <div className="sgtm-arbol__detalle">
                    {detalle !== undefined && detalle.items.length > 0 && (
                      <ul className="sgtm-arbol__manzanas">
                        {detalle.items.map((item, i) => (
                          <li key={`${i}-${item.texto}`}>
                            <button
                              type="button"
                              className="sgtm-arbol__nodo sgtm-arbol__nodo--manzana"
                              data-senalado={
                                senalado?.sector === codigo && senalado.manzana === item.texto
                                  ? '1'
                                  : '0'
                              }
                              onClick={() => onManzana(codigo, item.texto)}
                            >
                              <span className="sgtm-arbol__codigo">{item.texto}</span>
                              {item.nota !== undefined && (
                                <span className="sgtm-arbol__conteo">{item.nota}</span>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* **El hueco del backend, dicho una vez.** El texto lo
                        redacta el adaptador (`detalleDelSector`) y llega en la
                        respuesta; aquí solo se pinta, y solo dentro del sector
                        desplegado. Repetirlo en cada fila del carril lo
                        convertiría en ruido de fondo. */}
                    {detalle?.nota !== undefined && (
                      <p className="sgtm-arbol__nota">{detalle.nota}</p>
                    )}

                    {altaDeFila !== undefined && puedeRegistrar && (
                      <Boton variante="fantasma" onClick={() => onNuevaManzana(codigo)}>
                        {altaDeFila.accion}
                      </Boton>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {alta !== undefined && (
        <div className="sgtm-territorio__alta">
          {/* Se dibuja siempre y se apaga sin privilegio de registro, que es como
              estaba antes de #321: quitarla dejaría a quien solo consulta sin
              saber que el alta existe. */}
          <Boton variante="primario" disabled={!puedeRegistrar} onClick={onNuevoSector}>
            {alta.accion}
          </Boton>
        </div>
      )}
    </aside>
  );
}

/**
 * La hoja de sectores: lo señalado en el árbol, y el código que se compone con
 * ello.
 *
 * La tabla del catálogo ya no se dibuja aquí porque **es el árbol**: las mismas
 * celdas, la misma respuesta y el mismo adaptador, repartidas en el carril. Lo
 * que queda a la derecha es lo que la tabla no podía enseñar: qué es lo
 * señalado, y para qué sirve —componer el código de referencia catastral de un
 * predio y abrir su ficha—.
 */
function HojaDeSectores({
  estructura,
  filas,
  senalado,
  tecleado,
  onTecleado,
}: {
  readonly estructura: EstructuraDePantalla;
  readonly filas: readonly (readonly Celda[])[];
  readonly senalado: Senalado | null;
  readonly tecleado: string;
  readonly onTecleado: (valor: string) => void;
}) {
  const navegar = useNavigate();
  const idDelMotivo = useId();
  const columnas = estructura.tabla?.cols ?? [];
  const fila = filas.find((f) => celda(f, COLUMNA.codigo) === senalado?.sector);

  // El código con lo señalado ya colocado. Ver `conTramoDelCodigo`: si el
  // código todavía no llega hasta el tramo, no se toca —y se dice—.
  const codigo = conSenalado(tecleado, senalado);
  const colocado = senalado !== null && codigo !== normalizarCodigoCatastral(tecleado);
  const completo = normalizarCodigoCatastral(codigo).length === LONGITUD_DEL_CODIGO;

  return (
    <>
      <section className="sgtm-tarjeta">
        <div className="sgtm-tarjeta__cabecera">
          <h2 className="sgtm-tarjeta__titulo">Lo señalado en el territorio</h2>
        </div>
        {senalado === null ? (
          <p className="sgtm-territorio__vacio">
            Elige un sector en el árbol de la izquierda —o una de sus manzanas— para ver su detalle
            y componer el código de referencia catastral de un predio.
          </p>
        ) : (
          <>
            <Campo etiqueta="Sector" tipo="ro" valor={senalado.sector} />
            {senalado.manzana !== undefined && (
              <Campo etiqueta="Manzana" tipo="ro" valor={senalado.manzana} />
            )}
            {fila !== undefined && (
              <>
                <Campo
                  etiqueta={columnas[COLUMNA.nombre] ?? 'Denominación'}
                  tipo="ro"
                  valor={celda(fila, COLUMNA.nombre)}
                />
                <Campo
                  etiqueta={columnas[COLUMNA.manzanas] ?? 'Manzanas'}
                  tipo="ro"
                  valor={celda(fila, COLUMNA.manzanas)}
                />
                <Campo
                  etiqueta={columnas[COLUMNA.lotes] ?? 'Lotes'}
                  tipo="ro"
                  valor={celda(fila, COLUMNA.lotes)}
                />
                <Campo
                  etiqueta={columnas[COLUMNA.predios] ?? 'Predios inscritos'}
                  tipo="ro"
                  valor={celda(fila, COLUMNA.predios)}
                />
                <Campo
                  etiqueta={columnas[COLUMNA.zona] ?? 'Zona de arbitrios'}
                  tipo="ro"
                  valor={celda(fila, COLUMNA.zona)}
                />
                <Campo
                  etiqueta={columnas[COLUMNA.estado] ?? 'Estado'}
                  tipo="ro"
                  valor={celda(fila, COLUMNA.estado)}
                />
              </>
            )}
          </>
        )}
      </section>

      <section className="sgtm-tarjeta">
        <div className="sgtm-tarjeta__cabecera">
          <h2 className="sgtm-tarjeta__titulo">Código de referencia catastral</h2>
        </div>
        <CodigoCatastral
          etiqueta="Código de referencia catastral"
          valor={codigo}
          onCambio={onTecleado}
        />
        {senalado !== null && !colocado && (
          <p className="sgtm-territorio__pendiente">
            El sector {senalado.sector} se colocará en su tramo en cuanto el código llegue hasta él:
            teclea antes el ubigeo —departamento, provincia y distrito—. El código se llena de
            izquierda a derecha y aquí no se rellena ningún dígito que nadie haya escrito.
          </p>
        )}
        <p className="sgtm-lateral__falta" id={idDelMotivo} role="status">
          {completo
            ? ''
            : 'La ficha se abre con el código completo: mientras falten tramos, esto es una búsqueda por prefijo y no un predio.'}
        </p>
        <div className="sgtm-territorio__acciones">
          <Boton
            variante="primario"
            disabled={!completo}
            {...(completo ? {} : { 'aria-describedby': idDelMotivo })}
            onClick={() => navegar(`/catastro/ficha-urbana/${encodeURIComponent(codigo)}`)}
          >
            Abrir la ficha
          </Boton>
        </div>
      </section>
    </>
  );
}

/**
 * La hoja de vías: el catálogo vial **tal como lo sirve hoy** `calles`.
 *
 * Mismos filtros del prototipo, mismas columnas y los mismos «—» donde
 * `ViaResource` no publica (sector, zona de arancel y arancel por m²), mismo
 * formulario de la vía y misma barra con su «Nuevo», que abre el alta. Lo único
 * que cambia es dónde se dibuja: dentro del panel, al lado del árbol.
 */
function HojaDeVias({
  estructura,
  datos,
  cargando,
  buscando,
  busqueda,
  onBusqueda,
  cerradas,
  onAlternar,
  puedeRegistrar,
  onAlta,
}: {
  readonly estructura: EstructuraDePantalla;
  readonly datos?: DatosDePantalla;
  readonly cargando: boolean;
  readonly buscando: boolean;
  readonly busqueda: URLSearchParams;
  readonly onBusqueda: (siguiente: URLSearchParams) => void;
  readonly cerradas: Readonly<Record<string, boolean>>;
  readonly onAlternar: (clave: string, cerrada: boolean) => void;
  readonly puedeRegistrar: boolean;
  readonly onAlta: () => void;
}) {
  const busquedaActiva = leerBusqueda(busqueda);
  const filtros = filtrosDe(estructura.id, estructura.filtros);
  const secciones = seccionesDe(estructura, 0);
  const composicion = composicionDe(estructura.id);

  return (
    <>
      {filtros && (
        <Filtros
          opcion={estructura.id}
          campos={filtros}
          buscado={busquedaActiva.filtros}
          cargando={buscando}
          onBuscar={(valores) =>
            onBusqueda(
              conCambio(new URLSearchParams(busqueda), {
                ...vaciar(busquedaActiva.filtros),
                ...valores,
                [PAGINA]: undefined,
              }),
            )
          }
        />
      )}

      {estructura.tabla && (
        <TablaDePantalla
          estructura={estructura.tabla}
          opcion={estructura.id}
          datos={datos?.tabla}
          cargando={cargando}
          hayFiltros={Object.keys(busquedaActiva.filtros).length > 0}
          {...(busquedaActiva.orden === undefined ? {} : { orden: busquedaActiva.orden })}
          sentido={busquedaActiva.sentido}
          onOrdenar={(clave) => onBusqueda(conOrden(new URLSearchParams(busqueda), clave))}
          onPagina={(pagina) =>
            onBusqueda(
              conCambio(new URLSearchParams(busqueda), {
                [PAGINA]: pagina <= 1 ? undefined : String(pagina),
              }),
            )
          }
        />
      )}

      {secciones.length > 0 && (
        <Formulario
          opcion={estructura.id}
          secciones={secciones}
          valores={datos?.campos ?? {}}
          cargando={cargando}
          cerradas={cerradas}
          pestana={0}
          onAlternar={onAlternar}
        />
      )}

      {estructura.acciones && (
        <BarraDeAcciones
          acciones={estructura.acciones}
          {...(datos?.tabla?.conteo === undefined ? {} : { alcance: datos.tabla.conteo })}
          {...(puedeRegistrar && composicion.altas !== undefined
            ? { altas: Object.fromEntries(composicion.altas.map((alta) => [alta.accion, onAlta])) }
            : {})}
        />
      )}
    </>
  );
}

/** Sin nada escrito. Constante para que la clave de caché no cambie cada dibujo. */
const SIN_BORRADOR: Readonly<Record<string, string>> = {};

/**
 * La conexión de una de las dos opciones del territorio.
 *
 * Las dos están conectadas desde #16 y #321; que el registro las devuelva
 * `undefined` sería un error de programación —una opción quitada de
 * `CONEXIONES_DE_CATASTRO` sin quitarla de aquí—, y callarlo dejaría la
 * superficie en blanco sin decir por qué.
 */
function conexionDelTerritorio(opcion: string): Conexion {
  const conexion = conexionDe(opcion);
  if (conexion === undefined) {
    throw new Error(`«${opcion}» no está conectada: el territorio no se puede dibujar.`);
  }
  return conexion;
}

/** El texto de una celda de la fila del sector, o «—» si esa columna no vino. */
const celda = (fila: readonly Celda[], columna: number): string => fila[columna]?.texto ?? SIN_DATO;

/** Un sector casa con lo buscado si su código o su denominación lo contienen. */
function casa(fila: readonly Celda[], buscado: string): boolean {
  const texto = buscado.trim().toUpperCase();
  if (texto === '') return true;
  return (
    celda(fila, COLUMNA.codigo).toUpperCase().includes(texto) ||
    celda(fila, COLUMNA.nombre).toUpperCase().includes(texto)
  );
}

/** El código tecleado con los tramos que el árbol señaló, cuando caben. */
function conSenalado(tecleado: string, senalado: Senalado | null): string {
  if (senalado === null) return normalizarCodigoCatastral(tecleado);
  const conSector = conTramoDelCodigo(tecleado, 'sector', senalado.sector);
  return senalado.manzana === undefined
    ? conSector
    : conTramoDelCodigo(conSector, 'manzana', senalado.manzana);
}

/**
 * Los filtros de antes puestos a `undefined`, para que una búsqueda nueva
 * **quite** los que ya no están en vez de dejarlos pegados en la dirección.
 */
function vaciar(filtros: Readonly<Record<string, string>>): Record<string, undefined> {
  return Object.fromEntries(Object.keys(filtros).map((nombre) => [nombre, undefined]));
}
