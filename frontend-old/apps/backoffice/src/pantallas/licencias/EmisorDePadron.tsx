import { useState } from 'react';
import { Aviso, Boton, Campo } from '@sgtm/design-system';
import { importeDe } from '@sgtm/lectura';
import type { Celda, DatosDeTabla } from '@sgtm/api-client';
import type { CampoDePantalla, EstructuraDePantalla, EstructuraDeTabla } from '../../catalogo';
import { useCatalogoVisible } from '../../app/sesion/useCatalogoVisible';
import { useLecturaPorPost } from '../useLecturaPorPost';
import { ID_DE_LAS_ACCIONES } from '../bloques/BarraDeAcciones';
import { TablaDePantalla } from '../bloques/TablaDePantalla';
import { SIN_PERMISO } from '../estados';
import { SIN_DATO, esObjeto, leerObjeto, texto } from '../seguridad/listado';

/**
 * **Los dos padrones de Autorizaciones y licencias** (`anuncios_reportes` y
 * `licencia_padron`; #51, #54, #427, RF-114, RF-115).
 *
 * La tercera y la cuarta pantalla que usan la **tercera puerta**
 * —`useLecturaPorPost`, la lectura que viaja por `POST` y no escribe nada
 * (#424)—, y hermanas del emisor de transito y del de infracciones
 * administrativas. Viven en su propio componente por las mismas tres razones:
 *
 *   1. **La ultima accion del catalogo es «Cancelar»** —el cuarteto Exportar ·
 *      Imprimir · Pantalla · Cancelar que el prototipo repite—, y el
 *      renderizador comun trata siempre la ultima como la primaria. La que emite
 *      es «Pantalla», que es lo que `LA_QUE_ESCRIBE` (#421) ya declaraba; aqui
 *      es ademas la unica que se dibuja, porque «Cancelar» cierra un dialogo que
 *      esta interfaz no tiene y «Exportar»/«Imprimir» piden el documento por
 *      `?formato=`, que la descarga del frontend solo sabe hacer con un `GET`
 *      (`descargarOperacion`, `operaciones.ts`).
 *   2. **Los criterios que viajan no son los que el catalogo dibuja**, y la
 *      diferencia se dice campo por campo en vez de mandarlos y esperar el 422.
 *   3. **La respuesta no es un sobre paginado.** `PadronDeAnunciosResource` y
 *      `PadronDeLicenciasResource` publican sus filas bajo `filas` —nunca bajo
 *      `contenido`—, con su fecha de corte y su resumen al lado. Leidas por el
 *      camino comun, la tabla saldria **vacia y en silencio**, que es el defecto
 *      que #363 documento.
 *
 * ── Ni una cifra compuesta, y todas con su fecha ──────────────────────────
 *
 * El resumen de los dos lo calcula el servidor sobre **todo** el criterio, no
 * sobre la pagina: se pinta como viene y no se recuenta la tabla (RNF-083, y el
 * defecto que #25 destapo en la consulta unificada). La fecha de corte del
 * padron acompana a cada cifra del resumen (regla 9, RNF-075).
 *
 * ── Lo que estos dos padrones **no** pueden filtrar, y por que se dice ─────
 *
 * Es el mismo cruce de vocabularios que dejo `infracciones_adm` sin conectar en
 * #78 y que #397 tuvo que resolver en el backend, aqui en dos formas:
 *
 *   - **Un criterio sin destino.** «Estado» y «Nº anuncio» del padron de
 *     anuncios no tienen campo en `PeticionDeReporteDeAnuncios`, y el
 *     controlador pasa `null` por los dos huecos de `CriterioDeAnuncios`.
 *     Se dibujan **bloqueados con su motivo**, como el «Estado» del emisor de
 *     transito: un filtro que desaparece deja a quien lo buscaba pensando que
 *     algo se ha roto.
 *   - **Un criterio cuyo desplegable ofrece valores que el backend no tiene.**
 *     «Estado» del padron de licencias ofrece ACTIVA / CANCELADA / DUPLICADA /
 *     VENCIDA / TODAS y `EstadoDeLicencia` (V37) solo declara VIGENTE, VENCIDA y
 *     CANCELADA; «Tipo Lic.» ofrece (TODOS) / INDETERMINADA / TEMPORAL /
 *     CESIONARIO / MERCADO y `TipoDeLicencia` solo DEFINITIVA, TEMPORAL y
 *     CESIONARIA. Son **cinco de diez** que `LicenciaController.estadoOpcional`
 *     y `.tipoOpcional` rechazan con 422 despues de rellenar el formulario.
 *
 *     **Aqui no se traduce ninguno**, y esa es la decision: «ACTIVA» se parece a
 *     VIGENTE e «INDETERMINADA» a DEFINITIVA, pero parecerse no es serlo —una
 *     licencia «activa» podria querer decir «no cancelada», que incluye a las
 *     vencidas—, y una equivalencia decidida aqui cambiaria en silencio lo que
 *     se pregunta. El desplegable ofrece **solo los valores que el enumerado
 *     tiene letra por letra**, la lista se compone del catalogo (no se escribe
 *     en codigo) y la ayuda **nombra los que quedan fuera**. Cerrar el hueco es
 *     trabajo del backend o del vocabulario del prototipo, y esta escrito en
 *     `pantallas/licencias/index.ts`.
 */

/** Un `sel` del catalogo cuyo desplegable ofrece mas de lo que el backend tiene. */
interface VocabularioDelCriterio {
  /** Los valores que el enumerado del backend declara, letra por letra. */
  readonly admitidos: readonly string[];
  /** El rotulo del desplegable que significa «sin filtro» y el backend traduce a nulo. */
  readonly sinFiltro: string;
  /** Como se llama el enumerado, para poder decirlo. */
  readonly enumerado: string;
}

/** Lo que un padron de este modulo pide y lo que su pantalla no puede pedir. */
interface Padron {
  /** La opcion del catalogo, que es quien declara la lectura por `POST`. */
  readonly opcion: string;
  readonly aviso: { readonly titulo: string; readonly detalle: string };
  /**
   * Criterios que viajan: **clave del catalogo → nombre del cuerpo**. Lo que no
   * este aqui ni se dibuja ni viaja, que es la lista blanca de `escrituras.ts`
   * aplicada a una lectura.
   */
  readonly criterios: Readonly<Record<string, string>>;
  /** Criterios que se dibujan **bloqueados**: clave del catalogo → su motivo. */
  readonly bloqueados: Readonly<Record<string, string>>;
  /** Criterios `sel` cuyo desplegable hay que acotar a lo que el backend tiene. */
  readonly vocabularios?: Readonly<Record<string, VocabularioDelCriterio>>;
  /** De la respuesta a lo que se dibuja. */
  readonly hoja: (cuerpo: unknown, tabla: EstructuraDeTabla) => HojaEmitida;
}

/** La hoja que volvio: la tabla del catalogo, con las filas del recurso. */
interface HojaEmitida {
  readonly estructura: EstructuraDeTabla;
  readonly tabla: DatosDeTabla;
}

/** La accion del catalogo que emite a pantalla. Las otras tres, en el docblock. */
const EMITIR = 'Pantalla';

/** El `id` de la franja, para que la accion la referencie con `aria-describedby`. */
const MOTIVO = 'sgtm-motivo-de-la-accion';

/** El campo del catalogo con esa clave, para dibujarlo con su rotulo y su tipo. */
function campoDelCatalogo(
  estructura: EstructuraDePantalla,
  clave: string,
): CampoDePantalla | undefined {
  for (const seccion of estructura.secciones ?? []) {
    const encontrado = seccion.campos.find((campo) => campo.clave === clave);
    if (encontrado !== undefined) return encontrado;
  }
  return undefined;
}

/** Las filas de un arreglo del recurso, ya como objetos. */
function filasDe(valor: unknown): readonly Readonly<Record<string, unknown>>[] {
  return Array.isArray(valor) ? valor.filter(esObjeto) : [];
}

/** El importe de un `ImporteActualizado`, o `SIN_DATO` cuando el campo llega nulo. */
const importeS = (cruda: unknown): string => importeDe(cruda)?.importe ?? SIN_DATO;

/* ── El padron de anuncios (`PadronDeAnunciosResource`, #51) ────────────── */

/**
 * Ocho columnas, y ninguna compuesta.
 *
 * «Vigencia» sale de `fecVenc` tal cual: componer «fecInicio – fecVenc»
 * fabricaria un texto que el recurso no publica.
 */
const filaDeAnuncio = (anuncio: Readonly<Record<string, unknown>>): readonly Celda[] => [
  { texto: texto(anuncio['nroAutorizacion']) },
  { texto: texto(anuncio['contribuyente']) },
  { texto: texto(anuncio['direccion']) },
  { texto: texto(anuncio['tipoAnuncio']) },
  { texto: texto(anuncio['area']) },
  { texto: importeS(anuncio['tasaDevengada']) },
  { texto: texto(anuncio['fecVenc']) },
  { texto: texto(anuncio['estado']) },
];

function hojaDeAnuncios(cuerpo: unknown, estructura: EstructuraDeTabla): HojaEmitida {
  const padron = leerObjeto(cuerpo, 'el padrón de anuncios y propaganda');
  const filas = filasDe(padron['filas']);
  const corte = texto(padron['aLaFecha']);
  /* El recuento y el devengado los suma el servidor sobre todo el criterio: se
     pintan como vienen, con la fecha de corte del padron al lado (regla 9). */
  return {
    estructura,
    tabla: {
      filas: filas.map(filaDeAnuncio),
      conteo: `${texto(padron['autorizaciones'])} autorización(es) · S/ ${importeS(padron['devengado'])} devengados, al ${corte}`,
    },
  };
}

/* ── El padron de licencias (`PadronDeLicenciasResource`, #54) ──────────── */

/**
 * El giro principal de la licencia, que es el que la fila enseña.
 *
 * `LicenciaResource.giros` publica `principal: boolean` justo para esto; elegir
 * de una lista publicada no es componer nada. Sin ninguno marcado, `SIN_DATO`.
 */
function giroPrincipal(
  licencia: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  const giros = filasDe(licencia['giros']);
  return giros.find((giro) => giro['principal'] === true) ?? {};
}

const filaDeLicencia = (licencia: Readonly<Record<string, unknown>>): readonly Celda[] => {
  const giro = giroPrincipal(licencia);
  return [
    { texto: texto(licencia['nroLicencia']) },
    { texto: texto(licencia['fechaDeEmision']) },
    { texto: texto(licencia['contribuyente']) },
    { texto: texto(licencia['denominacionComercial']) },
    { texto: texto(giro['codigo']) },
    { texto: texto(giro['descripcion']) },
    { texto: texto(licencia['direccion']) },
    { texto: texto(licencia['estado']) },
  ];
};

function hojaDeLicencias(cuerpo: unknown, estructura: EstructuraDeTabla): HojaEmitida {
  const padron = leerObjeto(cuerpo, 'el padrón de licencias de funcionamiento');
  const filas = filasDe(padron['filas']);
  const corte = texto(padron['aLaFecha']);
  /* Los cuatro recuentos cubren **todas** las licencias del criterio, no las de
     esta pagina: se pintan como vienen y no se recuenta la tabla. */
  return {
    estructura,
    tabla: {
      filas: filas.map(filaDeLicencia),
      conteo: `${texto(padron['licencias'])} licencia(s) al ${corte} · ${texto(padron['vigentes'])} vigentes · ${texto(padron['vencidas'])} vencidas · ${texto(padron['canceladas'])} canceladas`,
    },
  };
}

/* ── Lo que declara cada uno de los dos ─────────────────────────────────── */

const PADRON_DE_ANUNCIOS: Padron = {
  opcion: 'anuncios_reportes',
  aviso: {
    titulo: 'Este padrón se pide por contribuyente, dirección y fechas',
    detalle:
      'El «Estado» y el «Nº anuncio» se dibujan bloqueados: el padrón no acota por ninguno de los dos. El estado de cada autorización sale en su columna, calculado a la fecha de corte, y una autorización concreta se busca en «Anuncios y propaganda».',
  },
  criterios: {
    contribuyente: 'contribuyente',
    direccion: 'direccion',
    desde: 'desde',
    hasta: 'hasta',
  },
  bloqueados: {
    nAnuncioSerie:
      'No viaja: el padrón no se acota por número de autorización. Una autorización concreta se abre en «Anuncios y propaganda», que sí busca por su número.',
    nAnuncioNumero:
      'No viaja, por lo mismo que la serie: el padrón sale entero y se acota por contribuyente, dirección o fechas.',
    estado:
      'No viaja: el padrón de anuncios no admite ningún filtro de estado. El de cada fila sale en la columna «Estado», derivado a la fecha de corte.',
  },
  hoja: hojaDeAnuncios,
};

const PADRON_DE_LICENCIAS: Padron = {
  opcion: 'licencia_padron',
  aviso: {
    titulo: 'Este padrón sale sin agrupar y ordenado por número de licencia',
    detalle:
      'Las tres primeras secciones del manual —«Agrupado por», «Subagrupado por» y «Ordenado por»— no se dibujan: ninguna consulta del sistema agrupa, subagrupa ni ordena este padrón todavía. Lo que sí se puede acotar es lo de «Filtrado por», con las salvedades que cada campo dice.',
  },
  criterios: {
    nLicenciaSerie: 'nLicenciaSerie',
    nLicenciaNumero: 'nLicenciaNumero',
    estado: 'estado',
    tipoLic: 'tipoLic',
    ciiu: 'ciiu',
    direccion: 'direccion',
    fecLicDesde: 'fecLicDesde',
    fecLicHasta: 'fecLicHasta',
  },
  bloqueados: {},
  vocabularios: {
    /** `EstadoDeLicencia` (V37). «TODAS» es el rótulo que el backend traduce a nulo. */
    estado: {
      admitidos: ['VIGENTE', 'VENCIDA', 'CANCELADA'],
      sinFiltro: 'TODAS',
      enumerado: 'vigente, vencida o cancelada',
    },
    /** `TipoDeLicencia` (V37). «(TODOS)» es el rótulo que el backend traduce a nulo. */
    tipoLic: {
      admitidos: ['DEFINITIVA', 'TEMPORAL', 'CESIONARIA'],
      sinFiltro: '(TODOS)',
      enumerado: 'definitiva, temporal o cesionaria',
    },
  },
  hoja: hojaDeLicencias,
};

/* ── El emisor, uno para los dos ────────────────────────────────────────── */

/**
 * Las opciones que este desplegable puede ofrecer, y las que quedan fuera.
 *
 * **Se computa del catálogo**, no se escribe aquí: si el prototipo cambia un
 * rótulo, el que deje de casar desaparece de la lista y aparece en el motivo.
 */
function acotar(
  opciones: readonly string[],
  vocabulario: VocabularioDelCriterio,
): { readonly ofrecidas: readonly string[]; readonly fuera: readonly string[] } {
  const admite = (opcion: string): boolean =>
    opcion === vocabulario.sinFiltro || vocabulario.admitidos.includes(opcion);
  return {
    ofrecidas: opciones.filter(admite),
    fuera: opciones.filter((opcion) => !admite(opcion)),
  };
}

/** La ayuda de un `sel` acotado, nombrando lo que se queda fuera. */
const ayudaDelVocabulario = (
  fuera: readonly string[],
  vocabulario: VocabularioDelCriterio,
): string =>
  `${fuera.map((valor) => `«${valor}»`).join(', ')} no llegan al padrón: el sistema clasifica cada licencia como ${vocabulario.enumerado}, y no hay ninguna equivalencia decidida para esos rótulos. Elegir el vacío las trae todas.`;

/**
 * La tabla, cuando el catálogo de la opción no declarara ninguna.
 *
 * Las dos la declaran —«Autorizaciones del padrón» y «Licencias del padrón»—, y
 * esto existe para no tener que suponerlo: una hoja sin columnas se dibuja vacía
 * en vez de reventar, y la prueba que compara las cabeceras contra el catálogo
 * lo diría.
 */
const SIN_TABLA: EstructuraDeTabla = { title: 'Padrón', cols: [], claves: [] };

function Emisor({
  padron,
  estructura,
}: {
  readonly padron: Padron;
  readonly estructura: EstructuraDePantalla;
}) {
  const catalogo = useCatalogoVisible();
  const [criterios, fijarCriterios] = useState<Readonly<Record<string, string>>>({});
  const lectura = useLecturaPorPost<HojaEmitida>(padron.opcion, (cuerpo) =>
    padron.hoja(cuerpo, estructura.tabla ?? SIN_TABLA),
  );

  /* Por qué no se puede emitir, **pintado** y nunca en un `title`: un `title`
     sobre un botón apagado no existe ni para el teclado —no se puede enfocar—
     ni para el lector de pantalla (FRO-04 §6, RNF-082). */
  const motivo = lectura.impedimento;
  const puedeEmitir = motivo === undefined && lectura.puedePedir;

  if (!catalogo.puedeVer(estructura.id)) {
    return <Aviso tipo="sin-permiso" titulo={SIN_PERMISO.titulo} detalle={SIN_PERMISO.detalle} />;
  }

  const emitir = (): void => {
    if (!puedeEmitir) return;
    const cuerpo: Record<string, string> = {};
    for (const [clave, nombre] of Object.entries(padron.criterios)) {
      const valor = (criterios[clave] ?? '').trim();
      if (valor === '' || valor === SIN_DATO) continue;
      cuerpo[nombre] = valor;
    }
    lectura.pedir(cuerpo);
  };

  return (
    <>
      {estructura.desc && <p className="sgtm-descripcion">{estructura.desc}</p>}

      <Aviso titulo={padron.aviso.titulo} detalle={padron.aviso.detalle} />

      <section className="sgtm-tarjeta">
        <div className="sgtm-tarjeta__cabecera">
          <h2 className="sgtm-tarjeta__titulo">Criterios</h2>
        </div>
        {Object.keys(padron.criterios).map((clave) => {
          const campo = campoDelCatalogo(estructura, clave);
          if (campo === undefined) return null;
          const vocabulario = padron.vocabularios?.[clave];
          const acotadas =
            vocabulario === undefined ? undefined : acotar(campo.opts ?? [], vocabulario);
          return (
            <Campo
              key={clave}
              etiqueta={campo.label}
              tipo={campo.t}
              {...(acotadas === undefined
                ? campo.opts === undefined
                  ? {}
                  : { opciones: campo.opts }
                : { opciones: acotadas.ofrecidas })}
              {...(acotadas === undefined ||
              acotadas.fuera.length === 0 ||
              vocabulario === undefined
                ? {}
                : { ayuda: ayudaDelVocabulario(acotadas.fuera, vocabulario) })}
              valor={criterios[clave] ?? ''}
              onCambio={(valor) => fijarCriterios((previos) => ({ ...previos, [clave]: valor }))}
            />
          );
        })}
        {Object.entries(padron.bloqueados).map(([clave, ayuda]) => {
          const campo = campoDelCatalogo(estructura, clave);
          if (campo === undefined) return null;
          return (
            <Campo
              key={clave}
              etiqueta={campo.label}
              tipo={campo.t}
              bloqueado
              {...(campo.opts === undefined ? {} : { opciones: campo.opts })}
              ayuda={ayuda}
            />
          );
        })}
      </section>

      {lectura.error !== undefined && (
        <Aviso tipo="error" titulo="No se emitió el padrón" detalle={lectura.error} />
      )}

      {lectura.hoja !== undefined && (
        <TablaDePantalla
          estructura={lectura.hoja.estructura}
          datos={lectura.hoja.tabla}
          cargando={false}
        />
      )}

      <div className="sgtm-acciones__fija" data-no-imprimible="1">
        <p className="sgtm-acciones__motivo" role="status" id={MOTIVO}>
          {motivo ?? ''}
        </p>
        <div className="sgtm-acciones" id={ID_DE_LAS_ACCIONES}>
          {/* Las otras tres del catálogo no se dibujan: ver el docblock. */}
          <Boton
            variante="primario"
            {...(puedeEmitir ? {} : { 'aria-disabled': true, 'aria-describedby': MOTIVO })}
            onClick={emitir}
          >
            {lectura.pidiendo ? `${EMITIR}…` : EMITIR}
          </Boton>
        </div>
      </div>
    </>
  );
}

export function EmisorDelPadronDeAnuncios({
  estructura,
}: {
  readonly estructura: EstructuraDePantalla;
}) {
  return <Emisor padron={PADRON_DE_ANUNCIOS} estructura={estructura} />;
}

export function EmisorDelPadronDeLicencias({
  estructura,
}: {
  readonly estructura: EstructuraDePantalla;
}) {
  return <Emisor padron={PADRON_DE_LICENCIAS} estructura={estructura} />;
}
