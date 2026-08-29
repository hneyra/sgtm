import { formatearFecha } from '@sgtm/dominio';
import type { ResumenDePantallaProps } from '../composicion';
import { CabeceraDeRegistro } from '../bloques/CabeceraDeRegistro';
import type { DatoDeCabecera } from '../bloques/CabeceraDeRegistro';
import { SIN_DATO } from '../seguridad/listado';
import {
  TRAMOS_DEL_CODIGO,
  esCodigoDeReferenciaCatastral,
  formatearCodigoCatastral,
  tramoDelCodigo,
} from './codigo';

/**
 * La cabecera-resumen de una ficha catastral (#319).
 *
 * **El lenguaje visual ya no vive aqui**: lo pone {@link CabeceraDeRegistro},
 * en `pantallas/bloques/` (#391 §4). Lo que queda en este archivo es lo que si
 * es de catastro —que el identificador es el codigo de referencia catastral y se
 * troquela en tramos, que la insignia dice si la version rige, y que la
 * conciliacion con rentas es un guion con motivo—. El territorio y el cuadro de
 * valuacion usan el mismo bloque con otro contenido, que es lo que demuestra que
 * la cabecera no era de este modulo.
 *
 * Una ficha son entre una y once pestanas de campos; quien la abre necesita
 * antes que nada saber **cual ficha esta viendo y de cuando es**. Eso ya estaba
 * en la pantalla, repartido: el codigo en la barra de direcciones, el uso en la
 * pestana de datos generales y la vigencia en el bloque de versionado, mas
 * abajo. Aqui se dice de una vez, arriba del todo.
 *
 * **No pide nada nuevo.** Los seis datos salen de lo que el adaptador ya trae:
 * el codigo de la ruta, el uso y el titular de los campos que compone
 * `catastro/index.ts`, y la vigencia del mismo `versionado` que dibuja el bloque
 * de historico. Una cabecera que necesitara otra peticion seria otra peticion
 * por ficha abierta, y no hay nada aqui que la justifique.
 *
 * **Seis y no cuatro desde #413**: el artboard de la propuesta A dibuja «Sector ·
 * manzana» y «Autovalúo», y los dos faltaban. Ninguno de los dos pide nada al
 * backend, y por motivos opuestos —ver {@link datosDeLaCabecera}—.
 *
 * Lo que el recurso no publica sale con «—», como en el resto del modulo:
 *
 *   titular          `FichaResource` no lo trae —lo tiene contribuyentes—, y
 *                    ponerle el de la consulta de fichas seria cruzar dos
 *                    respuestas distintas y llamarlo dato
 *   area construida  es la **suma** de los pisos, y la interfaz no suma
 *                    (RNF-083). El dia que el recurso publique el total, se
 *                    muestra; hasta entonces, el hueco dice a quien le toca
 *   autovaluo        no lo determina nadie todavia (D-02a). Va con su motivo,
 *                    como la conciliacion: un guion suelto en la rejilla se
 *                    leeria como «la ficha no lo trae»
 */
export function ResumenDeFicha({ codigo, datos, cargando }: ResumenDePantallaProps) {
  // Sin registro abierto no hay ficha que resumir. Lo decide la cabecera y no el
  // renderizador porque «cual es el registro» no es igual en todas: en catastro
  // es el parametro de la ruta y en el padron de contribuyentes es el filtro.
  if (codigo === undefined || codigo === '') return null;

  const campos = datos?.campos ?? {};
  const version = datos?.versionado?.actual;

  return (
    <CabeceraDeRegistro
      rotulo="Resumen de la ficha"
      identificador={formatearCodigoCatastral(codigo)}
      /* El estado nunca solo por color, y la version que rige va con desde
         cuando y de donde salio: esa apostilla **fecha la ficha entera**, que es
         por que ninguno de los datos de abajo lleva fecha propia —el titular, el
         uso y las areas son los de **esa** version, no los de hoy—. El unico que
         se declara `cifra` es el autovaluo, y precisamente para no ensenarse:
         llega sin fecha porque no lo determina nadie todavia (D-02a). */
      {...(version === undefined
        ? {}
        : {
            insignias: [
              {
                texto: version.vigente ? 'VIGENTE' : 'HISTÓRICA',
                tono: version.vigente ? ('ok' as const) : ('neutro' as const),
              },
            ],
            apostilla: `v${version.version} · desde ${formatearFecha(version.vigenciaDesde)} · ${
              version.origen === '' ? SIN_DATO : version.origen
            }`,
          })}
      datos={datosDeLaCabecera(codigo, campos)}
      cargando={cargando}
    >
      <LineaDeConciliacion />
      <LineaDeAutovaluo />
    </CabeceraDeRegistro>
  );
}

/**
 * Los seis datos de la rejilla, **sin montar nada**.
 *
 * Se exporta por lo mismo que `seccionesDeLaPestana`: aqui vive el reparto, y
 * una prueba que lo mire de frente no necesita levantar la ficha entera. Las
 * cuatro primeras salen del adaptador; las dos que anadio #413 no piden nada, y
 * conviene decir por que cada una:
 *
 *   sector · manzana  **son dos tramos del codigo de referencia catastral**, que
 *                     es el identificador con que se abrio la ficha. No hay dato
 *                     que pedir: es leer lo que ya se tiene, con el mismo
 *                     troquel que usa el compositor —por el **nombre** del
 *                     tramo, nunca por su posicion, que es lo que D-10 tiene
 *                     abierto—. Un identificador que no sea un codigo de
 *                     referencia catastral —la unidad catastral rural,
 *                     `11024-0418`— sale «—»: repartirlo en estos tramos diria
 *                     de el algo que no es cierto
 *   autovaluo         **no lo publica nadie** (D-02a). Va declarado `cifra` con
 *                     la fecha en blanco a proposito: asi la regla 9 la sostiene
 *                     el tipo y no un comentario —el dia que llegue la cifra,
 *                     quien la ponga tiene que traer su `aLaFecha` o
 *                     {@link CabeceraDeRegistro} la sigue dibujando «—»—
 */
export function datosDeLaCabecera(
  codigo: string,
  campos: Readonly<Record<string, unknown>>,
): readonly DatoDeCabecera[] {
  return [
    { etiqueta: 'Titular', valor: texto(campos['nombreDelContribuyente']) },
    { etiqueta: 'Uso', valor: texto(campos['uso2']) },
    { etiqueta: 'Área de terreno', valor: texto(campos['areaTotalHa']) },
    /* **Y sigue en «—» a proposito** (RNF-083). `FichaResource` publica
       `areaTerreno` y **no** `areaConstruida`: la unica que la publica es
       `FichaEncontradaResource`, la del listado de «Consulta de fichas», y la
       trae **ya sumada desde el servidor** (#290). Aqui la ficha carga sus
       construcciones piso a piso —118.50 y 46.00 en el juego de datos—, asi que
       sumarlas seria componer una cifra en la interfaz, que es exactamente lo
       que RNF-083 prohibe: la suma la publica el backend o no la hace nadie. */
    { etiqueta: 'Área construida', valor: SIN_DATO },
    { etiqueta: 'Sector · manzana', valor: sectorYManzana(codigo) },
    { etiqueta: 'Autovalúo', valor: SIN_DATO, cifra: true, aLaFecha: '' },
  ];
}

/** Como se separan los dos tramos al leerlos juntos. Del artboard: «01 · 015». */
const ENTRE_TRAMOS = ' · ';

/**
 * El sector y la manzana **del propio codigo**, o «—».
 *
 * Los dos tramos tienen que venir **completos**. Un codigo a medio componer es
 * una busqueda por prefijo legitima (`codigo.ts`), y ahi la manzana llega corta:
 * pintar «01 · 0» diria que el predio esta en la manzana 0, que es otra manzana.
 */
export function sectorYManzana(codigo: string): string {
  if (!esCodigoDeReferenciaCatastral(codigo)) return SIN_DATO;
  const sector = tramoDelCodigo(codigo, 'sector');
  const manzana = tramoDelCodigo(codigo, 'manzana');
  return completo('sector', sector) && completo('manzana', manzana)
    ? `${sector}${ENTRE_TRAMOS}${manzana}`
    : SIN_DATO;
}

/** Si lo escrito ocupa el tramo entero, con la longitud que declara la plantilla. */
const completo = (nombre: string, escrito: string): boolean =>
  escrito.length === TRAMOS_DEL_CODIGO.find((tramo) => tramo.nombre === nombre)?.longitud;

/**
 * «Conciliación con rentas: — · rentas no publica todavía si reconoce este
 * predio» (#322, ADR-0015).
 *
 * **El sujeto es «rentas», el mismo que en el aviso de la consulta de fichas**
 * (revision de #322). Decia «el padrón», y no es sinonimo para quien lee: en
 * este sistema hay un padron de predios —que es de catastro— y un padron de
 * contribuyentes, y quien atiende no tiene por que deducir que aqui se hablaba
 * del padron afecto de rentas. Las dos pantallas hablan de lo mismo; tienen que
 * nombrarlo igual.
 *
 * Es la consecuencia mas cara del modulo y la mas invisible: **un predio que
 * rentas no reconoce no genera deuda predial**. Quien abre una ficha no puede
 * saberlo hoy, y el hueco no estaba ni dicho: la ficha se leia entera sin que
 * nada mencionara que su predio pudiera estar fuera del padron afecto.
 *
 * Va aqui y no como un dato mas de la lista por lo mismo que la deuda del
 * contribuyente (#330): **no es un campo que falte, es una lectura que no
 * existe**. Un guion en la lista se leeria como «la ficha no lo trae»; un guion
 * explicado dice que nadie lo publica todavia, que es lo cierto.
 *
 * No se inventa el dato ni el mecanismo:
 *
 *   por que «—»    «conciliada» es un derivado —existe una declaracion jurada
 *                  de ese ejercicio sobre **el predio**
 *                  (`declaracion_jurada.predio_id`, V2), en estado PRESENTADA u
 *                  OBSERVADA— y la lectura que lo compone le toca a
 *                  `sgtm-rentas`: catastro no puede consultarlo sin cerrar el
 *                  ciclo que `verificarArquitectura` rechaza
 *   cuando llegue   sera **insignia con texto** —«CONCILIADA» / «SIN
 *                  DECLARACION»—, nunca solo color (FRO-02 §2.1), con el mismo
 *                  `Insignia` que esta cabecera ya usa para la vigencia, y
 *                  **con su ejercicio** (regla 9): la DJ de 2024 no concilia
 *                  2026. No hay hueco que preparar: el componente esta, y lo que
 *                  falta es el dato
 *   que hacer      conciliar es **registrar la declaracion jurada**. Hoy ese
 *                  registro se hace por el procedimiento actual: la opcion del
 *                  sistema es solo `GET` (ADR-0015 §3). Eso lo dice el aviso de
 *                  la consulta de fichas, que es donde se eligen los predios;
 *                  aqui solo se mira uno
 */
function LineaDeConciliacion() {
  return (
    <p className="sgtm-resumen__pendiente">
      <strong>Conciliación con rentas: {SIN_DATO}</strong> · rentas no publica todavía si reconoce
      este predio.
    </p>
  );
}

/**
 * «Autovalúo: — · todavía no hay ninguna determinación…» (#413, D-02a).
 *
 * Es la cifra que todo el mundo viene a buscar en una ficha, y por eso el guion
 * de la rejilla no se puede quedar solo: **suelto se lee como «la ficha no lo
 * trae»**, que es la misma trampa que la conciliacion de aqui al lado. Lo cierto
 * es lo contrario —no lo trae **nadie**—, y las dos mitades de por que importan:
 *
 *   por que «—»    ninguna determinacion del ejercicio esta calculada todavia
 *                  (D-02a): el conjunto de parametros con las cifras reales no
 *                  esta sellado, y sin el no hay autovaluo que publicar. No es
 *                  que `FichaResource` se lo deje: es que no existe
 *   por que no se  el autovaluo es terreno + edificacion − depreciacion, con el
 *   compone aqui   arancel y los valores unitarios del ejercicio. Componerlo con
 *                  lo que se ve en pantalla seria calcular un tributo en el
 *                  navegador (RNF-083, regla 5, regla 6), y esa cifra acaba en
 *                  el sustento de una determinacion
 */
function LineaDeAutovaluo() {
  return (
    <p className="sgtm-resumen__pendiente">
      <strong>Autovalúo: {SIN_DATO}</strong> · todavía no hay ninguna determinación de este
      ejercicio que lo calcule, y no se compone aquí con lo que se ve en pantalla.
    </p>
  );
}

const texto = (valor: unknown): string =>
  typeof valor === 'string' && valor !== '' ? valor : SIN_DATO;
