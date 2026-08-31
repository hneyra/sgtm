import { useEffect, useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Aviso, Icono } from '@sgtm/design-system';
import { ProblemaDeApi, pedirOperacion } from '@sgtm/api-client';
import type { Paginado } from '@sgtm/api-client';
import { opcionPorId } from '../../catalogo';
import type { OpcionSituada } from '../../catalogo';
import { useCatalogoVisible } from '../../app/sesion/useCatalogoVisible';
import type { CatalogoVisible } from '../../app/sesion/useCatalogoVisible';
import { useValorAposentado } from '../aposentar';
import { SIN_DATO, esObjeto, leerPaginado, texto } from '../seguridad/listado';
import { anotarAtencion, leerAtenciones } from './atenciones';
import type { Atencion } from './atenciones';
import {
  COMO_SE_BUSCA_EN,
  FUENTE_DE,
  FUENTES,
  loQueFalta,
  preguntasDe,
} from './busqueda-de-atencion';
import type { FuenteDeAtencion, PreguntaDeAtencion } from './busqueda-de-atencion';

/**
 * **El inicio pregunta a quien se atiende** (#296, ADR-0016 §1).
 *
 * El dia de una ventanilla no empieza por un modulo: empieza por una persona
 * que llega con un DNI, una placa o el recibo de un predio (ADR-0014 §1). Esta
 * es esa pregunta, y es lo unico que hay en `/`.
 *
 * **No es una opcion del catalogo, y no debe serlo.** Las 134 siguen siendo 134:
 * esto no publica ninguna lectura propia ni tiene un permiso que conceder —lo
 * que se pregunta y lo que se ve sale entero de las tres opciones que ya
 * existen—. El panel de recaudacion, que era la portada, **sigue siendo la
 * opcion que siempre fue** y se abre por su ruta desde el lanzador, la paleta o
 * el menu; lo unico que dejo de ser es el inicio (ADR-0016 §1). Una ruta que no
 * es opcion no la alcanzan ni el menu ni la paleta, asi que la vuelta hasta aqui
 * son **dos puertas puestas a mano**: la marca de la barra lateral y la primera
 * entrada del lanzador —la barra se pliega en cajon en movil, y con una sola
 * puerta quien entra por un enlace se queda sin camino—. Las dos se dicen bajo
 * la caja, porque ninguna de las dos se deduce.
 *
 * ── Un abanico, no un agregador ────────────────────────────────────────────
 *
 * La decision de fondo de ADR-0016 §1: se consultan **en paralelo las lecturas
 * publicadas cuya opcion el catalogo visible ofrece**, y ninguna mas. Con un
 * agregador unico del padron, el cajero sin permiso de vehiculos recibiria un
 * 403 que rompe la busqueda entera —o vehiculos que no debe ver—; con el
 * abanico, cada fila llega por el permiso que la cubre y la ausencia de un
 * permiso solo apaga su franja. Ninguna franja sin permiso: **ni vacia, ni con
 * error**, porque una franja vacia ya dice que ahi hay algo que mirar.
 *
 * Las tres lecturas existen hoy y no hacia falta backend nuevo:
 *
 *   `contribuyentes`       `GET /rentas/contribuyentes` — codigo, nombre **con
 *                          aproximacion**, DNI y RUC
 *   `consulta_vehiculos`   `GET /consultas/vehiculos?placa=`
 *   `consulta_fichas`      `GET /catastro/fichas?codRefCatastral=`
 *
 * ── Lo que no se dibuja, y por que ────────────────────────────────────────
 *
 * El tablero de diseno pone al lado de las atenciones recientes un panel de
 * **«Pendientes de tu unidad»** —valores por notificar, descargos por resolver,
 * licencias por resolver—. No se dibuja: ninguna lectura publicada devuelve esas
 * tres cifras, ni por unidad organica ni por nada, y componerlas contando filas
 * de otras consultas seria inventarse la carga de trabajo de un area
 * (RNF-083, ADR-0010 §4 — se anota, no se finge). Cuando exista la lectura que
 * las sirva, su sitio esta aqui.
 *
 * Tampoco se dibuja la deuda de las filas, aunque `consulta_vehiculos` la
 * publique: es un importe y no existe «la deuda», existe la deuda a una fecha
 * (regla 9, RNF-075). Una cifra en una lista de eleccion, sin su fecha y sin
 * espacio para ponerla, es exactamente la que se lee mal.
 */

/** Con la mano quieta se pregunta; con la mano escribiendo, no (300 ms). */
const ESPERA = 300;

/** Cuantas filas se enseñan por franja. Mas que esto no es una lista: es un padron. */
const MAXIMO = 6;

/** Una fila de una franja: quien es, como se le identifica y a donde lleva. */
interface Resultado {
  readonly clave: string;
  /** Quien es. Las tres franjas contestan lo mismo: el titular. */
  readonly titulo: string;
  /** Lo que lo distingue de otro con el mismo nombre. */
  readonly detalle: string;
  /** El identificador que se ve: el codigo del padron, la placa, el codigo catastral. */
  readonly codigo: string;
  readonly ruta: string;
  /** Solo las personas se anotan como atencion. */
  readonly atencion?: Atencion;
}

interface Franja {
  readonly fuente: FuenteDeAtencion;
  readonly opcion: OpcionSituada;
  readonly buscando: boolean;
  readonly resultados: readonly Resultado[];
  /** La respuesta traia mas de las que caben. Se dice; ver {@link anuncioDe}. */
  readonly recortada: boolean;
  readonly error?: unknown;
}

export function InicioDeAtencion() {
  const catalogo = useCatalogoVisible();
  const navegar = useNavigate();
  const [escrito, fijarEscrito] = useState('');
  const lista = useRef<HTMLDivElement>(null);
  const caja = useRef<HTMLInputElement>(null);

  /* **El foco entra en la caja**, que es el unico control de la pantalla: quien
     atiende empieza a teclear el documento sin tocar el raton (RNF-082).

     Con un efecto y no con `autoFocus`, por lo mismo que lo hace el panel
     lateral: `autoFocus` solo actua en el primer montaje del nodo y la regla de
     `jsx-a11y` lo prohibe —con razon casi siempre, porque mover el foco al
     entrar sorprende—. La excepcion es una pantalla cuyo contenido **es** el
     control: aqui no hay a donde mover el foco desde otro sitio. */
  useEffect(() => {
    // Sin reclamarselo a nadie: este componente llega en un trozo diferido, y
    // el efecto corre cuando el trozo aterriza — que puede ser DESPUES de que
    // el operador abriera la paleta con Ctrl K. Robarle el foco a un dialogo
    // abierto manda lo tecleado a la caja equivocada, y en CI es el flake de
    // `caja-con-teclado.spec.ts`. Solo se toma el foco si nadie lo tiene.
    const activo = document.activeElement;
    if (activo === null || activo === document.body) caja.current?.focus();
  }, []);

  const abanico = useAbanicoDeAtencion(escrito, catalogo);
  const franjas = abanico.franjas;
  const encontrados = franjas.flatMap((franja) => franja.resultados);
  const atenciones = catalogo.puedeVer('contribuyentes') ? leerAtenciones() : [];

  const abrir = (resultado: Resultado): void => {
    if (resultado.atencion !== undefined) anotarAtencion(resultado.atencion);
    navegar(resultado.ruta);
  };

  /* **Intro abre el destino** (RNF-082): con un solo resultado, ese; con
     varios, el foco baja a la lista y se elige con el tabulador y Enter, que es
     como se recorre cualquier lista de esta interfaz. Nunca se abre «el
     primero» de varios: elegir por quien atiende es lo que produce una atencion
     sobre la persona equivocada, y aqui la equivocada es un homonimo.

     **Y nunca sobre las respuestas de otra pregunta.** Lo que hay en pantalla
     durante los 300 ms del rebote son los resultados de lo que se pregunto
     **antes**: quien corrige un digito del DNI y pulsa Intro sin esperar abria
     la ficha de la persona anterior, y con la caja vaciada tambien —el estado
     dice `''` y las franjas siguen llenas—. La misma guarda que ya protege a la
     region viva (ver `anuncioDe`): si lo escrito no es lo preguntado, no hay
     todavia nada que abrir. */
  const alEnviar = (evento: React.FormEvent): void => {
    evento.preventDefault();
    if (escrito.trim() !== abanico.preguntado.trim()) return;
    const unico = encontrados.length === 1 ? encontrados[0] : undefined;
    if (unico !== undefined) {
      abrir(unico);
      return;
    }
    lista.current?.querySelector<HTMLElement>('button')?.focus();
  };

  /* **Esc vacia la caja y se queda en ella** (RNF-082). Es el gesto de «esta no
     es, viene el siguiente»: sin el hay que borrar a mano lo tecleado, que en
     una cola es lo que hace que se termine usando el raton. El `type="search"`
     lo hace solo en algunos navegadores y en otros no, asi que se escribe.

     **Las flechas no recorren la lista, y es deliberado.** La paleta de comandos
     puede permitirselas porque su lista es una y suya; aqui las franjas son
     tantas como padrones responda el perfil, cada una con su cabecera, y un foco
     itinerante sobre varias listas exige `aria-activedescendant` y un modelo de
     seleccion que hoy no existe. El recorrido es con el tabulador —como en
     cualquier otra lista de esta interfaz— y por eso tampoco se dibuja el cartel
     «↑ ↓ · Enter» de la paleta: prometeria un recorrido que no hay. */
  const alTeclear = (evento: React.KeyboardEvent<HTMLInputElement>): void => {
    if (evento.key !== 'Escape') return;
    evento.preventDefault();
    fijarEscrito('');
    caja.current?.focus();
  };

  return (
    <div className="sgtm-atencion">
      <form className="sgtm-atencion__pregunta" onSubmit={alEnviar}>
        <p className="sgtm-atencion__eyebrow">Atención al contribuyente</p>
        <h2 className="sgtm-atencion__titulo">¿A quién atiendes?</h2>
        <div className="sgtm-atencion__caja">
          <Icono nombre="lupa" tamano={18} />
          {/* La etiqueta va oculta y no ausente: la pregunta de arriba es un
              titulo, no el nombre accesible del control (FRO-04 §7). */}
          <label className="sgtm-atencion__etiqueta" htmlFor="sgtm-atencion-busqueda">
            Buscar a quién atiendes
          </label>
          <input
            id="sgtm-atencion-busqueda"
            ref={caja}
            type="search"
            autoComplete="off"
            placeholder="DNI, RUC, nombre, placa o código de predio…"
            value={escrito}
            onChange={(evento) => fijarEscrito(evento.target.value)}
            onKeyDown={alTeclear}
          />
        </div>
        <p className="sgtm-atencion__ayuda" role="status">
          {anuncioDe(escrito, abanico, encontrados.length)}
        </p>
        {/* El camino de vuelta, dicho una vez y donde se lee: el inicio no es
            una opcion del catalogo, asi que quien se va a media pantalla no
            tiene el menu ni la paleta para volver (#296). Fuera de la region
            viva a proposito —es una frase fija, y `role="status"` volveria a
            leerla en cada busqueda—. */}
        <p className="sgtm-atencion__vuelta">
          Desde cualquier pantalla se vuelve aquí: con la marca de arriba a la izquierda, o con «¿A
          quién atiendes?» en la rejilla de módulos de la cabecera.
        </p>
      </form>

      <div className="sgtm-atencion__resultados" ref={lista}>
        {franjas.map((franja) => (
          <FranjaDeResultados key={franja.fuente} franja={franja} onAbrir={abrir} />
        ))}
      </div>

      {/* Las atenciones recientes solo con la lectura que las publica: quien
          deja de tener `contribuyentes` deja de verlas, aunque sigan en memoria
          (ver `atenciones.ts`). */}
      {atenciones.length > 0 && (
        <section className="sgtm-atencion__recientes" aria-labelledby="sgtm-atencion-recientes">
          {/* Encabezado, como las franjas: la region se nombra con el, no con
              un `aria-label` que lo duplique. */}
          <h3 className="sgtm-atencion__eyebrow" id="sgtm-atencion-recientes">
            Atenciones recientes
          </h3>
          <ul>
            {atenciones.map((atencion) => (
              <li key={atencion.codigo}>
                <button
                  type="button"
                  // Volver a atender a alguien lo devuelve al principio de la
                  // lista: si esta persona ha vuelto al mostrador, es la mas
                  // reciente, no la de hace media hora.
                  onClick={() => {
                    anotarAtencion(atencion);
                    navegar(rutaDePersona(atencion.codigo));
                  }}
                  className="sgtm-atencion__fila"
                >
                  <span className="sgtm-atencion__quien">
                    <span className="sgtm-atencion__nombre">{atencion.nombre}</span>
                    <span className="sgtm-atencion__detalle">{atencion.documento}</span>
                  </span>
                  <span className="sgtm-atencion__codigo">{atencion.codigo}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/**
 * Una franja, con **su fuente dicha**: el titulo de la opcion del catalogo y su
 * modulo, sin reescribir ninguno de los dos (FRO-03 §5, ADR-0014 §5 — una
 * opcion se nombra en todas las puertas como la nombra el catalogo).
 *
 * No es decoracion: es lo que permite entender por que una persona ve tres
 * franjas y su compañero de al lado ve una. Cada franja **es** una opcion, con
 * su permiso.
 *
 * El nombre de la region **es su encabezado**, no un `aria-label` que lo repita:
 * el resto de la aplicacion titula con `h3` y quien navega por encabezados
 * necesita encontrarlas ahi. `aria-labelledby` ata las dos cosas, asi que el
 * nombre accesible y el titulo visible no pueden separarse.
 */
function FranjaDeResultados({
  franja,
  onAbrir,
}: {
  readonly franja: Franja;
  readonly onAbrir: (resultado: Resultado) => void;
}) {
  const idDelTitulo = useId();

  if (franja.error !== undefined) {
    return (
      <section className="sgtm-atencion__franja" aria-labelledby={idDelTitulo}>
        <Cabecera opcion={franja.opcion} idDelTitulo={idDelTitulo} />
        <ErrorDeLaFranja error={franja.error} opcion={franja.opcion} />
      </section>
    );
  }
  // Una franja que no encontro nada no se dibuja: con tres lecturas abiertas a
  // la vez, tres «ninguno responde a eso» tapan al unico que si respondio. Lo
  // que si se dice —una sola vez, arriba— es que no hubo nada en ninguna.
  if (franja.resultados.length === 0) return null;

  return (
    <section className="sgtm-atencion__franja" aria-labelledby={idDelTitulo}>
      <Cabecera opcion={franja.opcion} idDelTitulo={idDelTitulo} />
      <ul>
        {franja.resultados.map((resultado) => (
          <li key={resultado.clave}>
            <button
              type="button"
              className="sgtm-atencion__fila"
              onClick={() => onAbrir(resultado)}
            >
              <span className="sgtm-atencion__quien">
                <span className="sgtm-atencion__nombre">{resultado.titulo}</span>
                <span className="sgtm-atencion__detalle">{resultado.detalle}</span>
              </span>
              <span className="sgtm-atencion__codigo">{resultado.codigo}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Cabecera({
  opcion,
  idDelTitulo,
}: {
  readonly opcion: OpcionSituada;
  readonly idDelTitulo: string;
}) {
  return (
    <div className="sgtm-atencion__fuente">
      {/* Solo el titulo de la opcion dentro del encabezado: el modulo va al
          lado, porque entra en el nombre accesible de la region lo que este
          nodo contenga. */}
      <h3 className="sgtm-atencion__fuente-opcion" id={idDelTitulo}>
        {opcion.title}
      </h3>
      <span className="sgtm-atencion__fuente-modulo">{opcion.modulo.label}</span>
    </div>
  );
}

/**
 * No se pudo preguntar, o el perfil no puede. **Las dos cosas no se dicen
 * igual, y ninguna se dice como «no existe»** (el mismo reparto que
 * `ResolutorDeUnidad`).
 *
 * Aqui el 403 es ademas **inesperado**: la franja solo se dibuja si el catalogo
 * visible ofrece esa opcion, asi que un 403 significa que la interfaz y el
 * servidor no dicen lo mismo. Se cuenta como lo que es —algo que arregla el
 * administrador de la municipalidad, no un reintento (ADR-0013)— y no se
 * confunde con «esa persona no esta en el padron», que es la lectura que
 * llevaria a dar de alta por segunda vez a quien ya existe.
 */
function ErrorDeLaFranja({
  error,
  opcion,
}: {
  readonly error: unknown;
  readonly opcion: OpcionSituada;
}) {
  if (error instanceof ProblemaDeApi && error.problema.status === 403) {
    return (
      <Aviso
        tipo="sin-permiso"
        titulo={`Tu perfil no puede consultar «${opcion.title}»`}
        detalle="La búsqueda del inicio pregunta a cada padrón por separado, y este te la rechazó. Pídesela al administrador de tu municipalidad: reintentar dará lo mismo. Lo que respondieron los demás sí está aquí."
      />
    );
  }
  return (
    <Aviso
      tipo="error"
      titulo={`No se pudo preguntar a «${opcion.title}»`}
      detalle="La consulta no respondió, así que el sistema no sabe si ahí hay alguien. Vuelve a intentarlo: que no aparezca aquí no quiere decir que no esté en el padrón."
    />
  );
}

/**
 * Lo que dice la region viva: **una frase a la vez**, y ninguna cuando no hay
 * nada que contar.
 *
 * Quien navega con lector de pantalla no ve aparecer las franjas. El recuento es
 * lo que hay que oir antes de bajar: «1 resultado» dice que Intro basta, y «7»
 * que hay que elegir.
 */
function anuncioDe(escrito: string, abanico: Abanico, cuantos: number): string {
  const franjas = abanico.franjas;
  if (escrito.trim() === '') {
    return 'Escribe un DNI, un RUC, un nombre, una placa o un código de predio. Intro abre el resultado cuando solo hay uno.';
  }
  const falta = loQueFalta(escrito);
  if (falta !== '') return falta;
  /* Mientras la mano no para, lo unico cierto es que se esta buscando: lo
     escrito todavia no ha llegado a ninguna consulta. Cualquier otra frase
     estaria contando el estado de la busqueda **anterior**. */
  if (escrito.trim() !== abanico.preguntado.trim()) return 'Buscando…';
  if (franjas.some((franja) => franja.buscando)) return 'Buscando…';
  /* Un error tiene su bloque, con `role="alert"` y su distincion entre el 403 y
     el fallo de red: aqui no se repite. Pero **callar el recuento porque una
     franja fallo es callar lo que si respondieron las otras**: quien no ve la
     pantalla se queda sin saber que hay cuatro personas debajo. El silencio se
     reserva para cuando el error es lo unico que hay. */
  if (franjas.some((franja) => franja.error !== undefined) && cuantos === 0) return '';
  if (abanico.hayPreguntas && franjas.length === 0) return sinPadronQueResponda(abanico);
  if (cuantos === 0)
    return 'Nadie responde a eso. Revisa lo escrito, o búscalo en el padrón que corresponda.';
  const recortadas = franjas.filter((franja) => franja.recortada).length > 0;
  const cuenta = cuantos === 1 ? '1 resultado' : `${cuantos} resultados`;
  return recortadas
    ? `${cuenta}: se enseñan los ${MAXIMO} primeros de cada padrón. Escribe más para acotar.`
    : `${cuenta}. Intro ${cuantos === 1 ? 'lo abre' : 'baja a la lista'}.`;
}

/**
 * Habia a quien preguntar y no quedo ninguna franja. **Son dos cosas distintas
 * y hasta ahora se decian igual**, con la peor de las dos:
 *
 * - el perfil **no tiene ninguna** de las tres consultas del padron: desde aqui
 *   no se puede buscar a nadie, y eso hay que decirlo tal cual;
 * - el perfil tiene alguna, pero **no la que responde a lo escrito**: una placa
 *   con el padron de personas y sin el vehicular. Decirle a esa persona que no
 *   tiene ninguna consulta es falso, y ademas la deja sin saber que si puede
 *   buscar por DNI o por nombre.
 *
 * La fuente que falta se nombra **con el rotulo del catalogo**, que es como se
 * llama en todas las demas puertas: es lo que se le pide al administrador.
 */
function sinPadronQueResponda(abanico: Abanico): string {
  if (abanico.disponibles.length === 0) {
    return 'Tu perfil no tiene ninguna de las consultas del padrón, así que desde aquí no se puede buscar a nadie.';
  }
  const nombres = abanico.faltan.map((fuente) => `«${opcionPorId(fuente)?.title ?? fuente}»`);
  const una = nombres.length === 1;
  const camino = enLista(abanico.disponibles.map((fuente) => COMO_SE_BUSCA_EN[fuente]));
  return (
    `Lo que has escrito lo ${una ? 'responde' : 'responden'} ${enLista(nombres)}, ` +
    `y tu perfil no ${una ? 'la tiene' : 'las tiene'}. Desde aquí se busca ${camino}.`
  );
}

/** «a», «a y b», «a, b y c». */
function enLista(partes: readonly string[]): string {
  if (partes.length <= 1) return partes[0] ?? '';
  return `${partes.slice(0, -1).join(', ')} y ${partes.at(-1) ?? ''}`;
}

/* ── El abanico ────────────────────────────────────────────────────────────
   Tres consultas, siempre las tres declaradas y cada una encendida por su
   cuenta: un hook no se llama a veces. Lo que decide si sale la peticion son
   dos cosas y las dos tienen que cumplirse —que la forma de lo escrito tenga
   sentido para esa lectura, y que el catalogo visible ofrezca su opcion—. */

interface Abanico {
  readonly franjas: readonly Franja[];
  /**
   * Lo que **se pregunto de verdad**: el texto aposentado, no el que se esta
   * tecleando.
   *
   * Sin esto, la region viva contaba el estado de una busqueda que todavia no
   * habia salido, y la frase que salia era la peor de todas: mientras la mano
   * escribia, «tu perfil no tiene ninguna de las consultas del padron» —porque
   * a media pulsacion no hay ninguna franja aun—. Lo destapo intentar romper la
   * prueba del permiso: con la guarda quitada la prueba seguia verde, porque lo
   * que veia era esa frase transitoria y no la que defiende.
   */
  readonly preguntado: string;
  /** Habia algo que preguntar. Sin franjas y con esto, lo que falta es permiso. */
  readonly hayPreguntas: boolean;
  /** Las lecturas que lo escrito necesita y este perfil **no** ofrece. */
  readonly faltan: readonly FuenteDeAtencion[];
  /** Las que si ofrece, respondan o no a lo escrito: por ahi si se puede buscar. */
  readonly disponibles: readonly FuenteDeAtencion[];
}

/** Lo que devuelve una consulta que se quedo sin pregunta. Ver el `queryFn`. */
const NADA: Promise<Encontrados> = Promise.resolve({ resultados: [], recortada: false });

function useAbanicoDeAtencion(escrito: string, catalogo: CatalogoVisible): Abanico {
  const aposentado = useValorAposentado(escrito, ESPERA);
  const preguntas = preguntasDe(aposentado);
  const de = (fuente: FuenteDeAtencion): PreguntaDeAtencion | undefined =>
    preguntas.find((pregunta) => FUENTE_DE[pregunta.clave] === fuente);

  const personas = de('contribuyentes');
  const vehiculos = de('consulta_vehiculos');
  const predios = de('consulta_fichas');
  // A donde lleva un vehiculo depende de lo que este perfil pueda ver, y se
  // decide aqui para que entre en la clave de la consulta.
  const conFichaDeVehiculo = catalogo.puedeVer('vehiculos');

  const consultaDePersonas = useQuery({
    queryKey: ['atencion', 'contribuyentes', personas?.clave, personas?.valor],
    enabled: personas !== undefined && catalogo.puedeVer('contribuyentes'),
    /* Un reintento, no tres: esto se hace **con alguien esperando en el
       mostrador**, y los tres reintentos con espera creciente de TanStack dejan
       «Buscando…» hasta catorce segundos antes de decir nada. */
    retry: 1,
    /* La guarda explicita y no un `as`: `enabled` ya impide que esto corra sin
       pregunta, pero un cast lo **afirma** y una guarda lo comprueba —y si un
       dia `enabled` y la clave dejan de decir lo mismo, con el cast sale un
       `undefined.clave` en produccion y con esto una franja vacia—. */
    queryFn: ({ signal }) => (personas === undefined ? NADA : buscarPersonas(personas, signal)),
  });

  const consultaDeVehiculos = useQuery({
    queryKey: ['atencion', 'consulta_vehiculos', vehiculos?.valor, conFichaDeVehiculo],
    enabled: vehiculos !== undefined && catalogo.puedeVer('consulta_vehiculos'),
    retry: 1,
    queryFn: ({ signal }) => buscarVehiculos(vehiculos?.valor ?? '', conFichaDeVehiculo, signal),
  });

  const consultaDePredios = useQuery({
    queryKey: ['atencion', 'consulta_fichas', predios?.valor],
    enabled: predios !== undefined && catalogo.puedeVer('consulta_fichas'),
    retry: 1,
    queryFn: ({ signal }) => buscarPredios(predios?.valor ?? '', signal),
  });

  const pedidas = FUENTES.filter((fuente) =>
    preguntas.some((pregunta) => FUENTE_DE[pregunta.clave] === fuente),
  );

  return {
    franjas: [
      franjaDe('contribuyentes', personas, catalogo, consultaDePersonas),
      franjaDe('consulta_vehiculos', vehiculos, catalogo, consultaDeVehiculos),
      franjaDe('consulta_fichas', predios, catalogo, consultaDePredios),
    ].filter((franja): franja is Franja => franja !== undefined),
    preguntado: aposentado,
    hayPreguntas: preguntas.length > 0,
    faltan: pedidas.filter((fuente) => !catalogo.puedeVer(fuente)),
    disponibles: FUENTES.filter((fuente) => catalogo.puedeVer(fuente)),
  };
}

/** Lo que devuelve una busqueda: las filas que caben, y si sobraban. */
interface Encontrados {
  readonly resultados: readonly Resultado[];
  readonly recortada: boolean;
}

type ConsultaDeFranja = {
  readonly isFetching: boolean;
  readonly data?: Encontrados | undefined;
  readonly error: unknown;
};

/**
 * La franja de una lectura, o nada.
 *
 * **Nada** en los dos casos en que no hay que dibujar: cuando la forma de lo
 * escrito no le corresponde —un nombre no se le pregunta al padron vehicular— y
 * cuando el catalogo visible no ofrece su opcion. El segundo es el que importa:
 * sin permiso no se consulta y no se dibuja, ni franja vacia ni error.
 */
function franjaDe(
  fuente: FuenteDeAtencion,
  pregunta: PreguntaDeAtencion | undefined,
  catalogo: CatalogoVisible,
  consulta: ConsultaDeFranja,
): Franja | undefined {
  if (pregunta === undefined || !catalogo.puedeVer(fuente)) return undefined;
  const opcion = opcionPorId(fuente);
  if (opcion === undefined) return undefined;
  return {
    fuente,
    opcion,
    buscando: consulta.isFetching,
    resultados: consulta.data?.resultados ?? [],
    recortada: consulta.data?.recortada ?? false,
    ...(consulta.error === null || consulta.error === undefined ? {} : { error: consulta.error }),
  };
}

/* ── A donde lleva cada fila ───────────────────────────────────────────────
   Cada resultado lleva **a donde su propia lectura permite llegar**, que es lo
   que impide mandar a nadie a una pantalla que le va a contestar 403. */

/**
 * **La persona, a su ficha 360°** (#297, ADR-0016 §2).
 *
 * Hasta que la ficha existio, esta ruta llevaba al padron con el codigo puesto
 * —`contribuyentes?codigo=`—, que dibujaba la cabecera-resumen de #330 y nada
 * mas: el nombre, el documento y nueve pestañas de campos vacios. La pregunta
 * que trae a alguien al mostrador no la contesta esa pantalla.
 *
 * Ahora lleva a `/atencion/:codigo`, que es la misma persona con su deuda
 * consolidada a fecha en la cabecera y sus predios, vehiculos, papeletas y
 * expediente coactivo compuestos pestaña a pestaña, **cada uno con el permiso de
 * su opcion**. Era el unico destino de los tres del abanico que tenia que
 * cambiar: el del vehiculo y el del predio siguen llevando a su padron, porque
 * la ficha es de una persona y esos dos no la identifican.
 *
 * La ficha **no es una opcion del catalogo** —ver `App.tsx`—, asi que su ruta se
 * escribe aqui y no sale de `opcionPorId`.
 */
const rutaDePersona = (codigo: string): string => `/atencion/${encodeURIComponent(codigo)}`;

async function buscarPersonas(
  pregunta: PreguntaDeAtencion,
  senal: AbortSignal,
): Promise<Encontrados> {
  const cuerpo = await pedirOperacion('contribuyentes', parametroDe(pregunta), senal);
  const pagina = leerPaginado(cuerpo, 'los contribuyentes');
  const todos = pagina.contenido.filter(esObjeto).flatMap((fila): readonly Resultado[] => {
    const codigo = texto(fila['codigo']);
    if (codigo === SIN_DATO) return [];
    const nombre = texto(fila['nombreRazonSocial']);
    // El documento, como lo publica el recurso: tipo y numero. Y el estado,
    // dicho solo cuando importa —atender a un contribuyente dado de baja es lo
    // que hay que saber **antes** de abrirlo, no despues—.
    const documento = `${texto(fila['tipoDocumento'])} ${texto(fila['numeroDocumento'])}`.trim();
    const baja = fila['activo'] === false ? ' · INACTIVO' : '';
    return [
      {
        clave: `contribuyente-${codigo}`,
        titulo: nombre,
        detalle: `${documento}${baja}`,
        codigo,
        ruta: rutaDePersona(codigo),
        atencion: { codigo, nombre, documento },
      },
    ];
  });
  return recortar(todos, pagina);
}

/** Un texto del recurso, o vacio: para componer una linea sin un guion suelto en medio. */
const opcional = (valor: unknown): string => (typeof valor === 'string' ? valor.trim() : '');

/** Los cuatro filtros del contrato, elegido el que toca. Ver `busqueda-de-atencion.ts`. */
function parametroDe(pregunta: PreguntaDeAtencion): {
  readonly nombreRazonSocial?: string;
  readonly dNI?: string;
  readonly rUC?: string;
} {
  if (pregunta.clave === 'dni') return { dNI: pregunta.valor };
  if (pregunta.clave === 'ruc') return { rUC: pregunta.valor };
  return { nombreRazonSocial: pregunta.valor };
}

async function buscarVehiculos(
  placa: string,
  conFicha: boolean,
  senal: AbortSignal,
): Promise<Encontrados> {
  const cuerpo = await pedirOperacion('consulta_vehiculos', { placa }, senal);
  const pagina = leerPaginado(cuerpo, 'el padron vehicular');
  const todos = pagina.contenido.filter(esObjeto).flatMap((fila): readonly Resultado[] => {
    const suPlaca = texto(fila['placa']);
    if (suPlaca === SIN_DATO) return [];
    const vehiculo = [opcional(fila['marca']), opcional(fila['modelo'])]
      .filter((parte) => parte !== '')
      .join(' ');
    return [
      {
        clave: `vehiculo-${suPlaca}`,
        titulo: texto(fila['titular']),
        detalle: vehiculo === '' ? SIN_DATO : vehiculo,
        codigo: suPlaca,
        /* La ficha del vehiculo es **otra opcion, con otro permiso**: quien
           tenga la consulta y no la ficha se quedaria mirando un «no tienes
           permiso» al que le mando la propia interfaz. Sin ella, la fila vuelve
           a su consulta con la placa puesta, que es la que ya respondio. */
        ruta: conFicha
          ? `${opcionPorId('vehiculos')?.ruta ?? '/'}/${encodeURIComponent(suPlaca)}`
          : `${opcionPorId('consulta_vehiculos')?.ruta ?? '/'}?placa=${encodeURIComponent(suPlaca)}`,
      },
    ];
  });
  return recortar(todos, pagina);
}

async function buscarPredios(digitos: string, senal: AbortSignal): Promise<Encontrados> {
  const cuerpo = await pedirOperacion('consulta_fichas', { codRefCatastral: digitos }, senal);
  const pagina = leerPaginado(cuerpo, 'las fichas');
  const todos = pagina.contenido.filter(esObjeto).flatMap((fila): readonly Resultado[] => {
    const codigo = texto(fila['codRefCatastral']);
    if (codigo === SIN_DATO) return [];
    return [
      {
        // `titular` nulo significa «sin titular vigente», que es el predio que
        // catastro tiene que revisar: sale con guion, y sale en la lista.
        clave: `predio-${codigo}`,
        titulo: texto(fila['titular']),
        detalle: texto(fila['direccion']),
        codigo,
        ruta: `${opcionPorId('consulta_fichas')?.ruta ?? '/'}?codRefCatastral=${encodeURIComponent(digitos)}`,
      },
    ];
  });
  return recortar(todos, pagina);
}

/**
 * Los que caben, y si sobraban.
 *
 * Sobran los de esta pagina **y los que la paginacion dice que hay detras**:
 * enseñar seis sin decir que hay mas hace creer que no los hay, y quien no
 * encuentre al suyo se ira pensando que no esta en el padron.
 */
function recortar(todos: readonly Resultado[], pagina: Paginado<unknown>): Encontrados {
  return {
    resultados: todos.slice(0, MAXIMO),
    recortada:
      todos.length > MAXIMO || pagina.hayMas || pagina.totalElementos > pagina.contenido.length,
  };
}
