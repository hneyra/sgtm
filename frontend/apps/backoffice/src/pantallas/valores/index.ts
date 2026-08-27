import type { Celda, TonoDeCelda } from '@sgtm/api-client';
import { definirConexion } from '../conexiones';
import type { Conexion } from '../conexiones';
import { parametrosDeBusqueda } from '../busqueda';
import { SIN_DATO, datosDe, leerPaginado, tablaDe, texto } from '../seguridad/listado';

/**
 * Valores · conectado hasta donde llega el backend: **dos opciones de seis** (#75).
 *
 * `GET /api/v1/valores` (#37) se conecta aqui para lectura, con paginacion y filtro de
 * verdad contra el servidor (#63). `notificacion_valores`, que tambien tiene `Controller`
 * desde #39, se conecta para **escritura** en `escrituras.ts`, no aqui: su cuerpo
 * (`PeticionDeNotificacion`) es plano, y eso es exactamente lo que ese archivo sabe
 * declarar. Las cuatro restantes quedan fuera de este PR, y no por descuido:
 *
 * - `pase_coactiva` (`POST /valores/{numero}/movimientos`, #39 ya tiene su `Controller`):
 *   su cuerpo (`PeticionDeMovimiento`) es tan plano como el de `notificacion_valores` —
 *   `tipoDeMovimiento`, `fechaDelMovimiento`, `observacion`—, pero el catalogo dibuja las
 *   acciones de esta pantalla como `["Nuevo", "Modificar", "Generar", "Inactivar",
 *   "Imprimir"]`, y `BarraDeAcciones` trata **la ultima** como la primaria que escribe y
 *   pide confirmacion solo si `esIrreversible` reconoce su etiqueta. Aqui la ultima es
 *   «Imprimir», que ni escribe de verdad en ninguna otra pantalla ni es irreversible: si
 *   se declarara esta escritura, pulsar «Imprimir» pasaria el valor a coactiva **sin
 *   ninguna confirmacion**, justo lo que #75 pide evitar ("se confirma diciendo que se va
 *   a hacer... no con un «¿esta seguro?»" — y menos con nada). Conectarla de verdad
 *   necesita antes que el catalogo (o un adaptador de acciones) ponga la accion que
 *   escribe al final, no que se declare en `escrituras.ts` tal como esta.
 * - `prescripcion` (`POST /coactiva/prescripcion`, #39 ya tiene su `Controller` — vive en
 *   `sgtm-valores`, no en `sgtm-coactiva`, aunque su ruta diga `coactiva`): dos huecos de
 *   forma, no uno. `PeticionDePrescripcion` pide `ejercicioDesde`/`ejercicioHasta` como
 *   dos enteros separados, y el catalogo dibuja un unico campo de texto libre
 *   («Ejercicios solicitados»): partir «2021-2026» en dos numeros no es una traduccion de
 *   valor (`CampoDelCuerpo.valor` devuelve una cadena, no dos campos). Y `actoDeInterrupcion`
 *   /`fechaDelUltimoActo` solo pueden viajar como un elemento de `hechos` —un arreglo,
 *   igual que `obligaciones` en `valores_individual`—, aunque aqui sea opcional (una
 *   prescripcion sin interrupciones ni suspensiones es una peticion valida: `hechos:
 *   List.of()` por omision).
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
 *   tiene ningun filtro por corrida. No existe todavia un `GET` que deje **revisar antes
 *   de emitir**: la unica forma de saber cuantos candidatos hay es haber registrado ya el
 *   criterio, que es exactamente el paso que #75 pide poder deshacer con «Cancelar».
 *   Construir las «tres etapas» sobre esto seria simular una revision que el backend
 *   todavia no ofrece.
 *
 * Ninguna de las cuatro esta bloqueada por falta de UI generica: el renderizador comun ya
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
