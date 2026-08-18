import { Icono } from '@sgtm/design-system';
import { usePreferencias } from './preferencias';

/**
 * Cabecera fija: modulo, titulo de la pantalla, buscador, operacion del
 * contrato y quien esta en la caja.
 *
 * El chip con el endpoint se puede apagar (`mostrarEndpoint`): en desarrollo
 * dice contra que operacion se esta trabajando, y en ventanilla no le dice nada
 * a nadie.
 */
export interface CabeceraDeAppProps {
  readonly modulo: string;
  readonly titulo: string;
  readonly endpoint?: string;
  readonly onAbrirNavegacion: () => void;
  readonly onAbrirPaleta: () => void;
}

export function CabeceraDeApp({
  modulo,
  titulo,
  endpoint,
  onAbrirNavegacion,
  onAbrirPaleta,
}: CabeceraDeAppProps) {
  const { preferencias } = usePreferencias();

  return (
    <header className="sgtm-cabecera" data-no-imprimible="1">
      <button
        type="button"
        className="sgtm-cabecera__hamburguesa"
        onClick={onAbrirNavegacion}
        aria-label="Abrir la navegación"
      >
        <Icono nombre="menu" tamano={17} />
      </button>
      <div className="sgtm-cabecera__titulos">
        <p className="sgtm-cabecera__eyebrow">{modulo}</p>
        <h1 className="sgtm-cabecera__titulo">{titulo}</h1>
      </div>
      <button
        type="button"
        className="sgtm-cabecera__lupa"
        onClick={onAbrirPaleta}
        aria-label="Buscar en el sistema"
      >
        <Icono nombre="lupa" tamano={16} />
      </button>
      <div className="sgtm-cabecera__derecha" data-oculto-en-movil="1">
        {preferencias.mostrarEndpoint && endpoint && (
          <code className="sgtm-cabecera__endpoint">{endpoint}</code>
        )}
        <div className="sgtm-cabecera__usuario">
          <span className="sgtm-cabecera__avatar" aria-hidden="true">
            JC
          </span>
          <span className="sgtm-cabecera__identidad">
            <span className="sgtm-cabecera__nombre">J. Cárdenas</span>
            <span className="sgtm-cabecera__rol">Caja C-3</span>
          </span>
        </div>
      </div>
    </header>
  );
}
