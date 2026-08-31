import { Esqueleto } from '@sgtm/design-system';
import type { ValorDeCampo } from '@sgtm/api-client';
import type { CampoDePantalla } from '../../catalogo';
import type { MemoriaDeSeccion } from '../composicion';

/**
 * Una seccion de campos de solo lectura, leida **como la memoria de un
 * calculo** (#393).
 *
 * Es el paso 2 del marco de las cinco pantallas de determinacion: el sujeto
 * arriba, la cuenta en el medio, el acto abajo. La cuenta se lee de una pasada
 * —etiqueta, operacion, importe— en vez de repartida en trece cajas con borde
 * discontinuo, que es como se dibujaba un campo `"ro"` y como se dibujan las
 * cinco secciones que declaran esto.
 *
 * **Ni una cifra se compone aqui** (RNF-083, regla 9). Cada linea es el valor
 * que sirvio la API para la clave que el catalogo declara. Lo unico que hace la
 * interfaz es partir por la flecha que el propio valor trae:
 *
 *   `S/ 80,250.00 → S/ 160.50`   →   operacion «S/ 80,250.00», importe «S/ 160.50»
 *   `151,406.75`                 →   importe «151,406.75», sin operacion
 *
 * Un valor que no llego sale con «—», igual que en un campo: lo que distingue
 * «no llego» de «vale cero» sigue siendo el guion, y esta pantalla no lo
 * rellena.
 *
 * **Y no escribe.** Una seccion declarada como memoria es, en las cinco, de
 * campos `"ro"`; si alguna trajera un campo escribible, dibujarlo aqui lo
 * volveria texto y lo tecleado se perderia sin decirlo. Por eso
 * {@link MemoriaDeCalculoProps.campos} recibe **solo** los que no se escriben,
 * y `Formulario` deja los demas en su rejilla de siempre.
 */
export interface MemoriaDeCalculoProps {
  /** Los campos de la seccion, en el orden del catalogo. */
  readonly campos: readonly CampoDePantalla[];
  /** Lo que sirvio la API, por clave de campo. */
  readonly valores: Readonly<Record<string, ValorDeCampo>>;
  readonly cargando: boolean;
  /** Lo que la opcion declaro de esta seccion: cual de sus campos es el resultado. */
  readonly memoria: MemoriaDeSeccion;
}

/** Lo que se pinta cuando el servidor no mando esa clave. El mismo de las tablas. */
const SIN_DATO = '—';

/**
 * La flecha con la que el prototipo escribe «esta base, por esta alicuota, da
 * esto». Es un caracter del **valor**, no una convencion que la interfaz
 * imponga: partir por el es presentacion, no aritmetica.
 */
const FLECHA = '→';

interface LineaDeMemoria {
  readonly clave: string;
  readonly etiqueta: string;
  readonly operacion: string | undefined;
  readonly importe: string;
}

function linea(
  campo: CampoDePantalla,
  valores: Readonly<Record<string, ValorDeCampo>>,
): LineaDeMemoria {
  const valor = valores[campo.clave];
  const texto = typeof valor === 'string' ? valor.trim() : '';
  if (texto === '') {
    return { clave: campo.clave, etiqueta: campo.label, operacion: undefined, importe: SIN_DATO };
  }
  const corte = texto.indexOf(FLECHA);
  if (corte < 0) {
    return { clave: campo.clave, etiqueta: campo.label, operacion: undefined, importe: texto };
  }
  return {
    clave: campo.clave,
    etiqueta: campo.label,
    operacion: texto.slice(0, corte).trim(),
    importe: texto.slice(corte + FLECHA.length).trim(),
  };
}

export function MemoriaDeCalculo({ campos, valores, cargando, memoria }: MemoriaDeCalculoProps) {
  if (cargando) return <Esqueleto alto={220} />;

  const total = memoria.total;
  const pasos = campos.filter((campo) => campo.clave !== total);
  const resultado = total === undefined ? undefined : campos.find((campo) => campo.clave === total);

  return (
    <div className="sgtm-memoria">
      <dl className="sgtm-memoria__lineas">
        {pasos.map((campo) => {
          const { clave, etiqueta, operacion, importe } = linea(campo, valores);
          return (
            <div className="sgtm-memoria__linea" key={clave}>
              <dt className="sgtm-memoria__etiqueta">{etiqueta}</dt>
              {/* Las dos mitades van **dentro del mismo `dd`**, y no una en un
                  `span` suelto entre `dt` y `dd`: eso ultimo no es una lista de
                  definiciones valida, y lo que se pierde no es la validacion
                  sino el emparejamiento —el lector de pantalla lee el termino y
                  su definicion, y un nodo entre medias no pertenece a
                  ninguno—. Asi se oye la cuenta entera, en orden, y se ve en
                  dos columnas. */}
              <dd className="sgtm-memoria__valor">
                {operacion !== undefined && (
                  <span className="sgtm-memoria__operacion">{operacion}</span>
                )}
                <span className="sgtm-memoria__importe">{importe}</span>
              </dd>
            </div>
          );
        })}
      </dl>
      {resultado !== undefined && (
        <div className="sgtm-memoria__resultado">
          <span className="sgtm-memoria__resultado-etiqueta">{resultado.label}</span>
          <span className="sgtm-memoria__resultado-valor">{linea(resultado, valores).importe}</span>
        </div>
      )}
    </div>
  );
}
