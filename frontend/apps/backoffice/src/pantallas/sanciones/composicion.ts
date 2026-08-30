import { lazy } from 'react';
import type { ComposicionDeOpcion } from '../composicion';

/**
 * El control que compone el número de la notificación, **cargado con el módulo
 * y no en el arranque**, igual que los de rentas y el de licencias.
 */
const ResolutorDelNumeroDeNotificacion = lazy(async () => ({
  default: (await import('./ResolutorDelNumeroDeNotificacion')).ResolutorDelNumeroDeNotificacion,
}));

/**
 * Lo que Infracciones administrativas compone alrededor de los bloques comunes
 * (#428, sobre el mecanismo de #422).
 *
 * Una sola opción, y por un motivo que no es el de #427: aquí no falta ningún
 * campo —el manual dibuja los cuatro que `NotificacionAdministrativaController`
 * exige— sino que **uno de ellos está partido en tres** y la base lo guarda
 * entero, con su unicidad puesta encima. Ver `ResolutorDelNumeroDeNotificacion`.
 */
export const COMPOSICION_DE_SANCIONES: Readonly<Record<string, ComposicionDeOpcion>> = {
  adm_notificacion: {
    resolutores: {
      numero2: {
        campos: ['numeroCompuesto'],
        memoria: ['numeroDeLaNotificacion'],
        contexto: ['serie2'],
        Control: ResolutorDelNumeroDeNotificacion,
      },
    },
  },
};
