import { Icono } from '@sgtm/design-system';
import { usePreferencias } from './preferencias';
import { useSesion } from './sesion/ProveedorDeSesion';

/**
 * Cabecera fija: modulo, titulo de la pantalla, buscador, operacion del
 * contrato y quien esta en la caja.
 *
 * El chip con el endpoint se puede apagar (`mostrarEndpoint`): en desarrollo
 * dice contra que operacion se esta trabajando, y en ventanilla no le dice nada
 * a nadie.
 *
 * Quien esta en la caja sale del token, y con el la municipalidad activa —que
 * es para lo unico que el frontend lee ese claim (FRO-01 §4)—. Sin proveedor de
 * identidad no hay usuario que mostrar, y se dice: inventarse uno seria pintar
 * una sesion que no existe.
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
  const sesion = useSesion();
  const quien = sesion.datos?.usuario ?? 'Sin sesión';
  const donde = sesion.datos?.municipalidad ?? preferencias.entidad;

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
            {iniciales(quien)}
          </span>
          <span className="sgtm-cabecera__identidad">
            <span className="sgtm-cabecera__nombre">{quien}</span>
            <span className="sgtm-cabecera__rol">{donde}</span>
          </span>
        </div>
      </div>
    </header>
  );
}

/** «María Quispe» → «MQ». Sin sesion, el hueco no se rellena con nada inventado. */
function iniciales(nombre: string): string {
  const partes = nombre.split(/\s+/).filter(Boolean);
  return partes
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('');
}
