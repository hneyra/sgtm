import { formatearFecha } from '@sgtm/dominio';
import type { ResumenDePantallaProps } from '../composicion';
import { CabeceraDeRegistro } from '../bloques/CabeceraDeRegistro';
import type { DatoDeCabecera } from '../bloques/CabeceraDeRegistro';
import { SIN_DATO } from '../seguridad/listado';
import { formatearCodigoCatastral } from './codigo';

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
 * **No pide nada nuevo.** Las cuatro cosas salen de lo que el adaptador ya trae:
 * el codigo de la ruta, el uso y el titular de los campos que compone
 * `catastro/index.ts`, y la vigencia del mismo `versionado` que dibuja el bloque
 * de historico. Una cabecera que necesitara otra peticion seria otra peticion
 * por ficha abierta, y no hay nada aqui que la justifique.
 *
 * Lo que el recurso no publica sale con «—», como en el resto del modulo:
 *
 *   titular          `FichaResource` no lo trae —lo tiene contribuyentes—, y
 *                    ponerle el de la consulta de fichas seria cruzar dos
 *                    respuestas distintas y llamarlo dato
 *   area construida  es la **suma** de los pisos, y la interfaz no suma
 *                    (RNF-083). El dia que el recurso publique el total, se
 *                    muestra; hasta entonces, el hueco dice a quien le toca
 */
export function ResumenDeFicha({ codigo, datos, cargando }: ResumenDePantallaProps) {
  // Sin registro abierto no hay ficha que resumir. Lo decide la cabecera y no el
  // renderizador porque «cual es el registro» no es igual en todas: en catastro
  // es el parametro de la ruta y en el padron de contribuyentes es el filtro.
  if (codigo === undefined || codigo === '') return null;

  const campos = datos?.campos ?? {};
  const version = datos?.versionado?.actual;
  const datosDeLaFicha: readonly DatoDeCabecera[] = [
    { etiqueta: 'Titular', valor: texto(campos['nombreDelContribuyente']) },
    { etiqueta: 'Uso', valor: texto(campos['uso2']) },
    { etiqueta: 'Área de terreno', valor: texto(campos['areaTotalHa']) },
    // La suma de las areas por piso la haria el backend o no la hace nadie.
    { etiqueta: 'Área construida', valor: SIN_DATO },
  ];

  return (
    <CabeceraDeRegistro
      rotulo="Resumen de la ficha"
      identificador={formatearCodigoCatastral(codigo)}
      /* El estado nunca solo por color, y la version que rige va con desde
         cuando y de donde salio: esa apostilla **fecha la ficha entera**, que es
         por que ninguno de los cuatro datos de abajo lleva fecha propia. */
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
      datos={datosDeLaFicha}
      cargando={cargando}
    >
      <LineaDeConciliacion />
    </CabeceraDeRegistro>
  );
}

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

const texto = (valor: unknown): string =>
  typeof valor === 'string' && valor !== '' ? valor : SIN_DATO;
