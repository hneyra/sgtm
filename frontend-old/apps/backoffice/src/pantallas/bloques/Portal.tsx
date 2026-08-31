import { Boton } from '@sgtm/design-system';

/**
 * Portal ciudadano (FRO-03 §5, bloque 3): **la vista del funcionario**.
 *
 * Sigue siendo una de las 134 opciones, con su id, su ruta y su permiso, y no
 * se toca: quitarla seria reescribir el catalogo del manual por un motivo de
 * empaquetado (ADR-0016 §3). Lo que cambio en #298 es que **ya no es lo unico
 * que hay**: la aplicacion que descarga el ciudadano es `apps/portal`, servida
 * en `/portal/` del mismo origen y sin el shell ni el catalogo de navegacion.
 *
 * La tercera condicion de ADR-0009 —el paquete arrastra codigo que solo usa el
 * back-office— es la que se cumplio; **la primera y la segunda siguen sin
 * cumplirse**, asi que no hay realm ciudadano, no hay sesion propia del
 * contribuyente y ninguna lectura se abre al publico. Por eso el enlace de abajo
 * dice lo que dice: lo que se abre es una vista previa tras esta misma sesion.
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
      {/* La aplicacion que descarga el ciudadano, para poder verla como la ve
          el ciudadano (#298). Es un `<a>` y no un `Link`: `/portal/` es OTRA aplicacion
          del mismo origen —su propio paquete, su propio `index.html`—, y una
          navegacion del enrutador no saldria de esta. */}
      <p className="sgtm-portal__vistaprevia">
        <a href="/portal/">Ver el portal del contribuyente</a> — se abre la aplicación que descarga
        el ciudadano, con esta misma sesión: el acceso propio del contribuyente todavía no existe.
      </p>
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
