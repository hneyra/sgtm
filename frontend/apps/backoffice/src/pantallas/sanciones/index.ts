import type { Celda, DatosDePantalla } from '@sgtm/api-client';
import { definirConexion } from '../conexiones';
import type { Conexion } from '../conexiones';
import { parametrosDeBusqueda } from '../busqueda';
import { SIN_DATO, datosDe, leerPaginado, tablaDe, texto } from '../seguridad/listado';

/**
 * Infracciones administrativas, conectado hasta donde llega el backend: **una opción de
 * dieciocho** (#363).
 *
 * `adm_estado_cuenta` (`GET /infracciones/administrativas/estado-cuenta`,
 * `EstadoDeCuentaAdministrativoController`, #47) es la que la ficha 360° compone (#297,
 * `pestanas.ts`). **OJO con la ruta**: el manual de #363 la cita como
 * `/administrativas/estado-cuenta`, pero el contrato —y el controlador— la publican bajo
 * `/infracciones/administrativas/estado-cuenta`; se verificó contra `operaciones.generado.ts`
 * y contra el `@RequestMapping` de verdad antes de conectar.
 *
 * El controlador sirve el **mismo** `PapeletaResource` que `papeletas` (`../transito`),
 * filtrado a `Familia.ADMINISTRATIVA` y a lo todavía pendiente
 * (`CriterioDePapeleta.soloPendientes`). Su propio javadoc lo dice: «el reajuste, el interés y
 * los gastos que describe el contrato no salen de aquí: dependen de tesorería, que todavía no
 * publica su cálculo de deuda actualizada». Por eso «Interés S/» y «Gastos S/» —y con ellos
 * «Total S/», que no se compone sumando cifras que faltan (RNF-083)— salen con {@link SIN_DATO}
 * y no con un cero, que se leería como «esta papeleta no debe intereses ni gastos», y eso no es
 * lo que dice el recurso.
 */

/**
 * Una papeleta administrativa, con solo lo que `PapeletaResource` publica.
 *
 * «Concepto», «Cuota» y «Vencimiento» son las tres columnas de una papeleta que el prototipo
 * dibujó pensando en un desglose de cuotas, y el recurso real es una fila por papeleta, sin
 * descripción propia —solo su número, que esta tabla no declara como columna— ni fecha de
 * vencimiento ni fraccionamiento en cuotas. Las tres salen vacías, y no con el número de la
 * papeleta puesto donde no le corresponde.
 */
const adm_estado_cuenta = definirConexion({
  operacion: 'adm_estado_cuenta',
  parametros: ({ busqueda }) => parametrosDeBusqueda('adm_estado_cuenta', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'el estado de cuenta de la papeleta administrativa'),
  adaptar: (paginado): DatosDePantalla =>
    datosDe(
      tablaDe(
        paginado,
        (papeleta): readonly Celda[] => [
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          // Insoluto: «lo que corresponde pagar, sin beneficio» (javadoc de
          // `Papeleta#importeAPagar`) es exactamente lo que «Insoluto» nombra.
          { texto: texto(papeleta['importeAPagar']) },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
        ],
        'papeletas administrativas',
      ),
    ),
});

/** Las opciones de Infracciones administrativas conectadas. Crece cuando crezca su backend. */
export const CONEXIONES_DE_SANCIONES: Readonly<Record<string, Conexion>> = {
  adm_estado_cuenta,
};
