import type { Celda, TonoDeCelda } from '@sgtm/api-client';
import { definirConexion } from '../conexiones';
import type { Conexion } from '../conexiones';
import { parametrosDeBusqueda } from '../busqueda';
import { SIN_DATO, datosDe, leerPaginado, tablaDe, texto } from '../seguridad/listado';

/**
 * Valores · las seis opciones conectadas (#75).
 *
 * `GET /api/v1/valores` (#37) se conecta aqui para lectura, con paginacion y filtro de
 * verdad contra el servidor (#63). Las otras cinco escriben, y ninguna cabe en el
 * formulario plano de campo-a-campo que dibuja el renderizador generico:
 * `notificacion_valores` (`PeticionDeNotificacion`, un cuerpo plano) se declara en
 * `escrituras.ts` y se dibuja con `Pantalla.tsx`. Las cuatro restantes tienen **cuerpo
 * con arreglos, o una accion primaria que el catalogo no pone al final**, y viven en su
 * propio componente (`COMPONENTES_PROPIOS` de `Pantalla.tsx`), leyendo su lista blanca de
 * `escrituras.ts` igual que `ActualizacionDeCatastro`:
 *
 * - `valores_individual` (`GeneracionIndividualDeValores.tsx`): `RegistrarValor` exige
 *   `obligaciones: [{ tributo, ejercicio, predioId?, vehiculoId? }]` —un arreglo, aunque
 *   sea de un solo elemento—, y el catalogo dibuja un formulario plano (un tributo, un
 *   periodo). El componente mantiene esos dos campos en su propio estado y los
 *   sincroniza en una tabla de una fila (`OBLIGACION_UNICA`) cada vez que cambian.
 *   `predioId`/`vehiculoId` no viajan todavia: no hay resolutor que traduzca un codigo
 *   catastral o una placa a su identificador interno para esta pantalla (el de #331 es
 *   de `alta_deuda`, con su propio componente).
 * - `valores_masivo` (`GeneracionMasivaDeValores.tsx`): mismo problema de forma —
 *   `IniciarCorridaMasiva` exige `contribuyentes: string[]`, un codigo por elemento, no
 *   objetos—, resuelto con `TablaDelCuerpo.columnaUnica` (nuevo en `escritura.ts`): una
 *   tabla de una columna cuyo cuerpo es el arreglo de esos valores sueltos. Las «tres
 *   etapas» que #75 pide son preparar (los campos, sin ninguna peticion), revisar (un
 *   resumen de lo escrito, sin consultar al servidor) y emitir (el unico `POST`, que
 *   registra el criterio): `ValorMasivoResource` no trae candidatos porque la
 *   generacion corre aparte, en el perfil batch, asi que "revisar" no simula una
 *   consulta que el backend no publica —solo relee lo que se acaba de teclear—.
 *   `sector`, el monto minimo de emision y las dos exclusiones del catalogo no viajan:
 *   `PeticionDeValorMasivo` no tiene campo para ellos. La importacion de hoja de calculo
 *   (`archivoCsv`) tampoco se conecta: ninguna pantalla del sistema tiene todavia un
 *   control de archivo, y anadir uno aqui seria un componente escrito antes de que otra
 *   pantalla lo pida.
 * - `prescripcion` (`PrescripcionDeLaDeuda.tsx`): dos huecos de forma. `ejercicioDesde`/
 *   `ejercicioHasta` son dos enteros, y el catalogo dibuja un unico campo de texto libre
 *   («Ejercicios solicitados») que ningun `CampoDelCuerpo.valor` puede partir en dos
 *   campos; el componente dibuja dos selectores de ejercicio en su lugar.
 *   `actoDeInterrupcion`/`fechaDelUltimoActo` solo pueden viajar como el unico elemento
 *   de `hechos`, un arreglo (`HECHO_DE_INTERRUPCION`), aunque sea opcional: elegir
 *   «NINGUNO» sincroniza la tabla vacia, no `hechos: [{}]`.
 * - `pase_coactiva` (`PaseACoactiva.tsx`): su cuerpo (`PeticionDeMovimiento`) es tan
 *   plano como el de `notificacion_valores`, pero el catalogo dibuja sus acciones como
 *   `["Nuevo", "Modificar", "Generar", "Inactivar", "Imprimir"]` —la ultima es
 *   «Imprimir», que ni escribe ni es irreversible—, y el renderizador generico trata
 *   siempre la ultima accion como la primaria. Con una barra propia de una sola accion
 *   —«Derivar a coactiva», siempre la primaria y siempre irreversible— la confirmacion
 *   de #75 protege el acto de verdad. `tipoDeMovimiento` se fija en `PCO` sin preguntar:
 *   `ValoresController.mover` rechaza cualquier otro codigo desde esta ruta.
 *
 * `valores.test.tsx` prueba las seis: que ninguna ofrece borrar, que las cinco que
 * escriben confirman lo irreversible diciendo que va a pasar y sobre cuantos, que
 * emitir/generar/declarar/derivar dos veces es imposible sin una observacion nueva, y el
 * cuerpo exacto que cada una manda.
 */

/**
 * Los ejercicios del desplegable de `valores_masivo`, tal como el catalogo los dibuja
 * (2026 a 2020). `prescripcion` no tiene su propia lista —su unico campo del manual es
 * el texto libre «Ejercicios solicitados» (ver `PrescripcionDeLaDeuda.tsx`)— y comparte
 * esta para que sus dos selectores de ejercicio no inventen un rango distinto.
 */
export const EJERCICIOS_DEL_DESPLEGABLE = ['2026', '2025', '2024', '2023', '2022', '2021', '2020'];

/**
 * Como escribe el catalogo el tipo de valor en el filtro de busqueda —«ORDEN DE PAGO»,
 * «RES. DETERMINACIÓN», «RES. DE MULTA»— no es el codigo de tres letras que
 * `TipoValor.porCodigo` espera (`OP`, `RD`, `RM`, V26). Se traduce aqui, igual que
 * `tributoDe` en `escrituras.ts`; lo que no se reconoce —incluido «Todos»— no viaja: sin
 * filtro trae todos los tipos.
 */
const TIPO_DE_BUSQUEDA: Readonly<Record<string, string>> = {
  'ORDEN DE PAGO': 'OP',
  'RES. DETERMINACIÓN': 'RD',
  'RES. DE MULTA': 'RM',
};

const tipoDeBusquedaDe = (cruda: string | null): string | undefined =>
  cruda === null ? undefined : TIPO_DE_BUSQUEDA[cruda];

/**
 * Busqueda y mantenimiento de valores (RF-092, #37, #63).
 *
 * `ValorResource` no trae el tributo ni el periodo de la obligacion que formaliza —eso
 * vive en `ValorDetalle`, que este recurso no publica— ni la fecha de notificacion —eso
 * vive en `NotificacionResource`, un recurso aparte que esta busqueda no trae—, asi que
 * esas tres columnas del catalogo salen en `SIN_DATO` en vez de inventarse (RNF-083). El
 * «Estado» sí sale del recurso, tal cual lo nombra `EstadoDeValor`: no se reescribe a las
 * etiquetas del prototipo («Firme», «Reclamado»), que no son ningun valor del enum —la
 * firmeza es una fecha derivada de la notificacion, no un estado (`NotificacionResource
 * .exigibleDesde`), y el reclamo no tiene estado propio todavia—, y RNF-080 pide no
 * reescribir lo que el backend redacta.
 *
 * El filtro «Estado» del catalogo viaja igual que `zona`/`uso` en `arbitrios`: el
 * contrato lo declara como parametro de consulta, pero `ValoresController.buscar` todavia
 * no lo lee. Un filtro que el backend no aplica todavia, no uno que esta pantalla se
 * inventa (ADR-0010).
 */
const valores_busqueda = definirConexion({
  operacion: 'valores_busqueda',
  parametros: ({ busqueda }) => {
    const tipo = tipoDeBusquedaDe(busqueda.get('tipo'));
    return {
      ...parametrosDeBusqueda('valores_busqueda', undefined, busqueda),
      ...(tipo === undefined ? {} : { tipo }),
    };
  },
  leer: (cuerpo) => leerPaginado(cuerpo, 'los valores'),
  adaptar: (paginado) =>
    datosDe(
      tablaDe(
        paginado,
        (valor): readonly Celda[] => [
          { texto: texto(valor['numero']) },
          { texto: texto(valor['tipo']) },
          { texto: texto(valor['nombreContribuyente']) },
          // Tributo y periodo son de ValorDetalle, que este recurso no publica.
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          { texto: texto(valor['total']) },
          // La fecha de notificacion vive en NotificacionResource (#39), un recurso aparte
          // que esta busqueda no trae.
          { texto: SIN_DATO },
          estadoDe(valor['estado']),
        ],
        'valores',
      ),
    ),
});

/**
 * El tono es lo unico que esta pantalla anade al estado que manda el backend: el texto
 * es siempre el nombre literal de `EstadoDeValor`, nunca una etiqueta inventada.
 */
const TONO_DE_ESTADO: Readonly<Record<string, TonoDeCelda>> = {
  EMITIDO: 'warn',
  NOTIFICADO: 'warn',
  COACTIVA: 'bad',
  PAGADO: 'ok',
  ANULADO: 'bad',
  PRESCRITO: 'bad',
};

function estadoDe(cruda: unknown): Celda {
  const valor = texto(cruda);
  return valor === SIN_DATO ? { texto: SIN_DATO } : { texto: valor, tono: TONO_DE_ESTADO[valor] };
}

/**
 * Las opciones de Valores conectadas para **lectura**. `notificacion_valores` se conecta
 * para escritura en `escrituras.ts`, no aqui —una `Conexion` es solo para leer (ver
 * `conexiones.ts`)—.
 */
export const CONEXIONES_DE_VALORES: Readonly<Record<string, Conexion>> = {
  valores_busqueda,
};
