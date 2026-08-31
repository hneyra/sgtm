import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { SeccionDePantalla } from '../../catalogo';
import { IndiceDeSecciones } from './IndiceDeSecciones';

/**
 * El rótulo del índice, honesto sobre qué cuenta (#342, nit 4).
 *
 * «predial_individual» —único hoy con `previa`— ya se comprueba de punta a
 * punta en `memoria-del-predial.test.tsx`. Lo que se aísla aquí es la palabra
 * en sí, en las dos formas: sin `previa` sigue diciendo «secciones», como
 * decía antes de #342; con `previa` pasa a «bloques», porque una de las
 * entradas no es una sección del catálogo, es la tabla.
 */

const SECCIONES: readonly SeccionDePantalla[] = [
  { label: 'Datos generales', campos: [] },
  { label: 'Ubicación', campos: [] },
];

const ANCLA_DE = (indice: number): string => `ancla-${indice}`;

describe('el eyebrow del indice cuenta lo que realmente lista', () => {
  it('sin `previa`, sigue diciendo «secciones»: nada cambia para las demas pantallas', () => {
    render(<IndiceDeSecciones secciones={SECCIONES} anclaDe={ANCLA_DE} />);
    expect(screen.getByText('2 secciones')).toBeInTheDocument();
  });

  it('con `previa`, la entrada de la tabla se cuenta pero no se llama sección', () => {
    render(
      <IndiceDeSecciones
        secciones={SECCIONES}
        anclaDe={ANCLA_DE}
        previa={{ rotulo: 'Predios que integran la base', ancla: 'sgtm-tabla-de-la-pantalla' }}
      />,
    );
    // Tres entradas en total (la tabla + las dos secciones), y ninguna la
    // llama «sección»: sería falso para la primera.
    expect(screen.getByText('3 bloques')).toBeInTheDocument();
    expect(screen.queryByText(/secciones?/)).not.toBeInTheDocument();
  });

  it('con `previa` y una sola sección, «1 bloque» sigue en singular', () => {
    render(
      <IndiceDeSecciones
        secciones={[]}
        anclaDe={ANCLA_DE}
        previa={{ rotulo: 'Predios que integran la base', ancla: 'sgtm-tabla-de-la-pantalla' }}
      />,
    );
    expect(screen.getByText('1 bloque')).toBeInTheDocument();
  });
});
