import { useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Aviso, Esqueleto, Insignia } from '@sgtm/design-system';
import { ProblemaDeApi, pedirDatosDePantalla, pedirOperacion } from '@sgtm/api-client';
import type { DatosDePantalla } from '@sgtm/api-client';
import type { Fecha } from '@sgtm/dominio';
import { opcionPorId } from '../../catalogo';
import type { OpcionSituada } from '../../catalogo';
import { useCatalogoVisible } from '../../app/sesion/useCatalogoVisible';
import type { CatalogoVisible } from '../../app/sesion/useCatalogoVisible';
import { conexionDe } from '../conexiones';
import { operacionDe } from '../busqueda';
import { FechaDeCalculo } from '../bloques/FechaDeCalculo';
import { TablaDePantalla } from '../bloques/TablaDePantalla';
import { SIN_DATO, esObjeto, leerObjeto, leerPaginado, texto } from '../seguridad/listado';
import { ESTADO_DE_LA_CONSULTA, PESTANAS, RESUMEN_DE_SALDOS, filasDeLaSeccion } from './pestanas';
import type {
  AccionDeLaFicha,
  ContextoDeLaFicha,
  PestanaDeLaFicha,
  RejillaDeLaFicha,
} from './pestanas';

/**
 * **La ficha 360° del contribuyente** (#297, ADR-0016 §2).
 *
 * Quien atiende en ventanilla no viene a mirar un módulo: viene con una persona
 * delante. El inicio pregunta a quién se atiende (#296) y esto es lo que se abre
 * al responder: la misma persona, con sus predios, sus vehículos, sus papeletas,
 * su deuda y su expediente coactivo **compuestos de las opciones que ya
 * existen**, pestaña a pestaña.
 *
 * ── No es la opción 135, y por eso vive en una ruta ────────────────────────
 *
 * `/atencion/:codigo`, fuera del catálogo, por lo mismo que el inicio y que el
 * centro de reportes de ADR-0014 §5: **no publica ninguna lectura propia ni
 * tiene un permiso que conceder**. Cada pestaña viaja con la operación y el
 * permiso de su opción, y lo que un permiso niega aquí no se dibuja. El segmento
 * `atencion` no choca con `/:moduloId/:ranura`: React Router puntúa por encima
 * lo estático, y ningún módulo del catálogo se llama así.
 *
 * ── Qué se pide al abrir, y qué al activar ────────────────────────────────
 *
 * Al abrir, **dos** lecturas y ninguna más:
 *
 *   `contribuyentes`       quién es: código, nombre, documento y si está de baja
 *   `consulta_unificada`   el `resumenDeSaldos` con su `aLaFecha` — el único
 *                          total consolidado con fecha que el sistema publica,
 *                          y por tanto la cifra de la cabecera (regla 9)
 *
 * Las demás pestañas consultan **al activarse** y no al montar (ADR-0016 §2):
 * siete abanicos al abrir una ficha tienen otro perfil de coste que los tres del
 * inicio —aquí cada uno es un padrón entero o el expediente coactivo de una
 * persona—. El panel activo es el único montado, así que su consulta sale cuando
 * se entra en él; volver a una pestaña ya visitada no vuelve a pedir nada,
 * porque la caché guarda la respuesta por su clave.
 *
 * La pestaña financiera **no pide nada**: sus seis rejillas viajan en la misma
 * respuesta que ya trajo el resumen de la cabecera. Pedirlas otra vez serían dos
 * lecturas del mismo dato a dos instantes distintos, que es justo lo que el
 * agregador del backend existe para evitar (un `@Transactional(readOnly)`, un
 * `SET LOCAL`, un solo instante de lectura).
 *
 * ── Pestañas y no secciones, y por qué ────────────────────────────────────
 *
 * Las seis son **vistas mutuamente excluyentes de fuentes distintas**, cada una
 * con su permiso y su petición: apiladas como secciones, entrar en la ficha
 * dispararía las seis lecturas —que es lo que el ADR prohíbe— o dejaría seis
 * secciones vacías esperando a que alguien las despliegue. La barra de pestañas
 * dice de un vistazo qué hay de esta persona y pide una cosa cada vez. Va con el
 * patrón completo de ARIA —`tablist`/`tab`/`tabpanel`, flechas, Inicio y Fin,
 * `aria-controls`, tabulación itinerante y el foco siguiendo a la activa—: el
 * repo ya quitó una barra incompleta en #330, y media barra de pestañas es peor
 * que ninguna.
 *
 * Dentro de la pestaña financiera sí hay secciones con encabezado, y también es
 * deliberado: sus seis rejillas llegan en **una** respuesta y bajo **un**
 * permiso, así que partirlas en seis pestañas prometería seis permisos donde hay
 * uno.
 */

/** Lo que la cabecera sabe de la persona. Sale del padrón, no se compone. */
interface Identidad {
  readonly codigo: string;
  readonly nombre: string;
  readonly tipoDocumento: string;
  readonly numeroDocumento: string;
  readonly activo: boolean;
}

export function FichaDeAtencion() {
  const { codigo = '' } = useParams();
  const catalogo = useCatalogoVisible();
  const identificador = useId();

  const identidad = useConsultaDeIdentidad(codigo, catalogo.puedeVer('contribuyentes'));
  const unificada = useConsultaUnificada(codigo, catalogo.puedeVer('consulta_unificada'));

  const contexto: ContextoDeLaFicha = {
    codigo,
    numeroDocumento: identidad.data?.numeroDocumento ?? '',
  };

  const visibles = PESTANAS.filter((pestana) => sePuedeComponer(pestana, catalogo));
  /* La pestaña activa se guarda por **el id de su opción**, no por su posición:
     la lista de visibles depende de los permisos, y un índice guardado señala a
     otra pestaña en cuanto la lista cambia de largo. */
  const [elegida, fijarElegida] = useState<string | undefined>(undefined);
  const activa = visibles.find((pestana) => pestana.opcion === elegida) ?? visibles[0];

  const botones = useRef<Record<string, HTMLButtonElement | null>>({});
  const idDePestana = (opcion: string): string => `${identificador}-tab-${opcion}`;
  const idDePanel = (opcion: string): string => `${identificador}-panel-${opcion}`;

  /* **Flechas, Inicio y Fin, con activación automática** (patrón ARIA, RNF-082).
     La activa es la única tabulable; el tabulador sale de la barra al panel, que
     es donde está el contenido. Al mover con las flechas se activa y **se lleva
     el foco**: dejarlo atrás obliga a pulsar Enter para algo que ya cambió. */
  const alTeclearEnLaBarra = (evento: React.KeyboardEvent, posicion: number): void => {
    const salto = { ArrowRight: 1, ArrowLeft: -1 }[evento.key];
    const destino =
      salto !== undefined
        ? (posicion + salto + visibles.length) % visibles.length
        : evento.key === 'Home'
          ? 0
          : evento.key === 'End'
            ? visibles.length - 1
            : undefined;
    if (destino === undefined) return;
    const siguiente = visibles[destino];
    if (siguiente === undefined) return;
    evento.preventDefault();
    fijarElegida(siguiente.opcion);
    botones.current[siguiente.opcion]?.focus();
  };

  return (
    <div className="sgtm-ficha">
      <Cabecera
        codigo={codigo}
        identidad={identidad.data}
        cargando={identidad.isFetching}
        error={identidad.error}
        puedeVerElPadron={catalogo.puedeVer('contribuyentes')}
        catalogo={catalogo}
        contexto={contexto}
      />

      {catalogo.puedeVer('consulta_unificada') && (
        <ResumenDeSaldos
          ficha={unificada.data}
          cargando={unificada.isFetching}
          error={unificada.error}
        />
      )}

      {activa === undefined ? (
        <SinNadaQueComponer catalogo={catalogo} />
      ) : (
        <>
          <div
            className="sgtm-pestanas"
            role="tablist"
            aria-label="Lo que se compone de esta persona"
          >
            {visibles.map((pestana, posicion) => {
              const opcion = opcionPorId(pestana.opcion);
              const esLaActiva = pestana.opcion === activa.opcion;
              return (
                <button
                  key={pestana.opcion}
                  id={idDePestana(pestana.opcion)}
                  ref={(nodo) => {
                    botones.current[pestana.opcion] = nodo;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={esLaActiva}
                  aria-controls={idDePanel(pestana.opcion)}
                  tabIndex={esLaActiva ? 0 : -1}
                  className="sgtm-pestanas__tab"
                  data-activa={esLaActiva ? '1' : '0'}
                  onClick={() => fijarElegida(pestana.opcion)}
                  onKeyDown={(evento) => alTeclearEnLaBarra(evento, posicion)}
                >
                  {/* El rótulo del menú, tal cual lo escribe el manual (RNF-080). */}
                  {opcion?.label ?? pestana.opcion}
                </button>
              );
            })}
          </div>

          {/* Solo el panel activo se monta: es lo que hace que la consulta salga
              al activarse. Su `key` lo remonta al cambiar de pestaña, así que
              cada uno estrena su estado y ninguno hereda el de otro. */}
          <section
            key={activa.opcion}
            id={idDePanel(activa.opcion)}
            role="tabpanel"
            aria-labelledby={idDePestana(activa.opcion)}
            /* El panel entra en el tabulador: es contenido al que se llega desde
               la barra, y sin esto quien navega con teclado saltaría de la
               pestaña a la primera acción sin pasar por lo que hay dentro. */
            tabIndex={0}
            className="sgtm-ficha__panel"
          >
            {activa.rejillas === undefined ? (
              <PanelDeUnaOpcion pestana={activa} contexto={contexto} catalogo={catalogo} />
            ) : (
              <PanelDeLaUnificada
                pestana={activa}
                ficha={unificada.data}
                cargando={unificada.isFetching}
                error={unificada.error}
                contexto={contexto}
                catalogo={catalogo}
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}

/* ── Quién es ──────────────────────────────────────────────────────────── */

/**
 * La identidad, del padrón y de una sola fila.
 *
 * `GET /rentas/contribuyentes?codigo=` devuelve un listado, y de él se toma **la
 * fila cuyo código coincide**, no la primera: el filtro del backend resuelve por
 * prefijo, y la primera de varias no tiene por qué ser la buscada. Con ninguna
 * que coincida, la cabecera dice lo que sabe —el código de la ruta— y no inventa
 * un nombre.
 */
function useConsultaDeIdentidad(codigo: string, puede: boolean) {
  return useQuery<Identidad | null>({
    queryKey: ['atencion', 'identidad', codigo],
    enabled: codigo !== '' && puede,
    // Uno, no tres: esto se hace con alguien esperando en el mostrador.
    retry: 1,
    queryFn: async ({ signal }) => {
      const cuerpo = await pedirOperacion('contribuyentes', { codigo }, signal);
      const pagina = leerPaginado(cuerpo, 'los contribuyentes');
      const fila = pagina.contenido
        .filter(esObjeto)
        .find((persona) => persona['codigo'] === codigo);
      if (fila === undefined) return null;
      return {
        codigo: texto(fila['codigo']),
        nombre: texto(fila['nombreRazonSocial']),
        tipoDocumento: typeof fila['tipoDocumento'] === 'string' ? fila['tipoDocumento'] : '',
        numeroDocumento: typeof fila['numeroDocumento'] === 'string' ? fila['numeroDocumento'] : '',
        activo: fila['activo'] !== false,
      };
    },
  });
}

/** La ficha consolidada, entera: la cabecera usa su resumen y la pestaña sus seis rejillas. */
function useConsultaUnificada(codigo: string, puede: boolean) {
  return useQuery<Readonly<Record<string, unknown>>>({
    queryKey: ['atencion', 'unificada', codigo],
    enabled: codigo !== '' && puede,
    retry: 1,
    queryFn: async ({ signal }) => {
      const cuerpo = await pedirOperacion('consulta_unificada', { contribuyente: codigo }, signal);
      return leerObjeto(cuerpo, 'la consulta unificada');
    },
  });
}

function Cabecera({
  codigo,
  identidad,
  cargando,
  error,
  puedeVerElPadron,
  catalogo,
  contexto,
}: {
  readonly codigo: string;
  readonly identidad?: Identidad | null;
  readonly cargando: boolean;
  readonly error: unknown;
  readonly puedeVerElPadron: boolean;
  readonly catalogo: CatalogoVisible;
  readonly contexto: ContextoDeLaFicha;
}) {
  const documento =
    identidad == null ? SIN_DATO : `${identidad.tipoDocumento} ${identidad.numeroDocumento}`.trim();

  return (
    <header className="sgtm-ficha__cabecera">
      <p className="sgtm-ficha__eyebrow">Atención al contribuyente</p>
      {cargando ? (
        <Esqueleto alto={28} ancho="24ch" />
      ) : (
        /* `h2` y no `h1`: el `h1` de la aplicación es el de la cabecera del
           shell, igual que en el inicio. Aquí se nombra a quién se atiende. */
        <h2 className="sgtm-ficha__nombre">{identidad?.nombre ?? codigo}</h2>
      )}
      <dl className="sgtm-ficha__identidad">
        <Dato etiqueta="Código" valor={codigo === '' ? SIN_DATO : codigo} />
        <Dato etiqueta="Documento" valor={documento === '' ? SIN_DATO : documento} />
        {identidad != null && (
          <div className="sgtm-ficha__dato">
            <dt>Estado</dt>
            <dd>
              {/* Nunca solo por color: la insignia lleva su palabra dentro. */}
              <Insignia tono={identidad.activo ? 'ok' : 'neutro'}>
                {identidad.activo ? 'ACTIVO' : 'INACTIVO'}
              </Insignia>
            </dd>
          </div>
        )}
      </dl>
      {!puedeVerElPadron && (
        <p className="sgtm-ficha__nota">
          Tu perfil no incluye «{opcionPorId('contribuyentes')?.title ?? 'Contribuyentes'}», así que
          aquí solo se ve el código: el nombre y el documento los publica el padrón.
        </p>
      )}
      {puedeVerElPadron && error !== undefined && error !== null && (
        <AvisoDeLectura error={error} opcion="contribuyentes" />
      )}
      {puedeVerElPadron && !cargando && error == null && identidad === null && (
        <Aviso
          titulo="Ese código no está en el padrón"
          detalle="La dirección lleva un código que el padrón de contribuyentes no reconoce. Comprueba el código, o búscalo de nuevo desde el inicio: aquí no se da de alta a nadie."
        />
      )}
      <Acciones
        acciones={ACCIONES_DE_LA_CABECERA}
        contexto={contexto}
        catalogo={catalogo}
        etiqueta="Acciones sobre esta persona"
      />
    </header>
  );
}

/**
 * Lo que se lanza desde la cabecera con el contexto puesto.
 *
 * Una sola, y no por falta de ganas: el tablero de diseño pone aquí «Cobrar en
 * caja», y `caja_tributaria` **no declara ni un parámetro de consulta** en el
 * contrato, así que el enlace llegaría a la caja sin la persona puesta. Un
 * enlace que promete contexto y no lo lleva es peor que no ofrecerlo.
 */
const ACCIONES_DE_LA_CABECERA: readonly AccionDeLaFicha[] = [
  { opcion: 'constancia', filtro: (contexto) => ({ codContribuyente: contexto.codigo }) },
];

function Dato({ etiqueta, valor }: { readonly etiqueta: string; readonly valor: string }) {
  return (
    <div className="sgtm-ficha__dato">
      <dt>{etiqueta}</dt>
      <dd>{valor}</dd>
    </div>
  );
}

/* ── El resumen consolidado ────────────────────────────────────────────── */

/**
 * Las cinco cifras del «Resumen de saldos», **tal cual las mandó el servidor** y
 * con su fecha de corte debajo.
 *
 * Es el único total consolidado con fecha que el sistema publica (ADR-0016 §2), y
 * llega sumado: aquí no se suma ni se completa el total a partir de las partes
 * (RNF-083). La frase que lo explica también viene redactada del backend, porque
 * el día que el total y el desglose discreparan la explicación tiene que salir
 * del mismo sitio que las cifras.
 */
function ResumenDeSaldos({
  ficha,
  cargando,
  error,
}: {
  readonly ficha?: Readonly<Record<string, unknown>>;
  readonly cargando: boolean;
  readonly error: unknown;
}) {
  if (error !== undefined && error !== null) {
    return <AvisoDeLectura error={error} opcion="consulta_unificada" />;
  }
  const resumen = esObjeto(ficha?.['resumenDeSaldos']) ? ficha['resumenDeSaldos'] : undefined;
  const explicacion = texto(resumen?.[ESTADO_DE_LA_CONSULTA]);

  return (
    <section className="sgtm-totales-marco" aria-label="Resumen de saldos">
      <div className="sgtm-totales">
        {RESUMEN_DE_SALDOS.map((cifra) => (
          <div
            key={cifra.clave}
            className="sgtm-totales__celda"
            data-fuerte={cifra.clave === 'total' ? '1' : '0'}
          >
            <span className="sgtm-totales__etiqueta">{cifra.label}</span>
            <span className="sgtm-totales__valor">
              {cargando ? (
                <Esqueleto alto={18} ancho="7ch" />
              ) : (
                importeDeLaFicha(resumen?.[cifra.clave])
              )}
            </span>
          </div>
        ))}
      </div>
      {!cargando && explicacion !== SIN_DATO && <p className="sgtm-ficha__nota">{explicacion}</p>}
      <FechaDeCalculo {...fechaDeCorteDe(ficha)} />
    </section>
  );
}

/** El importe de un `ImporteActualizado`, o el guion. Nunca un cero inventado. */
function importeDeLaFicha(valor: unknown): string {
  if (!esObjeto(valor)) return SIN_DATO;
  const importe = valor['importe'];
  return typeof importe === 'string' && importe !== '' ? importe : SIN_DATO;
}

/**
 * La fecha de corte con la que el backend respondió todo lo que depende de hoy.
 *
 * Sale de `aLaFecha` de la respuesta y **no del reloj del navegador**: la banda
 * dice a qué fecha están actualizadas las cifras, y el reloj del cliente diría
 * «hoy» sobre lo que se calculó anteayer (regla 9, RNF-075).
 */
function fechaDeCorteDe(ficha: Readonly<Record<string, unknown>> | undefined): {
  readonly fecha?: Fecha;
} {
  const aLaFecha = ficha?.['aLaFecha'];
  return typeof aLaFecha === 'string' && aLaFecha !== '' ? { fecha: aLaFecha as Fecha } : {};
}

/* ── Los paneles ───────────────────────────────────────────────────────── */

/**
 * Una pestaña que compone **una opción con tabla**: predios, vehículos,
 * papeletas, papeletas administrativas y coactiva.
 *
 * La lectura sale por el mismo camino que usa la propia opción: su conexión
 * tipada cuando la tiene —y entonces es **su adaptador** el que traduce el
 * recurso, sin una segunda lectura escrita aquí— y el camino común cuando no.
 * Las columnas son las de su catálogo (`pestanas.ts`).
 */
function PanelDeUnaOpcion({
  pestana,
  contexto,
  catalogo,
}: {
  readonly pestana: PestanaDeLaFicha;
  readonly contexto: ContextoDeLaFicha;
  readonly catalogo: CatalogoVisible;
}) {
  const parametros = pestana.parametros(contexto);
  const consulta = useQuery<DatosDePantalla>({
    queryKey: ['atencion', 'pestana', pestana.opcion, parametros],
    enabled: parametros !== undefined,
    retry: 1,
    queryFn: ({ signal }) => cargarLaOpcion(pestana.opcion, parametros ?? {}, signal),
  });

  return (
    <>
      <Fuente opcion={pestana.opcion} />
      {parametros === undefined ? (
        <Aviso
          titulo="Falta con qué preguntar por esta persona"
          detalle="Esta pestaña se compone con el número de documento del contribuyente, y el padrón no lo devolvió. No quiere decir que no tenga: quiere decir que desde aquí no se puede preguntar."
        />
      ) : consulta.error !== undefined && consulta.error !== null ? (
        <AvisoDeLectura error={consulta.error} opcion={pestana.opcion} />
      ) : (
        <>
          <TablaDePantalla
            estructura={{
              title: pestana.tabla?.title ?? '',
              cols: pestana.tabla?.cols ?? [],
              // Sin claves: la ficha **no ordena**. Ordenar es del servidor y su
              // sitio es la opción, que tiene sus filtros y su paginador.
              claves: [],
              ...(pestana.tabla?.num === undefined ? {} : { num: pestana.tabla.num }),
            }}
            opcion={pestana.opcion}
            {...(consulta.data?.tabla === undefined ? {} : { datos: consulta.data.tabla })}
            cargando={consulta.isFetching}
          />
          <FechaDeCalculo
            {...(consulta.data?.fechaCalculo === undefined
              ? {}
              : { fecha: consulta.data.fechaCalculo })}
          />
        </>
      )}
      <Acciones
        acciones={pestana.acciones ?? []}
        contexto={contexto}
        catalogo={catalogo}
        etiqueta="Seguir en su módulo"
      />
    </>
  );
}

/**
 * La lectura de una opción, por el camino que esa opción ya usa.
 *
 * Con conexión, la suya: es lo que evita escribir aquí una segunda lectura del
 * mismo recurso —dos lecturas del mismo cuerpo acaban leyendo campos distintos, y
 * una de las dos, mal—. Sin conexión, el camino común de las 134.
 */
function cargarLaOpcion(
  opcion: string,
  parametros: Readonly<Record<string, string>>,
  senal: AbortSignal,
): Promise<DatosDePantalla> {
  const conexion = conexionDe(opcion);
  if (conexion !== undefined) return conexion.cargar(parametros, senal);
  const operacion = operacionDe(opcion);
  if (operacion === undefined) {
    throw new Error(`La opcion «${opcion}» no es una operacion del contrato.`);
  }
  return pedirDatosDePantalla(operacion, parametros, senal);
}

/**
 * La pestaña financiera: las seis rejillas que ya vinieron con el resumen.
 *
 * No pide nada. Lo que dibuja es la misma respuesta que la cabecera, que es lo
 * que el agregador de `consulta_unificada` consolidó en un solo instante de
 * lectura: deuda, pagos, altas y bajas, fraccionamientos, valores y
 * declaraciones juradas.
 */
function PanelDeLaUnificada({
  pestana,
  ficha,
  cargando,
  error,
  contexto,
  catalogo,
}: {
  readonly pestana: PestanaDeLaFicha;
  readonly ficha?: Readonly<Record<string, unknown>>;
  readonly cargando: boolean;
  readonly error: unknown;
  readonly contexto: ContextoDeLaFicha;
  readonly catalogo: CatalogoVisible;
}) {
  return (
    <>
      <Fuente opcion={pestana.opcion} />
      {error !== undefined && error !== null ? (
        <AvisoDeLectura error={error} opcion={pestana.opcion} />
      ) : (
        (pestana.rejillas ?? []).map((rejilla) => (
          <Rejilla key={rejilla.clave} rejilla={rejilla} ficha={ficha} cargando={cargando} />
        ))
      )}
      <Acciones
        acciones={pestana.acciones ?? []}
        contexto={contexto}
        catalogo={catalogo}
        etiqueta="Seguir en su módulo"
      />
    </>
  );
}

function Rejilla({
  rejilla,
  ficha,
  cargando,
}: {
  readonly rejilla: RejillaDeLaFicha;
  readonly ficha?: Readonly<Record<string, unknown>>;
  readonly cargando: boolean;
}) {
  const filas = filasDeLaSeccion(ficha, rejilla.clave);
  return (
    <div className="sgtm-ficha__rejilla">
      <TablaDePantalla
        estructura={{
          title: rejilla.titulo,
          cols: rejilla.cols,
          claves: [],
          ...(rejilla.num === undefined ? {} : { num: rejilla.num }),
          ...(rejilla.nota === undefined ? {} : { note: rejilla.nota }),
        }}
        datos={{ filas: filas.map(rejilla.fila), conteo: conteoDe(filas.length) }}
        cargando={cargando}
      />
      {/* La banda solo donde **todas** sus cifras comparten fecha. Donde cada
          fila trae la suya —los pagos, los movimientos— la fecha ya está en su
          columna, y una banda encima diría que se recalcularon hoy. */}
      {rejilla.aLaFechaDeCorte === true && <FechaDeCalculo {...fechaDeCorteDe(ficha)} />}
    </div>
  );
}

/** «3 filas» / «1 fila». Contar no es redactar en lenguaje del dominio (RNF-080). */
const conteoDe = (cuantas: number): string => `${cuantas} ${cuantas === 1 ? 'fila' : 'filas'}`;

/* ── De dónde sale lo que se ve, y a dónde se sigue ────────────────────── */

/**
 * **La fuente, dicha** (ADR-0014 §1): «Fuente: Consultas · Consulta unificada
 * predial-arbitrios».
 *
 * No es decoración. Es lo que permite entender por qué una persona ve seis
 * pestañas y su compañero de al lado ve dos, y de dónde salió cada cifra cuando
 * el contribuyente pregunta. El módulo y el título son los del catálogo, sin
 * reescribir ninguno (RNF-080).
 */
function Fuente({ opcion }: { readonly opcion: string }) {
  const situada = opcionPorId(opcion);
  if (situada === undefined) return null;
  return (
    <p className="sgtm-ficha__fuente">
      Fuente: {situada.modulo.label} · {situada.title}
    </p>
  );
}

/**
 * Los enlaces que llevan a otra de las 134 **con el contexto puesto**.
 *
 * El contexto viaja como lo declara el contrato —el registro en la ruta o el
 * filtro en la consulta—, así que la opción de destino lo aplica sin que nadie
 * traduzca nada. Nada nuevo que permisar y **ninguna escritura**: el acto que
 * escribe vive en su opción, con su observación (regla 10).
 *
 * Y solo se dibuja el enlace cuyo destino este perfil puede ver: mandar a
 * alguien a una pantalla que le va a contestar 403 es peor que no ofrecer el
 * camino.
 */
function Acciones({
  acciones,
  contexto,
  catalogo,
  etiqueta,
}: {
  readonly acciones: readonly AccionDeLaFicha[];
  readonly contexto: ContextoDeLaFicha;
  readonly catalogo: CatalogoVisible;
  readonly etiqueta: string;
}) {
  const alcanzables = acciones.flatMap((accion) => {
    if (!catalogo.puedeVer(accion.opcion)) return [];
    const opcion = opcionPorId(accion.opcion);
    if (opcion === undefined) return [];
    const destino = destinoDe(accion, opcion, contexto);
    return destino === undefined ? [] : [{ accion, opcion, destino }];
  });
  if (alcanzables.length === 0) return null;

  return (
    <nav className="sgtm-ficha__acciones" aria-label={etiqueta}>
      <ul>
        {alcanzables.map(({ accion, opcion, destino }) => (
          <li key={accion.opcion}>
            <Link to={destino} className="sgtm-ficha__accion">
              {/* La opción se nombra como la nombra el catálogo, en esta puerta
                  igual que en el menú y en la paleta (RNF-080). */}
              {opcion.title}
            </Link>
            {accion.nota !== undefined && (
              <span className="sgtm-ficha__accion-nota">{accion.nota}</span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** La dirección de una acción, o nada si el contexto no da para componerla. */
function destinoDe(
  accion: AccionDeLaFicha,
  opcion: OpcionSituada,
  contexto: ContextoDeLaFicha,
): string | undefined {
  if (accion.registro !== undefined) {
    const registro = accion.registro(contexto);
    return registro === '' ? undefined : `${opcion.ruta}/${encodeURIComponent(registro)}`;
  }
  if (accion.filtro === undefined) return opcion.ruta;
  const filtro = accion.filtro(contexto);
  const consulta = new URLSearchParams();
  for (const [nombre, valor] of Object.entries(filtro)) {
    if (valor !== '') consulta.set(nombre, valor);
  }
  // Un filtro que se queda sin valor no viaja vacío: el enlace lleva a la
  // opción, que preguntará por su cuenta.
  const cadena = consulta.toString();
  return cadena === '' ? opcion.ruta : `${opcion.ruta}?${cadena}`;
}

/* ── Lo que este perfil no puede componer ──────────────────────────────── */

const sePuedeComponer = (pestana: PestanaDeLaFicha, catalogo: CatalogoVisible): boolean =>
  catalogo.puedeVer(pestana.opcion) &&
  (pestana.tambien ?? []).every((otra) => catalogo.puedeVer(otra));

/**
 * Ninguna pestaña se dibuja. **Son dos cosas distintas y no se dicen igual**, con
 * el mismo reparto que la búsqueda del inicio (ADR-0016 §1):
 *
 * - el perfil **no tiene ninguna** de las lecturas con que se compone la ficha:
 *   desde aquí no se puede ver nada de esta persona, y eso se dice tal cual;
 * - el perfil tiene alguna, pero le falta la que la acompaña —las papeletas se
 *   componen por el documento, que lo publica el padrón—. Entonces se nombra
 *   **cuál falta, con el rótulo del catálogo**, que es lo que se le pide al
 *   administrador.
 *
 * Nunca «no existe»: lo que un permiso niega no es lo que no hay.
 */
function SinNadaQueComponer({ catalogo }: { readonly catalogo: CatalogoVisible }) {
  const faltan = [
    ...new Set(
      PESTANAS.filter((pestana) => catalogo.puedeVer(pestana.opcion)).flatMap((pestana) =>
        (pestana.tambien ?? []).filter((otra) => !catalogo.puedeVer(otra)),
      ),
    ),
  ];

  if (faltan.length === 0) {
    return (
      <Aviso
        tipo="sin-permiso"
        titulo="Desde aquí no se puede componer nada de esta persona"
        detalle="Tu perfil no tiene ninguna de las lecturas con las que se arma esta ficha —deuda, predios, vehículos, papeletas y coactiva son cinco opciones distintas, cada una con su permiso—. Pídeselas al administrador de tu municipalidad."
      />
    );
  }

  const nombres = faltan.map((opcion) => `«${opcionPorId(opcion)?.title ?? opcion}»`);
  const una = nombres.length === 1;
  return (
    <Aviso
      tipo="sin-permiso"
      titulo="Falta una lectura para poder componer la ficha"
      detalle={`Tienes alguna de las opciones que esta ficha compone, pero ${una ? 'la que' : 'las que'} ${una ? 'acompaña' : 'acompañan'} no: ${nombres.join(', ')}. Pídesela al administrador de tu municipalidad; mientras tanto, cada opción se abre por su cuenta desde el menú.`}
    />
  );
}

/**
 * No se pudo leer, o el perfil no puede. **Las dos cosas no se dicen igual, y
 * ninguna se dice como «no existe»** (el mismo reparto que las franjas del
 * inicio).
 *
 * Aquí el 403 es además **inesperado**: la pestaña solo se dibuja si el catálogo
 * visible ofrece su opción, así que un 403 significa que la interfaz y el
 * servidor no dicen lo mismo. Se cuenta como lo que es —algo que arregla el
 * administrador, no un reintento (ADR-0013)— y no se confunde con «esta persona
 * no tiene nada de eso», que es la lectura que lleva a dar por bueno un padrón
 * vacío.
 */
function AvisoDeLectura({ error, opcion }: { readonly error: unknown; readonly opcion: string }) {
  const titulo = opcionPorId(opcion)?.title ?? opcion;
  if (error instanceof ProblemaDeApi && error.problema.status === 403) {
    return (
      <Aviso
        tipo="sin-permiso"
        titulo={`Tu perfil no puede consultar «${titulo}»`}
        detalle="La ficha compone cada parte con la opción que la publica, y esta te la rechazó. Pídesela al administrador de tu municipalidad: reintentar dará lo mismo. Lo demás de esta persona sigue aquí."
      />
    );
  }
  return (
    <Aviso
      tipo="error"
      titulo={`No se pudo consultar «${titulo}»`}
      detalle="La consulta no respondió, así que esta parte de la ficha no se pudo componer. Vuelve a intentarlo: que no aparezca aquí no quiere decir que no exista."
    />
  );
}
