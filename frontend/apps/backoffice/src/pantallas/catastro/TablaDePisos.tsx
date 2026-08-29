import { useState } from 'react';
import { Aviso, Boton, Campo, Esqueleto } from '@sgtm/design-system';
import type { Escritura } from '../escritura';
import { letrasDeCategorias } from './fichas';

/**
 * La tabla de pisos de una ficha catastral, **como campo de la escritura**.
 *
 * La comparten el alta de una ficha (#320) y su actualización (#71) porque el
 * backend la declara una sola vez para los dos verbos
 * (`DeclaracionDeFicha.ConstruccionDeclarada`): escribirla dos veces aquí
 * garantizaría que un día acepten cosas distintas.
 *
 * Las filas viven en `useEscritura`, no en un `useState` de la pantalla. Esa es
 * la diferencia que importa: la tabla está declarada en `pantallas/escrituras.ts`
 * con su lista blanca **por columna**, así que una columna que el prototipo
 * dibuje y el controlador no acepte —mes, año, MEP, ECS, ECC, UCA— no viaja por
 * declaración y no por acordarse. Y cambiar la tabla empieza un intento nuevo:
 * con la clave de idempotencia anterior, quitar un piso devolvería el resultado
 * del envío que todavía lo tenía.
 *
 * **Ni un importe** (regla 5, D-02a): piso, área y las siete categorías de una
 * letra. Cuánto vale cada categoría es un valor unitario, y eso vive en datos
 * versionados.
 */
interface TablaDePisosProps {
  readonly escritura: Escritura;
  /** Todavía se están leyendo los pisos que ya tiene la ficha. */
  readonly cargando?: boolean;
  /** Rótulo de la tarjeta: en un alta son los pisos de la primera versión. */
  readonly titulo?: string;
}

/** La clave de la tabla en `escrituras.ts`. Una sola, y las dos pantallas la comparten. */
export const CONSTRUCCIONES = 'construcciones';

/**
 * Una fila de la tabla, con sus claves.
 *
 * Es un `type` y no una `interface` a proposito: la escritura guarda las filas
 * como `Record<string, string>` —lo que su lista blanca por columna filtra— y
 * solo un alias recibe la firma de indice implicita que hace falta para pasarla.
 */
type FilaDePiso = {
  readonly piso: string;
  readonly areaConstruida: string;
  readonly categoriaMuros: string;
  readonly categoriaTechos: string;
  readonly categoriaPisos: string;
  readonly categoriaPuertas: string;
  readonly categoriaRevestimientos: string;
  readonly categoriaBanios: string;
  readonly categoriaInstalaciones: string;
};

const FILA_VACIA: FilaDePiso = {
  piso: '',
  areaConstruida: '',
  categoriaMuros: '',
  categoriaTechos: '',
  categoriaPisos: '',
  categoriaPuertas: '',
  categoriaRevestimientos: '',
  categoriaBanios: '',
  categoriaInstalaciones: '',
};

const CATEGORIAS: ReadonlyArray<{
  readonly clave: Exclude<keyof FilaDePiso, 'piso' | 'areaConstruida'>;
  readonly etiqueta: string;
}> = [
  { clave: 'categoriaMuros', etiqueta: 'Muros' },
  { clave: 'categoriaTechos', etiqueta: 'Techos' },
  { clave: 'categoriaPisos', etiqueta: 'Pisos' },
  { clave: 'categoriaPuertas', etiqueta: 'Puertas' },
  { clave: 'categoriaRevestimientos', etiqueta: 'Revest.' },
  { clave: 'categoriaBanios', etiqueta: 'Baños' },
  { clave: 'categoriaInstalaciones', etiqueta: 'Instalaciones' },
];

/** Una letra de A a I, o vacío: ninguna categoría es tan válida como declarar las siete. */
const LETRA_VALIDA = /^[A-I]?$/;

export function TablaDePisos({
  escritura,
  cargando = false,
  titulo = 'Pisos declarados en la nueva versión',
}: TablaDePisosProps) {
  const [borrador, fijarBorrador] = useState<FilaDePiso>(FILA_VACIA);
  const [errorDeFila, fijarErrorDeFila] = useState<string | undefined>(undefined);

  const filas = escritura.filasDe(CONSTRUCCIONES).map(comoFila);
  // Sin operación no hay a dónde escribir —es lo que pasa sin permiso—, y sin
  // la tabla declarada tampoco: las dos condiciones, no una.
  const escribible = escritura.operacion !== undefined && escritura.tablas.has(CONSTRUCCIONES);

  return (
    <section className="sgtm-tarjeta">
      <div className="sgtm-tarjeta__cabecera">
        {/* `h3` y no `h2`: dentro del asistente esta tarjeta cuelga del rotulo
            del paso, que ya es el `h2`. Dos `h2` hermanos dicen que son dos
            secciones del mismo nivel, y quien navega por encabezados se
            encuentra la tabla de pisos al mismo nivel que el paso que la
            contiene. */}
        <h3 className="sgtm-tarjeta__titulo">{titulo}</h3>
        <span className="sgtm-tarjeta__conteo">
          {cargando ? '…' : `${filas.length} ${filas.length === 1 ? 'piso' : 'pisos'}`}
        </span>
      </div>

      {cargando ? (
        <Esqueleto alto={120} />
      ) : (
        <div className="sgtm-tabla__marco">
          {/* Con nombre accesible, y no solo por las pruebas: desde que la ficha
              y su edicion caen en la misma superficie hay mas de una tabla en la
              pagina, y una tabla sin nombre no se distingue de la otra ni con un
              lector de pantalla ni tabulando (FRO-04). El nombre es el titulo
              que ya lleva encima: no se redacta uno nuevo. */}
          <table className="sgtm-tabla" aria-label={titulo}>
            <thead>
              <tr>
                <th>Piso</th>
                {/* El rotulo corto es el mismo del campo de abajo: con «Área
                    construida (m²)» la columna se ensanchaba el doble que su
                    contenido y la fila de alta no se alineaba con ninguna. */}
                <th className="sgtm-tabla--numerica">Área m²</th>
                {CATEGORIAS.map(({ etiqueta }) => (
                  <th key={etiqueta}>{etiqueta}</th>
                ))}
                <th aria-label="Acciones de la fila" />
              </tr>
            </thead>
            <tbody>
              {filas.length === 0 && (
                <tr>
                  <td colSpan={CATEGORIAS.length + 3}>
                    Ningún piso declarado. La ficha quedaría sin construcciones si guardas así.
                  </td>
                </tr>
              )}
              {filas.map((fila, indice) => (
                <tr key={indice}>
                  <td>{fila.piso}</td>
                  <td className="sgtm-tabla--numerica">{fila.areaConstruida}</td>
                  {CATEGORIAS.map(({ clave, etiqueta }) => (
                    <td key={etiqueta}>{fila[clave]}</td>
                  ))}
                  <td>
                    {escribible && (
                      <Boton
                        variante="fantasma"
                        // Diez botones «Quitar» iguales no se distinguen en la
                        // lista de un lector de pantalla: cada uno dice de que
                        // piso es.
                        aria-label={`Quitar el piso ${fila.piso === '' ? indice + 1 : fila.piso}`}
                        onClick={() =>
                          escritura.fijarFilas(
                            CONSTRUCCIONES,
                            filas.filter((_fila, i) => i !== indice),
                          )
                        }
                      >
                        Quitar
                      </Boton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {escribible && (
        <>
          {/* Los nueve campos del alta, en una rejilla de nueve columnas y con
              **los rotulos de las cabeceras**: antes eran nueve campos de ancho
              libre en fila, «Nº Piso» y «Área construida (m²)» ocupaban media
              fila entre los dos, y ninguno caia debajo de su columna. */}
          <div className="sgtm-pisos__alta">
            <Campo
              etiqueta="Piso"
              tipo="text"
              valor={borrador.piso}
              onCambio={(valor) => fijarBorrador({ ...borrador, piso: valor })}
            />
            <Campo
              etiqueta="Área m²"
              tipo="text"
              valor={borrador.areaConstruida}
              onCambio={(valor) => fijarBorrador({ ...borrador, areaConstruida: valor })}
            />
            {CATEGORIAS.map(({ clave, etiqueta }) => (
              <Campo
                key={clave}
                etiqueta={etiqueta}
                tipo="text"
                ph="A–I"
                valor={borrador[clave]}
                onCambio={(valor) =>
                  fijarBorrador({ ...borrador, [clave]: valor.toUpperCase().slice(0, 1) })
                }
              />
            ))}
          </div>
          {errorDeFila !== undefined && (
            <Aviso tipo="error" titulo="No se puede agregar este piso" detalle={errorDeFila} />
          )}
          <Boton
            onClick={() => {
              const error = errorDeLaFila(borrador);
              if (error) {
                fijarErrorDeFila(error);
                return;
              }
              fijarErrorDeFila(undefined);
              escritura.fijarFilas(CONSTRUCCIONES, [...filas, borrador]);
              fijarBorrador(FILA_VACIA);
            }}
          >
            Agregar piso
          </Boton>
        </>
      )}
    </section>
  );
}

/** Las filas de la escritura son texto por columna; aquí se leen con sus nombres. */
function comoFila(fila: Readonly<Record<string, string>>): FilaDePiso {
  const columna = (clave: keyof FilaDePiso): string => fila[clave] ?? '';
  return {
    piso: columna('piso'),
    areaConstruida: columna('areaConstruida'),
    categoriaMuros: columna('categoriaMuros'),
    categoriaTechos: columna('categoriaTechos'),
    categoriaPisos: columna('categoriaPisos'),
    categoriaPuertas: columna('categoriaPuertas'),
    categoriaRevestimientos: columna('categoriaRevestimientos'),
    categoriaBanios: columna('categoriaBanios'),
    categoriaInstalaciones: columna('categoriaInstalaciones'),
  };
}

function errorDeLaFila(fila: FilaDePiso): string | undefined {
  if (fila.piso.trim() === '') return 'Falta el número de piso.';
  if (fila.areaConstruida.trim() === '' || Number.isNaN(Number(fila.areaConstruida))) {
    return 'El área construida tiene que ser un número.';
  }
  for (const { clave, etiqueta } of CATEGORIAS) {
    if (!LETRA_VALIDA.test(fila[clave])) {
      return `La categoría de ${etiqueta.toLowerCase()} va de A a I.`;
    }
  }
  return undefined;
}

/**
 * Del recurso de `ficha_urbana`: las categorías llegan como texto —`[BCCBCBB]`
 * en el backend, `C B C C B C B` en el juego de datos del prototipo— y aquí se
 * separan por letra, admitiendo las dos formas.
 *
 * El reparto lo hace `letrasDeCategorias`, en `fichas.ts`: lo lee también el
 * adaptador de la ficha, que pinta esas siete letras en las siete columnas del
 * prototipo, y dos repartos distintos del mismo texto acabarían diciendo cosas
 * distintas del mismo piso.
 */
export function filaDeConstruccionLeida(construccion: {
  readonly piso: string;
  readonly areaConstruida: string;
  readonly categorias: string;
}): FilaDePiso {
  const letras = letrasDeCategorias(construccion.categorias);
  const letra = (indice: number): string => letras[indice] ?? '';
  return {
    piso: construccion.piso,
    areaConstruida: construccion.areaConstruida,
    categoriaMuros: letra(0),
    categoriaTechos: letra(1),
    categoriaPisos: letra(2),
    categoriaPuertas: letra(3),
    categoriaRevestimientos: letra(4),
    categoriaBanios: letra(5),
    categoriaInstalaciones: letra(6),
  };
}
