import { Boton } from '@sgtm/design-system';

/**
 * Portal ciudadano (FRO-03 §5, bloque 3).
 *
 * Es **una** de las 134 opciones, no una aplicacion aparte; el criterio para
 * separarla en `apps/portal` esta en ADR-0009 y ninguno de sus tres supuestos
 * se cumple todavia (FRO-01 §1).
 *
 * Lo usa quien no conoce el sistema, una vez al ano, desde un movil con red
 * mala: es una de las tres pantallas que FRO-03 §6 marca para validar con
 * usuarios reales antes de darla por buena. **No esta validada.**
 */
export interface PortalProps {
  readonly pasos: readonly string[];
}

const TIPOS_DE_DOCUMENTO = ['DNI', 'RUC', 'Código'] as const;

export function Portal({ pasos }: PortalProps) {
  return (
    <>
      <section className="sgtm-portal">
        <div className="sgtm-portal__texto">
          <p className="sgtm-portal__eyebrow">Portal del contribuyente</p>
          <h2 className="sgtm-portal__titular">
            Consulta y paga tus tributos <em>sin ir a ventanilla</em>.
          </h2>
        </div>
        <div className="sgtm-portal__consulta">
          <label className="sgtm-portal__oculto" htmlFor="portal-tipo">
            Tipo de documento
          </label>
          <select id="portal-tipo" defaultValue="DNI">
            {TIPOS_DE_DOCUMENTO.map((tipo) => (
              <option key={tipo}>{tipo}</option>
            ))}
          </select>
          <label className="sgtm-portal__oculto" htmlFor="portal-numero">
            Número de documento
          </label>
          <input id="portal-numero" placeholder="Número de documento" />
          <Boton variante="primario" className="sgtm-portal__boton">
            Consultar
          </Boton>
        </div>
      </section>
      <ol className="sgtm-pasos">
        {pasos.map((paso, i) => (
          <li key={paso} className="sgtm-pasos__paso" data-hecho={i < 3 ? '1' : '0'}>
            <span className="sgtm-pasos__numero">{String(i + 1).padStart(2, '0')}</span>
            <span className="sgtm-pasos__etiqueta">{paso}</span>
          </li>
        ))}
      </ol>
    </>
  );
}
