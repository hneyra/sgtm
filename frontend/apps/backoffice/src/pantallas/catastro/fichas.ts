import type { DatosDeVersionado, ValorDeCampo, Version } from '@sgtm/api-client';
import type { Fecha } from '@sgtm/dominio';
import { SIN_DATO } from '../seguridad/listado';

/**
 * La frontera de las cuatro fichas: el cuerpo que manda el backend, leido una
 * sola vez.
 *
 * Las cuatro comparten recurso —`FichaResource` de #18 y #19— y se diferencian
 * en cual de los tres bloques de detalle viene relleno. Eso es lo que este
 * archivo separa: el sobre se abre aqui, y cada pantalla pone lo suyo.
 *
 * **Los tres bloques son nulos salvo el que toca**, y esa distincion se
 * conserva: una ficha rural no publica un bloque economico vacio, asi que
 * «este predio no declara actividad» y «esta ficha no es de las que la
 * declaran» no se confunden.
 */

const esObjeto = (valor: unknown): valor is Readonly<Record<string, unknown>> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor);

const texto = (valor: unknown): string => (typeof valor === 'string' ? valor : '');

const lista = (valor: unknown): readonly unknown[] => (Array.isArray(valor) ? valor : []);

/** Una construccion: medidas y **categorias**, cero importes (regla 5, D-02a). */
export interface Construccion {
  readonly piso: string;
  readonly areaConstruida: string;
  readonly anioConstruccion?: number;
  readonly material?: string;
  readonly estadoConservacion?: string;
  /** `A B C B A C B` — las siete categorias del cuadro de valores unitarios. */
  readonly categorias: string;
}

/** La ficha del predio, con su version. Lo que el backend publica y nada mas. */
export interface Ficha {
  readonly tipo: string;
  readonly areaTerreno: string;
  readonly uso: string;
  readonly denominacion?: string;
  readonly construcciones: readonly Construccion[];
  readonly economico?: Readonly<Record<string, unknown>>;
  readonly bienesComunes?: Readonly<Record<string, unknown>>;
  readonly rural?: Readonly<Record<string, unknown>>;
  readonly versionado: DatosDeVersionado;
}

function versionDe(cuerpo: Readonly<Record<string, unknown>>): Version {
  const hasta = cuerpo['vigenciaHasta'];
  const usuario = cuerpo['usuario'];
  const registrada = cuerpo['registradaEn'];
  return {
    version: typeof cuerpo['version'] === 'number' ? cuerpo['version'] : 0,
    vigenciaDesde: texto(cuerpo['vigenciaDesde']) as Fecha,
    ...(typeof hasta === 'string' && hasta !== '' ? { vigenciaHasta: hasta as Fecha } : {}),
    vigente: cuerpo['vigente'] === true,
    origen: texto(cuerpo['origen']),
    documentoOrigen: texto(cuerpo['documentoOrigen']),
    observacion: texto(cuerpo['observacion']),
    ...(typeof usuario === 'string' && usuario !== '' ? { usuario } : {}),
    ...(typeof registrada === 'string' && registrada !== '' ? { registradaEn: registrada } : {}),
  };
}

export function leerFicha(cuerpo: unknown, que: string): Ficha {
  if (!esObjeto(cuerpo)) throw new Error(`La ficha ${que} respondio algo que no es un objeto.`);

  const vigenciaDesde = cuerpo['vigenciaDesde'];
  if (typeof vigenciaDesde !== 'string' || vigenciaDesde === '') {
    // Sin vigencia no se puede decir de cuando es lo que se muestra, y una
    // ficha sin eso no se puede mostrar honestamente (regla 9, RNF-075).
    throw new Error(`La ficha ${que} respondio sin la fecha desde la que rige.`);
  }

  const historico = cuerpo['historico'];
  const economico = cuerpo['economico'];
  const comunes = cuerpo['bienesComunes'];
  const rural = cuerpo['rural'];
  const denominacion = cuerpo['denominacion'];

  return {
    tipo: texto(cuerpo['tipo']),
    areaTerreno: texto(cuerpo['areaTerreno']),
    uso: texto(cuerpo['uso']),
    ...(typeof denominacion === 'string' && denominacion !== '' ? { denominacion } : {}),
    construcciones: lista(cuerpo['construcciones'])
      .filter(esObjeto)
      .map((construccion) => ({
        piso: texto(construccion['piso']),
        areaConstruida: texto(construccion['areaConstruida']),
        ...(typeof construccion['anioConstruccion'] === 'number'
          ? { anioConstruccion: construccion['anioConstruccion'] }
          : {}),
        ...(typeof construccion['material'] === 'string'
          ? { material: construccion['material'] }
          : {}),
        ...(typeof construccion['estadoConservacion'] === 'string'
          ? { estadoConservacion: construccion['estadoConservacion'] }
          : {}),
        categorias: texto(construccion['categorias']),
      })),
    ...(esObjeto(economico) ? { economico } : {}),
    ...(esObjeto(comunes) ? { bienesComunes: comunes } : {}),
    ...(esObjeto(rural) ? { rural } : {}),
    versionado: {
      actual: versionDe(cuerpo),
      // Ausente cuando no se pidio; nunca vacio cuando si.
      ...(Array.isArray(historico) ? { historico: historico.filter(esObjeto).map(versionDe) } : {}),
    },
  };
}

/** Un campo del formulario, salvo cuando el recurso no lo publica. */
export const campo = (valor: string | undefined): ValorDeCampo =>
  valor === undefined || valor === '' ? SIN_DATO : valor;
