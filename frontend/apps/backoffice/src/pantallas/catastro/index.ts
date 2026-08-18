import type { Celda } from '@sgtm/api-client';
import { definirConexion } from '../conexiones';
import type { Conexion, ContextoDePantalla } from '../conexiones';
import { parametrosDeBusqueda } from '../busqueda';
import { SIN_DATO, datosDe, estado, leerPaginado, tablaDe, texto } from '../seguridad/listado';

/**
 * Catastro, conectado hasta donde llega el backend: **una opcion de doce**.
 *
 * `GET /catastro/vias` es el unico endpoint de catastro publicado hoy (#16); las
 * cuatro fichas, la consulta de fichas, el historico y las tres tablas de
 * valuacion esperan a #17, #18, #19 y #20. Conectar aqui las once restantes
 * seria inventarse su respuesta en el proxy, que es exactamente lo que ADR-0010
 * decidio no hacer.
 */

const deLaBusqueda =
  (operacion: Parameters<typeof parametrosDeBusqueda>[0]) =>
  ({ ruta, busqueda }: ContextoDePantalla) =>
    parametrosDeBusqueda(operacion, ruta['codigo'], busqueda);

/**
 * El catalogo vial.
 *
 * El prototipo dibuja siete columnas y `ViaResource` publica cuatro: no trae
 * sector, ni zona de arancel, ni el arancel por metro cuadrado. Las tres salen
 * con «—», y la del arancel importa mas que las otras dos: es una **cifra**, y
 * una cifra inventada en la pantalla que alimenta la valuacion de un predio es
 * de las que acaban en un valor mal emitido. Que falte se ve; que este mal, no.
 */
const calles = definirConexion({
  operacion: 'calles',
  parametros: deLaBusqueda('calles'),
  leer: (cuerpo) => leerPaginado(cuerpo, 'las vias'),
  adaptar: (paginado) =>
    datosDe(
      tablaDe(
        paginado,
        (via): readonly Celda[] => [
          { texto: texto(via['codigo']) },
          { texto: texto(via['tipo']) },
          { texto: texto(via['nombre']) },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          // «Activa», en femenino: es una via. El manual lo escribe asi y la
          // pantalla es lo que lee quien atiende.
          estado(via['activa'], 'ACTIVA', 'INACTIVA'),
        ],
        'vías',
      ),
    ),
});

/** Las opciones de catastro ya conectadas. Crece cuando crezca su backend. */
export const CONEXIONES_DE_CATASTRO: Readonly<Record<string, Conexion>> = { calles };
