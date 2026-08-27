import { Icono } from '@sgtm/design-system';
import { useEjercicio } from './ejercicio';
import { usePreferencias } from './preferencias';
import { Lanzador } from './Lanzador';
import { MenuDeLaPersona } from './MenuDeLaPersona';

/**
 * Cabecera fija: modulo, titulo de la pantalla, buscador, operacion del
 * contrato y las dos puertas de ADR-0014 —el lanzador de modulos y el menu de
 * la persona—.
 *
 * El chip con el endpoint se puede apagar (`mostrarEndpoint`): en desarrollo
 * dice contra que operacion se esta trabajando, y en ventanilla no le dice nada
 * a nadie.
 *
 * **El ejercicio de trabajo se ve siempre**, tambien en movil: es global a la
 * sesion (#70), y una cifra de 2025 mostrada como si fuera de 2026 no es un
 * fallo de formato sino una respuesta equivocada a quien vino a preguntar
 * cuanto debe.
 *
 * **El lanzador tambien se ve en movil**: con la barra lateral plegada en
 * cajon, es la puerta corta a los modulos, y por eso no va dentro del bloque
 * `data-oculto-en-movil`.
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
  const { ejercicio } = useEjercicio();

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
      <p className="sgtm-cabecera__ejercicio">
        <span>Ejercicio</span>
        <strong>{ejercicio}</strong>
      </p>
      <Lanzador />
      <div className="sgtm-cabecera__derecha" data-oculto-en-movil="1">
        {preferencias.mostrarEndpoint && endpoint && (
          <code className="sgtm-cabecera__endpoint">{endpoint}</code>
        )}
        <MenuDeLaPersona />
      </div>
    </header>
  );
}
