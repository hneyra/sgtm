import { Esqueleto, Insignia } from '@sgtm/design-system';
import type { Celda } from '@sgtm/api-client';
import type { ResumenDePantallaProps } from '../composicion';
import { SIN_DATO } from '../seguridad/listado';

/**
 * La cabecera-resumen de la declaracion jurada (#330).
 *
 * `GET /rentas/declaraciones/{djNro}` trae **una** declaracion, y el catalogo la
 * dibuja como si fuera un padron de resultados: una tabla de ocho columnas para
 * una sola fila, que hay que leer de izquierda a derecha para saber de que
 * declaracion se trata. Arriba, de una vez: cual es, de que ejercicio, de que
 * tipo y en que estado.
 *
 * **No pide nada nuevo**: es la misma fila que ya compone `rentas/index.ts`.
 */
export function ResumenDeDeclaracion({ codigo, datos, cargando }: ResumenDePantallaProps) {
  if (codigo === undefined || codigo === '') return null;
  if (cargando) return <Esqueleto alto={92} />;

  const [fila] = datos?.tabla?.filas ?? [];
  if (fila === undefined) return null;

  return (
    <section className="sgtm-resumen" aria-label="Resumen de la declaración">
      <div className="sgtm-resumen__identidad">
        <p className="sgtm-resumen__codigo">DJ {texto(fila[0])}</p>
        <p className="sgtm-resumen__vigencia">
          {/* El estado con su texto dentro, nunca solo por color. */}
          <Insignia tono="neutro">{texto(fila[7])}</Insignia>
          <span>
            Ejercicio {texto(fila[1])} · {texto(fila[3])}
          </span>
        </p>
      </div>
      <dl className="sgtm-resumen__datos">
        <Dato etiqueta="Presentada el" valor={texto(fila[4])} />
        {/* Ni el contribuyente ni el conteo de predios estan en
            `DeclaracionJuradaResource`; el valuo afecto depende de la
            determinacion, que es D-02. */}
        <Dato etiqueta="Contribuyente" valor={texto(fila[2])} />
        <Dato etiqueta="Predios" valor={texto(fila[5])} />
        <Dato etiqueta="Valúo afecto" valor={texto(fila[6])} />
      </dl>
    </section>
  );
}

function Dato({ etiqueta, valor }: { readonly etiqueta: string; readonly valor: string }) {
  return (
    <div className="sgtm-resumen__dato">
      <dt>{etiqueta}</dt>
      <dd>{valor}</dd>
    </div>
  );
}

const texto = (celda: Celda | undefined): string =>
  celda === undefined || celda.texto === '' ? SIN_DATO : celda.texto;
