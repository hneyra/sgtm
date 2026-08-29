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
 * **El emisor de reportes de infracciones administrativas** (`adm_reportes`,
 * `POST /infracciones/administrativas/reportes`; #53, #428, RF-074).
 *
 * La segunda pantalla que usa la **tercera puerta** —`useLecturaPorPost`, la
 * lectura que viaja por `POST` y no escribe nada (#424)—, y la gemela del
 * emisor de transito (`../transito/EmisorDeReportes`). Vive en su propio
 * componente por las mismas tres razones, que aqui se cumplen todas:
 *
 *   1. **La ultima accion del catalogo es «Cancelar»** —el cuarteto
 *      Exportar/Imprimir/Pantalla/Cancelar que el prototipo repite—, y el
 *      renderizador comun trata siempre la ultima como la primaria. La que
 *      emite es «Pantalla».
 *   2. **Los criterios que viajan dependen del reporte elegido**, asi que se
 *      dibujan solo los que ese reporte admite.
 *   3. **La respuesta trae su forma junto con sus datos.**
 *      `ReporteAdministrativoResource` es una union de tres secciones y solo una
 *      viene llena; el catalogo de esta pantalla no declara ninguna `tabla`.
 *
 * ── Diez tipos en el desplegable, tres emitidos, y por que (#428) ──────────
 *
 * `TipoDeReporteAdministrativo` declara **tres** hojas; el desplegable del
 * prototipo ofrece **diez**. Conectarlo tal cual dejaria siete elecciones que
 * contestan 422 con el boton encendido, que es peor que el boton apagado que
 * habia. Aqui la diferencia **se dice**, y cada una de las siete dice **donde
 * esta lo que promete**, que es lo que evita que se lea como una averia:
 *
 *   cinco son otras opciones del catalogo —las notificaciones vencidas, las de
 *   un contribuyente, el estado de cuenta, la resolucion de gerencia y su
 *   notificacion—, y el centro de reportes (ADR-0014 §5) lleva a las cuatro
 *   primeras de un clic;
 *
 *   dos **no las sirve nadie**: la relacion de notificaciones por mes —el
 *   padron no agrupa: `CriterioDelPadronDeNotificaciones` no tiene agrupador— y
 *   el padron de papeletas administrativas, que no existe como reporte (la
 *   relacion de procedimientos es la grilla de «Infracciones administrativas»).
 *
 * ── El unico rotulo que hay que interpretar ───────────────────────────────
 *
 * Dos de los tres se leen solos: «PADRÓN DE NOTIFICACIONES» es
 * `PADRON_NOTIFICACIONES` y «RESUMEN RECAUDACIÓN» es `RESUMEN_RECAUDACION`. El
 * tercero, `RESUMEN_PAPELETAS` —«cuantas papeletas administrativas hay y por
 * cuanto, agrupadas»—, no tiene rotulo literal, y de los dos candidatos se
 * elige **«PAPELETAS POR INFRACCIÓN»** y no «PADRÓN DE PAPELETAS»: el segundo
 * es un listado y el backend no publica ninguno; el primero nombra una
 * agrupacion, y `AgrupacionDelResumen.CODIGO` es exactamente «por codigo de
 * infraccion». La pantalla **fija** ese agrupador —el rotulo ya dice cual es, y
 * el catalogo de esta opcion no dibuja ningun campo para elegirlo—, que es lo
 * mismo que hizo `PaseACoactiva` con la unica respuesta que su endpoint acepta
 * (#75).
 *
 * ── Los criterios que el catalogo dibuja y no viajan ──────────────────────
 *
 * La seccion «Criterios» del prototipo tiene quince campos y
 * `PeticionDeReporteAdministrativo` admite cuatro (`desde`, `hasta`,
 * `agrupadoPor`, `estado`). De los quince se usan los dos de rango; los otros
 * trece no se dibujan, y entre ellos hay uno que merece decirse: el prototipo
 * trae **dos** pares de fechas —«Rango desde/hasta» y «Registradas
 * desde/hasta»—, y el backend tiene **un** intervalo. Se manda el primero, que
 * es el que el emisor nombra sin adjetivo; mandar el segundo por el mismo
 * parametro seria decidir aqui que las dos preguntas son la misma.
 */

/** Un reporte que este emisor **si** pide, con los criterios que el backend le admite. */
interface ReporteEmitible {
  /** El valor de `TipoDeReporteAdministrativo` que espera el cuerpo. */
  readonly tipo: string;
  /** Criterios: **clave del catalogo → nombre del cuerpo**. Lo que no este aqui no viaja. */
  readonly criterios: Readonly<Record<string, string>>;
  /** Lo que la pantalla fija por su cuenta, porque el rotulo elegido ya lo dice. */
  readonly fijos?: Readonly<Record<string, string>>;
}

const RANGO: Readonly<Record<string, string>> = {
  rangoDesde: 'desde',
  rangoHasta: 'hasta',
};

/**
 * Los tres que se emiten desde aqui, por el rotulo **literal** del desplegable
 * del prototipo (RNF-080: el rotulo no se reescribe, se traduce al enumerado).
 */
const EMITIBLES = new Map<string, ReporteEmitible>([
  ['PADRÓN DE NOTIFICACIONES', { tipo: 'PADRON_NOTIFICACIONES', criterios: RANGO }],
  [
    'PAPELETAS POR INFRACCIÓN',
    { tipo: 'RESUMEN_PAPELETAS', criterios: RANGO, fijos: { agrupadoPor: 'CODIGO' } },
  ],
  ['RESUMEN RECAUDACIÓN', { tipo: 'RESUMEN_RECAUDACION', criterios: RANGO }],
]);

/** Los siete que **no** se emiten aqui, con donde esta cada uno. */
const NO_SE_EMITEN_AQUI = new Map<string, string>([
  [
    'RELACIÓN DE NOTIFICACIONES POR MES',
    'El padrón de notificaciones no se agrupa por mes: se emite con su rango de fechas y lista cada una con la suya. Elige «PADRÓN DE NOTIFICACIONES» y acota el rango al mes que buscas.',
  ],
  [
    'NOTIFICACIONES VENCIDAS',
    'Las notificaciones vencidas tienen su propia hoja, «Notificaciones vencidas», en el centro de reportes: allí sale con el plazo de cada una.',
  ],
  [
    'NOTIFICACIONES POR CONTRIBUYENTE',
    'Se piden por contribuyente en «Notificaciones por contribuyente», y este emisor no dibuja ningún campo para identificarlo.',
  ],
  [
    'PADRÓN DE PAPELETAS',
    'No hay ningún padrón de papeletas administrativas: la relación de procedimientos se consulta en «Infracciones administrativas», con su filtro de estado. Lo que este emisor sí sabe dar es el resumen agrupado, en «PAPELETAS POR INFRACCIÓN».',
  ],
  [
    'ESTADO DE CUENTA PAPELETA',
    'El estado de cuenta se consulta por contribuyente en «Estado de cuenta de infracciones»: no es una hoja de este emisor.',
  ],
  [
    'RESOLUCIONES DE GERENCIA',
    'Ninguna consulta del sistema lista las resoluciones de gerencia todavía: la opción del mismo nombre es la hoja de una resolución, no su relación.',
  ],
  [
    'NOTIFICACIÓN DE RESOLUCIÓN',
    'Tampoco hay una relación de notificaciones de resolución: «Notificación de resolución de gerencia» es la cédula de una, no su listado.',
  ],
]);

/** La accion del catalogo que emite a pantalla. Las otras tres, mas abajo. */
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

/** La hoja que volvio: sus columnas y sus filas, que salen de la misma respuesta. */
interface HojaEmitida {
  readonly estructura: EstructuraDeTabla;
  readonly tabla: DatosDeTabla;
}

const COLUMNAS_DEL_PADRON: EstructuraDeTabla = {
  title: 'Notificaciones',
  cols: ['Nº notificación', 'Fecha', 'Dirección', 'Motivo', 'Estado', 'Papeleta', 'Importe S/'],
  claves: [
    'numero',
    'fecha',
    'direccion',
    'motivo',
    'estado',
    'papeletaNumero',
    'importeDeLaPapeleta',
  ],
  num: [6],
};

const COLUMNAS_DEL_RESUMEN: EstructuraDeTabla = {
  title: 'Resumen por código de infracción',
  cols: [
    'Código',
    'Descripción',
    'Pendientes',
    'Importe pendiente S/',
    'Pagadas',
    'Importe pagado S/',
  ],
  claves: [
    'clave',
    'descripcion',
    'pendientes',
    'importeDeLasPendientes',
    'pagadas',
    'importeDeLasPagadas',
  ],
  num: [2, 3, 4, 5],
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
 * La hoja, leida de la seccion que venga llena.
 *
 * Una respuesta con las tres vacias se dice **en voz alta** en vez de dibujar
 * una tabla vacia que se lee como «no hay notificaciones».
 */
function hojaDelReporte(cuerpo: unknown): HojaEmitida {
  const recurso = leerObjeto(cuerpo, 'el reporte de infracciones administrativas');

  if (esObjeto(recurso['padronDeNotificaciones'])) {
    const filas = contenidoDe(recurso['padronDeNotificaciones']);
    return {
      estructura: COLUMNAS_DEL_PADRON,
      tabla: {
        filas: filas.map((fila) => celdasDe(fila, COLUMNAS_DEL_PADRON.claves)),
        conteo: `${filas.length} notificación(es)`,
      },
    };
  }

  if (esObjeto(recurso['resumenDePapeletas'])) {
    const lineas = objetosDe(recurso['resumenDePapeletas']['lineas']);
    return {
      estructura: COLUMNAS_DEL_RESUMEN,
      tabla: {
        filas: lineas.map((linea) => celdasDe(linea, COLUMNAS_DEL_RESUMEN.claves)),
        conteo: `${lineas.length} código(s)`,
      },
    };
  }

  if (esObjeto(recurso['recaudacion'])) {
    /* Se dibuja desde `lineas` —una por (tributo, ejercicio, mes, fase)— y **no
       se suma nada** (RNF-083): el total por mes lo compone el servidor, y esta
       hoja no tiene columna para el. */
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
    `El reporte «${texto(recurso['reporte'])}» volvió sin ninguna de sus tres secciones.`,
  );
}

export function EmisorDeReportesAdministrativos({
  estructura,
}: {
  readonly estructura: EstructuraDePantalla;
}) {
  const catalogo = useCatalogoVisible();
  const [reporte, fijarReporte] = useState('');
  const [criterios, fijarCriterios] = useState<Readonly<Record<string, string>>>({});
  const lectura = useLecturaPorPost('adm_reportes', hojaDelReporte);

  const emitible = EMITIBLES.get(reporte);
  const fuera = NO_SE_EMITEN_AQUI.get(reporte);

  /* Por que no se puede emitir todavia, **pintado** y nunca en un `title`: un
     `title` sobre un boton apagado no existe ni para el teclado —no se puede
     enfocar— ni para el lector de pantalla (FRO-04 §6, RNF-082). */
  const motivo =
    lectura.impedimento ??
    fuera ??
    (reporte === '' ? 'Elige el tipo de reporte que quieres emitir.' : undefined);
  const puedeEmitir = motivo === undefined && lectura.puedePedir;

  if (!catalogo.puedeVer(estructura.id)) {
    return <Aviso tipo="sin-permiso" titulo={SIN_PERMISO.titulo} detalle={SIN_PERMISO.detalle} />;
  }

  const emitir = (): void => {
    if (!puedeEmitir || emitible === undefined) return;
    const cuerpo: Record<string, string> = { reporte: emitible.tipo, ...(emitible.fijos ?? {}) };
    for (const [clave, nombre] of Object.entries(emitible.criterios)) {
      const valor = (criterios[clave] ?? '').trim();
      if (valor === '' || valor === SIN_DATO) continue;
      cuerpo[nombre] = valor;
    }
    lectura.pedir(cuerpo);
  };

  /* Solo los tres que se emiten, mas el que se haya elegido: el desplegable no
     ofrece lo que el sistema no puede dar, y elegir uno de los siete —al que se
     llega por el enlace de una busqueda guardada, o tecleando— sigue diciendo
     donde esta. La lista se compone del catalogo, no se escribe aqui: si el
     prototipo cambia un rotulo, el que deje de casar desaparece de la lista y
     su prueba lo dice. */
  const delCatalogo = campoDelCatalogo(estructura, 'reporte')?.opts ?? [];
  const tipos = delCatalogo.filter((tipo) => EMITIBLES.has(tipo) || tipo === reporte);

  return (
    <>
      {estructura.desc && <p className="sgtm-descripcion">{estructura.desc}</p>}

      <Aviso
        titulo="Este emisor da tres de los diez reportes del manual"
        detalle="Los otros siete no se emiten desde aquí: cinco tienen su propia opción —notificaciones vencidas, notificaciones por contribuyente, estado de cuenta, resolución de gerencia y su notificación— y dos no las sirve nadie todavía. El desplegable ofrece sólo los tres que salen; elegir cualquier otro dice dónde está."
      />

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
          Object.keys(emitible.criterios).map((clave) => {
            const campo = campoDelCatalogo(estructura, clave);
            if (campo === undefined) return null;
            return (
              <Campo
                key={clave}
                etiqueta={campo.label}
                tipo={campo.t}
                {...(campo.opts === undefined ? {} : { opciones: campo.opts })}
                valor={criterios[clave] ?? ''}
                onCambio={(valor) => fijarCriterios((previos) => ({ ...previos, [clave]: valor }))}
              />
            );
          })
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
              «Cancelar»— no se dibujan, por lo mismo que en el emisor de
              tránsito: las dos primeras piden el documento por `formato` y la
              descarga del frontend sólo sabe hacerlo con un `GET`; «Cancelar»
              cierra un diálogo que aquí no existe. */}
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
