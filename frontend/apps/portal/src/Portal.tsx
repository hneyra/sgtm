import { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Aviso, Boton, Esqueleto, FechaDeCalculo, Insignia } from '@sgtm/design-system';
import { ProblemaDeApi, solicitar } from '@sgtm/api-client';
import type { Celda, ParametrosDe } from '@sgtm/api-client';
import {
  ESTADO_DE_LA_CONSULTA,
  REJILLAS_DE_LA_UNIFICADA,
  RESUMEN_DE_SALDOS,
  SIN_DATO,
  conteoDeLaRejilla,
  documentoDe,
  fechaDeCorteDe,
  identidadesQueCoinciden,
  importeDe,
  leerObjeto,
  resumenDeSaldosDe,
  seccionDeLaFicha,
  texto,
} from '@sgtm/lectura';
import type { Identidad, RejillaDeLaFicha } from '@sgtm/lectura';
import { DOCUMENTOS, documentoPorId, filtroDe, loQueFalta } from './consulta';
import { LECTURAS } from './lecturas';

/**
 * **La vista del contribuyente, en un teléfono y en solo lectura** (#298,
 * ADR-0016 §3).
 *
 * ── Las mismas cifras, y a la misma fecha ──────────────────────────────────
 *
 * Lo que se dibuja aquí sale de **los mismos adaptadores** que la ficha 360° del
 * back-office: `@sgtm/lectura` lee la identidad del padrón y las seis secciones
 * de `consulta_unificada`, con sus rótulos del catálogo y su `aLaFecha`. No hay
 * una segunda lectura del mismo cuerpo, que es lo que acabaría enseñándole al
 * ciudadano una cifra distinta de la que quien atiende ve en ventanilla —o la
 * misma cifra sin su fecha (regla 9, RNF-075)—.
 *
 * Lo que sí cambia es **cómo se dibuja**: en 390 px no hay siete columnas, así
 * que cada fila se lee como pares rótulo/valor con el rótulo de su columna. El
 * texto es el mismo; el que cambia es el ancho.
 *
 * ── Solo lectura, y no por ahora ───────────────────────────────────────────
 *
 * Ni una escritura: ningún `useEscritura`, ninguna mutación. El pago en línea
 * que el prototipo dibuja —medio de pago, correo, celular, aceptación de
 * términos— es una escritura del ciudadano, y el ciudadano todavía no tiene con
 * qué identificarse (ADR-0009 §1 y §2). Recoger esos datos hoy sería pedirle a
 * un funcionario que teclee el correo y el celular de otra persona en una
 * pantalla que no puede mandarlos a ningún sitio.
 *
 * ── Y el endpoint del prototipo tampoco se finge ───────────────────────────
 *
 * La opción `portal` del catálogo declara `GET /portal/deuda?doc=`, y el
 * contrato la publica **sin esquema de respuesta** (`CuerpoSinEsquema`): ningún
 * controlador la sirve y lo único que la contesta es el proxy, con la tabla del
 * prototipo. Preguntar por ahí habría dado cifras de mentira con aire de
 * verdaderas. Se pregunta por donde el backend responde de verdad —el padrón y
 * la unificada (#25)—, que además es lo que hace que las cifras coincidan.
 */

/** Lo que se preguntó, ya aposentado: la respuesta se lee de esto, no de lo tecleado. */
interface Preguntado {
  readonly documento: string;
  readonly valor: string;
}

export function Portal() {
  const identificador = useId();
  const [tipo, fijarTipo] = useState<string>(DOCUMENTOS[0]?.id ?? 'DNI');
  const [escrito, fijarEscrito] = useState('');
  const [preguntado, fijarPreguntado] = useState<Preguntado | undefined>(undefined);

  const documento = documentoPorId(tipo);
  const falta = loQueFalta(documento, escrito);

  const identidad = useConsultaDeIdentidad(preguntado);
  const codigo = codigoParaConsultar(identidad.data?.identidad);
  const unificada = useConsultaUnificada(codigo);

  return (
    /* `<main>`, no un `div`: es la unica region de contenido de la aplicacion, y
       sin el punto de referencia quien navega con lector de pantalla no tiene a
       donde saltar —ni forma de saber donde acaba la cabecera—. */
    <main className="sgtm-portal-app">
      <header className="sgtm-portal-app__cabecera">
        <p className="sgtm-portal-app__eyebrow">Portal del contribuyente</p>
        <h1 className="sgtm-portal-app__titular">Consulta tu deuda</h1>
      </header>

      {/* El acto honesto de esta pantalla, permanente y antes de que nadie
          teclee: lo que aquí se ve es una consulta, y de esta consulta no sale
          ningún pago. Decirlo después de buscar sería decirlo tarde. */}
      <Aviso
        titulo="Aquí solo se consulta"
        detalle="Esta pantalla muestra lo que la municipalidad tiene registrado a tu nombre, a la fecha que se indica en cada cifra. El pago en línea todavía no está disponible: se paga en caja de la municipalidad o en los canales que ella anuncie."
      />

      <form
        className="sgtm-portal-app__consulta"
        onSubmit={(evento) => {
          evento.preventDefault();
          if (falta !== '') return;
          fijarPreguntado({ documento: documento.id, valor: escrito });
        }}
      >
        <div className="sgtm-portal-app__campo">
          <label htmlFor={`${identificador}-tipo`}>Tipo de documento</label>
          <select
            id={`${identificador}-tipo`}
            value={tipo}
            onChange={(evento) => fijarTipo(evento.target.value)}
          >
            {DOCUMENTOS.map((opcion) => (
              <option key={opcion.id} value={opcion.id}>
                {opcion.etiqueta}
              </option>
            ))}
          </select>
        </div>
        <div className="sgtm-portal-app__campo">
          <label htmlFor={`${identificador}-numero`}>Número de documento</label>
          <input
            id={`${identificador}-numero`}
            value={escrito}
            inputMode={documento.digitos === undefined ? 'text' : 'numeric'}
            aria-describedby={`${identificador}-ayuda`}
            onChange={(evento) => fijarEscrito(evento.target.value)}
          />
          <p className="sgtm-portal-app__ayuda" id={`${identificador}-ayuda`}>
            {falta === '' ? documento.ayuda : falta}
          </p>
        </div>
        {/* `submit`, no el `button` por omision del componente: la caja se
            envia con Intro desde el campo, que es como se rellena un formulario
            de una linea en un telefono (RNF-082). Y deshabilitada **con su
            motivo a la mano**: `aria-describedby` apunta a la misma ayuda que el
            campo, que es donde dice lo que falta. Un boton apagado sin motivo
            programatico obliga a adivinar por que no se puede pulsar, y ahi el
            que no ve la pantalla se queda sin la frase (patron de #332). */}
        <Boton
          type="submit"
          variante="primario"
          disabled={falta !== ''}
          aria-describedby={`${identificador}-ayuda`}
        >
          Consultar
        </Boton>
      </form>

      {/* Lo que está pasando, dicho en voz alta y una sola vez: quien consulta
          desde un lector de pantalla no ve el esqueleto ni la tabla que cambia
          debajo. Se cuenta sobre lo **preguntado**, no sobre lo tecleado: atado
          a la caja, la frase cambiaría a media pulsación y diría cosas falsas
          (el defecto que #296 pagó). */}
      <p className="sgtm-portal-app__oculto" role="status">
        {anuncioDe(identidad, unificada)}
      </p>

      {preguntado === undefined ? null : (
        <Resultado documento={preguntado.documento} identidad={identidad} unificada={unificada} />
      )}

      <footer className="sgtm-portal-app__pie">
        <p>
          ¿Tu documento es un carné de extranjería, un pasaporte o una partida? Todavía no se puede
          consultar por su número: acércate a la municipalidad con tu código de contribuyente.
        </p>
      </footer>
    </main>
  );
}

/**
 * El codigo con el que se pregunta por la deuda, **o nada**.
 *
 * `Identidad.codigo` sale de `texto()`, que devuelve el guion cuando el padron
 * no manda el dato: comparar contra la cadena vacia dejaba pasar ese guion y la
 * consulta salia como `?contribuyente=—`, una peticion por un contribuyente que
 * no existe, con su espera y su respuesta vacia. Sin codigo no hay a quien
 * preguntarle la deuda, y no se pregunta.
 */
const codigoParaConsultar = (persona: Identidad | undefined): string =>
  persona === undefined || persona.codigo === SIN_DATO ? '' : persona.codigo;

/* ── Las dos lecturas ──────────────────────────────────────────────────── */

/** Lo que el padrón contestó: la persona, o cuántas filas trajo si no es una. */
interface RespuestaDelPadron {
  readonly identidad?: Identidad;
  readonly cuantas: number;
}

/**
 * Quién es, del padrón, y **de una sola fila**.
 *
 * Con más de una no se elige ninguna: dos personas bajo el mismo número es un
 * dato que se resuelve en ventanilla, no aquí. Ver `identidadUnica`.
 */
function useConsultaDeIdentidad(preguntado: Preguntado | undefined) {
  return useQuery<RespuestaDelPadron>({
    queryKey: ['portal', 'identidad', preguntado?.documento, preguntado?.valor],
    enabled: preguntado !== undefined,
    // Uno, no tres: esto se consulta desde un teléfono con la red que haya, y
    // tres intentos son tres esperas antes de decir nada.
    retry: 1,
    queryFn: async ({ signal }) => {
      const documento = documentoPorId(preguntado?.documento ?? '');
      const cuerpo = await solicitar<unknown>(LECTURAS.contribuyentes, {
        consulta: filtroDe(documento, preguntado?.valor ?? ''),
        senal: signal,
      });
      /* **Se comprueba que la fila sea la que se pidio**, no se toma la que
         venga: el proxy de datos no filtra y devuelve el padron entero
         (ADR-0010), asi que sin esto el portal ensenaria la deuda de la primera
         persona del padron a quien teclee su DNI. Ver `identidadesQueCoinciden`. */
      const coinciden = identidadesQueCoinciden(cuerpo, documento.filtro, preguntado?.valor ?? '');
      return {
        ...(coinciden.length === 1 ? { identidad: coinciden[0] as Identidad } : {}),
        cuantas: coinciden.length,
      };
    },
  });
}

/** La ficha consolidada: el resumen con su fecha y las seis secciones. */
function useConsultaUnificada(codigo: string) {
  return useQuery<Readonly<Record<string, unknown>>>({
    queryKey: ['portal', 'unificada', codigo],
    enabled: codigo !== '',
    retry: 1,
    queryFn: async ({ signal }) => {
      /* El filtro va tipado contra el contrato: al irse `pedirOperacion` (#298)
         se fue con el la unica comprobacion, y un renombre de `contribuyente`
         en el contrato dejaba al portal compilando —y preguntando con un
         parametro que el backend ya no declara—. Con el tipo puesto, ese
         renombre es un error de `tsc` aqui, no una ficha ajena en pantalla. */
      const consulta: ParametrosDe<'consulta_unificada'> = { contribuyente: codigo };
      const cuerpo = await solicitar<unknown>(LECTURAS.consulta_unificada, {
        consulta,
        senal: signal,
      });
      return leerObjeto(cuerpo, 'la consulta unificada');
    },
  });
}

type ConsultaDelPadron = ReturnType<typeof useConsultaDeIdentidad>;
type ConsultaUnificada = ReturnType<typeof useConsultaUnificada>;

function anuncioDe(identidad: ConsultaDelPadron, unificada: ConsultaUnificada): string {
  if (identidad.isFetching || unificada.isFetching) return 'Consultando…';
  /* El 403 no es «vuelve a intentarlo»: el aviso dibujado ya lo distingue, y la
     region viva tiene que decir lo mismo — anunciar «no se pudo hacer» sobre un
     rechazo invita a reintentar lo que va a dar lo mismo (el patron de #331). */
  if (esRechazo(identidad.error) || esRechazo(unificada.error)) {
    return 'El servidor rechazó la consulta; reintentar dará lo mismo';
  }
  /* El 403 no es «vuelve a intentarlo»: el aviso dibujado ya lo distingue, y la
     region viva tiene que decir lo mismo — anunciar «no se pudo hacer» sobre un
     rechazo invita a reintentar lo que va a dar lo mismo (el patron de #331). */
  if (hayFallo(identidad.error) || hayFallo(unificada.error)) return 'La consulta no se pudo hacer';
  if (identidad.data === undefined) return '';
  if (identidad.data.identidad === undefined) {
    return identidad.data.cuantas === 0
      ? 'Ese documento no figura en el padrón'
      : 'Ese documento corresponde a más de un registro';
  }
  return `Consulta de ${identidad.data.identidad.nombre}`;
}

const hayFallo = (error: unknown): boolean => error !== undefined && error !== null;

const esRechazo = (error: unknown): boolean =>
  error instanceof ProblemaDeApi && error.problema.status === 403;

/* ── Lo que se ve al consultar ─────────────────────────────────────────── */

function Resultado({
  documento,
  identidad,
  unificada,
}: {
  readonly documento: string;
  readonly identidad: ConsultaDelPadron;
  readonly unificada: ConsultaUnificada;
}) {
  if (identidad.isFetching) {
    return (
      <section className="sgtm-portal-app__resultado" aria-label="Resultado de la consulta">
        <Esqueleto alto={24} ancho="18ch" />
      </section>
    );
  }

  if (hayFallo(identidad.error)) {
    return (
      <section className="sgtm-portal-app__resultado" aria-label="Resultado de la consulta">
        <AvisoDeLectura error={identidad.error} />
      </section>
    );
  }

  const persona = identidad.data?.identidad;
  if (persona === undefined) {
    /* **«No figura» y «hay más de uno» no son la misma frase, y ninguna es «no
       existe»**: el mismo reparto que las franjas del inicio (ADR-0016 §1). Con
       varias filas la salida es la ventanilla, no elegir una aquí. */
    const varias = (identidad.data?.cuantas ?? 0) > 0;
    return (
      <section className="sgtm-portal-app__resultado" aria-label="Resultado de la consulta">
        <Aviso
          titulo={
            varias
              ? 'Ese documento corresponde a más de un registro'
              : `Ese ${documento} no figura en el padrón`
          }
          detalle={
            varias
              ? 'Con más de un registro a ese número, desde aquí no se puede saber cuál es el tuyo. Acércate a la municipalidad con tu documento.'
              : 'Puede que el número esté mal escrito, o que tus tributos estén registrados con otro documento. Comprueba el número, o acércate a la municipalidad con tu documento.'
          }
        />
      </section>
    );
  }

  return (
    <section className="sgtm-portal-app__resultado" aria-label="Resultado de la consulta">
      <Identificacion persona={persona} />
      <Resumen unificada={unificada} />
      {hayFallo(unificada.error) ? null : (
        <div className="sgtm-portal-app__secciones">
          {REJILLAS_DE_LA_UNIFICADA.map((rejilla) => (
            <Seccion
              key={rejilla.clave}
              rejilla={rejilla}
              ficha={unificada.data}
              cargando={unificada.isFetching}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/** Quién eres, según el padrón. Sin nada que el padrón no haya dicho. */
function Identificacion({ persona }: { readonly persona: Identidad }) {
  return (
    <div className="sgtm-portal-app__identidad">
      <h2>{persona.nombre}</h2>
      <dl>
        <div>
          <dt>Código</dt>
          {/* Ya viene del guion cuando falta: lo pone `texto()` al leer la fila
              (`@sgtm/lectura`), y aqui no se vuelve a decidir. */}
          <dd>{persona.codigo}</dd>
        </div>
        <div>
          <dt>Documento</dt>
          <dd>{documentoDe(persona)}</dd>
        </div>
        {persona.condicionEspecial !== undefined && (
          <div>
            <dt>Condición</dt>
            <dd>
              {/* Tal cual la publica el recurso: es lo que decide la deducción
                  del predial (NEG-05) y aquí no se le pone otro nombre
                  (RNF-080). Nunca solo por color: lleva su texto dentro. */}
              <Insignia tono="atencion">{persona.condicionEspecial}</Insignia>
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

/**
 * El total consolidado, **sumado por el servidor** y con su fecha debajo.
 *
 * Es el único total con fecha que el sistema publica (ADR-0016 §2). Aquí no se
 * suma ni se completa el total a partir de las partes (RNF-083), y la frase que
 * lo explica llega redactada del backend: el día que el total y el desglose
 * discreparan, la explicación tiene que salir del mismo sitio que las cifras.
 */
function Resumen({ unificada }: { readonly unificada: ConsultaUnificada }) {
  if (hayFallo(unificada.error)) return <AvisoDeLectura error={unificada.error} />;

  const resumen = resumenDeSaldosDe(unificada.data);
  const explicacion = texto(resumen?.[ESTADO_DE_LA_CONSULTA]);

  return (
    <div className="sgtm-portal-app__resumen">
      <h2>Lo que debes</h2>
      <dl>
        {RESUMEN_DE_SALDOS.map((cifra) => (
          <div key={cifra.clave} data-fuerte={cifra.clave === 'total' ? '1' : '0'}>
            {/* **La unidad, igual que en las filas.** El importe llega como texto
                del backend —«279.03»— y sin moneda al lado no dice si son soles.
                En las rejillas la trae su columna del catalogo («Total S/»); el
                catalogo del resumen no la escribe, asi que se pone aqui **al
                dibujar**: el rotulo del catalogo se conserva letra a letra
                (RNF-080) y la unidad se le anade, que es lo que hace la pestana
                hermana. */}
            <dt>{cifra.label} S/</dt>
            <dd>
              {unificada.isFetching ? (
                <Esqueleto alto={18} ancho="7ch" />
              ) : (
                /* El importe **de un `ImporteActualizado`**: un importe sin su
                   `actualizadoA` no es una cifra que se pueda enseñar (regla 9). */
                (importeDe(resumen?.[cifra.clave])?.importe ?? SIN_DATO)
              )}
            </dd>
          </div>
        ))}
      </dl>
      {!unificada.isFetching && explicacion !== SIN_DATO && (
        <p className="sgtm-portal-app__nota">{explicacion}</p>
      )}
      <FechaDeCalculo {...fechaDeCorteDe(unificada.data)} />
    </div>
  );
}

/**
 * Una de las seis secciones de la unificada, **leída con el mismo adaptador que
 * la ficha del back-office** y dibujada para 390 px.
 *
 * Cada fila es una lista de pares: el rótulo es el de la columna que declara la
 * rejilla —del catálogo, letra a letra (RNF-080)— y el valor, la celda que su
 * `fila` produce. Así la tabla de siete columnas cabe sin que nadie tenga que
 * desplazarse en horizontal para leer una deuda.
 */
function Seccion({
  rejilla,
  ficha,
  cargando,
}: {
  readonly rejilla: RejillaDeLaFicha;
  readonly ficha?: Readonly<Record<string, unknown>>;
  readonly cargando: boolean;
}) {
  const seccion = seccionDeLaFicha(ficha, rejilla.clave);

  return (
    <section className="sgtm-portal-app__seccion">
      <h3>{rejilla.titulo}</h3>
      <p className="sgtm-portal-app__conteo">
        {cargando ? 'Consultando…' : conteoDeLaRejilla(rejilla, seccion)}
      </p>
      {seccion.filas.map((registro, indice) => (
        <dl key={indice} className="sgtm-portal-app__fila">
          {rejilla.fila(registro).map((celda, columna) => (
            <div key={rejilla.cols[columna] ?? columna}>
              <dt>{rejilla.cols[columna] ?? ''}</dt>
              <dd>
                <Valor celda={celda} />
              </dd>
            </div>
          ))}
        </dl>
      ))}
      {/* **La nota del ciudadano, nunca la del back-office.** La de arriba
          termina en «se ve en «Consulta de convenios»» y las suyas: cuatro
          destinos que desde aqui no existen —no hay navegacion, ni catalogo, ni
          permiso que los abra—, asi que a este lector no le serian verdad. Lo
          que falta se sigue diciendo; la salida que se le ofrece es la
          municipalidad. Ver `RejillaDeLaFicha.notaDelCiudadano`. */}
      {rejilla.notaDelCiudadano !== undefined && (
        <p className="sgtm-portal-app__nota">{rejilla.notaDelCiudadano}</p>
      )}
      {/* La banda solo donde **todas** sus cifras comparten fecha. Donde cada
          fila trae la suya —los pagos, los movimientos— la fecha ya está en su
          par, y una banda encima diría que se recalcularon hoy (regla 9). */}
      {rejilla.aLaFechaDeCorte === true && <FechaDeCalculo {...fechaDeCorteDe(ficha)} />}
    </section>
  );
}

/** El texto de la celda, con su tono cuando lo trae. Nunca solo por color. */
function Valor({ celda }: { readonly celda: Celda }) {
  if (celda.tono === undefined) return <>{celda.texto}</>;
  return (
    <Insignia tono={celda.tono === 'warn' ? 'atencion' : celda.tono === 'bad' ? 'critico' : 'ok'}>
      {celda.texto}
    </Insignia>
  );
}

/**
 * No se pudo leer, o el perfil no puede. **Las dos cosas no se dicen igual, y
 * ninguna se dice como «no existe»**.
 *
 * El 403 aquí es el de la marcha blanca: el portal se sirve tras la sesión del
 * funcionario, y un funcionario sin el permiso de esas lecturas no puede
 * previsualizarlo. Se cuenta como lo que es —algo que arregla el administrador,
 * no un reintento (ADR-0013)—.
 */
function AvisoDeLectura({ error }: { readonly error: unknown }) {
  if (error instanceof ProblemaDeApi && error.problema.status === 403) {
    return (
      <Aviso
        tipo="sin-permiso"
        titulo="Esta consulta te la rechazó el servidor"
        detalle="El portal se sirve, mientras no exista el acceso del ciudadano, tras la sesión de quien atiende en la municipalidad, y esta sesión no tiene esa lectura. Reintentar dará lo mismo: pídesela al administrador de tu municipalidad."
      />
    );
  }
  return (
    <Aviso
      tipo="error"
      titulo="La consulta no se pudo hacer"
      detalle="No hubo respuesta, así que esto no se pudo mostrar. Vuelve a intentarlo: que no aparezca aquí no quiere decir que no exista."
    />
  );
}
