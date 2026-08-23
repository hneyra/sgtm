import { Aviso, Boton, Esqueleto } from '@sgtm/design-system';
import type { EstructuraDePantalla } from '../../catalogo';
import { useCatalogoVisible } from '../../app/sesion/useCatalogoVisible';
import { SIN_PERMISO, textoDeError } from '../estados';
import { FechaDeCalculo } from '../bloques/FechaDeCalculo';
import { hoy, texto } from '../seguridad/listado';
import { useTablaDeValuacion } from './useTablaDeValuacion';

/**
 * Tabla de depreciación: `GET /catastro/tablas/depreciacion` (#71).
 *
 * Mismo defecto de forma que `valores_unitarios`: el backend publica una fila
 * por material, estado de conservación y tramo de antigüedad; el prototipo
 * dibuja una matriz —antigüedad × estados—. Aquí se agrupa por material y,
 * dentro de cada uno, se cruza el tramo de antigüedad con el estado.
 */
export function Depreciacion({ estructura }: { readonly estructura: EstructuraDePantalla }) {
  const catalogo = useCatalogoVisible();
  const tabla = useTablaDeValuacion('depreciacion', 'la depreciación');

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
          titulo={`Sin tabla de depreciación sellada para ${tabla.ejercicio}`}
          detalle="Todavía no hay un conjunto de depreciación verificado para este ejercicio (D-02a). En cuanto se selle uno, esta pantalla lo muestra: no hay porcentajes de ejemplo que puedan confundirse con un valor normativo."
        />
      ) : (
        agruparPorMaterial(tabla.filas).map((grupo) => (
          <section key={grupo.material} className="sgtm-tarjeta">
            <div className="sgtm-tarjeta__cabecera">
              <h2 className="sgtm-tarjeta__titulo">{grupo.material}</h2>
              <span className="sgtm-tarjeta__conteo">Ejercicio {tabla.ejercicio}</span>
            </div>
            <div className="sgtm-tabla__marco">
              <table className="sgtm-tabla">
                <thead>
                  <tr>
                    <th>Antigüedad hasta (años)</th>
                    {grupo.estados.map((estado) => (
                      <th key={estado} className="sgtm-tabla--numerica">
                        {estado}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grupo.tramos.map((antiguedad) => (
                    <tr key={antiguedad}>
                      <td>{antiguedad}</td>
                      {grupo.estados.map((estado) => (
                        <td key={estado} className="sgtm-tabla--numerica">
                          {grupo.valores[`${antiguedad}·${estado}`] ?? '—'}
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

interface GrupoDeDepreciacion {
  readonly material: string;
  readonly tramos: readonly number[];
  readonly estados: readonly string[];
  readonly valores: Readonly<Record<string, string>>;
}

/** Agrupa las filas sueltas del backend por material. */
export function agruparPorMaterial(
  filas: readonly Readonly<Record<string, unknown>>[],
): readonly GrupoDeDepreciacion[] {
  const grupos = new Map<
    string,
    { tramos: Set<number>; estados: Set<string>; valores: Record<string, string> }
  >();

  for (const fila of filas) {
    const material = texto(fila['material']);
    const estado = texto(fila['estadoConservacion']);
    const antiguedad = typeof fila['antiguedadHasta'] === 'number' ? fila['antiguedadHasta'] : 0;
    const porcentaje = texto(fila['porcentaje']);

    const grupo = grupos.get(material) ?? {
      tramos: new Set<number>(),
      estados: new Set<string>(),
      valores: {},
    };
    grupo.tramos.add(antiguedad);
    grupo.estados.add(estado);
    grupo.valores[`${antiguedad}·${estado}`] = porcentaje;
    grupos.set(material, grupo);
  }

  return [...grupos.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([material, grupo]) => ({
      material,
      tramos: [...grupo.tramos].sort((a, b) => a - b),
      estados: [...grupo.estados].sort(),
      valores: grupo.valores,
    }));
}
