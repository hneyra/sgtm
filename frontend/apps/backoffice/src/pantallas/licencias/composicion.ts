import { lazy } from 'react';
import type { ComposicionDeOpcion } from '../composicion';

/**
 * El resolutor del solicitante, **cargado con el módulo y no en el arranque**.
 *
 * Mismo motivo que los de rentas: trae dentro su búsqueda contra el padrón y su
 * prosa, y en el trozo común sería código que 133 de las 134 pantallas no usan
 * nunca. `Formulario` lo dibuja dentro de un `Suspense`.
 */
const ResolutorDelSolicitante = lazy(async () => ({
  default: (await import('./ResolutorDelSolicitante')).ResolutorDelSolicitante,
}));

/**
 * Lo que Autorizaciones y licencias compone alrededor de los bloques comunes
 * (#427, sobre los mecanismos de #422).
 *
 * Una sola opción, y las dos formas del resolutor a la vez, que es lo que hacía
 * falta para que «Emitir» pudiera emitir:
 *
 *   `controles`   **el número del recibo del derecho de trámite**, que
 *                 `CertificadoController` exige (`exigido(peticion.nDeRecibo(),
 *                 "nDeRecibo")`) y ninguna sección del catálogo dibuja. Es la
 *                 primera de las tres formas del hueco —lo teclea quien
 *                 atiende, leyéndolo del recibo que el administrado trae—, así
 *                 que basta declararlo: sin componente, como
 *                 `transito_descargos` (#422)
 *   `resolutores` **el solicitante**, que es un código y la pantalla teclea como
 *                 nombre. Ver `ResolutorDelSolicitante`
 *
 * Las dos llevan **su propia etiqueta** y ninguna reescribe la de un campo del
 * manual (RNF-080).
 */
export const COMPOSICION_DE_LICENCIAS: Readonly<Record<string, ComposicionDeOpcion>> = {
  certificados: {
    controles: [
      {
        campo: 'nDeRecibo',
        etiqueta: 'Nº de recibo del derecho de trámite',
        tipo: 'text',
        ph: '001-0000123',
        ayuda:
          'El recibo con que el administrado pagó el derecho de este certificado en la caja de tasas. El sistema comprueba contra él antes de emitir.',
        seccion: 'Datos del certificado',
      },
    ],
    resolutores: {
      solicitante: {
        campos: ['solicitante'],
        Control: ResolutorDelSolicitante,
      },
    },
  },
};
