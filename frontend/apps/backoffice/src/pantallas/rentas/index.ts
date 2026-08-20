import type { Celda } from '@sgtm/api-client';
import { definirConexion } from '../conexiones';
import type { Conexion } from '../conexiones';
import { parametrosDeBusqueda } from '../busqueda';
import { SIN_DATO, datosDe, estado, leerPaginado, tablaDe, texto } from '../seguridad/listado';

/**
 * Rentas · Registro, conectado hasta donde llega el backend: **una de quince**.
 *
 * `GET /rentas/contribuyentes` es el unico endpoint del modulo publicado (#11).
 * Los predios, las declaraciones, las transferencias, los beneficios y las altas
 * y bajas esperan a #15, #24, #26, #27, #28 y #29; los tres calculos —predial,
 * arbitrios y vehicular— esperan ademas a D-02, y ese no lo desbloquea ningun
 * backend.
 */

/**
 * El padron de contribuyentes.
 *
 * Ocho columnas para un recurso que publica seis campos. Las dos que faltan son
 * las que mas se miran —**cuantos predios tiene y cuanto debe**— y las dos salen
 * vacias a proposito: los predios los tiene `catastro` y la deuda es
 * `deudaActualizadaA(fecha)` (#22), que no existe todavia. Componer aqui
 * cualquiera de las dos seria inventarse la respuesta a «¿cuanto debo?», que es
 * la pregunta que trae a la gente a la ventanilla.
 */
const contribuyentes = definirConexion({
  operacion: 'contribuyentes',
  parametros: ({ ruta, busqueda }) =>
    parametrosDeBusqueda('contribuyentes', ruta['codigo'], busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'los contribuyentes'),
  adaptar: (paginado) =>
    datosDe(
      tablaDe(
        paginado,
        (contribuyente): readonly Celda[] => {
          // El documento viaja como tipo y numero; la pantalla tiene una
          // columna para cada tipo, asi que el numero va a la que le toca.
          const esRuc = contribuyente['tipoDocumento'] === 'RUC';
          const numero = texto(contribuyente['numeroDocumento']);
          return [
            estado(contribuyente['activo'], 'A', 'I'),
            { texto: texto(contribuyente['codigo']) },
            { texto: texto(contribuyente['nombreRazonSocial']) },
            { texto: esRuc ? SIN_DATO : numero },
            { texto: esRuc ? numero : SIN_DATO },
            // El domicilio fiscal es #15; los predios, de catastro; la deuda,
            // de #22. Ninguna se compone aqui.
            { texto: SIN_DATO },
            { texto: SIN_DATO },
            { texto: SIN_DATO },
          ];
        },
        'contribuyentes',
      ),
    ),
});

/** Las opciones de Rentas ya conectadas. Crece cuando crezca su backend. */
export const CONEXIONES_DE_RENTAS: Readonly<Record<string, Conexion>> = { contribuyentes };
