import { formatearFecha } from '@sgtm/dominio';
import { Esqueleto, Insignia } from '@sgtm/design-system';
import type { DatosDeVersionado, Version } from '@sgtm/api-client';

/**
 * Que version se esta viendo, y las que hubo antes.
 *
 * **Es el bloque que hace util al versionado.** El backend de la ficha
 * catastral nunca sobrescribe (#18): actualizar crea la version siguiente y
 * cierra la anterior. Una pantalla que ensena el area de 180 m² sin decir que
 * rige desde marzo —y que hasta entonces eran 120— convierte esa propiedad en
 * un detalle interno, y entonces no hay forma de explicar por que la
 * determinacion del ejercicio anterior salio distinta.
 *
 * Lo que se muestra de cada version, y por que las tres cosas:
 *
 *   vigencia      desde cuando rige, y hasta cuando rigio
 *   autor y fecha quien la escribio y cuando —la pista de auditoria—
 *   observacion   **por que**. Es la mitad util
 *
 * El diff dice que el area paso de 120 a 180; solo la observacion dice que fue
 * una fiscalizacion de campo y no un error de tecleo, y es lo que se lee en voz
 * alta cuando el contribuyente pregunta por que le subio el recibo.
 */
export interface VersionadoProps {
  readonly datos?: DatosDeVersionado;
  readonly cargando: boolean;
}

export function Versionado({ datos, cargando }: VersionadoProps) {
  if (cargando) return <Esqueleto alto={64} />;
  if (!datos) return null;

  const historico = datos.historico ?? [];

  return (
    <section className="sgtm-versionado" aria-label="Versión de la ficha">
      <div className="sgtm-versionado__actual">
        <p className="sgtm-versionado__titulo">
          <span className="sgtm-versionado__numero">Versión {datos.actual.version}</span>
          {/* El estado nunca solo por color: el texto lo dice igual. */}
          <Insignia tono={datos.actual.vigente ? 'ok' : 'neutro'}>
            {datos.actual.vigente ? 'VIGENTE' : 'HISTÓRICA'}
          </Insignia>
        </p>
        <p className="sgtm-versionado__vigencia">{vigenciaDe(datos.actual)}</p>
        <p className="sgtm-versionado__origen">
          {datos.actual.origen} · {datos.actual.documentoOrigen}
        </p>
      </div>

      {/* Ausente no es lo mismo que vacio: sin historico pedido no se dibuja
          nada, y con el pedido siempre hay al menos la version que se ve. */}
      {datos.historico !== undefined && (
        <ol className="sgtm-versionado__historico">
          {historico.map((version) => (
            <li key={version.version} data-vigente={version.vigente ? '1' : '0'}>
              <p className="sgtm-versionado__fila">
                <span className="sgtm-versionado__numero">v{version.version}</span>
                <span className="sgtm-versionado__vigencia">{vigenciaDe(version)}</span>
                <span className="sgtm-versionado__autor">{autorDe(version)}</span>
              </p>
              {/* La observacion, entera y sin recortar: es lo que se lee en voz
                  alta, y un «…» ahi obliga a abrir otra cosa para terminarla. */}
              <p className="sgtm-versionado__observacion">{version.observacion}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** «Desde 12/03/2026» mientras rija; «12/03/2026 — 30/06/2026» cuando ya no. */
function vigenciaDe(version: Version): string {
  const desde = formatearFecha(version.vigenciaDesde);
  return version.vigenciaHasta === undefined
    ? `Desde ${desde}`
    : `${desde} — ${formatearFecha(version.vigenciaHasta)}`;
}

/** Quien y cuando. Sin usuario no se inventa uno: se dice que no consta. */
function autorDe(version: Version): string {
  if (version.usuario === undefined || version.usuario === '') return 'Autor no consta';
  const cuando = version.registradaEn === undefined ? '' : ` · ${fechaDe(version.registradaEn)}`;
  return `${version.usuario}${cuando}`;
}

const fechaDe = (instante: string): string => {
  const [fecha = ''] = instante.split('T');
  return fecha === '' ? instante : formatearFecha(fecha);
};
