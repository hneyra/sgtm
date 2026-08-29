import { useState } from 'react';
import { Aviso, Boton, Campo } from '@sgtm/design-system';
import type { Celda, DatosDeTabla } from '@sgtm/api-client';
import type { CampoDePantalla, EstructuraDePantalla, EstructuraDeTabla } from '../../catalogo';
import { useCatalogoVisible } from '../../app/sesion/useCatalogoVisible';
import { useLecturaPorPost } from '../useLecturaPorPost';
import { ID_DE_LAS_ACCIONES } from '../bloques/BarraDeAcciones';
import { TablaDePantalla } from '../bloques/TablaDePantalla';
import { SIN_PERMISO } from '../estados';
import { SIN_DATO, esObjeto, leerObjeto, texto } from '../seguridad/listado';

/**
 * **El emisor de reportes de tránsito** (`transito_reportes`, `POST
 * /transito/reportes`; #396, #424, RF-068, RF-073, RF-074).
 *
 * Es la primera pantalla que estrena la **tercera puerta** —`useLecturaPorPost`,
 * la lectura que viaja por `POST` y no escribe nada—, y el motivo por el que esa
 * puerta existe está en el docblock de `pantallas/lecturas-por-post.ts`.
 *
 * ── Por qué su propio componente ───────────────────────────────────────────
 *
 * Tres cosas, y ninguna cabe en el renderizador común:
 *
 *   1. **La última acción del catálogo es «Cancelar»** —el cuarteto
 *      Exportar/Imprimir/Pantalla/Cancelar que el prototipo repite en varios
 *      módulos (#79)—, y el renderizador común trata siempre la última como la
 *      primaria. La que emite es «Pantalla».
 *   2. **Los criterios que viajan dependen del reporte elegido.**
 *      `PeticionDeReporteDeTransito` **rechaza con 422 el criterio que ese
 *      reporte no usa**, nombrándolo, porque aceptarlo y no mirarlo devolvería
 *      una hoja correcta a una pregunta que no es la que se hizo. Aquí eso se
 *      dibuja: la sección de criterios enseña **solo** los que el reporte
 *      admite, así que no se puede teclear uno que vaya a ser rechazado.
 *   3. **La respuesta trae su forma junto con sus datos.**
 *      `ReporteDeTransitoResource` es una unión de cuatro secciones y solo una
 *      viene llena; el catálogo de esta pantalla no declara ninguna `tabla`,
 *      así que las columnas salen de la sección que llegó.
 *
 * ── Quince tipos en el desplegable, ocho emitidos aquí, y por qué ──────────
 *
 * `TipoDeReporteDeTransito` declara **nueve** hojas; el desplegable del
 * prototipo ofrece **quince**. La diferencia no se tapa con un 422:
 *
 *   - **Seis** no son reportes de este emisor sino **otras opciones del
 *     catálogo** —la papeleta, la constancia libre, las dos resoluciones de
 *     gerencia, el estado de cuenta y la notificación—, y el centro de reportes
 *     (ADR-0014 §5) lleva a cada una de un clic. Elegirlas aquí lo dice.
 *   - **Una** es `RECORD DE CONDUCTOR`, que el backend sí sirve y esta pantalla
 *     **no puede pedir**: `CriteriosDeTransito.delConductor` exige la licencia
 *     de conducir o el documento del infractor —«sin ninguno de los dos, esto
 *     seria el padron entero con otro titulo»— y el único campo parecido que el
 *     catálogo dibuja es «Conductor», que es un **nombre**. Mandar un nombre
 *     como documento sería inventarse el criterio. Su hoja propia
 *     (`transito_record_conductor`) sí lo pide por la URL.
 *
 * ── El filtro «Estado» se dibuja y no viaja ───────────────────────────────
 *
 * Sus opciones son PENDIENTE / A CUENTA / CANCELADA / FRACCIONADA / ANULADA
 * —el vocabulario de la **cobranza**—, y `CriteriosDeTransito` lo lee como
 * `EstadoDePapeleta` —IMPUESTA / NOTIFICADA / PAGADA / COACTIVA / PRESCRITA—,
 * que es el del **procedimiento**. Traducir entre los dos sería decidir aquí
 * una equivalencia que ninguno de los dos vocabularios sostiene, y es el mismo
 * cruce que dejó `infracciones_adm` sin conectar en #78 hasta que #397 lo
 * resolvió en el backend. Se dibuja bloqueado, con su motivo escrito al lado:
 * un filtro que desaparece deja a quien lo buscaba pensando que algo se rompió.
 */

/** Un reporte que este emisor **sí** pide, con los criterios que el backend le admite. */
interface ReporteEmitible {
  /** El valor de `TipoDeReporteDeTransito` que espera el cuerpo. */
  readonly tipo: string;
  /**
   * Los criterios que ese reporte usa: **clave del catálogo → nombre del
   * cuerpo**. Lo que no esté aquí ni se dibuja ni viaja, que es la misma lista
   * blanca de `escrituras.ts` aplicada a una lectura.
   */
  readonly criterios: Readonly<Record<string, string>>;
  /** El criterio sin el cual el backend rechaza, y qué decir mientras falte. */
  readonly exige?: { readonly campo: string; readonly falta: string };
  /**
   * El backend **admitiría** `estado` en este reporte, y aun asi no viaja: ver
   * el docblock de arriba. Se dibuja bloqueado con su motivo; en los reportes
   * que ni siquiera lo admiten no se dibuja, porque ahi no hay nada que
   * explicar.
   */
  readonly estadoBloqueado?: true;
}

const DESDE_HASTA: Readonly<Record<string, string>> = {
  fechaDesde: 'desde',
  fechaHasta: 'hasta',
};

/**
 * Los ocho que se emiten desde aquí, por el rótulo **literal** del desplegable
 * del prototipo (RNF-080: el rótulo no se reescribe, se traduce al enumerado).
 */
const EMITIBLES = new Map<string, ReporteEmitible>([
  [
    'PADRÓN DE PAPELETAS DE INFRACCIÓN',
    { tipo: 'PADRON', criterios: DESDE_HASTA, estadoBloqueado: true },
  ],
  ['PAPELETAS ENVIADAS A COACTIVAS', { tipo: 'PADRON_COACTIVA', criterios: DESDE_HASTA }],
  [
    'RELACIÓN CONSTANCIAS LIBRE DE INFRAC.',
    {
      tipo: 'PADRON_CONSTANCIAS',
      criterios: {
        ...DESDE_HASTA,
        nConstancia: 'nDeConstancia',
        usuarioQueIngreso: 'usuarioQueEmitio',
      },
    },
  ],
  [
    'RECORD VEHICULAR',
    {
      tipo: 'RECORD_VEHICULAR',
      criterios: { placa: 'placa' },
      exige: {
        campo: 'placa',
        falta:
          'Falta la placa: sin ella el record vehicular sería el padrón entero con otro título, y el servidor lo rechaza.',
      },
    },
  ],
  ['RESUMEN RECAUDACIÓN', { tipo: 'RESUMEN_RECAUDACION', criterios: {} }],
  [
    'RESUMEN PAPEL. PENDIENTES Y PAGADAS',
    { tipo: 'RESUMEN_PAPELETAS', criterios: { ...DESDE_HASTA, agrupadoPor: 'agrupadoPor' } },
  ],
  [
    'RESUMEN POR CÓDIGO INFRACCIÓN',
    {
      tipo: 'RESUMEN_CODIGO',
      criterios: { ...DESDE_HASTA, infraccionCodigo: 'codigoDeInfraccion' },
      estadoBloqueado: true,
    },
  ],
  [
    'RESUMEN POR PLACA (2 LETRAS)',
    { tipo: 'RESUMEN_PLACA', criterios: DESDE_HASTA, estadoBloqueado: true },
  ],
]);

/**
 * Los siete que **no** se emiten aquí, con dónde está cada uno.
 *
 * Se dice **a dónde ir**, no solo que no se puede: el centro de reportes de
 * Tránsito (ADR-0014 §5) lleva a las trece hojas del módulo de un clic, y seis
 * de estos siete son una de ellas.
 */
const NO_SE_EMITEN_AQUI = new Map<string, string>([
  [
    'RECORD DE CONDUCTOR',
    'El record de conductor necesita la licencia de conducir o el documento del infractor, y esta pantalla solo dibuja el nombre. Se pide desde su propia hoja, «Record de conductor», en el centro de reportes.',
  ],
  [
    'CONSTANCIA LIBRE DE INFRACCIONES',
    'La constancia se emite —no se lista— desde «Constancia libre de infracciones»; aquí solo se saca la relación de las ya emitidas.',
  ],
  [
    'ESTADO DE CUENTA DE INFRACCIONES',
    'El estado de cuenta se consulta por contribuyente en «Estado de cuenta de infracciones»: no es una hoja de este emisor.',
  ],
  [
    'PAPELETA DE INFRACCIÓN',
    'La hoja informativa de una papeleta se abre por su número, en «Papeleta de infracción».',
  ],
  [
    'RESOLUCIÓN DE GERENCIA ORDINARIA',
    'La resolución se dicta y se imprime desde «Resolución de gerencia ordinaria».',
  ],
  [
    'RESOLUCIÓN DE GERENCIA SANCIONADA',
    'La resolución se dicta y se imprime desde «Resolución de gerencia sancionadora».',
  ],
  [
    'NOTIFICACIÓN',
    'La notificación se emite desde su propia opción, con el acto que notifica: aquí no hay ninguno elegido.',
  ],
]);

/** La acción del catálogo que emite a pantalla. Las otras tres, más abajo. */
const EMITIR = 'Pantalla';

/** El `id` de la franja, para que la acción la referencie con `aria-describedby`. */
const MOTIVO = 'sgtm-motivo-de-la-accion';

/** El campo del catálogo con esa clave, para dibujarlo con su rótulo y su tipo. */
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

/** El agrupador, del rótulo del prototipo al `AgrupacionDelResumen` del backend. */
const AGRUPADORES = new Map<string, string>([
  ['MES', 'MES'],
  ['AÑO', 'ANO'],
  ['CÓDIGO DE INFRACCIÓN', 'CODIGO'],
  ['ESTADO', 'ESTADO'],
  ['PLACA', 'PLACA'],
]);

/** La hoja que volvió: sus columnas y sus filas, que salen de la misma respuesta. */
interface HojaEmitida {
  readonly estructura: EstructuraDeTabla;
  readonly tabla: DatosDeTabla;
}

const COLUMNAS_DE_PAPELETAS: EstructuraDeTabla = {
  title: 'Papeletas',
  cols: ['Nº papeleta', 'Fecha', 'Placa', 'Infractor', 'Infracción', 'Importe S/', 'Estado'],
  claves: ['numero', 'fechaInfraccion', 'placa', 'infractor', 'infraccion', 'importe', 'estado'],
  num: [5],
};

const COLUMNAS_DE_CONSTANCIAS: EstructuraDeTabla = {
  title: 'Constancias emitidas',
  cols: ['Nº constancia', 'Fecha', 'Placa', 'Usuario que emitió'],
  claves: ['numero', 'fechaEmision', 'placa', 'usuarioQueEmitio'],
};

const COLUMNAS_DEL_RESUMEN: EstructuraDeTabla = {
  title: 'Resumen',
  cols: ['Grupo', 'Pendientes', 'Importe pendiente S/', 'Pagadas', 'Importe pagado S/'],
  claves: ['clave', 'pendientes', 'importeDeLasPendientes', 'pagadas', 'importeDeLasPagadas'],
  num: [1, 2, 3, 4],
};

const COLUMNAS_DE_LA_RECAUDACION: EstructuraDeTabla = {
  title: 'Recaudación por mes',
  cols: ['Mes', 'Fase', 'Recaudado S/'],
  claves: ['mes', 'fase', 'recaudado'],
  num: [2],
};

/** Las filas de un arreglo del recurso, ya como objetos. */
function objetosDe(valor: unknown): readonly Readonly<Record<string, unknown>>[] {
  return Array.isArray(valor) ? valor.filter(esObjeto) : [];
}

/** El contenido de un sobre paginado del recurso, ya como objetos. */
function contenidoDe(valor: unknown): readonly Readonly<Record<string, unknown>>[] {
  return esObjeto(valor) ? objetosDe(valor['contenido']) : [];
}

const celdasDe = (fila: Readonly<Record<string, unknown>>, claves: readonly string[]): Celda[] =>
  claves.map((clave) => ({ texto: texto(fila[clave]) }));

/**
 * La hoja, leída de la sección que venga llena.
 *
 * El orden de las cuatro no importa —solo una viene llena, y el recurso lo
 * garantiza—, pero la comprobación sí: una respuesta con las cuatro vacías se
 * dice **en voz alta** en vez de dibujar una tabla vacía que se lee como «no
 * hay papeletas».
 */
function hojaDelReporte(cuerpo: unknown): HojaEmitida {
  const recurso = leerObjeto(cuerpo, 'el reporte de tránsito');

  if (esObjeto(recurso['papeletas'])) {
    const papeletas = contenidoDe(recurso['papeletas']);
    return {
      estructura: COLUMNAS_DE_PAPELETAS,
      tabla: {
        filas: papeletas.map((papeleta): readonly Celda[] => [
          { texto: texto(papeleta['numero']) },
          { texto: texto(papeleta['fechaInfraccion']) },
          { texto: texto(papeleta['placa']) },
          { texto: texto(papeleta['infractorNombre']) },
          { texto: texto(papeleta['descripcionInfraccion']) },
          { texto: texto(papeleta['importeAPagar']) },
          { texto: texto(papeleta['estado']) },
        ]),
        conteo: `${papeletas.length} papeleta(s)`,
      },
    };
  }

  if (esObjeto(recurso['constancias'])) {
    const constancias = contenidoDe(recurso['constancias']);
    return {
      estructura: COLUMNAS_DE_CONSTANCIAS,
      tabla: {
        filas: constancias.map((constancia) =>
          celdasDe(constancia, COLUMNAS_DE_CONSTANCIAS.claves),
        ),
        conteo: `${constancias.length} constancia(s)`,
      },
    };
  }

  if (esObjeto(recurso['resumenDePapeletas'])) {
    const lineas = objetosDe(recurso['resumenDePapeletas']['lineas']);
    return {
      estructura: COLUMNAS_DEL_RESUMEN,
      tabla: {
        filas: lineas.map((linea) => celdasDe(linea, COLUMNAS_DEL_RESUMEN.claves)),
        conteo: `${lineas.length} grupo(s)`,
      },
    };
  }

  if (esObjeto(recurso['recaudacion'])) {
    /* Se dibuja desde `lineas` —una por (tributo, ejercicio, mes, fase)— y **no
       se suma nada** (RNF-083): el total por mes lo compone el servidor en
       `porMes`, y esta hoja no tiene columna para él. */
    const lineas = objetosDe(recurso['recaudacion']['lineas']);
    return {
      estructura: COLUMNAS_DE_LA_RECAUDACION,
      tabla: {
        filas: lineas.map((linea) => celdasDe(linea, COLUMNAS_DE_LA_RECAUDACION.claves)),
        conteo: `${lineas.length} línea(s)`,
      },
    };
  }

  throw new Error(
    `El reporte «${texto(recurso['reporte'])}» volvió sin ninguna de sus cuatro secciones.`,
  );
}

export function EmisorDeReportes({ estructura }: { readonly estructura: EstructuraDePantalla }) {
  const catalogo = useCatalogoVisible();
  const [reporte, fijarReporte] = useState('');
  const [criterios, fijarCriterios] = useState<Readonly<Record<string, string>>>({});
  const lectura = useLecturaPorPost('transito_reportes', hojaDelReporte);

  /* `Map` y no un objeto: los rotulos del prototipo son datos —«NOTIFICACIÓN»,
     «AÑO»— y como claves de objeto quedan escritos como identificadores, que es
     justo lo que la regla del idioma prohibe con tilde o con eñe. Un `Map` los
     deja donde son: en una cadena. */
  const emitible = EMITIBLES.get(reporte);
  const fuera = NO_SE_EMITEN_AQUI.get(reporte);
  const faltaElCriterio =
    emitible?.exige !== undefined && (criterios[emitible.exige.campo] ?? '').trim() === ''
      ? emitible.exige.falta
      : undefined;

  /* Por qué no se puede emitir todavía, **pintado** y nunca en un `title`: un
     `title` sobre un botón apagado no existe ni para el teclado —no se puede
     enfocar— ni para el lector de pantalla (FRO-04 §6, RNF-082). */
  const motivo =
    lectura.impedimento ??
    fuera ??
    (reporte === '' ? 'Elige el tipo de reporte que quieres emitir.' : faltaElCriterio);
  const puedeEmitir = motivo === undefined && lectura.puedePedir;

  if (!catalogo.puedeVer(estructura.id)) {
    return <Aviso tipo="sin-permiso" titulo={SIN_PERMISO.titulo} detalle={SIN_PERMISO.detalle} />;
  }

  const emitir = (): void => {
    if (!puedeEmitir || emitible === undefined) return;
    const cuerpo: Record<string, string> = { reporte: emitible.tipo };
    for (const [clave, nombre] of Object.entries(emitible.criterios)) {
      const valor = (criterios[clave] ?? '').trim();
      if (valor === '' || valor === SIN_DATO) continue;
      // El agrupador es el único criterio con dos vocabularios: «AÑO» del
      // prototipo es `ANO` del enumerado, y lo que no esté en la tabla no viaja.
      const traducido = clave === 'agrupadoPor' ? AGRUPADORES.get(valor) : valor;
      if (traducido !== undefined) cuerpo[nombre] = traducido;
    }
    lectura.pedir(cuerpo);
  };

  const tipos = campoDelCatalogo(estructura, 'reporte')?.opts ?? [];

  return (
    <>
      {estructura.desc && <p className="sgtm-descripcion">{estructura.desc}</p>}

      <section className="sgtm-tarjeta">
        <div className="sgtm-tarjeta__cabecera">
          <h2 className="sgtm-tarjeta__titulo">Tipo de reporte</h2>
        </div>
        <Campo
          etiqueta="Reporte"
          tipo="sel"
          ancho
          eleccionObligatoria
          opciones={tipos}
          valor={reporte}
          onCambio={(valor) => {
            fijarReporte(valor);
            // Los criterios son de **este** reporte: al cambiar de hoja se
            // vacían, porque uno que la nueva no admite volvería como 422.
            fijarCriterios({});
          }}
        />
      </section>

      <section className="sgtm-tarjeta">
        <div className="sgtm-tarjeta__cabecera">
          <h2 className="sgtm-tarjeta__titulo">Criterios</h2>
        </div>
        {emitible === undefined ? (
          <p className="sgtm-descripcion">
            Los criterios que se pueden usar dependen del reporte: elige uno arriba y aquí se
            dibujan los suyos.
          </p>
        ) : (
          <>
            {Object.keys(emitible.criterios).map((clave) => {
              const campo = campoDelCatalogo(estructura, clave);
              if (campo === undefined) return null;
              return (
                <Campo
                  key={clave}
                  etiqueta={campo.label}
                  tipo={campo.t}
                  {...(campo.opts === undefined ? {} : { opciones: campo.opts })}
                  valor={criterios[clave] ?? ''}
                  onCambio={(valor) =>
                    fijarCriterios((previos) => ({ ...previos, [clave]: valor }))
                  }
                />
              );
            })}
            {emitible.estadoBloqueado === true && (
              <Campo
                etiqueta="Estado"
                tipo="sel"
                bloqueado
                opciones={campoDelCatalogo(estructura, 'estado')?.opts ?? []}
                ayuda="No viaja: aquí «Pendiente» o «Cancelada» son estados de la cobranza, y el servidor acota por el estado del procedimiento (impuesta, notificada, pagada, coactiva). Traducir entre los dos vocabularios cambiaría lo que se pregunta."
              />
            )}
            {Object.keys(emitible.criterios).length === 0 && (
              <p className="sgtm-descripcion">
                Este reporte no admite ningún criterio de esta pantalla: sale del ejercicio en
                curso, y la hoja dice de cuál.
              </p>
            )}
          </>
        )}
      </section>

      {lectura.error !== undefined && (
        <Aviso tipo="error" titulo="No se emitió el reporte" detalle={lectura.error} />
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
          {/* Las otras tres acciones del catálogo —«Exportar», «Imprimir» y
              «Cancelar»— no se dibujan: las dos primeras piden el documento por
              `formato`, y la descarga del frontend (`descargarOperacion`) solo
              sabe hacerlo con un `GET`; «Cancelar» cierra un diálogo que aquí no
              existe. Un botón que no puede hacer lo que dice es lo que #332
              cerró. */}
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
