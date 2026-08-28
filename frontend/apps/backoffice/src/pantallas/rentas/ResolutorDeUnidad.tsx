import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Aviso, Boton, Campo } from '@sgtm/design-system';
import { ProblemaDeApi, pedirOperacion } from '@sgtm/api-client';
import type { ResolutorProps } from '../composicion';
import { useValorAposentado } from '../aposentar';
import { SIN_DATO, esObjeto, leerObjeto, leerPaginado } from '../seguridad/listado';

/**
 * **De un código catastral o una placa al identificador que el backend pide** (#331).
 *
 * El hueco que cierra, dicho con nombres: `alta_deuda` dibuja «Unidad (predio /
 * placa)» y quien atiende escribe ahí lo que tiene —un código de referencia
 * catastral, una placa—. `PeticionDeMovimiento` no acepta ninguna de las dos
 * cosas: acepta `predioId` y `vehiculoId`, que son los identificadores internos
 * que `ClaveDeSaldo` compara con igualdad exacta. Hasta hoy el campo se tecleaba
 * y **no viajaba**, así que el alta quedaba a nivel de contribuyente: sin unidad,
 * y por tanto sobre otra obligación distinta de la que se quería dar de alta.
 *
 * **Ninguna consulta inventada.** Se resuelve con las dos operaciones de lectura
 * que el backend ya publica, y las dos publican el identificador:
 *
 *   `consulta_fichas`  `GET /catastro/fichas?codRefCatastral=` — `FichaEncontradaResource`
 *                      trae `predioId`, el código y el titular, y la dirección
 *                      **cuando la trae**: el recurso la declara y el juego de
 *                      datos del prototipo no la tiene, así que el candidato la
 *                      enseña solo si llega (ADR-0010: no se finge en el proxy)
 *   `vehiculos`        `GET /rentas/vehiculos/{placa}` — `VehiculoResource` trae `id`
 *
 * Es lo que separa este issue de los otros cuatro consumidores que el hueco
 * bloquea: aquí el identificador **está publicado**. Ver `rentas/index.ts` para
 * los que no lo están, que se anotan y no se fingen (ADR-0010).
 *
 * Cuatro cosas que hace y que se ven poco:
 *
 * - **No pregunta por tecla.** Un código catastral son 21 dígitos, y con la
 *   consulta en la clave del `useQuery` eso eran 21 consultas contra el padrón.
 *   Se espera a que la mano pare (`useValorAposentado`, 300 ms), igual que el
 *   asistente de catastro.
 * - **Un fallo de red no es «no existe».** Son tres frases distintas y se dicen
 *   distintas: `no encontrado` es una respuesta del servidor sobre el padrón,
 *   un 403 es que ese perfil no puede consultarlo, y cualquier otro error es que
 *   no se pudo preguntar. Callar ante los dos últimos los convierte en el
 *   primero, que es exactamente lo que autoriza a dar de alta la deuda de una
 *   unidad que sí existe como si no existiera.
 * - **Lo tecleado no viaja.** El código y la placa son texto de presentación y
 *   viven en este control, como el borrador de `Filtros`. Lo único que sale de
 *   aquí es el identificador, y pasa por la lista blanca de `escrituras.ts`.
 * - **Lo resuelto puede no ser de quien paga**, y eso se dice (revisión de
 *   #331). Ver {@link cruceDelTitular}.
 */

/** Las dos formas de nombrar una unidad, con el rótulo del manual. */
const POR_CODIGO = 'CÓDIGO CATASTRAL';
const POR_PLACA = 'PLACA';
const FORMAS = [POR_CODIGO, POR_PLACA] as const;

/** Qué campo del cuerpo llena cada forma. Los dos, declarados en `escrituras.ts`. */
const CAMPO_DE_LA_FORMA: Readonly<Record<string, string>> = {
  [POR_CODIGO]: 'predioId',
  [POR_PLACA]: 'vehiculoId',
};

/** Los dos identificadores, en el orden en que se busca cuál está fijado. */
const IDENTIFICADORES = [CAMPO_DE_LA_FORMA[POR_CODIGO] ?? '', CAMPO_DE_LA_FORMA[POR_PLACA] ?? ''];

/**
 * Dónde se guarda **el rótulo** de lo que se eligió: en el borrador, no en el
 * estado de este componente, y sin viajar nunca.
 *
 * Es una clave de `EscrituraDeclarada.presentacion` (`escrituras.ts`), así que
 * `fijarCampo` la acepta y `soloDeclarados` ni la mira. Vivía en un `useState`,
 * y el estado de este componente muere cuando la sección se pliega: plegar y
 * volver a abrir dejaba la tarjeta diciendo «#1 / —» sobre una unidad que sí
 * estaba resuelta. Releerla por su identificador tampoco se puede —no hay
 * ningún `GET` de un predio por `predioId`—, así que se recuerda.
 */
const MEMORIA = 'unidadResuelta';

/**
 * Con menos de esto no se pregunta.
 *
 * No es una barrera de permisos —quien llega aquí ya tiene la lectura de
 * `consulta_fichas`, y la superficie que esa lectura da es la que da con o sin
 * este control—: es que una consulta por prefijo con menos dígitos devuelve
 * medio padrón y el candidato correcto no se distingue del resto. Seis dígitos
 * son el ubigeo de un código catastral, y seis caracteres una placa peruana
 * entera. No es el mismo número por casualidad, pero tampoco hay motivo para dos.
 */
const MINIMO = 6;

interface Candidato {
  /** El identificador interno, tal como lo publica el recurso. */
  readonly id: string;
  /** Cómo se llama la unidad para quien la busca: el código o la placa. */
  readonly codigo: string;
  /** De quién es, o qué es. */
  readonly titulo: string;
  /** Dónde está, cuando el recurso lo publica. */
  readonly detalle: string;
  /**
   * A nombre de quién figura la unidad, cuando el recurso publica un nombre.
   *
   * `FichaEncontradaResource.titular` lo publica —y nulo significa «sin titular
   * vigente», que es el predio que catastro tiene que revisar—;
   * `VehiculoResource` no publica ningún nombre: publica `contribuyenteId`, que
   * es un identificador interno y no se puede cruzar con el código que la
   * pantalla tiene. Vacío en ese caso, y entonces no se afirma nada.
   */
  readonly titular: string;
}

export function ResolutorDeUnidad({
  etiqueta,
  resuelto,
  contexto,
  onCampo,
  bloqueado,
}: ResolutorProps) {
  const [forma, fijarForma] = useState<string>(POR_CODIGO);
  const [escrito, fijarEscrito] = useState('');
  /* A dónde va el foco en el próximo dibujo, cuando el gesto cambia de bloque:
     al elegir, la tarjeta sustituye a la búsqueda y el control que sigue siendo
     útil es «Cambiar»; al pulsar «Cambiar», la caja donde se teclea. El destino
     no existe todavía en el momento del clic —el otro bloque no está montado—,
     así que se apunta y se enfoca en el efecto (`pantallas/foco.ts` hace lo
     mismo con la acción que abrió un flujo). */
  const [foco, fijarFoco] = useState<'busqueda' | 'cambiar' | null>(null);
  const cajaDeBusqueda = useRef<HTMLDivElement>(null);
  const tarjeta = useRef<HTMLDivElement>(null);

  const campo = CAMPO_DE_LA_FORMA[forma] ?? '';
  // Cuál de los dos identificadores tiene valor, si alguno. A lo sumo uno: una
  // obligación cuelga de un predio, de un vehículo o de ninguno. Se pregunta
  // **por los dos identificadores** y no por lo que traiga `resuelto`, que
  // ahora lleva además el rótulo de presentación.
  const fijado = IDENTIFICADORES.map((nombre) => [nombre, resuelto[nombre] ?? ''] as const).find(
    ([, valor]) => valor.trim() !== '',
  );
  const elegido = leerMemoria(resuelto[MEMORIA] ?? '');

  const busqueda = useBusquedaDeUnidad(forma, escrito, !bloqueado && fijado === undefined);

  /* **Al dejar de haber unidad resuelta, la búsqueda empieza limpia.**
     Guardar vacía el borrador —y con él lo resuelto—, pero `escrito` es estado
     de este componente y sobrevivía: la pantalla volvía a la búsqueda con el
     código del alta anterior escrito, `invalidateQueries` relanzaba la consulta
     y la lista repintaba el titular de antes al lado de un formulario vacío.
     Solo en el flanco: limpiar en cada dibujo impediría teclear. */
  const habiaUnidad = useRef(fijado !== undefined);
  useEffect(() => {
    const hay = fijado !== undefined;
    const acabaDeSoltarse = habiaUnidad.current && !hay;
    habiaUnidad.current = hay;
    if (acabaDeSoltarse) fijarEscrito('');
  }, [fijado]);

  useEffect(() => {
    if (foco === null) return;
    const donde = foco === 'busqueda' ? cajaDeBusqueda.current : tarjeta.current;
    // El primer control escribible de la caja, o el botón de la tarjeta. Se
    // busca en el DOM y no por `ref` sobre el componente por lo mismo que
    // `useFocoTrasGuardar`: `Campo` y `Boton` no exponen el nodo.
    donde
      ?.querySelector<HTMLElement>(
        foco === 'busqueda' ? 'input:not([readonly]):not([disabled])' : '.sgtm-boton',
      )
      ?.focus();
    fijarFoco(null);
  }, [foco]);

  if (fijado !== undefined) {
    const [nombre, valor] = fijado;
    const mismo = elegido !== undefined && elegido.id === valor;
    const cruce = mismo
      ? cruceDelTitular(
          elegido.titular,
          contexto['nombre'] ?? '',
          contexto['codContribuyente'] ?? '',
        )
      : undefined;
    return (
      <div className="sgtm-resolutor sgtm-resolutor--resuelto" ref={tarjeta}>
        <p className="sgtm-resolutor__eyebrow">{etiqueta}</p>
        <p className="sgtm-resolutor__codigo">{mismo ? elegido.codigo : `#${valor}`}</p>
        <p className="sgtm-resolutor__detalle">
          {mismo ? [elegido.titulo, elegido.detalle].filter((t) => t !== '').join(' · ') : SIN_DATO}
        </p>
        {/* Advertencia, no error: **no bloquea**. Lleva su propio relleno de
            atención —el mismo par de tokens que la insignia, que
            `contraste.test.ts` ya mide— y no un `Aviso tipo="error"`, que
            afirmaría que algo salió mal cuando lo que pasa es que hay que
            mirar. `role="status"` y no `alert`: se anuncia, no interrumpe. */}
        {cruce !== undefined && (
          <p className="sgtm-resolutor__cruce" role="status" data-cruce={cruce.tipo}>
            <strong className="sgtm-resolutor__cruce-titulo">{cruce.titulo}</strong>
            <span>{cruce.detalle}</span>
          </p>
        )}
        <Boton
          menudo
          // El rótulo visible se queda como está —es el del gesto—, y el nombre
          // accesible dice de qué: en una lista de controles, «Cambiar» a secas
          // no se distingue de ningún otro «Cambiar» de la pantalla.
          aria-label="Cambiar la unidad resuelta"
          onClick={() => {
            // Se vacía el campo, no se cambia por otro: cambiar de unidad es
            // dejar de señalar a la que había mientras se busca la siguiente.
            onCampo(nombre, '');
            onCampo(MEMORIA, '');
            fijarEscrito('');
            fijarFoco('busqueda');
          }}
        >
          Cambiar
        </Boton>
      </div>
    );
  }

  return (
    <div className="sgtm-resolutor">
      <div className="sgtm-resolutor__controles" ref={cajaDeBusqueda}>
        <Campo
          etiqueta={`${etiqueta} — buscar por`}
          tipo="sel"
          opciones={[...FORMAS]}
          valor={forma}
          bloqueado={bloqueado}
          onCambio={(valor) => {
            fijarForma(valor);
            fijarEscrito('');
          }}
        />
        <Campo
          etiqueta={etiqueta}
          tipo="text"
          valor={escrito}
          bloqueado={bloqueado}
          ph={forma === POR_CODIGO ? '20 01 06 01 001 …' : 'ABC-123'}
          /* **La prosa no invita a lo que la guarda rechaza** (revisión de
             #331). Decía «hasta entonces el alta queda a nivel de
             contribuyente», y eso solo vale para los conceptos que no cuelgan
             de ninguna unidad: para arbitrios, alcabala o vehicular, un alta
             sin unidad la rechaza `faltaEnElAlta` —y con razón, porque
             señalaría a otra obligación—. */
          ayuda={
            bloqueado
              ? 'Aquí todavía no se puede resolver la unidad: solo se pueden dar de alta conceptos que no cuelguen de ninguna (el predial, una multa administrativa sin predio).'
              : 'Escribe lo que tengas y elige la unidad en la lista: lo que se guarda es el registro, no el texto.'
          }
          onCambio={fijarEscrito}
        />
      </div>

      {/* Lo que va cambiando mientras se busca, **en una región viva**: quien
          navega con lector de pantalla no ve la lista aparecer. Se dibuja
          siempre —vacía cuando no hay nada que decir— porque una región que se
          monta con su texto dentro no anuncia nada: lo que se lee es el cambio
          de una región que ya se estaba observando, igual que la franja de la
          barra de acciones. */}
      <p className="sgtm-resolutor__nota" role="status">
        {anuncioDe(busqueda, bloqueado, escrito)}
      </p>

      {busqueda.error !== undefined && <ErrorDeLaBusqueda error={busqueda.error} forma={forma} />}

      {busqueda.candidatos.length > 0 && (
        /* Las clases son las de la lista del asistente de catastro **a
           propósito**: es la misma lista de candidatos con el mismo gesto, y
           dos hojas para lo mismo se separan a la primera corrección. La
           compartición está anotada en `aplicacion.css`, donde vive la regla.

           **Y no lleva flechas ni Esc**, que es el patrón de `MenuDeCabecera`
           (ADR-0014). No es lo mismo: aquel es un desplegable —se abre, se
           cierra, atrapa el foco y Esc lo devuelve al botón que lo abrió—, y
           esto es contenido en línea que aparece al escribir y desaparece al
           elegir. Aquí Esc no tendría qué cerrar ni a dónde devolver el foco, y
           las flechas competirían con el recorrido del tabulador, que ya llega
           a los candidatos en el orden de la página. Lo que sí faltaba es que
           el foco **se viera** (`aplicacion.css`) y que la lista se anunciara
           (`anuncioDe`). */
        <ul className="sgtm-asistente__resultados">
          {busqueda.candidatos.map((candidato) => (
            <li key={candidato.id}>
              <button
                type="button"
                onClick={() => {
                  onCampo(campo, candidato.id);
                  onCampo(MEMORIA, JSON.stringify(candidato));
                  fijarFoco('cambiar');
                }}
              >
                <span>
                  {candidato.titulo}
                  {candidato.detalle === '' ? '' : ` · ${candidato.detalle}`}
                </span>
                <span className="sgtm-asistente__codigo">{candidato.codigo}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Lo que dice la región viva de la búsqueda: **una frase a la vez**, y ninguna
 * cuando no hay nada que contar.
 *
 * El recuento está aquí y no en la lista porque es lo que hay que oír al elegir:
 * «4 unidades encontradas» dice que hay que mirar, y «1» que no.
 */
function anuncioDe(busqueda: BusquedaDeUnidad, bloqueado: boolean, escrito: string): string {
  if (busqueda.buscando) return 'Buscando la unidad…';
  // Que no se haya preguntado no es que no exista. Se dice, por lo mismo que
  // lo dice el asistente de catastro antes de comprobar un duplicado.
  if (!busqueda.preguntable) {
    return !bloqueado && escrito.trim() !== ''
      ? `Todavía no se ha buscado: hacen falta al menos ${MINIMO} caracteres.`
      : '';
  }
  // El error tiene su propio bloque, con su propia distinción: aquí no se
  // repite, porque decir dos veces lo mismo en dos sitios no es decirlo mejor.
  if (busqueda.error !== undefined) return '';
  if (busqueda.candidatos.length === 0) {
    return 'Ninguna unidad responde a eso. Revisa lo escrito, o deja el alta sin unidad si el concepto no cuelga de ninguna.';
  }
  const cuantas =
    busqueda.candidatos.length === 1
      ? '1 unidad encontrada'
      : `${busqueda.candidatos.length} unidades encontradas`;
  /* Y **se dice cuando la lista está recortada**. Un prefijo corto trae el
     edificio entero; enseñar los ocho primeros sin decirlo hace creer que no
     hay más, y quien no encuentre el suyo dejaría el alta sin unidad teniéndola. */
  return busqueda.recortada
    ? `${cuantas}: se enseñan las ${MAXIMO} primeras. Escribe más dígitos para acotar.`
    : `${cuantas}.`;
}

/**
 * **La unidad resuelta puede no ser de quien va a pagar**, y la pantalla lo dice
 * (revisión de #331).
 *
 * El hueco: se busca un predio por su código y se elige de una lista donde el
 * titular es una columna más. Nada cruza ese titular con el contribuyente del
 * alta, así que resolver la unidad de **otra persona** —un dígito de más en el
 * código— asienta la deuda sobre una obligación que no es de nadie que la deba,
 * y ningún síntoma lo delata.
 *
 * **El cruce de fondo es del backend, y aquí no se finge que no lo sea.**
 * `RegistrarMovimientoDeDeuda` es quien tiene las dos cosas —el contribuyente y
 * el predio— y quien puede rechazar un `predioId` que no cuelgue de él;
 * `VehiculoResource` ya publica `contribuyenteId` para el otro lado. Esto es la
 * mitad de delante: **avisa y no bloquea**, porque una titularidad puede estar
 * en trámite y quien atiende sabe cosas que la pantalla no.
 *
 * Las tres respuestas, y por qué son tres:
 *
 *   sin titular    el recurso no publica ninguno —`VehiculoResource` no lo
 *                  publica, y un predio sin titular vigente lo publica nulo—:
 *                  no hay nada que afirmar, y afirmar «no coincide» sería
 *                  mentir
 *   no coincide    la pantalla sabe a nombre de quién va el alta y no es el
 *                  mismo. Es lo que hay que ver antes de guardar
 *   sin cruzar     la pantalla **no** sabe de quién es la cuenta —hoy es el
 *                  caso normal: «Alta de deuda» es un `POST` y no pide nada al
 *                  abrir, así que su campo «Nombre» está vacío—. Entonces se
 *                  dice a nombre de quién figura la unidad y que el cruce lo
 *                  hace el servidor, en vez de callarse
 */
export interface CruceDelTitular {
  readonly tipo: 'no-coincide' | 'sin-cruzar';
  readonly titulo: string;
  readonly detalle: string;
}

export function cruceDelTitular(
  titular: string,
  nombreDelContribuyente: string,
  codContribuyente: string,
): CruceDelTitular | undefined {
  if (titular.trim() === '' || titular.trim() === SIN_DATO) return undefined;
  const dedeQuien = codContribuyente.trim() === '' ? 'del alta' : `«${codContribuyente.trim()}»`;
  if (nombreDelContribuyente.trim() === '') {
    return {
      tipo: 'sin-cruzar',
      titulo: `La unidad resuelta figura a nombre de ${titular}`,
      detalle: `Comprueba que es la del contribuyente ${dedeQuien}: el sistema todavía no puede cruzarlos desde aquí, y una unidad de otro titular asienta la deuda sobre una obligación que no es suya. El servidor lo comprueba al guardar.`,
    };
  }
  if (comparable(titular) === comparable(nombreDelContribuyente)) return undefined;
  return {
    tipo: 'no-coincide',
    titulo: `La unidad resuelta es de OTRO titular: ${titular}`,
    detalle: `El alta se registra sobre ${nombreDelContribuyente.trim()} (${dedeQuien}). Si la titularidad está en trámite puede ser correcto; si no lo está, vuelve a buscar la unidad, porque la deuda quedaría asentada sobre una obligación que no es la suya.`,
  };
}

/**
 * Dos nombres, comparables: sin tildes, sin puntuación y sin espacios de más.
 *
 * No es una identidad —«MEDINA MEDINA, RUFINA (SUC.)» y «MEDINA MEDINA RUFINA»
 * son la misma persona y este embudo los iguala—, y por eso lo que produce es
 * un aviso y no un bloqueo.
 */
const comparable = (nombre: string): string =>
  nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();

/**
 * No se pudo preguntar, el perfil no puede, o el padrón contestó que no hay.
 *
 * **Las tres cosas no se dicen igual.** «No existe» es una afirmación sobre el
 * padrón y solo la puede hacer el servidor contestando; un 500 o la red caída no
 * dicen nada sobre la unidad, y un 403 dice algo muy distinto —que la consulta
 * es la equivocada para ese perfil, y eso lo arregla el administrador de la
 * municipalidad, no un reintento—. Presentar cualquiera de los dos como «no
 * existe» lleva a dar de alta sin unidad una deuda que sí tiene la suya, y
 * presentar el 403 como «vuelve a intentarlo» manda a alguien a pulsar cien
 * veces algo que va a contestar lo mismo (ADR-0013).
 */
function ErrorDeLaBusqueda({ error, forma }: { readonly error: unknown; readonly forma: string }) {
  const donde = forma === POR_PLACA ? 'el padrón de vehículos' : 'el catastro';
  if (esNoEncontrado(error)) {
    return (
      <p className="sgtm-resolutor__nota" role="status">
        {forma === POR_PLACA
          ? 'No hay ningún vehículo con esa placa en el padrón.'
          : 'No hay ninguna unidad con ese código en el catastro.'}
      </p>
    );
  }
  if (esSinPermiso(error)) {
    return (
      <Aviso
        tipo="sin-permiso"
        titulo="No tienes permiso para consultar esa unidad"
        detalle={`Resolver la unidad se hace contra ${donde}, y tu perfil no tiene esa consulta. Pídesela al administrador de tu municipalidad: reintentar dará lo mismo.`}
      />
    );
  }
  return (
    <Aviso
      tipo="error"
      titulo="No se pudo buscar la unidad"
      detalle="La consulta no respondió, así que el sistema no sabe si esa unidad existe. Vuelve a intentarlo: que no aparezca aquí no quiere decir que no esté en el padrón."
    />
  );
}

/**
 * El servidor contestó que no hay (404), que **no** es un fallo de la consulta.
 *
 * Se exporta para poder probarlo sin montar nada: es la distinción entera de la
 * que depende que un fallo de red no se lea como «no existe».
 */
export const esNoEncontrado = (error: unknown): boolean =>
  error instanceof ProblemaDeApi && error.problema.status === 404;

/** Y el 403, que tampoco lo es: es que ese perfil no puede preguntar. */
export const esSinPermiso = (error: unknown): boolean =>
  error instanceof ProblemaDeApi && error.problema.status === 403;

interface BusquedaDeUnidad {
  /** Ya hay texto suficiente para preguntar. Si no, no es que no haya: es que no se preguntó. */
  readonly preguntable: boolean;
  readonly buscando: boolean;
  readonly candidatos: readonly Candidato[];
  /** La página traía más de las que se enseñan. Se dice; ver `anuncioDe`. */
  readonly recortada: boolean;
  readonly error?: unknown;
}

/** Lo que devuelve una búsqueda: los candidatos que caben, y si sobraban. */
interface Encontrados {
  readonly candidatos: readonly Candidato[];
  readonly recortada: boolean;
}

/**
 * La búsqueda, por la operación de lectura que corresponde a la forma elegida.
 *
 * Un solo `useQuery` y no dos: la forma entra en la clave, así que cambiar de
 * código a placa es otra consulta y no hay ningún hook que se llame a veces.
 */
function useBusquedaDeUnidad(forma: string, escrito: string, activa: boolean): BusquedaDeUnidad {
  const buscado = useValorAposentado(normalizar(forma, escrito));
  const preguntable = activa && buscado.length >= MINIMO;

  const consulta = useQuery({
    queryKey: ['resolutor-de-unidad', forma, buscado],
    enabled: preguntable,
    /* Un reintento, no tres. Esto se hace **con alguien esperando en el
       mostrador**: con la red caída, los tres reintentos con espera creciente
       de TanStack dejan «Buscando la unidad…» entre siete y catorce segundos
       antes de decir nada. Uno cubre el corte de un instante, que es lo que un
       reintento arregla; lo que no arregla es una red caída. */
    retry: 1,
    queryFn: ({ signal }) =>
      forma === POR_PLACA ? porPlaca(buscado, signal) : porCodigo(buscado, signal),
  });

  if (!preguntable) {
    return { preguntable: false, buscando: false, candidatos: [], recortada: false };
  }
  return {
    preguntable: true,
    buscando: consulta.isFetching,
    candidatos: consulta.data?.candidatos ?? [],
    recortada: consulta.data?.recortada ?? false,
    ...(consulta.error === null ? {} : { error: consulta.error }),
  };
}

/**
 * Lo que se manda, a partir de lo que se escribió.
 *
 * Un código catastral se busca **por sus dígitos**: el prototipo lo escribe
 * troquelado y el backend resuelve el prefijo por rango, no por el texto con
 * guiones (`modelo-logico-fisico.md` §0). Una placa se busca en mayúsculas y sin
 * espacios, que es como `Placa.de` la normaliza en el dominio.
 */
function normalizar(forma: string, escrito: string): string {
  const limpio = escrito.trim();
  if (forma === POR_PLACA) return limpio.toUpperCase().replace(/\s+/g, '');
  return limpio.replace(/[^0-9]/g, '');
}

/** Las fichas cuyo código empieza así (`consulta_fichas`). Publica `predioId`. */
async function porCodigo(digitos: string, senal: AbortSignal): Promise<Encontrados> {
  const cuerpo = await pedirOperacion('consulta_fichas', { codRefCatastral: digitos }, senal);
  const pagina = leerPaginado(cuerpo, 'las fichas');
  const todos = pagina.contenido.filter(esObjeto).flatMap((fila) => {
    const id = identificador(fila['predioId']);
    if (id === '') return [];
    const titular = cadena(fila['titular'], '');
    return [
      {
        id,
        codigo: cadena(fila['codRefCatastral'], SIN_DATO),
        titulo: titular === '' ? SIN_DATO : titular,
        detalle: cadena(fila['direccion'], ''),
        titular,
      },
    ];
  });
  return {
    candidatos: todos.slice(0, MAXIMO),
    // Sobran las de esta página, y las que la paginación dice que hay detrás.
    recortada:
      todos.length > MAXIMO || pagina.hayMas || pagina.totalElementos > pagina.contenido.length,
  };
}

/** El vehículo de esa placa (`vehiculos`). Publica su `id`. */
async function porPlaca(placa: string, senal: AbortSignal): Promise<Encontrados> {
  const vehiculo = leerObjeto(await pedirOperacion('vehiculos', { placa }, senal), 'el vehiculo');
  const id = identificador(vehiculo['id']);
  if (id === '') return { candidatos: [], recortada: false };
  return {
    candidatos: [
      {
        id,
        codigo: cadena(vehiculo['placa'], placa),
        titulo: [cadena(vehiculo['marca'], ''), cadena(vehiculo['modelo'], '')]
          .filter((parte) => parte !== '')
          .join(' '),
        detalle: cadena(vehiculo['categoria'], ''),
        // `VehiculoResource` publica `contribuyenteId`, no un nombre: no hay
        // titular que cruzar desde aquí. Ver `cruceDelTitular`.
        titular: '',
      },
    ],
    recortada: false,
  };
}

/**
 * Cuántos candidatos se enseñan.
 *
 * Un prefijo corto trae el edificio entero, y una lista de cien no es una lista:
 * es la invitación a elegir el primero. Quien no encuentre el suyo escribe más
 * dígitos, que es lo que la búsqueda por prefijo pide — y ahora se le dice
 * (`anuncioDe`), en vez de dejarle creer que no hay más.
 */
const MAXIMO = 8;

const cadena = (valor: unknown, porOmision: string): string =>
  typeof valor === 'string' && valor !== '' ? valor : porOmision;

/** El identificador interno como texto, o vacío si el recurso no lo trajo. */
const identificador = (valor: unknown): string =>
  typeof valor === 'number' ? String(valor) : typeof valor === 'string' ? valor : '';

/**
 * El candidato que se recordó, o nada.
 *
 * Se lee del borrador, que es texto: si lo que hay no es un candidato —porque
 * alguien escribió otra cosa ahí— se devuelve nada y la tarjeta enseña el
 * identificador pelado, que es como se comportaba antes de recordarlo. No lanza:
 * un rótulo ilegible no puede tumbar el formulario.
 */
function leerMemoria(guardado: string): Candidato | undefined {
  if (guardado === '') return undefined;
  try {
    const leido: unknown = JSON.parse(guardado);
    if (!esObjeto(leido)) return undefined;
    const id = cadena(leido['id'], '');
    if (id === '') return undefined;
    return {
      id,
      codigo: cadena(leido['codigo'], SIN_DATO),
      titulo: cadena(leido['titulo'], SIN_DATO),
      detalle: cadena(leido['detalle'], ''),
      titular: cadena(leido['titular'], ''),
    };
  } catch {
    return undefined;
  }
}
