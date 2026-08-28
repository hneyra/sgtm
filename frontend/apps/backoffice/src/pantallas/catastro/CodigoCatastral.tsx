import { useRef, useId } from 'react';
import type { ClipboardEvent, KeyboardEvent } from 'react';
import {
  LONGITUD_DEL_CODIGO,
  TRAMOS_DEL_CODIGO,
  componerDeTramos,
  repartirEnTramos,
  soloDigitos,
} from './codigo';

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
 * Los tramos, su reparto y el formato viven en `./codigo`, **sin JSX**: los
 * necesita tambien la conexion de catastro, que no puede importar React.
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

export interface CodigoCatastralProps {
  /** Rotulo del conjunto: el que trae el catalogo para ese campo. */
  readonly etiqueta: string;
  readonly valor: string;
  readonly onCambio: (valor: string) => void;
}

export function CodigoCatastral({ etiqueta, valor, onCambio }: CodigoCatastralProps) {
  const idDeLaRegla = useId();
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
      {/* La regla que la vista no ensena: los diez tramos componen UN codigo,
          asi que escribir en un tramo con los anteriores vacios escribe desde
          el inicio. Oculto a la vista, presente para el lector de pantalla. */}
      <span id={idDeLaRegla} className="sgtm-codigo__regla">
        Los tramos componen un solo código: escribir en un tramo con los anteriores vacíos
        escribe desde el inicio del código.
      </span>
      <div className="sgtm-codigo__tramos">
        {TRAMOS_DEL_CODIGO.map((tramo, indice) => (
          <label key={tramo.nombre} className="sgtm-codigo__tramo">
            <span className="sgtm-codigo__nombre">{tramo.etiqueta}</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              size={tramo.longitud}
              maxLength={tramo.longitud}
              className="sgtm-codigo__caja"
              value={tramos[indice] ?? ''}
              aria-label={`${etiqueta} · ${tramo.etiqueta}`}
              aria-describedby={idDeLaRegla}
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
