import type { Celda, TonoDeCelda } from '@sgtm/api-client';
import { definirConexion } from '../conexiones';
import type { Conexion } from '../conexiones';
import { parametrosDeBusqueda } from '../busqueda';
import { SIN_DATO, datosDe, leerPaginado, tablaDe, texto } from '../seguridad/listado';

/**
 * Valores · conectado hasta donde llega el backend: **una opcion de seis** (#75).
 *
 * `GET /api/v1/valores` (#37) se conecta para lectura, con paginacion y filtro de verdad
 * contra el servidor (#63): es la unica de las seis que hoy tiene un `Controller`
 * que la sirve. Las otras cinco quedan fuera de este PR, y no por descuido:
 *
 * - `valores_individual` (`POST /valores`, #37 ya tiene su `Controller`): el cuerpo que
 *   `RegistrarValor` exige es `{ tipo, codContribuyente, obligaciones: [{ tributo,
 *   ejercicio, predioId?, vehiculoId? }], observacion }` — `obligaciones` es un arreglo,
 *   aunque sea de un solo elemento. La pantalla que dibuja el catalogo es un formulario
 *   **plano** (un `tributo`, un `periodo`), y `escrituras.ts` solo sabe declarar campos
 *   sueltos hacia el cuerpo (`CampoDelCuerpo`): no hay forma de expresar ahi «estos tres
 *   campos son el unico elemento de un arreglo». `alta_deuda` (#24, #73) resolvio el mismo
 *   problema de raiz distinta —su backend acepta una `cuota` entera, no un arreglo— asi
 *   que su solucion (una entrada mas en la lista blanca) no sirve aqui. Conectarla de
 *   verdad es la misma pieza que le falta a `permisos`/`actualizacion_catastro`: un
 *   `cuerpo` a medida, pero esas dos se escriben con su propio componente, y
 *   `valores_individual` todavia se dibuja con el renderizador generico
 *   (`Pantalla.tsx`), que no pasa ningun `cuerpo` — solo `campos`.
 * - `valores_masivo` (`POST /valores/masivo`, #38 ya tiene su `Controller`): el mismo
 *   problema de forma, mas uno de fondo. `IniciarCorridaMasiva` solo acepta **seleccion
 *   explicita** (`contribuyentes: string[]`) o **archivo importado** (`archivoCsv`,
 *   base64) — nunca un filtro amplio. El catalogo dibuja «Criterios de seleccion» como si
 *   fuera eso: tributo, sector, monto minimo de emision, exclusiones — ninguno de los
 *   cuales `IniciarCorridaMasiva` sabe leer. Y aunque se resolviera la forma, **no hay
 *   tercera etapa que conectar todavia**: `ValorMasivoResource` (la respuesta de este
 *   mismo `POST`) lo dice en su propio javadoc — "no trae los valores emitidos [...] lo
 *   que hasta ahi se emite se consulta con valores_busqueda" —, y `valores_busqueda` no
 *   tiene ningun filtro por corrida. No existe today un `GET` que deje **revisar antes de
 *   emitir**: la unica forma de saber cuantos candidatos hay es haber registrado ya el
 *   criterio, que es exactamente el paso que #75 pide poder deshacer con «Cancelar».
 *   Construir las «tres etapas» sobre esto seria simular una revision que el backend
 *   todavia no ofrece.
 * - `notificacion_valores`, `prescripcion`, `pase_coactiva`: #39 sigue en progreso —
 *   `sgtm-coactiva` (de donde saldria `prescripcion`) todavia es solo un
 *   `package-info.java`, y `ValoresController` no tiene ningun `@PostMapping` para
 *   `notificacion` ni `movimientos`. Nada que conectar: no hay `Controller` que
 *   responda.
 *
 * Ninguna de las cinco esta bloqueada por falta de UI generica: el renderizador comun ya
 * cumple lo que #75 pide de todas ellas —sin boton de borrar, confirmacion diciendo que
 * va a pasar y sobre cuantos, una tanda que no se puede emitir dos veces sin nueva
 * observacion— y eso ya lo prueba `valores.test.tsx` contra las seis, conectadas o no.
 */

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
 * es #39—, asi que esas tres columnas del catalogo salen en `SIN_DATO` en vez de
 * inventarse (RNF-083). El «Estado» sí sale del recurso, tal cual lo nombra
 * `EstadoDeValor`: no se reescribe a las etiquetas del prototipo («Firme», «Reclamado»)
 * porque esos dos no son ningun valor del enum —la firmeza y el reclamo todavia no tienen
 * estado propio (#39)—, y RNF-080 pide no reescribir lo que el backend redacta.
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
          // La notificacion es #39: todavia no existe ningun campo que la traiga.
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

/** Las opciones de Valores ya conectadas. Crece cuando crezca su backend (#39). */
export const CONEXIONES_DE_VALORES: Readonly<Record<string, Conexion>> = {
  valores_busqueda,
};
