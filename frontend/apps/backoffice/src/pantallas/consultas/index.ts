import type { Celda, DatosDePantalla } from '@sgtm/api-client';
import type { Fecha } from '@sgtm/dominio';
import { definirConexion } from '../conexiones';
import type { Conexion } from '../conexiones';
import { parametrosDeBusqueda } from '../busqueda';
import { SIN_DATO, leerPaginado, tablaDe, texto } from '../seguridad/listado';

/**
 * Consultas, conectado hasta donde llega el backend: **una opcion de once**.
 *
 * `GET /consultas/cuenta-corriente/{codigo}` es el unico endpoint del modulo
 * publicado (#21); las otras diez esperan a #22, #24 y #25.
 *
 * Es la pantalla del **libro de asientos**, y eso decide como se dibuja: cargos,
 * abonos y reversiones en orden, sin nada que ofrezca modificar una linea. Si la
 * interfaz permitiera editar un asiento contradiria el modelo —el backend no
 * hace `UPDATE` sobre el libro—, y quien la use se llevaria una idea equivocada
 * de lo que el sistema garantiza.
 */

/**
 * Un importe con su fecha, tal como lo publica `ImporteActualizado`.
 *
 * Los dos juntos o ninguno: una cifra sin fecha es una cifra que dentro de tres
 * dias es otra (regla 9, RNF-075). Se lee asi y no como dos campos sueltos
 * porque asi es como el backend impide que se separen.
 */
interface ImporteConFecha {
  readonly importe: string;
  readonly actualizadoA: Fecha;
}

const esObjeto = (valor: unknown): valor is Readonly<Record<string, unknown>> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor);

function importeDe(valor: unknown): ImporteConFecha | undefined {
  if (!esObjeto(valor)) return undefined;
  const importe = valor['importe'];
  const actualizadoA = valor['actualizadoA'];
  if (typeof importe !== 'string' || typeof actualizadoA !== 'string') return undefined;
  return { importe, actualizadoA: actualizadoA as Fecha };
}

/**
 * El estado de cuenta: el libro, con una fila por asiento.
 *
 * **Un asiento es un importe y un tipo, no tres columnas.** El prototipo dibuja
 * «Emitido», «Pagado» y «Saldo»; el recurso publica un `monto` y un `tipo`, asi
 * que el monto va a la columna que le toca —cargo a emitido, abono a pagado— y
 * el saldo sale vacio. Restar aqui produciria una cifra que el backend no puede
 * sustentar (RNF-083), y el saldo proyectado es #23, que sigue bloqueado.
 */
const cuenta_corriente = definirConexion({
  operacion: 'cuenta_corriente',
  parametros: ({ ruta, busqueda }) => ({
    codigo: ruta['codigo'] ?? '',
    ...parametrosDeBusqueda('cuenta_corriente', ruta['codigo'], busqueda),
  }),
  leer: (cuerpo) => leerPaginado(cuerpo, 'el estado de cuenta'),
  adaptar: (paginado): DatosDePantalla => {
    const tabla = tablaDe(
      paginado,
      (asiento): readonly Celda[] => {
        const monto = importeDe(asiento['monto']);
        const esAbono = asiento['tipo'] === 'ABONO';
        return [
          { texto: texto(asiento['ejercicio']) },
          { texto: texto(asiento['tributo']) },
          { texto: texto(asiento['predioId'] ?? asiento['vehiculoId']) },
          { texto: texto(asiento['periodo']) },
          { texto: esAbono ? SIN_DATO : (monto?.importe ?? SIN_DATO) },
          { texto: esAbono ? (monto?.importe ?? SIN_DATO) : SIN_DATO },
          // El saldo es el proyectado (#23) y no se compone restando.
          { texto: SIN_DATO },
          { texto: texto(asiento['fase']) },
        ];
      },
      'asientos',
    );

    return {
      // La fecha de la pantalla es la del asiento mas reciente: es a lo que
      // estan actualizadas las cifras que se ven, y sale del backend —no del
      // reloj del navegador, que diria «hoy» sobre datos de anteayer—.
      fechaCalculo: masReciente(paginado.contenido),
      tabla,
      // Los cuatro totales los calcula el backend a partir del saldo proyectado
      // (#23). Vacios mientras no exista: un cero seria una cifra, y un total
      // compuesto aqui seria una cifra que nadie puede sustentar.
      totales: [
        { label: 'Deuda insoluta', value: SIN_DATO },
        { label: 'Reajuste e interés', value: SIN_DATO },
        { label: 'Costas y gastos', value: SIN_DATO },
        { label: 'Saldo total', value: SIN_DATO },
      ],
    };
  },
});

/** La fecha del asiento mas reciente. Sin asientos, no hay cifras que fechar. */
function masReciente(asientos: readonly unknown[]): Fecha {
  let mayor: string | undefined;
  for (const asiento of asientos) {
    if (!esObjeto(asiento)) continue;
    const monto = importeDe(asiento['monto']);
    if (monto !== undefined && (mayor === undefined || monto.actualizadoA > mayor)) {
      mayor = monto.actualizadoA;
    }
  }
  return (mayor ?? new Date().toISOString().slice(0, 10)) as Fecha;
}

/** Las opciones de Consultas ya conectadas. Crece cuando crezca su backend. */
export const CONEXIONES_DE_CONSULTAS: Readonly<Record<string, Conexion>> = { cuenta_corriente };
