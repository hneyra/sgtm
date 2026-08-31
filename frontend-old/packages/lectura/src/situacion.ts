import type { Fecha } from '@sgtm/dominio';
import { esObjeto, importeDe, texto } from './contrato';
import type { ImporteConFecha } from './contrato';

/**
 * **Lo que `GET /portal/situacion` publica del ciudadano, ya leido** (#57,
 * ADR-0020).
 *
 * ── Que sustituye, y por que el adaptador cambia de forma ──────────────────
 *
 * Hasta aqui el portal preguntaba **dos** cosas —el padron por un documento
 * tecleado y la ficha unificada por el codigo que devolviera—, y sobre esas dos
 * respuestas hacia una guarda: `identidadesQueCoinciden` dejaba de fiarse de que
 * la fila devuelta fuera la pedida, porque el proxy no filtra (ADR-0010) y un
 * filtro del backend que un dia se relaje produce el mismo destrozo sin que nada
 * se ponga rojo.
 *
 * Con la sesion del ciudadano ya no hay documento tecleado ni codigo que
 * resolver: hay **una** operacion sin parametros cuyo sujeto sale de un claim
 * firmado. La guarda no desaparece —cambia de sitio y de forma—: lo que ahora se
 * comprueba es que la situacion que llego sea la del documento **de este token**
 * ({@link esLaSituacionDe}). Es la misma desconfianza aplicada a la unica fila
 * que queda.
 *
 * ── Y las cifras siguen siendo las de ventanilla ───────────────────────────
 *
 * El resumen de saldos y las obligaciones vienen con la **misma forma** que en
 * `consulta_unificada` —`ImporteActualizado`, las cinco partes sumadas por el
 * servidor—, asi que se leen con los mismos ayudantes de este paquete. Dos
 * lectores del mismo cuerpo son como el portal y la ficha 360° acaban diciendo
 * cifras distintas de la misma persona el mismo dia.
 */

/** Una obligacion con saldo, tal como la publica `ObligacionDeLaFicha`. */
export interface ObligacionDelCiudadano {
  readonly tributo: string;
  readonly ejercicio: string;
  readonly total: ImporteConFecha | undefined;
}

/** Un predio del ciudadano, con **su** porcentaje y sin nombrar copropietarios (ADR-0019). */
export interface PredioDelCiudadano {
  readonly codigoReferenciaCatastral: string;
  readonly tipo: string;
  readonly direccion: string;
  readonly porcentajeTitularidad: string;
}

/** Lo que hay de esta persona en una municipalidad. */
export interface EnLaMunicipalidad {
  readonly ubigeo: string;
  readonly nombre: string;
  readonly codigoContribuyente: string;
  readonly nombreContribuyente: string;
  /**
   * Si sigue de alta en ese padron.
   *
   * Cuando es `false` la deuda **se muestra igual** y se dice que esta de baja:
   * la deuda sobrevive a la baja del padron (RNF-051), y ocultarla seria decirle
   * que no debe nada.
   */
  readonly activo: boolean;
  readonly resumen: ResumenDeLaMunicipalidad;
  readonly obligaciones: readonly ObligacionDelCiudadano[];
  readonly predios: readonly PredioDelCiudadano[];
}

/** Las cinco cifras del resumen, **sumadas por el servidor** (RNF-083). */
export interface ResumenDeLaMunicipalidad {
  readonly insoluto: ImporteConFecha | undefined;
  readonly reajuste: ImporteConFecha | undefined;
  readonly interes: ImporteConFecha | undefined;
  readonly gasto: ImporteConFecha | undefined;
  readonly total: ImporteConFecha | undefined;
  /** La frase que explica el resumen, redactada por el servidor. */
  readonly estadoDeLaConsulta: string;
}

/** La situacion entera, con su fecha de corte y su total —o el motivo de que no lo haya—. */
export interface SituacionDelCiudadano {
  readonly tipoDocumento: string;
  readonly numeroDocumento: string;
  readonly aLaFecha: Fecha;
  readonly municipalidadesRecorridas: number;
  /**
   * El total de todo, **o nada**.
   *
   * Nada cuando alguna municipalidad no se pudo leer, y entonces {@link
   * notaDelTotal} dice cuales faltan. No es cero y no se puede dibujar como
   * cero: un total al que le falta una municipalidad es un importe plausible y
   * equivocado.
   */
  readonly totalConsolidado: ImporteConFecha | undefined;
  readonly notaDelTotal: string;
  /** Si no figura en ninguna municipalidad activa del sistema. */
  readonly sinRegistros: boolean;
  readonly municipalidades: readonly EnLaMunicipalidad[];
}

/**
 * **La situacion que llego, ¿es la de este token?**
 *
 * Es la heredera directa de `identidadesQueCoinciden` y existe por el mismo
 * motivo, dicho para la forma nueva: quien responde puede equivocarse de
 * persona, y una situacion de otra persona **no se distingue de la correcta** —
 * trae un nombre, un codigo y unas cifras que existen—. El proxy de datos no
 * filtra y devuelve siempre el mismo cuerpo (ADR-0010); un fallo del backend
 * produciria lo mismo sin que nada se ponga rojo.
 *
 * Se compara el **numero**, no el documento formateado: el tipo viaja aparte
 * justamente para esto, y una diferencia de rotulo —«DNI», «02 — DNI»— no puede
 * convertirse en «esta no es tu situacion».
 */
export function esLaSituacionDe(situacion: SituacionDelCiudadano, numeroDelToken: string): boolean {
  const esperado = numeroDelToken.trim().toUpperCase();
  if (esperado === '') return false;
  return situacion.numeroDocumento.trim().toUpperCase() === esperado;
}

/**
 * Abre la respuesta. Falla ruidosamente si no es un objeto, por lo mismo que
 * `leerObjeto`: media pantalla mal dibujada es peor que un error que dice que la
 * respuesta no era la esperada.
 */
export function leerSituacion(cuerpo: unknown): SituacionDelCiudadano {
  if (!esObjeto(cuerpo)) {
    throw new Error('La respuesta del portal no trae un objeto.');
  }
  const municipalidades = Array.isArray(cuerpo['municipalidades']) ? cuerpo['municipalidades'] : [];
  return {
    tipoDocumento: typeof cuerpo['tipoDocumento'] === 'string' ? cuerpo['tipoDocumento'] : '',
    numeroDocumento: typeof cuerpo['numeroDocumento'] === 'string' ? cuerpo['numeroDocumento'] : '',
    aLaFecha: (typeof cuerpo['aLaFecha'] === 'string' ? cuerpo['aLaFecha'] : '') as Fecha,
    municipalidadesRecorridas:
      typeof cuerpo['municipalidadesRecorridas'] === 'number'
        ? cuerpo['municipalidadesRecorridas']
        : 0,
    totalConsolidado: importeDe(cuerpo['totalConsolidado']),
    // El guion no: aqui la ausencia de nota **significa** que si hay total, y
    // un «—» en su sitio se leeria como una nota vacia dibujada al lado del
    // importe.
    notaDelTotal: typeof cuerpo['notaDelTotal'] === 'string' ? cuerpo['notaDelTotal'] : '',
    sinRegistros: cuerpo['sinRegistros'] === true,
    municipalidades: municipalidades.filter(esObjeto).map(enLaMunicipalidad),
  };
}

function enLaMunicipalidad(fila: Readonly<Record<string, unknown>>): EnLaMunicipalidad {
  const resumen = esObjeto(fila['resumen'])
    ? fila['resumen']
    : esObjeto(fila['resumenDeSaldos'])
      ? fila['resumenDeSaldos']
      : {};
  const obligaciones = Array.isArray(fila['obligaciones']) ? fila['obligaciones'] : [];
  const predios = Array.isArray(fila['predios']) ? fila['predios'] : [];
  return {
    ubigeo: texto(fila['ubigeo']),
    nombre: texto(fila['nombre']),
    codigoContribuyente: texto(fila['codigoContribuyente']),
    nombreContribuyente: texto(fila['nombreContribuyente']),
    // De alta salvo que el servidor diga lo contrario: la marca de baja es la
    // afirmacion, y afirmarla por omision pondria «dado de baja» a todo el
    // mundo el dia que el campo faltara.
    activo: fila['activo'] !== false,
    resumen: {
      insoluto: importeDe(resumen['insoluto']),
      reajuste: importeDe(resumen['reajuste']),
      interes: importeDe(resumen['interes']),
      gasto: importeDe(resumen['gasto']),
      total: importeDe(resumen['total']),
      estadoDeLaConsulta: texto(resumen['estadoDeLaConsulta']),
    },
    obligaciones: obligaciones.filter(esObjeto).map((obligacion) => ({
      tributo: texto(obligacion['tributo']),
      ejercicio: texto(obligacion['ejercicio']),
      total: importeDe(obligacion['total']),
    })),
    predios: predios.filter(esObjeto).map((predio) => ({
      codigoReferenciaCatastral: texto(predio['codigoReferenciaCatastral']),
      tipo: texto(predio['tipo']),
      direccion: texto(predio['direccion']),
      // El porcentaje llega como texto decimal (regla 1) y se dibuja tal cual:
      // no se redondea ni se convierte a numero al leerlo.
      porcentajeTitularidad: texto(predio['porcentajeTitularidad']),
    })),
  };
}
