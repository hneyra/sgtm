import { useRef } from 'react';
import type { ClipboardEvent, KeyboardEvent } from 'react';

/**
 * El codigo de referencia catastral **se compone, no se teclea** (RF-005, #318).
 *
 * Es la direccion fisica del predio dentro del territorio, y con el se emparejan
 * la ficha catastral, la determinacion y la deuda. Escrito como una cadena
 * suelta, un digito de mas o de menos no se ve al teclearlo: se ve cuando dos
 * predios colisionan o cuando un padron entero deja de cuadrar con el catastro.
 * Repartido en sus tramos con su nombre, la posicion equivocada se ve mientras
 * se escribe.
 *
 * **La composicion es la del backend, no una copia.** Los tramos y sus
 * longitudes salen de `ComposicionCatastral.DEL_MANUAL`
 * (`backend/sgtm-dominio-compartido/.../ComposicionCatastral.java`), que es la
 * plantilla `DDPPddSSMMMLLLEEeeppUUU` del manual: **diez tramos, 23 posiciones**
 * —el ubigeo, departamento/provincia/distrito, va delante de sector—.
 * `codigo-catastral.test.tsx` lee ese archivo y exige que las dos listas
 * coincidan tramo a tramo: separarlas es exactamente el defecto que la clase
 * Java evita al recibir la composicion en vez de cablearla.
 *
 * **D-10 sigue abierta**: la plantilla del manual da 23 y los ejemplos del
 * prototipo traen 21. Por eso aqui no se rellena con ceros ni se exige la
 * longitud completa: lo que se compone es la concatenacion de lo escrito, y unos
 * tramos finales en blanco son una **busqueda por prefijo**, que es lo que el
 * backend ya resuelve por rango (`~>=~` / `~<~`, y no `LIKE`, por RLS).
 *
 * **Compone un solo valor de cadena**, el mismo que viaja hoy: la URL y el
 * contrato quedan intactos. De ahi sale la unica regla que conviene saber para
 * usarlo: el codigo es un **prefijo posicional y se llena de izquierda a
 * derecha**, sin huecos. Borrar un digito en un tramo del medio corre los de su
 * derecha, y escribir en el sexto tramo con los cinco primeros vacios escribe el
 * primer digito del codigo, porque eso es lo que significa esa cadena. La
 * alternativa —guardar diez cajas por separado y mandar su concatenacion—
 * ensenaria un codigo en pantalla y mandaria otro distinto.
 */

export interface TramoDelCodigo {
  /** Nombre del tramo en `ComposicionCatastral`. */
  readonly nombre: string;
  /** Como se rotula en la pantalla. */
  readonly etiqueta: string;
  readonly longitud: number;
}

/**
 * Los diez tramos de `ComposicionCatastral.DEL_MANUAL`, en su orden.
 *
 * Si D-10 se cierra en las 21 posiciones del prototipo, se cambia **la clase
 * Java** y esta lista detras; la prueba que las compara es lo que impide que
 * cambie solo una de las dos.
 */
export const TRAMOS_DEL_CODIGO: readonly TramoDelCodigo[] = [
  { nombre: 'departamento', etiqueta: 'Depto.', longitud: 2 },
  { nombre: 'provincia', etiqueta: 'Prov.', longitud: 2 },
  { nombre: 'distrito', etiqueta: 'Distrito', longitud: 2 },
  { nombre: 'sector', etiqueta: 'Sector', longitud: 2 },
  { nombre: 'manzana', etiqueta: 'Manzana', longitud: 3 },
  { nombre: 'lote', etiqueta: 'Lote', longitud: 3 },
  { nombre: 'edificacion', etiqueta: 'Edif.', longitud: 2 },
  { nombre: 'entrada', etiqueta: 'Entrada', longitud: 2 },
  { nombre: 'piso', etiqueta: 'Piso', longitud: 2 },
  { nombre: 'unidad', etiqueta: 'Unidad', longitud: 3 },
];

/** Posiciones que ocupa el codigo completo: 23 con la plantilla del manual. */
export const LONGITUD_DEL_CODIGO = TRAMOS_DEL_CODIGO.map((t) => t.longitud).reduce(
  (total, largo) => total + largo,
  0,
);

/** Solo digitos: un codigo catastral no lleva letras ni guiones (RF-005). */
export const soloDigitos = (texto: string): string => texto.replace(/[^0-9]/g, '');

/**
 * Reparte un codigo en sus tramos, de izquierda a derecha y sin rellenar.
 *
 * Es el inverso exacto de concatenar: pegar 21 digitos deja los dos ultimos
 * tramos a medias y `componerDeTramos` devuelve los mismos 21. Por eso el valor
 * que viaja al filtro es identico al que se pego.
 */
export function repartirEnTramos(valor: string): readonly string[] {
  const digitos = soloDigitos(valor).slice(0, LONGITUD_DEL_CODIGO);
  const tramos: string[] = [];
  let desde = 0;
  for (const tramo of TRAMOS_DEL_CODIGO) {
    tramos.push(digitos.slice(desde, desde + tramo.longitud));
    desde += tramo.longitud;
  }
  return tramos;
}

/** El codigo que componen unos tramos: su concatenacion, sin separadores. */
export const componerDeTramos = (tramos: readonly string[]): string => tramos.join('');

/**
 * El codigo con guiones entre tramos, para leerlo de un vistazo.
 *
 * Troquela **lo mismo que reparte el componente**, y por eso admite codigos mas
 * cortos que la plantilla: los ejemplos del prototipo traen 21 posiciones y la
 * plantilla del manual da 23 —eso es D-10, y sigue abierta—, asi que exigir la
 * longitud completa dejaria sin troquelar justo los codigos que hay.
 *
 * Lo que **no** troquela es lo que no es un codigo catastral: la unidad
 * catastral rural (`11024-0418`) lleva guion y letras posibles, y meterla en
 * esta plantilla diria de ella algo que no es cierto. Sale tal cual.
 */
export function formatearCodigoCatastral(valor: string): string {
  const limpio = valor.trim();
  if (limpio === '' || limpio.length > LONGITUD_DEL_CODIGO || soloDigitos(limpio) !== limpio) {
    return valor;
  }
  return repartirEnTramos(limpio)
    .filter((tramo) => tramo !== '')
    .join('-');
}

export interface CodigoCatastralProps {
  /** Rotulo del conjunto: el que trae el catalogo para ese campo. */
  readonly etiqueta: string;
  readonly valor: string;
  readonly onCambio: (valor: string) => void;
}

export function CodigoCatastral({ etiqueta, valor, onCambio }: CodigoCatastralProps) {
  const tramos = repartirEnTramos(valor);
  const cajas = useRef<(HTMLInputElement | null)[]>([]);

  const enfocar = (indice: number, alFinal = false): void => {
    const caja = cajas.current[Math.max(0, Math.min(indice, TRAMOS_DEL_CODIGO.length - 1))];
    if (!caja) return;
    caja.focus();
    if (alFinal) caja.setSelectionRange(caja.value.length, caja.value.length);
  };

  /** Que tramo ocupa la posicion `indice` del codigo. */
  const tramoDeLaPosicion = (posicion: number): number => {
    let desde = 0;
    for (let i = 0; i < TRAMOS_DEL_CODIGO.length; i++) {
      desde += TRAMOS_DEL_CODIGO[i]?.longitud ?? 0;
      if (posicion < desde) return i;
    }
    return TRAMOS_DEL_CODIGO.length - 1;
  };

  /** Reemplaza desde el tramo `indice` en adelante y devuelve el codigo entero. */
  const conTramo = (indice: number, digitos: string): string =>
    (
      componerDeTramos(tramos.slice(0, indice)) +
      digitos +
      componerDeTramos(tramos.slice(indice + 1))
    ).slice(0, LONGITUD_DEL_CODIGO);

  return (
    /* Un `fieldset` y no diez campos sueltos: los diez son **un** dato, y quien
       navega con lector de pantalla tiene que oir de que codigo son los tramos. */
    <fieldset
      className="sgtm-campo sgtm-campo--ancho sgtm-codigo"
      onCopy={(evento: ClipboardEvent<HTMLFieldSetElement>) => {
        // Copiar desde cualquier tramo copia el codigo entero: nadie quiere
        // llevarse «01» al portapapeles.
        evento.preventDefault();
        evento.clipboardData.setData('text/plain', componerDeTramos(tramos));
      }}
    >
      <legend className="sgtm-campo__etiqueta">{etiqueta}</legend>
      <div className="sgtm-codigo__tramos">
        {TRAMOS_DEL_CODIGO.map((tramo, indice) => (
          <label key={tramo.nombre} className="sgtm-codigo__tramo">
            <span className="sgtm-codigo__nombre">{tramo.etiqueta}</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              size={tramo.longitud}
              className="sgtm-codigo__caja"
              value={tramos[indice] ?? ''}
              aria-label={`${etiqueta} · ${tramo.etiqueta}`}
              ref={(caja) => {
                cajas.current[indice] = caja;
              }}
              onChange={(evento) => {
                const escrito = soloDigitos(evento.target.value);
                const antes = tramos[indice] ?? '';
                onCambio(conTramo(indice, escrito));
                // Un tramo lleno salta al siguiente. Solo al llenarse: si no,
                // corregir el ultimo digito mandaria el foco lejos en cada tecla.
                if (escrito.length >= tramo.longitud && antes.length < tramo.longitud) {
                  enfocar(indice + 1);
                }
              }}
              onPaste={(evento) => {
                const pegado = soloDigitos(evento.clipboardData.getData('text'));
                if (pegado === '') return;
                // Pegar el codigo entero lo reparte: se escribe desde este tramo
                // hacia adelante, con o sin guiones en lo que venia pegado.
                evento.preventDefault();
                const prefijo = componerDeTramos(tramos.slice(0, indice));
                const compuesto = (prefijo + pegado).slice(0, LONGITUD_DEL_CODIGO);
                onCambio(compuesto);
                enfocar(tramoDeLaPosicion(compuesto.length - 1), true);
              }}
              onKeyDown={(evento: KeyboardEvent<HTMLInputElement>) => {
                const caja = evento.currentTarget;
                const alPrincipio = caja.selectionStart === 0 && caja.selectionEnd === 0;
                const alFinal =
                  caja.selectionStart === caja.value.length &&
                  caja.selectionEnd === caja.value.length;
                if (evento.key === 'Backspace' && caja.value === '' && indice > 0) {
                  evento.preventDefault();
                  enfocar(indice - 1, true);
                } else if (evento.key === 'ArrowLeft' && alPrincipio && indice > 0) {
                  evento.preventDefault();
                  enfocar(indice - 1, true);
                } else if (
                  evento.key === 'ArrowRight' &&
                  alFinal &&
                  indice < TRAMOS_DEL_CODIGO.length - 1
                ) {
                  evento.preventDefault();
                  enfocar(indice + 1);
                }
              }}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
