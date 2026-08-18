import { Campo } from '@sgtm/design-system';
import type { ValorDeCampo } from '@sgtm/api-client';
import type { SeccionDePantalla } from '../../catalogo';
import { arrancaCerrada } from '../../catalogo';
import { Icono } from '@sgtm/design-system';

/**
 * Formulario por secciones colapsables (FRO-03 §5, bloque 8).
 *
 * Las secciones marcadas `Opcional`, `Solo lectura` o `Colapsado` arrancan
 * cerradas. El colapso se guarda por clave `seccion|pestana` para que cambiar
 * de pestana no arrastre el estado de la anterior.
 */
export interface FormularioProps {
  readonly secciones: readonly SeccionDePantalla[];
  readonly valores: Readonly<Record<string, ValorDeCampo>>;
  readonly cargando: boolean;
  readonly cerradas: Readonly<Record<string, boolean>>;
  readonly onAlternar: (clave: string, cerrada: boolean) => void;
  readonly pestana: number;
}

export function Formulario({
  secciones,
  valores,
  cargando,
  cerradas,
  onAlternar,
  pestana,
}: FormularioProps) {
  return (
    <div className="sgtm-formulario">
      {secciones.map((seccion, i) => {
        const clave = `${i}|${pestana}`;
        const cerrada = cerradas[clave] ?? arrancaCerrada(seccion);
        return (
          <section key={clave} className="sgtm-tarjeta">
            <button
              type="button"
              className="sgtm-seccion__cabecera"
              aria-expanded={!cerrada}
              onClick={() => onAlternar(clave, !cerrada)}
            >
              <h2 className="sgtm-tarjeta__titulo">{seccion.label}</h2>
              {seccion.hint && <span className="sgtm-seccion__hint">{seccion.hint}</span>}
              <span className="sgtm-seccion__caret" data-cerrada={cerrada ? '1' : '0'}>
                <Icono nombre="chevronAbajo" tamano={15} />
              </span>
            </button>
            {!cerrada && (
              <div className="sgtm-seccion__rejilla">
                {seccion.campos.map((campo) => {
                  const valor = valores[campo.clave];
                  return (
                    <Campo
                      key={campo.clave}
                      etiqueta={campo.label}
                      tipo={campo.t}
                      valor={typeof valor === 'string' ? valor : ''}
                      marcado={valor === true}
                      ph={campo.ph}
                      opciones={campo.opts}
                      ancho={campo.ancho}
                      cargando={cargando}
                    />
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
