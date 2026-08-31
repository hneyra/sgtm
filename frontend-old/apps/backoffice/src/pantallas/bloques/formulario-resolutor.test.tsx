import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CampoResolutor, ResolutorProps } from '../composicion';
import type { SeccionDePantalla } from '../../catalogo';

/**
 * **Un control propio solo escribe lo que declaró llenar** (revisión de #331).
 *
 * El agujero que cierra no se ve desde ninguna pantalla: `Formulario` le pasaba
 * al resolutor el `fijarCampo` de la pantalla entera, y ese acepta **cualquier
 * clave que la opción declare**. Un control que llenara `codContribuyente` —o
 * un importe— lo conseguía sin que nada lo dijera, y el cuerpo salía con un
 * campo que el operador no escribió y que nadie puede rastrear hasta un gesto.
 *
 * `CampoResolutor.campos` existe justamente para declarar qué llena. Aquí se
 * comprueba que se hace valer, y se comprueba **con la muestra que lo viola**:
 * un resolutor que intenta salirse de lo suyo. Sin ese control, una prueba
 * sobre el resolutor de verdad —que se porta bien— pasaría igual con la guarda
 * quitada.
 *
 * El registro de composiciones se sustituye entero porque es lo que
 * `Formulario` consulta; este archivo no prueba ninguna otra cosa de él.
 */

/** El resolutor que se porta mal: escribe lo suyo **y cuatro cosas más**. */
function ResolutorQueSeSaleDeLoSuyo({ onCampo }: ResolutorProps) {
  return (
    <button
      type="button"
      onClick={() => {
        onCampo('predioId', '7');
        onCampo('unidadResuelta', '{"id":"7"}');
        // Lo que ninguna de las dos declaraciones le da derecho a tocar.
        onCampo('codContribuyente', '00000000001');
        onCampo('insolutoS', '999999.00');
        onCampo('conceptoTributo', 'IMPUESTO PREDIAL');
      }}
    >
      Resolver
    </button>
  );
}

const DECLARADO: CampoResolutor = {
  campos: ['predioId'],
  memoria: ['unidadResuelta'],
  Control: ResolutorQueSeSaleDeLoSuyo,
};

vi.mock('../composicion', () => ({
  resolutorDeCampo: (_opcion: string, campo: string): CampoResolutor | undefined =>
    campo === 'unidadPredioPlaca' ? DECLARADO : undefined,
  // Esta prueba mira el resolutor, no como se lee la seccion (#393): ninguna
  // seccion es memoria de calculo aqui, que es lo que declaran 129 de las 134.
  memoriaDeSeccion: () => undefined,
  // Ni ningun control anadido (#422): eso lo mira `formulario-controles.test.tsx`.
  controlesDeLaSeccion: () => [],
  // Ni ninguna tabla prestada (#503 F2).
  tablasDeLaSeccion: () => [],
}));

const { Formulario } = await import('./Formulario');

const SECCION: readonly SeccionDePantalla[] = [
  {
    label: 'Deuda a dar de alta',
    campos: [{ clave: 'unidadPredioPlaca', label: 'Unidad (predio / placa)', t: 'text' }],
  },
];

describe('el resolutor no escribe fuera de lo que declara', () => {
  it('pasa lo declarado y descarta lo demas, aunque la opcion lo tenga declarado', async () => {
    const usuario = userEvent.setup();
    const escrito: [string, string][] = [];

    render(
      <Formulario
        opcion="alta_deuda"
        secciones={SECCION}
        valores={{}}
        cargando={false}
        cerradas={{}}
        onAlternar={() => {}}
        pestana={0}
        // **La opción sí declara los otros cuatro**: es una pantalla de alta de
        // deuda. Lo que los deja fuera no es la lista blanca de la escritura,
        // es la declaración de este control.
        escribibles={
          new Set([
            'predioId',
            'vehiculoId',
            'unidadResuelta',
            'codContribuyente',
            'insolutoS',
            'conceptoTributo',
          ])
        }
        borrador={{}}
        onCampo={(campo, valor) => escrito.push([campo, valor])}
      />,
    );

    await usuario.click(await screen.findByRole('button', { name: 'Resolver' }));

    expect(escrito).toEqual([
      ['predioId', '7'],
      ['unidadResuelta', '{"id":"7"}'],
    ]);
  });
});
