import { useSearchParams } from 'react-router-dom';
import { Esqueleto, Insignia } from '@sgtm/design-system';
import type { Celda } from '@sgtm/api-client';
import type { ResumenDePantallaProps } from '../composicion';
import { SIN_DATO } from '../seguridad/listado';

/**
 * La cabecera-resumen del padron de contribuyentes (#330).
 *
 * Nueve pestanas y 56 campos, de los que el backend llena siete: quien abre a un
 * contribuyente en ventanilla necesita antes que nada saber **a quien tiene
 * delante** —codigo, nombre, documento y estado—, y hoy eso obliga a leer la
 * fila de una tabla de ocho columnas y despues entrar en la pestana 1.
 *
 * **No pide nada nuevo.** Todo sale de la fila que el adaptador ya trajo
 * (`rentas/index.ts`): el mismo `ContribuyenteResource` paginado, sin una
 * peticion mas.
 *
 * De donde sale «cual contribuyente»: `contribuyentes` no tiene parametro de
 * ruta —el contrato lo declara como filtro—, asi que el registro abierto es
 * `?codigo=`, no `/00028314`. Se admiten los dos: si la ruta trae uno, manda; si
 * no, el filtro. Sin ninguno de los dos, esto es un padron y no una ficha, y la
 * cabecera no se dibuja.
 */
export function ResumenDeContribuyente({ codigo, datos, cargando }: ResumenDePantallaProps) {
  const [busqueda] = useSearchParams();
  const buscado = codigo !== undefined && codigo !== '' ? codigo : (busqueda.get('codigo') ?? '');
  if (buscado === '') return null;
  if (cargando) return <Esqueleto alto={92} />;

  // La columna 1 es «Código» (`estructura.tabla.claves`), y la fila que la trae
  // igual es el contribuyente abierto. Buscarla y no tomar la primera: una
  // busqueda por prefijo puede devolver varias, y la primera no es «la suya».
  const fila = (datos?.tabla?.filas ?? []).find((celdas) => texto(celdas[1]) === buscado);
  if (fila === undefined) return null;

  return (
    <section className="sgtm-resumen" aria-label="Resumen del contribuyente">
      <div className="sgtm-resumen__identidad">
        <p className="sgtm-resumen__codigo">{buscado}</p>
        <p className="sgtm-resumen__vigencia">
          {/* El estado nunca solo por color: la insignia lleva su letra dentro,
              que es la del manual («A», «I»). */}
          <Insignia tono={texto(fila[0]) === 'A' ? 'ok' : 'neutro'}>{texto(fila[0])}</Insignia>
          <span>{texto(fila[2])}</span>
        </p>
      </div>
      <dl className="sgtm-resumen__datos">
        <Dato etiqueta="D.N.I." valor={texto(fila[3])} />
        <Dato etiqueta="R.U.C." valor={texto(fila[4])} />
        {/* El domicilio fiscal es #15 y los predios los tiene catastro: ninguno
            de los dos sale de `ContribuyenteResource`, y cruzarlos aqui seria
            juntar dos respuestas distintas y llamarlo dato. */}
        <Dato etiqueta="Domicilio fiscal" valor={texto(fila[5])} />
        <Dato etiqueta="Predios" valor={texto(fila[6])} />
      </dl>
      <LineaDeDeuda />
    </section>
  );
}

/**
 * «Deuda a hoy: — · el padrón no la publica todavía».
 *
 * Es la cifra que mas se mira de esta pantalla y la que mas importa no
 * inventarse: es la respuesta a «¿cuanto debo?», que es lo que trae a la gente a
 * la ventanilla. **Un cero se lee como «no debe»**, y no hay nada que sostenga
 * esa frase: la deuda es `deudaActualizadaA(fecha)` (#22, regla 9), no un saldo
 * guardado, y esa consulta no existe todavia. Un guion **explicado** dice lo
 * unico cierto: que el dato no llego.
 *
 * Y por eso no lleva fecha: no hay importe al que fecharla (regla 9 se aplica a
 * las cifras, y aqui no hay ninguna).
 */
function LineaDeDeuda() {
  return (
    <p className="sgtm-resumen__pendiente">
      <strong>Deuda a hoy: {SIN_DATO}</strong> · el padrón no la publica todavía. Es la deuda
      actualizada a una fecha, no un saldo guardado: hasta que exista, un guion — nunca un cero.
    </p>
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
