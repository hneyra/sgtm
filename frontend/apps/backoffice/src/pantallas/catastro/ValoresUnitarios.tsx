import { Aviso, Boton, Esqueleto } from '@sgtm/design-system';
import type { EstructuraDePantalla } from '../../catalogo';
import { useCatalogoVisible } from '../../app/sesion/useCatalogoVisible';
import { SIN_PERMISO, textoDeError } from '../estados';
import { FechaDeCalculo } from '../bloques/FechaDeCalculo';
import { hoy, texto } from '../seguridad/listado';
import { useTablaDeValuacion } from './useTablaDeValuacion';

/**
 * Valores unitarios de edificación: `GET /catastro/tablas/valores-unitarios` (#71).
 *
 * **No es solo que el contenido sea D-02a: la forma tampoco encajaba.** El
 * backend publica una fila por partida y tramo de año de construcción; el
 * prototipo dibuja una matriz —categoría × siete partidas—, y una tercera
 * dimensión que ni siquiera dibuja: el año de construcción. Esta pantalla
 * agrupa por ese tramo y, dentro de cada uno, cruza categoría con partida.
 *
 * **Una tabla sin datos para el ejercicio muestra vacío explícito, nunca
 * ceros ni cifras del prototipo**: mostrar un valor unitario inventado en
 * esta pantalla es publicarlo como si fuera normativo.
 */
const PARTIDAS: ReadonlyArray<{ readonly clave: string; readonly etiqueta: string }> = [
  { clave: 'MUROS', etiqueta: 'Muros y columnas' },
  { clave: 'TECHOS', etiqueta: 'Techos' },
  { clave: 'PISOS', etiqueta: 'Pisos' },
  { clave: 'PUERTAS', etiqueta: 'Puertas y ventanas' },
  { clave: 'REVESTIMIENTOS', etiqueta: 'Revestimientos' },
  { clave: 'BANIOS', etiqueta: 'Baños' },
  { clave: 'INSTALACIONES', etiqueta: 'Instalaciones eléctricas y sanitarias' },
];

export function ValoresUnitarios({ estructura }: { readonly estructura: EstructuraDePantalla }) {
  const catalogo = useCatalogoVisible();
  const tabla = useTablaDeValuacion('valores_unitarios', 'los valores unitarios');

  if (!catalogo.puedeVer(estructura.id)) {
    return <Aviso tipo="sin-permiso" titulo={SIN_PERMISO.titulo} detalle={SIN_PERMISO.detalle} />;
  }

  if (tabla.error !== undefined) {
    const error = textoDeError(tabla.error);
    return (
      <Aviso tipo="error" titulo={error.titulo} detalle={error.detalle} traza={error.traza}>
        <Boton onClick={tabla.reintentar}>Reintentar</Boton>
      </Aviso>
    );
  }

  return (
    <>
      {estructura.desc && <p className="sgtm-descripcion">{estructura.desc}</p>}
      <FechaDeCalculo fecha={hoy()} />

      {tabla.cargando ? (
        <Esqueleto alto={160} />
      ) : tabla.vacia ? (
        <Aviso
          titulo={`Sin valores unitarios sellados para ${tabla.ejercicio}`}
          detalle="Todavía no hay un conjunto de valores unitarios verificado para este ejercicio (D-02a). En cuanto se selle uno, esta pantalla lo muestra: no hay cifras de ejemplo que puedan confundirse con un valor normativo."
        />
      ) : (
        agruparPorTramo(tabla.filas).map((tramo) => (
          <section key={tramo.clave} className="sgtm-tarjeta">
            <div className="sgtm-tarjeta__cabecera">
              <h2 className="sgtm-tarjeta__titulo">
                Edificaciones de {tramo.desde}
                {tramo.hasta === undefined ? ' a más' : ` a ${tramo.hasta}`}
              </h2>
              <span className="sgtm-tarjeta__conteo">Ejercicio {tabla.ejercicio}</span>
            </div>
            <div className="sgtm-tabla__marco">
              <table className="sgtm-tabla">
                <thead>
                  <tr>
                    <th>Categoría</th>
                    {PARTIDAS.map(({ etiqueta }) => (
                      <th key={etiqueta} className="sgtm-tabla--numerica">
                        {etiqueta}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tramo.categorias.map((categoria) => (
                    <tr key={categoria}>
                      <td>{categoria}</td>
                      {PARTIDAS.map(({ clave }) => (
                        <td key={clave} className="sgtm-tabla--numerica">
                          {tramo.valores[`${categoria}·${clave}`] ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </>
  );
}

interface TramoDeValores {
  readonly clave: string;
  readonly desde: number;
  readonly hasta?: number;
  readonly categorias: readonly string[];
  readonly valores: Readonly<Record<string, string>>;
}

/** Agrupa las filas sueltas del backend por tramo de año de construcción. */
export function agruparPorTramo(
  filas: readonly Readonly<Record<string, unknown>>[],
): readonly TramoDeValores[] {
  const tramos = new Map<
    string,
    { desde: number; hasta?: number; categorias: Set<string>; valores: Record<string, string> }
  >();

  for (const fila of filas) {
    const desde = typeof fila['anioConstruccionDesde'] === 'number' ? fila['anioConstruccionDesde'] : 0;
    const hasta = typeof fila['anioConstruccionHasta'] === 'number' ? fila['anioConstruccionHasta'] : undefined;
    const clave = `${desde}-${hasta ?? ''}`;
    const categoria = texto(fila['categoria']);
    const partida = texto(fila['partida']);
    const valor = texto(fila['valorM2']);

    const tramo = tramos.get(clave) ?? { desde, hasta, categorias: new Set<string>(), valores: {} };
    tramo.categorias.add(categoria);
    tramo.valores[`${categoria}·${partida}`] = valor;
    tramos.set(clave, tramo);
  }

  return [...tramos.entries()]
    .sort(([, a], [, b]) => a.desde - b.desde)
    .map(([clave, tramo]) => ({
      clave,
      desde: tramo.desde,
      ...(tramo.hasta === undefined ? {} : { hasta: tramo.hasta }),
      categorias: [...tramo.categorias].sort(),
      valores: tramo.valores,
    }));
}
