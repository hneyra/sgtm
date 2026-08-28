import { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Aviso, Esqueleto, FechaDeCalculo, Insignia } from '@sgtm/design-system';
import { ProblemaDeApi, pedirDatosDePantalla, pedirOperacion } from '@sgtm/api-client';
import type { DatosDePantalla } from '@sgtm/api-client';
import {
  SIN_DATO,
  conteoDeLaRejilla,
  documentoDe,
  esObjeto,
  fechaDeCorteDe,
  identidadPorCodigo,
  importeDe,
  leerObjeto,
  seccionDeLaFicha,
  texto,
} from '@sgtm/lectura';
import type { Identidad, RejillaDeLaFicha, SeccionDeLaFicha } from '@sgtm/lectura';
import { opcionPorId } from '../../catalogo';
import type { OpcionSituada } from '../../catalogo';
import { useCatalogoVisible } from '../../app/sesion/useCatalogoVisible';
import type { CatalogoVisible } from '../../app/sesion/useCatalogoVisible';
import { conexionDe } from '../conexiones';
import { operacionDe } from '../busqueda';
import { TablaDePantalla } from '../bloques/TablaDePantalla';
import { anotarAtencion } from '../inicio/atenciones';
import { ESTADO_DE_LA_CONSULTA, PESTANAS, RESUMEN_DE_SALDOS } from './pestanas';
import type { AccionDeLaFicha, ContextoDeLaFicha, PestanaDeLaFicha } from './pestanas';

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
 * se entra en él; volver a una pestaña ya visitada **dentro de los treinta
 * segundos** no vuelve a pedir nada.
 *
 * Y son los treinta segundos del `staleTime` de la aplicación (`App.tsx`), no
 * «la caché por su clave»: la caché sola no evita la petición —una consulta que
 * se monta con datos ya vencidos los sirve **y vuelve a pedir**—. Lo que la
 * evita es que el dato siga fresco. Pasado ese rato, volver a la pestaña la pide
 * otra vez, que es lo correcto para una deuda que corre.
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
 * `aria-controls` en la seleccionada y tabulación itinerante—, y con
 * **activación manual**: el repo ya quitó una barra incompleta en #330, y media
 * barra de pestañas es peor que ninguna.
 *
 * Dentro de la pestaña financiera sí hay secciones con encabezado, y también es
 * deliberado: sus seis rejillas llegan en **una** respuesta y bajo **un**
 * permiso, así que partirlas en seis pestañas prometería seis permisos donde hay
 * uno.
 */

/*
 * **Quién es, de dónde sale y cómo se lee**: `Identidad` y `identidadPorCodigo`
 * viven en `@sgtm/lectura` (#298). El portal del contribuyente lee al mismo
 * contribuyente del mismo padrón (ADR-0016 §3), y dos lectores del mismo recurso
 * acaban leyendo campos distintos.
 */

export function FichaDeAtencion() {
  const { codigo = '' } = useParams();
  const catalogo = useCatalogoVisible();
  const identificador = useId();

  const puedeVerElPadron = catalogo.puedeVer('contribuyentes');
  const identidad = useConsultaDeIdentidad(codigo, puedeVerElPadron);
  const unificada = useConsultaUnificada(codigo, catalogo.puedeVer('consulta_unificada'));

  /* **Quién es, solo con el permiso que lo publica.** `enabled` ya impide que
     la consulta salga sin él, así que esto es defensa en profundidad y se anota
     como tal: lo que un permiso niega no se dibuja, y la forma de que no se
     dibuje no es acordarse en cada sitio donde se pinta —la cabecera lo tenía
     en dos, el nombre y el documento, y consultaba el permiso solo para la
     nota— sino que el dato no exista aguas arriba. Un `data` que sobreviva a la
     invalidación del permiso —una respuesta ya en caché, un `enabled` que un día
     deje de decir lo mismo que el catálogo visible— se queda igualmente fuera. */
  const persona = puedeVerElPadron ? (identidad.data ?? undefined) : undefined;

  const contexto: ContextoDeLaFicha = {
    codigo,
    numeroDocumento: persona?.numeroDocumento ?? '',
  };

  /* **Esta persona no está en el padrón**: ni la fila coincidente ni un 404.
     Con eso resuelto, debajo no se compone nada —ver el reparto del `return`—. */
  const noEstaEnElPadron =
    puedeVerElPadron &&
    !identidad.isFetching &&
    (esProblema(identidad.error, 404) || (identidad.error == null && identidad.data === null));

  const nombre = useFocoEnElNombre(!identidad.isFetching);
  useAtencionAnotada(persona);

  const visibles = PESTANAS.filter((pestana) => sePuedeComponer(pestana, catalogo));
  /* La pestaña activa se guarda por **el id de su opción**, no por su posición:
     la lista de visibles depende de los permisos, y un índice guardado señala a
     otra pestaña en cuanto la lista cambia de largo. */
  const [elegida, fijarElegida] = useState<string | undefined>(undefined);
  const activa = visibles.find((pestana) => pestana.opcion === elegida) ?? visibles[0];

  /* Qué pestaña tiene el foco, que con activación manual **no es la activa**.
     Se guarda por el id de su opción, por lo mismo que la elegida. */
  const [enfocada, fijarEnfocada] = useState<string | undefined>(undefined);
  // El nodo de la region viva de los paneles: ver `NodoDeAnuncio`.
  const [nodoDeAnuncio, fijarNodoDeAnuncio] = useState<HTMLElement | null>(null);
  /* Sin nadie enfocado —o con una pestaña que el permiso ya no ofrece—, el
     tabulador entra por la activa, que es lo que pide la tabulación itinerante. */
  const conFoco = visibles.find((pestana) => pestana.opcion === enfocada);

  const botones = useRef<Record<string, HTMLButtonElement | null>>({});
  const idDePestana = (opcion: string): string => `${identificador}-tab-${opcion}`;
  const idDePanel = (opcion: string): string => `${identificador}-panel-${opcion}`;

  /**
   * **Flechas, Inicio y Fin mueven el foco; Enter y Espacio activan** (patrón
   * ARIA, RNF-082). Es la activación **manual**, y el cambio es deliberado.
   *
   * Con activación automática —la que había—, recorrer la barra con la flecha
   * derecha dispara las cinco lecturas de la ficha por el camino: cada pestaña
   * por la que se pasa monta su panel y pide su padrón. Eso es exactamente lo
   * que ADR-0016 §2 evita al no consultar las seis al abrir, deshecho por un
   * gesto de teclado; y el patrón ARIA recomienda la activación manual
   * precisamente cuando el panel viene del servidor.
   *
   * Lo que cuesta: quien recorre con flechas tiene que pulsar Enter. Lo que se
   * gana: recorrer la barra con el teclado deja de costar cinco consultas, y
   * quien navega con lector de pantalla puede pasar por encima de una pestaña
   * sin pedirla.
   *
   * Enter y Espacio no se escriben aquí: cada pestaña es un `<button>`, y un
   * botón se activa con las dos teclas por su cuenta —lo que llega es su
   * `onClick`, el mismo del ratón—. Escribirlas sería duplicar el gesto.
   */
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
    // Solo el foco: `aria-selected` sigue a la activa, y la activa no se ha
    // movido. La tabulación itinerante sí acompaña al foco (`tabIndex`).
    fijarEnfocada(siguiente.opcion);
    botones.current[siguiente.opcion]?.focus();
  };

  /* **Con la identidad resuelta a «no está en el padrón», debajo no va nada.**
     Ni barra, ni resumen, ni acciones: el resto de la ficha se compone con el
     código de la ruta, y las lecturas que lo aceptan responden igual para un
     código que no existe —el proxy enseñaba un total de 279,03 y una constancia
     de no adeudo de nadie—. Componer una ficha bajo el aviso de que esa persona
     no existe es peor que no componerla: lo que se lee es la deuda de alguien. */
  return (
    <div className="sgtm-ficha">
      <Cabecera
        codigo={codigo}
        identidad={persona}
        refDelNombre={nombre}
        cargando={identidad.isFetching}
        error={identidad.error}
        noEstaEnElPadron={noEstaEnElPadron}
        puedeVerElPadron={puedeVerElPadron}
        catalogo={catalogo}
        contexto={contexto}
      />

      {noEstaEnElPadron ? null : (
        <>
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
                      /* **`aria-controls` solo en la seleccionada**, porque solo
                         su panel existe: apuntar a los otros cinco es apuntar a
                         `id` que no están en el documento, y un lector de
                         pantalla que sigue la referencia no encuentra nada que
                         anunciar. Es el mismo defecto que la tabla ya corrigió
                         quitándoselo a la fila plegada. */
                      {...(esLaActiva ? { 'aria-controls': idDePanel(pestana.opcion) } : {})}
                      tabIndex={pestana.opcion === (conFoco?.opcion ?? activa.opcion) ? 0 : -1}
                      className="sgtm-pestanas__tab"
                      data-activa={esLaActiva ? '1' : '0'}
                      onClick={() => {
                        fijarElegida(pestana.opcion);
                        fijarEnfocada(pestana.opcion);
                      }}
                      onKeyDown={(evento) => alTeclearEnLaBarra(evento, posicion)}
                    >
                      {/* El título de la opción, tal cual lo escribe el manual
                          (RNF-080). El título y no la etiqueta del menú: ver el
                          docblock de `pestanas.ts` —«Papeletas» y «Estado de
                          cuenta de papeleta», juntas en una barra, se leen como
                          la misma cosa—. */}
                      {opcion?.title ?? pestana.opcion}
                    </button>
                  );
                })}
              </div>

              {/* La region viva de los paneles, FUERA de la `section` con
                  `key`: preexiste al remontado, y por eso lo que el panel
                  anuncia se anuncia (ver `NodoDeAnuncio`). */}
              <p className="sgtm-portal__oculto" role="status" ref={fijarNodoDeAnuncio} />

              {/* Solo el panel activo se monta: es lo que hace que la consulta
                  salga al activarse. Su `key` lo remonta al cambiar de pestaña,
                  así que cada uno estrena su estado y ninguno hereda el de otro.

                  **Sin `tabIndex`**: el patrón ARIA lo pide solo cuando el panel
                  no tiene nada enfocable, y este tiene la región desplazable de
                  su tabla y sus enlaces de salida. La parada de más costaba dos
                  mil cien píxeles de desplazamiento —la primera pulsación del
                  tabulador se llevaba la cabecera fuera de la pantalla— para
                  llegar a un contenedor que no hace nada. */}
              <NodoDeAnuncio.Provider value={nodoDeAnuncio}>
                <section
                  key={activa.opcion}
                  id={idDePanel(activa.opcion)}
                  role="tabpanel"
                  aria-labelledby={idDePestana(activa.opcion)}
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
              </NodoDeAnuncio.Provider>
            </>
          )}
        </>
      )}
    </div>
  );
}

/**
 * **El foco entra en el nombre de quien se atiende** (RNF-082).
 *
 * Sin esto el foco se queda en `body` al llegar a la ficha —se navega hasta aquí
 * desde el inicio, y una navegación de React Router no lo mueve—, y desde `body`
 * hay **diecinueve** pulsaciones del tabulador hasta la barra de pestañas: toda
 * la cabecera del shell, la barra lateral y el lanzador van antes. En ventanilla
 * eso es la ficha entera fuera del alcance del teclado.
 *
 * Va al `h2` del nombre y no a la barra: lo primero que hay que saber es a quién
 * se ha abierto —abrir al homónimo es el error que se paga—, y desde ahí el
 * tabulador baja por lo que sigue.
 *
 * **Con la misma guarda que el inicio, y por lo mismo**: esto llega en un trozo
 * diferido y su efecto corre cuando el trozo aterriza, que puede ser después de
 * que el operador abriera la paleta con Ctrl K. Solo se toma el foco si no lo
 * tiene nadie.
 *
 * Y **en el flanco**: una sola vez, cuando el nombre se dibuja. Enfocar en cada
 * render devolvería el foco al encabezado cada vez que una pestaña termina de
 * cargar, que es el defecto que #331 ya pagó una vez.
 */
function useFocoEnElNombre(dibujado: boolean) {
  const nombre = useRef<HTMLHeadingElement>(null);
  const yaLlevado = useRef(false);
  useEffect(() => {
    if (yaLlevado.current || !dibujado) return;
    yaLlevado.current = true;
    const activo = document.activeElement;
    if (activo === null || activo === document.body) nombre.current?.focus();
  }, [dibujado]);
  return nombre;
}

/**
 * **Atender a alguien se anota, se haya llegado como se haya llegado** (#296).
 *
 * El inicio anota al pulsar la fila, así que quien entra por un enlace directo a
 * `/atencion/:codigo` —el que se comparte, el del historial del navegador, el
 * que alguien pegó en un correo— no aparecía en «Atenciones recientes», y volver
 * a esa persona exigía buscarla otra vez. Se anota **al resolverse la identidad
 * y con el permiso del padrón**: sin `contribuyentes` no hay nombre ni documento
 * que anotar, y la lista no se dibuja tampoco.
 *
 * Lo que se anota es lo que la respuesta trajo, sin recomponer nada, y vive en
 * memoria: `atenciones.ts` explica por qué no toca el disco.
 */
function useAtencionAnotada(persona: Identidad | undefined) {
  const codigo = persona?.codigo;
  const nombre = persona?.nombre;
  const documento =
    persona === undefined ? '' : `${persona.tipoDocumento} ${persona.numeroDocumento}`.trim();
  useEffect(() => {
    if (codigo === undefined || codigo === '') return;
    anotarAtencion({ codigo, nombre: nombre ?? '', documento });
  }, [codigo, nombre, documento]);
}

/* ── Quién es ──────────────────────────────────────────────────────────── */

/**
 * La identidad, del padrón y de una sola fila.
 *
 * `GET /rentas/contribuyentes?codigo=` devuelve un listado, y de él se toma **la
 * fila cuyo código coincide**, no la primera. No porque el backend resuelva por
 * prefijo —no lo hace: `ContribuyenteRepositoryJdbc` compara
 * `codigo_contribuyente = :codigo` con el criterio en mayúsculas, que es
 * igualdad exacta—, sino porque lo que llega es un **listado** y quien lo sirve
 * puede traer más de una fila: el proxy de datos no filtra y devuelve el padrón
 * entero, y un filtro que un día se relaje aquí no se nota. Tomar la primera de
 * un listado es dar por buena la fila que venga.
 *
 * La comparación no distingue mayúsculas, por lo mismo que el backend las sube:
 * `00000025673a` y `00000025673A` son el mismo contribuyente para quien
 * responde, y aquí no pueden dejar de serlo.
 *
 * Con ninguna que coincida, la cabecera dice lo que sabe —el código de la ruta—
 * y no inventa un nombre.
 */
function useConsultaDeIdentidad(codigo: string, puede: boolean) {
  return useQuery<Identidad | null>({
    queryKey: ['atencion', 'identidad', codigo],
    enabled: codigo !== '' && puede,
    // Uno, no tres: esto se hace con alguien esperando en el mostrador.
    retry: 1,
    queryFn: async ({ signal }) => {
      const cuerpo = await pedirOperacion('contribuyentes', { codigo }, signal);
      return identidadPorCodigo(cuerpo, codigo);
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
  refDelNombre,
  cargando,
  error,
  noEstaEnElPadron,
  puedeVerElPadron,
  catalogo,
  contexto,
}: {
  readonly codigo: string;
  readonly identidad?: Identidad | undefined;
  readonly refDelNombre: React.RefObject<HTMLHeadingElement | null>;
  readonly cargando: boolean;
  readonly error: unknown;
  readonly noEstaEnElPadron: boolean;
  readonly puedeVerElPadron: boolean;
  readonly catalogo: CatalogoVisible;
  readonly contexto: ContextoDeLaFicha;
}) {
  /* **El dato, no solo la nota, sale del permiso.** La cabecera consultaba
     `puedeVerElPadron` únicamente para decidir si avisaba, y pintaba el nombre y
     el documento con lo que hubiera en `identidad`: con la guarda de la consulta
     quitada, el aviso de que no se pueden ver salía **al lado del nombre y del
     DNI**. Aquí se cierra el segundo camino. */
  const persona = puedeVerElPadron ? identidad : undefined;
  const documento = documentoDe(persona ?? undefined);

  return (
    <header className="sgtm-ficha__cabecera">
      <p className="sgtm-ficha__eyebrow">Atención al contribuyente</p>
      {cargando ? (
        <Esqueleto alto={28} ancho="24ch" />
      ) : (
        /* `h2` y no `h1`: el `h1` de la aplicación es el de la cabecera del
           shell, igual que en el inicio. Aquí se nombra a quién se atiende.

           `tabIndex={-1}` para poder recibir el foco al abrir la ficha sin
           entrar en el recorrido del tabulador (ver `useFocoEnElNombre`). */
        <h2 className="sgtm-ficha__nombre" ref={refDelNombre} tabIndex={-1}>
          {persona?.nombre ?? codigo}
        </h2>
      )}
      <dl className="sgtm-ficha__identidad">
        <Dato etiqueta="Código" valor={codigo === '' ? SIN_DATO : codigo} />
        <Dato etiqueta="Documento" valor={documento} />
        {persona != null && (
          <div className="sgtm-ficha__dato">
            <dt>Estado</dt>
            <dd>
              {/* Nunca solo por color: la insignia lleva su palabra dentro. */}
              <Insignia tono={persona.activo ? 'ok' : 'neutro'}>
                {persona.activo ? 'ACTIVO' : 'INACTIVO'}
              </Insignia>
            </dd>
          </div>
        )}
        {persona?.condicionEspecial !== undefined && (
          <div className="sgtm-ficha__dato">
            <dt>Condición</dt>
            <dd>
              {/* Tal cual la publica el recurso: decide la deducción del
                  predial, y aquí no se le pone otro nombre. Ver {@link Identidad}. */}
              <Insignia tono="atencion">{persona.condicionEspecial}</Insignia>
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
      {/* La simétrica de la de arriba, y por lo mismo: sin la lectura que publica
          el total consolidado, la cabecera se quedaba **muda** —ni cifra ni
          motivo—, y una ficha sin deuda a la vista se lee como una persona que
          no debe nada. Es el único total con fecha que el sistema publica. */}
      {!catalogo.puedeVer('consulta_unificada') && (
        <p className="sgtm-ficha__nota">
          Tu perfil no incluye «
          {opcionPorId('consulta_unificada')?.title ?? 'Consulta unificada predial-arbitrios'}», así
          que aquí no se puede dar el total consolidado: lo que se debe se ve en las pestañas que sí
          tienes.
        </p>
      )}
      {puedeVerElPadron && error !== undefined && error !== null && !esProblema(error, 404) && (
        <AvisoDeLectura error={error} opcion="contribuyentes" />
      )}
      {noEstaEnElPadron && (
        <Aviso
          titulo="Ese código no está en el padrón"
          detalle="La dirección lleva un código que el padrón de contribuyentes no reconoce. Comprueba el código, o búscalo de nuevo desde el inicio: aquí no se da de alta a nadie."
        />
      )}
      {/* Ninguna acción sobre quien no está en el padrón: la constancia de no
          adeudo de un código que no existe es un papel de nadie. */}
      {!noEstaEnElPadron && (
        <Acciones
          acciones={ACCIONES_DE_LA_CABECERA}
          contexto={contexto}
          catalogo={catalogo}
          etiqueta="Acciones sobre esta persona"
        />
      )}
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
                /* El importe **de un `ImporteActualizado`**, leído con la misma
                   función que lee los de las rejillas: un importe sin su
                   `actualizadoA` no es una cifra que se pueda enseñar (regla 9),
                   y una lectura propia aquí era justo la que no lo exigía. */
                (importeDe(resumen?.[cifra.clave])?.importe ?? SIN_DATO)
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

  const sinContexto = parametros === undefined;
  const fallo = consulta.error !== undefined && consulta.error !== null;
  return (
    <>
      <Fuente opcion={pestana.opcion} />
      <Anuncio
        texto={
          sinContexto
            ? 'Falta con qué preguntar por esta persona'
            : consulta.isFetching
              ? 'Buscando…'
              : fallo
                ? tituloDelAviso(consulta.error, pestana.opcion)
                : (consulta.data?.tabla?.conteo ?? '')
        }
      />
      {sinContexto ? (
        <Aviso
          titulo="Falta con qué preguntar por esta persona"
          /* El dato que faltó lo redacta la pestaña (`faltante`): sin eso, este
             aviso hablaba del documento aunque otra pestaña se quedara sin otra
             cosa. */
          detalle={`Esta pestaña se compone con ${pestana.faltante ?? 'un dato que otra lectura publica y esta ficha no consiguió'}. No quiere decir que no tenga: quiere decir que desde aquí no se puede preguntar.`}
        />
      ) : fallo ? (
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
            /* **Sin `opcion`**, y no por descuido: esa prop existe para una sola
               cosa —preguntar si la prosa corrige el pie del catálogo—, y aquí
               la tabla no dibuja el pie del catálogo: `pestanas.ts` declara
               `title`, `cols` y `num`, nunca `note`. Además la prosa solo está
               cargada si el operador pasó antes por una pantalla del catálogo
               (`Pantalla.tsx` es quien llama a `cargarProsa`), así que pasarla
               haría aparecer o no una corrección **según de dónde se venga**. */
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
  /* **Tres de las cinco pestañas caen aquí, y eso tiene fecha de caducidad**:
     `papeletas`, `adm_estado_cuenta` y `coactiva_expedientes` no declaran su
     `definirConexion`, así que salen por el camino común —el que el proxy de
     datos atiende sirviendo la respuesta del prototipo, sin validar el cuerpo—.
     Contra el backend real ese camino no falla ruidosamente: devuelve la forma
     que no es y la tabla sale **vacía en silencio**, que es exactamente lo que
     una ficha de atención no puede hacer. Las tres necesitan su conexión —con
     su `leer` que valide y su adaptador— antes de apagar el proxy (ADR-0010):
     issue #363. */
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
  const rejillas = pestana.rejillas ?? [];
  const fallo = error !== undefined && error !== null;
  return (
    <>
      <Fuente opcion={pestana.opcion} />
      <Anuncio
        texto={
          cargando
            ? 'Buscando…'
            : fallo
              ? tituloDelAviso(error, pestana.opcion)
              : rejillas
                  .map((rejilla) =>
                    conteoDeLaRejilla(rejilla, seccionDeLaFicha(ficha, rejilla.clave)),
                  )
                  .join(' · ')
        }
      />
      {fallo ? (
        <AvisoDeLectura error={error} opcion={pestana.opcion} />
      ) : (
        rejillas.map((rejilla) => (
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
  const seccion = seccionDeLaFicha(ficha, rejilla.clave);
  const nota = [rejilla.nota, notaDeLaPaginacion(rejilla, seccion)].filter(
    (parte): parte is string => parte !== undefined,
  );
  return (
    <div className="sgtm-ficha__rejilla">
      <TablaDePantalla
        estructura={{
          title: rejilla.titulo,
          cols: rejilla.cols,
          claves: [],
          ...(rejilla.num === undefined ? {} : { num: rejilla.num }),
          ...(nota.length === 0 ? {} : { note: nota.join(' ') }),
        }}
        datos={{
          filas: seccion.filas.map(rejilla.fila),
          conteo: conteoDeLaRejilla(rejilla, seccion),
        }}
        cargando={cargando}
      />
      {/* La banda solo donde **todas** sus cifras comparten fecha. Donde cada
          fila trae la suya —los pagos, los movimientos— la fecha ya está en su
          columna, y una banda encima diría que se recalcularon hoy. */}
      {rejilla.aLaFechaDeCorte === true && <FechaDeCalculo {...fechaDeCorteDe(ficha)} />}
    </div>
  );
}

/**
 * Dónde están las que no caben: **en la opción que pagina**, nombrada con su
 * rótulo del catálogo.
 *
 * Solo cuando la sección dice que quedan más. La ficha no pagina —ordenar y
 * paginar son del servidor, y su sitio es la opción con sus filtros—, así que
 * sin esta línea la salida no existe: quien tenga cuarenta y tres obligaciones
 * vería veinte y ningún camino hasta las otras veintitrés.
 */
function notaDeLaPaginacion(
  rejilla: RejillaDeLaFicha,
  seccion: SeccionDeLaFicha,
): string | undefined {
  if (!seccion.hayMas) return undefined;
  const titulo = opcionPorId(rejilla.rotulos)?.title ?? rejilla.rotulos;
  return `Aquí caben las primeras: las demás, con su paginador y sus filtros, en «${titulo}».`;
}

/**
 * **Lo que el panel está haciendo, dicho una vez y en voz alta.**
 *
 * Un panel de esta ficha carga, falla o se llena sin que nada de eso se anuncie:
 * quien navega con lector de pantalla activaba una pestaña y no oía nada —ni
 * «Buscando…», ni cuántas filas llegaron, ni que la lectura falló—, porque la
 * tabla que cambia debajo no es una región viva. Es la misma región de estado
 * que ya llevan el inicio y la banda de selección de la tabla.
 *
 * Va oculta a la vista y no duplicada: el conteo se ve en la cabecera de cada
 * tabla y el aviso se lee en su sitio. Lo que falta no es el texto: es que
 * alguien lo diga cuando cambia.
 */
/**
 * El nodo persistente donde anuncian los paneles.
 *
 * La region viva NO puede vivir dentro de la `section` con `key`: al cambiar de
 * pestana el panel se remonta, y una `role="status"` que nace ya con su texto
 * dentro no se anuncia en la mayoria de lectores — el primer anuncio de cada
 * pestana, que es el que importa, se perdia. El nodo vive arriba, fuera del
 * subarbol remontado, y cada panel le manda su texto por un portal: la region
 * preexiste al cambio, que es lo que hace que el cambio se anuncie.
 */
const NodoDeAnuncio = createContext<HTMLElement | null>(null);

function Anuncio({ texto: dicho }: { readonly texto: string }) {
  const nodo = useContext(NodoDeAnuncio);
  return nodo === null ? null : createPortal(dicho, nodo);
}

/** El título con que {@link AvisoDeLectura} nombra un fallo, para poder anunciarlo. */
function tituloDelAviso(error: unknown, opcion: string): string {
  const titulo = opcionPorId(opcion)?.title ?? opcion;
  if (esProblema(error, 403)) return `Tu perfil no puede consultar «${titulo}»`;
  if (esProblema(error, 404)) return `«${titulo}» no tiene nada con ese código`;
  return `No se pudo consultar «${titulo}»`;
}

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
  /* **Un filtro declarado que se queda sin valor no lleva a ninguna parte, y
     desde luego no al padrón entero.** Llevaba a `opcion.ruta` pelada: con el
     documento vacío —el padrón no se pudo leer, o no lo publica— «Estado de
     cuenta de infracciones» abría el estado de cuenta de **todos**, presentado
     bajo la ficha de esta persona como si fuera el suyo. La acción desaparece,
     que es lo que ya hacía el registro vacío tres líneas más arriba: una acción
     que no puede llevar el contexto que promete no se ofrece. */
  const cadena = consulta.toString();
  return cadena === '' ? undefined : `${opcion.ruta}?${cadena}`;
}

/* ── Lo que este perfil no puede componer ──────────────────────────────── */

/**
 * Una pestaña se compone con **su** permiso y con los de las lecturas que la
 * acompañan (`tambien`). Sin alguno, no se dibuja: ni vacía, ni deshabilitada.
 *
 * **Lo que aquí falta se dice solo cuando no queda ninguna pestaña**, y eso es
 * lo que ADR-0016 §1 acota: el reparto de dos mensajes —«no hay ninguna
 * lectura» / «falta la que acompaña, y se llama así»— es el de la pantalla que
 * se queda sin nada. Con pestañas visibles, la que se cayó por falta de su
 * acompañante **desaparece en silencio**: quien tenga `papeletas` y
 * `consulta_predios` pero no `contribuyentes` ve Predios y no ve Papeletas, sin
 * que nada diga por qué. Es un hueco conocido y se anota en vez de taparse a
 * ojo: decirlo pide un sitio donde quepa —la barra no lo tiene— y una decisión
 * sobre si una pestaña ausente por permiso debe nombrarse cuando hay otras, que
 * es la misma pregunta que ADR-0016 §1 respondió para la pantalla entera. Hasta
 * que se responda para esta, la ficha no inventa una respuesta propia.
 */
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
  if (esProblema(error, 403)) {
    return (
      <Aviso
        tipo="sin-permiso"
        titulo={`Tu perfil no puede consultar «${titulo}»`}
        detalle="La ficha compone cada parte con la opción que la publica, y esta te la rechazó. Pídesela al administrador de tu municipalidad: reintentar dará lo mismo. Lo demás de esta persona sigue aquí."
      />
    );
  }
  /* **El 404 tampoco es una red caída.** Iba por la rama de abajo, así que un
     código que el servidor dice no conocer se contaba como «la consulta no
     respondió, vuelve a intentarlo» —y contradecía a la cabecera, que dos
     centímetros más arriba ya decía bien que ese código no está en el padrón—.
     Reintentar un 404 da 404: lo que hay que hacer es comprobar el código. */
  if (esProblema(error, 404)) {
    return (
      <Aviso
        titulo={`«${titulo}» no tiene nada con ese código`}
        detalle="El servidor respondió, y lo que dijo es que con ese código no hay nada aquí. No es un fallo de la consulta ni algo que se arregle reintentando: comprueba el código, o búscalo de nuevo desde el inicio."
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

/** Un problema del contrato con ese estado. Es lo que distingue un 403 de un 500. */
const esProblema = (error: unknown, estado: number): boolean =>
  error instanceof ProblemaDeApi && error.problema.status === estado;
