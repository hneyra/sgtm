import { Aviso, Boton, Esqueleto } from '@sgtm/design-system';
import type { DatosDeReporte } from '@sgtm/api-client';
import type { EstructuraDeReporte } from '../../catalogo';
import { usePreferencias } from '../../app/preferencias';
import type { DescargaDeArchivo } from '../useDescargaDeArchivo';
import { textoDeError } from '../estados';

/**
 * Hoja de reporte (FRO-03 §5, bloque 9).
 *
 * Se imprime en A4 vertical y sale de la municipalidad con firma (RNF-084), asi
 * que la hoja pierde sombra, borde y margenes al imprimir, y todo lo que no es
 * la hoja —barra lateral, cabecera, botones— desaparece.
 *
 * **«Descargar PDF» no hace nada, salvo que la pantalla traiga `descargas`.**
 * Para los otros once reportes el PDF lo emitiria el backend con su
 * numeracion y su firma, y el regimen de firma digital es la decision abierta
 * D-05: un PDF generado en el navegador no seria el documento oficial. Las dos
 * excepciones son la ficha del contribuyente (#71) y la constancia de no
 * adeudo (#72): ninguna de las dos se registra como documento emitido —son
 * consultas, no emisiones—, y sus backends ya sirven los tres formatos que
 * RNF-081 exige.
 */
export interface ReporteProps {
  readonly estructura: EstructuraDeReporte;
  readonly datos?: DatosDeReporte;
  readonly cargando: boolean;
  readonly descargas?: DescargaDeArchivo;
}

export function Reporte({ estructura, datos, cargando, descargas }: ReporteProps) {
  const { preferencias } = usePreferencias();
  const numericas = new Set(estructura.num ?? []);

  return (
    <>
      <article className="sgtm-hoja" data-hoja="1">
        <header className="sgtm-hoja__cabecera">
          <div>
            <p className="sgtm-hoja__entidad">{preferencias.entidad}</p>
            <p className="sgtm-hoja__unidad">
              Gerencia de Administración Tributaria — Unidad de Rentas
            </p>
          </div>
          <div className="sgtm-hoja__referencia">
            <span>{datos?.code ?? ''}</span>
            <span>{datos?.date ?? ''}</span>
          </div>
        </header>

        <h2 className="sgtm-hoja__titulo">{estructura.title}</h2>
        <p className="sgtm-hoja__subtitulo">{estructura.subtitle}</p>

        <div className="sgtm-hoja__meta">
          {cargando
            ? [0, 1, 2, 3].map((n) => <Esqueleto key={n} alto={30} />)
            : (datos?.meta ?? []).map((dato) => (
                <div key={dato.k}>
                  <p className="sgtm-hoja__meta-clave">{dato.k}</p>
                  <p className="sgtm-hoja__meta-valor">{dato.v}</p>
                </div>
              ))}
        </div>

        <table className="sgtm-hoja__tabla">
          <thead>
            <tr>
              {estructura.cols.map((columna, i) => (
                <th key={columna} className={numericas.has(i) ? 'sgtm-hoja--numerica' : undefined}>
                  {columna}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cargando &&
              [0, 1, 2, 3, 4].map((n) => (
                <tr key={n}>
                  {estructura.cols.map((columna) => (
                    <td key={columna}>
                      <Esqueleto alto={12} />
                    </td>
                  ))}
                </tr>
              ))}
            {!cargando && (datos?.filas.length ?? 0) === 0 && (
              // Un reporte sin filas se imprime igual, y quien lo firma tiene
              // que poder ver que no es que falten: es que no hay.
              <tr>
                <td colSpan={estructura.cols.length} className="sgtm-hoja__vacio">
                  Sin movimientos en el periodo del reporte.
                </td>
              </tr>
            )}
            {!cargando &&
              (datos?.filas ?? []).map((fila, f) => (
                <tr key={f}>
                  {fila.map((celda, c) => (
                    <td
                      key={estructura.cols[c] ?? c}
                      className={numericas.has(c) ? 'sgtm-hoja--numerica' : undefined}
                    >
                      {celda}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>

        <p className="sgtm-hoja__cierre">{datos?.footer ?? ''}</p>

        <div className="sgtm-hoja__firmas">
          <span>Cajero / Responsable</span>
          <span>Contribuyente</span>
        </div>
      </article>

      <div className="sgtm-hoja__botones" data-no-imprimible="1">
        <Boton variante="primario" onClick={() => window.print()}>
          Imprimir
        </Boton>
        {descargas ? (
          FORMATOS.map((formato) => (
            <Boton
              key={formato}
              /* Sin hoja no hay nada que exportar, y la descarga no espera a
                 tenerla: `descargar` va contra el backend por su cuenta, asi
                 que con la lectura todavia en camino —o caida— el archivo
                 saldria de una consulta que la pantalla no llego a mostrar, y
                 el papel diria algo que nadie vio (#332). */
              disabled={descargas.enCurso !== null || datos === undefined}
              {...(datos === undefined ? { title: 'Primero hay que cargar el reporte' } : {})}
              onClick={() => descargas.descargar(formato)}
            >
              {descargas.enCurso === formato ? 'Descargando…' : `Descargar ${formato}`}
            </Boton>
          ))
        ) : (
          <Boton disabled title="El PDF lo emite el backend con su numeración y su firma (D-05)">
            Descargar PDF
          </Boton>
        )}
      </div>
      {descargas?.error !== undefined && descargas.error !== null && (
        <div data-no-imprimible="1">
          <ErrorDeDescarga error={descargas.error} />
        </div>
      )}
    </>
  );
}

const FORMATOS = ['PDF', 'XLS', 'RTF'] as const;

function ErrorDeDescarga({ error }: { readonly error: unknown }) {
  const texto = textoDeError(error);
  return <Aviso tipo="error" titulo={texto.titulo} detalle={texto.detalle} traza={texto.traza} />;
}
