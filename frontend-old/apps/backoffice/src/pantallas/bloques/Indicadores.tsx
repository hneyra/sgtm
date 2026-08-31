import { Aviso, Esqueleto, Indicador } from '@sgtm/design-system';
import type { Kpi, Panel } from '@sgtm/api-client';

/**
 * Panel de recaudacion (FRO-03 §5, bloque 2): tarjetas de indicador y paneles
 * con barra de avance.
 *
 * Ni el valor ni el porcentaje se calculan aqui: llegan calculados. La barra
 * pinta `pct`, no lo deduce de dividir dos importes —que ademas seria
 * aritmetica con importes, prohibida por RNF-083—.
 *
 * El esqueleto dibuja **cuatro** tarjetas, las mismas que trae la respuesta, y
 * con el alto de una tarjeta con datos: si dibujara una, la pantalla saltaria
 * al llegar la respuesta.
 */
export interface IndicadoresProps {
  readonly kpis?: readonly Kpi[];
  readonly paneles?: readonly Panel[];
  readonly cargando: boolean;
}

export function Indicadores({ kpis, paneles, cargando }: IndicadoresProps) {
  const vacio = !cargando && (kpis?.length ?? 0) === 0 && (paneles?.length ?? 0) === 0;

  if (vacio) {
    return (
      <Aviso
        titulo="Sin indicadores para este ejercicio"
        detalle="El panel se llena con lo emitido y lo recaudado del ejercicio activo. Si acaba de empezar, todavía no hay nada que resumir."
      />
    );
  }

  if (cargando) {
    return (
      <div className="sgtm-kpis">
        {[0, 1, 2, 3].map((n) => (
          <div key={n} className="sgtm-kpis__tarjeta">
            <Esqueleto alto={30} />
            <Esqueleto alto={12} ancho="60%" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {kpis && kpis.length > 0 && (
        <div className="sgtm-kpis">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="sgtm-kpis__tarjeta">
              <Indicador valor={kpi.value} etiqueta={kpi.label} />
              <p className="sgtm-kpis__nota">{kpi.note}</p>
            </div>
          ))}
        </div>
      )}
      {paneles && paneles.length > 0 && (
        <div className="sgtm-paneles">
          {paneles.map((panel) => (
            <section key={panel.title} className="sgtm-tarjeta">
              <div className="sgtm-tarjeta__cabecera">
                <h2 className="sgtm-tarjeta__titulo">{panel.title}</h2>
                <span className="sgtm-panel__nota">{panel.note}</span>
              </div>
              <div className="sgtm-panel__filas">
                {panel.rows.map((fila) => (
                  <div key={fila.label} className="sgtm-panel__fila">
                    <div className="sgtm-panel__texto">
                      <span className="sgtm-panel__etiqueta">{fila.label}</span>
                      <span className="sgtm-panel__sub">{fila.sub}</span>
                    </div>
                    <div
                      className="sgtm-panel__barra"
                      data-oculto-en-movil="1"
                      role="img"
                      aria-label={`Avance ${fila.pct} %`}
                    >
                      <span style={{ width: `${fila.pct}%` }} />
                    </div>
                    <span className="sgtm-panel__valor">{fila.value}</span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
