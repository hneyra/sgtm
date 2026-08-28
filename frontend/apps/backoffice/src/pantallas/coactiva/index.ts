import type { Celda, DatosDePantalla, TonoDeCelda } from '@sgtm/api-client';
import type { Fecha } from '@sgtm/dominio';
import { definirConexion } from '../conexiones';
import type { Conexion } from '../conexiones';
import { parametrosDeBusqueda } from '../busqueda';
import { SIN_DATO, esObjeto, hoy, leerPaginado, tablaDe, texto } from '../seguridad/listado';

/**
 * Valores y coactiva, conectado hasta donde llega el backend: **una opción de doce** (#363).
 *
 * `coactiva_expedientes` (`GET /coactiva/expedientes`, `ExpedienteController`, #40) es la que
 * la ficha 360° compone (#297, `pestanas.ts`) y también la que dibuja su propia pantalla del
 * catálogo. Antes de esta conexión salía por el camino común: el proxy servía
 * `RESPUESTAS['coactiva_expedientes']` sin envolver, y una forma que no fuera esa —la que
 * publica de verdad `ExpedienteResource`— habría dejado la tabla vacía en silencio, no fallada
 * en voz alta (issue #363).
 *
 * **Cada cifra a su fecha (regla 9, RNF-075).** `ExpedienteResource` no lleva una fecha por
 * importe —a diferencia de `ImporteActualizado`—, sino **una** para las siete cifras de deuda
 * del expediente: `deudaAlDia`. `fechaCalculo` sale de ahí, con la misma fecha de todas las filas
 * de la página, no del reloj del navegador.
 */

/**
 * El tono del estado, con las siete etiquetas de `EstadoDelExpediente` (V33) — «INICIADO»,
 * «REC 01 EMITIDO», «REC 01 NOTIFICADA», «REC 02 EMITIDA», «MEDIDA CAUTELAR», «SUSPENDIDO» y
 * «CONCLUIDO»—, no las del filtro del prototipo (`porNombre` ya traduce «CON MEDIDA CAUTELAR»
 * a la etiqueta real antes de que esta pantalla la vea). El texto es siempre el que redacta el
 * backend (RNF-080); esto solo decide el color.
 */
const TONO_DEL_ESTADO_DEL_EXPEDIENTE: Readonly<Record<string, TonoDeCelda>> = {
  INICIADO: 'warn',
  'REC 01 EMITIDO': 'warn',
  'REC 01 NOTIFICADA': 'warn',
  'REC 02 EMITIDA': 'warn',
  'MEDIDA CAUTELAR': 'bad',
  SUSPENDIDO: 'warn',
  CONCLUIDO: 'ok',
};

function estadoDelExpedienteCelda(cruda: unknown): Celda {
  const nombre = texto(cruda);
  const tono = TONO_DEL_ESTADO_DEL_EXPEDIENTE[nombre];
  return tono === undefined ? { texto: nombre } : { texto: nombre, tono };
}

/** La fecha a la que están las siete cifras de deuda de cualquier fila: todas comparten la misma. */
function fechaDeExpedientesDe(expedientes: readonly unknown[]): Fecha {
  let mayor: string | undefined;
  for (const expediente of expedientes) {
    if (!esObjeto(expediente)) continue;
    const deudaAlDia = expediente['deudaAlDia'];
    if (typeof deudaAlDia === 'string' && (mayor === undefined || deudaAlDia > mayor)) {
      mayor = deudaAlDia;
    }
  }
  return (mayor ?? hoy()) as Fecha;
}

/**
 * Expedientes coactivos (RF-100, #40, #363).
 *
 * `leer` valida el sobre paginado que publica `RespuestaPaginada<ExpedienteResource>` —falla
 * nombrando la operación si el cuerpo no lo trae (`leerPaginado`)— y `adaptar` traduce cada
 * fila con los nombres del recurso.
 *
 * «Medida cautelar» sale con {@link SIN_DATO}: el recurso no publica una descripción de la
 * medida trabada —tipo, bien afectado, tercero retenedor—, solo el `estado` del expediente, que
 * ya dice «MEDIDA CAUTELAR» en la última columna cuando corresponde. Repetirlo aquí como una
 * palabra suelta no añadiría el dato que la columna promete.
 */
const coactiva_expedientes = definirConexion({
  operacion: 'coactiva_expedientes',
  parametros: ({ busqueda }) => parametrosDeBusqueda('coactiva_expedientes', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'los expedientes coactivos'),
  adaptar: (paginado): DatosDePantalla => {
    const tabla = tablaDe(
      paginado,
      (expediente): readonly Celda[] => [
        { texto: texto(expediente['numero']) },
        { texto: texto(expediente['codContribuyente']) },
        { texto: texto(expediente['valores']) },
        { texto: texto(expediente['deudaMateriaDeCobranza']) },
        { texto: texto(expediente['costas']) },
        { texto: SIN_DATO },
        estadoDelExpedienteCelda(expediente['estado']),
      ],
      'expedientes',
    );

    return {
      fechaCalculo: fechaDeExpedientesDe(paginado.contenido),
      tabla,
    };
  },
});

/** Las opciones de Valores y coactiva conectadas. Crece cuando crezca su backend. */
export const CONEXIONES_DE_COACTIVA: Readonly<Record<string, Conexion>> = {
  coactiva_expedientes,
};
