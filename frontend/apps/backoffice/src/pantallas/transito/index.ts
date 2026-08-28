import type { Celda, DatosDePantalla, TonoDeCelda } from '@sgtm/api-client';
import { definirConexion } from '../conexiones';
import type { Conexion } from '../conexiones';
import { parametrosDeBusqueda } from '../busqueda';
import { SIN_DATO, datosDe, leerPaginado, tablaDe, texto } from '../seguridad/listado';

/**
 * Tránsito, conectado hasta donde llega el backend: **una opción de veintitrés** (#363).
 *
 * `papeletas` (`GET /transito/papeletas`, #46 — `PapeletasController`) es la única con
 * `Controller` de verdad que la ficha 360° compone (#297, `pestanas.ts`). Hasta aquí salía
 * por el camino común —el proxy sirve `RESPUESTAS['papeletas']` sin envolver, y esa forma no
 * es la de `PapeletaResource`—, así que una forma equivocada del backend real no fallaría
 * ruidosamente: la tabla saldría vacía en silencio (issue #363).
 *
 * **`PapeletaResource` no publica ni la mitad de lo que dibuja el prototipo.** Es un registro
 * congelado del acta física (su propio javadoc: los seis importes «se toman tal cual del acta
 * física al registrar»), y no lleva el nombre del infractor —solo `infractorId`, una llave—,
 * ni el código de infracción —solo `codigoInfraccionId`, que tampoco viaja—, ni una gravedad:
 * `Papeleta` no modela ese campo en ningún lado. Las tres columnas salen con {@link SIN_DATO},
 * igual que `consulta_vehiculos` deja «Base imponible S/» vacía por el mismo motivo: no
 * inventar lo que el recurso no tiene (RNF-083).
 */

/**
 * El tono del estado, con el vocabulario real de `EstadoDePapeleta` (V4) y no el del
 * prototipo: «Pendiente», «Con descargo» y compañía son etiquetas del catálogo, y el recurso
 * publica el nombre literal del enum —`IMPUESTA`, `NOTIFICADA`, `RESUELTA`, `PAGADA`,
 * `COACTIVA`, `ANULADA`, `PRESCRITA`—, sin reescribirlo (RNF-080).
 *
 * `RESUELTA` queda sin tono: puede significar que el descargo prosperó o que se desestimó, y
 * el recurso no distingue cuál de las dos fue — un color aquí sería una afirmación que la
 * papeleta no hace.
 */
const TONO_DEL_ESTADO_DE_PAPELETA: Readonly<Record<string, TonoDeCelda>> = {
  IMPUESTA: 'warn',
  NOTIFICADA: 'warn',
  PAGADA: 'ok',
  COACTIVA: 'bad',
  ANULADA: 'bad',
  PRESCRITA: 'bad',
};

function estadoDePapeletaCelda(cruda: unknown): Celda {
  const nombre = texto(cruda);
  const tono = TONO_DEL_ESTADO_DE_PAPELETA[nombre];
  return tono === undefined ? { texto: nombre } : { texto: nombre, tono };
}

/**
 * Papeletas de infracción de tránsito (RF-060, #46, #363).
 *
 * `leer` valida el sobre paginado que publica `RespuestaPaginada<PapeletaResource>` —falla
 * nombrando la operación si el cuerpo no lo trae (`leerPaginado`)— y `adaptar` traduce cada
 * fila con los nombres del recurso, no con los del catálogo del prototipo.
 */
const papeletas = definirConexion({
  operacion: 'papeletas',
  parametros: ({ busqueda }) => parametrosDeBusqueda('papeletas', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'las papeletas de tránsito'),
  adaptar: (paginado): DatosDePantalla =>
    datosDe(
      tablaDe(
        paginado,
        (papeleta): readonly Celda[] => [
          { texto: texto(papeleta['numero']) },
          { texto: texto(papeleta['fechaInfraccion']) },
          { texto: texto(papeleta['placa']) },
          // Infractor: el recurso solo publica `infractorId` (una llave), no un nombre.
          { texto: SIN_DATO },
          // Código: `codigoInfraccionId` no viaja en `PapeletaResource`.
          { texto: SIN_DATO },
          // Gravedad: no existe ese campo en `Papeleta` ni en su recurso.
          { texto: SIN_DATO },
          { texto: texto(papeleta['importeAPagar']) },
          estadoDePapeletaCelda(papeleta['estado']),
        ],
        'papeletas',
      ),
    ),
});

/** Las opciones de Tránsito conectadas. Crece cuando crezca su backend. */
export const CONEXIONES_DE_TRANSITO: Readonly<Record<string, Conexion>> = {
  papeletas,
};
