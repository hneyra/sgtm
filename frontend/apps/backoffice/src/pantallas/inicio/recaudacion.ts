import type { DatosDePantalla } from '@sgtm/api-client';
import type { Fecha } from '@sgtm/dominio';
import { definirConexion } from '../conexiones';
import { esObjeto } from '../seguridad/listado';

/**
 * Panel de recaudacion: la primera opcion con operacion propia.
 *
 * `GET /indicadores/recaudacion` no devuelve «los datos de una pantalla»:
 * devuelve **el avance de la recaudacion de un ejercicio**, que es un recurso
 * del dominio con su fecha de corte, sus indicadores y su cartera pendiente por
 * tributo. Que hoy quepa en los bloques del renderizador es una coincidencia
 * afortunada, no una propiedad del recurso.
 *
 * Este archivo es el primero de `pantallas/<modulo>/`, tal como anticipa
 * `frontend/README.md`: **aparece cuando una opcion necesita codigo propio, y
 * no antes**.
 */

/**
 * Una cifra del panel.
 *
 * `cifra` es texto **ya redactado por el backend** (RNF-080): «S/ 18.42 M»,
 * «73,4 %». No es un `Importe`, y por eso no se llama asi: sobre un importe se
 * podria hacer aritmetica, y sobre esto no hay nada que hacer mas que pintarlo.
 */
export interface IndicadorDeRecaudacion {
  readonly concepto: string;
  readonly cifra: string;
  readonly nota: string;
}

export interface LineaDeCartera {
  readonly concepto: string;
  readonly detalle: string;
  readonly cifra: string;
  /** Avance en porcentaje, 0-100. Lo calcula el backend, no la barra (RNF-083). */
  readonly avance: number;
}

export interface CarteraDeRecaudacion {
  readonly titulo: string;
  readonly nota: string;
  readonly lineas: readonly LineaDeCartera[];
}

/** El recurso: el avance de la recaudacion de un ejercicio, a una fecha. */
export interface AvanceDeRecaudacion {
  /**
   * Fecha a la que estan actualizadas las cifras (regla 9, RNF-075). Va primero
   * y es obligatoria: no existe «lo recaudado», existe lo recaudado a una fecha.
   */
  readonly fechaCalculo: Fecha;
  readonly indicadores: readonly IndicadorDeRecaudacion[];
  readonly carteras: readonly CarteraDeRecaudacion[];
}

/* ── La frontera ───────────────────────────────────────────────────────────
   El contrato declara la operacion pero todavia no describe su cuerpo: los
   esquemas se escriben cuando cada backend existe (#61). Hasta entonces la
   respuesta llega como `CuerpoSinEsquema` y **se valida aqui**, en un solo
   sitio. El dia que el backend sirva su recurso, esto es lo unico que cambia:
   el adaptador ya trabaja sobre el dominio. */

const texto = (valor: unknown): string => (typeof valor === 'string' ? valor : '');

const numero = (valor: unknown): number => (typeof valor === 'number' ? valor : 0);

const lista = (valor: unknown): readonly unknown[] => (Array.isArray(valor) ? valor : []);

export function leerAvanceDeRecaudacion(cuerpo: unknown): AvanceDeRecaudacion {
  if (!esObjeto(cuerpo)) {
    throw new Error('El panel de recaudacion respondio algo que no es un objeto.');
  }

  const fechaCalculo = cuerpo['fechaCalculo'];
  if (typeof fechaCalculo !== 'string' || fechaCalculo === '') {
    // Sin fecha de corte la cifra no se puede mostrar honestamente (RNF-075):
    // se para aqui en vez de pintar un numero sin fecha.
    throw new Error(
      'El panel de recaudacion respondio cifras sin la fecha a la que estan actualizadas.',
    );
  }

  return {
    fechaCalculo,
    indicadores: lista(cuerpo['kpis'])
      .filter(esObjeto)
      .map((indicador) => ({
        concepto: texto(indicador['label']),
        cifra: texto(indicador['value']),
        nota: texto(indicador['note']),
      })),
    carteras: lista(cuerpo['paneles'])
      .filter(esObjeto)
      .map((cartera) => ({
        titulo: texto(cartera['title']),
        nota: texto(cartera['note']),
        lineas: lista(cartera['rows'])
          .filter(esObjeto)
          .map((linea) => ({
            concepto: texto(linea['label']),
            detalle: texto(linea['sub']),
            cifra: texto(linea['value']),
            avance: numero(linea['pct']),
          })),
      })),
  };
}

/* ── El adaptador ──────────────────────────────────────────────────────────
   Puro: recurso del dominio → lo que dibujan los bloques. Sin HTTP, sin reloj y
   sin aritmetica. La fecha de calculo viaja con las cifras porque el tipo de
   salida la exige: un adaptador que la perdiera no compila (RNF-075). */

export function adaptarAvanceDeRecaudacion(recurso: AvanceDeRecaudacion): DatosDePantalla {
  return {
    fechaCalculo: recurso.fechaCalculo,
    kpis: recurso.indicadores.map((indicador) => ({
      label: indicador.concepto,
      value: indicador.cifra,
      note: indicador.nota,
    })),
    paneles: recurso.carteras.map((cartera) => ({
      title: cartera.titulo,
      note: cartera.nota,
      rows: cartera.lineas.map((linea) => ({
        label: linea.concepto,
        sub: linea.detalle,
        value: linea.cifra,
        pct: linea.avance,
      })),
    })),
  };
}

/**
 * La conexion de la opcion `inicio`.
 *
 * El ejercicio sale de la URL y **entra en la clave de cache**: el panel de
 * 2025 y el de 2026 son dos respuestas distintas, y compartirlas mostraria
 * cifras de un ano como si fueran de otro. Sin ejercicio en la URL, el
 * parametro no viaja y el que manda es el del backend.
 */
export const conexionDeRecaudacion = definirConexion({
  operacion: 'inicio',
  parametros: ({ busqueda }) => ({ ejercicio: busqueda.get('ejercicio') ?? undefined }),
  leer: (cuerpo) => leerAvanceDeRecaudacion(cuerpo),
  adaptar: adaptarAvanceDeRecaudacion,
});
