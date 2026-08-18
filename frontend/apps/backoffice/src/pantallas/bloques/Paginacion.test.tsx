import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DatosDeTabla } from '@sgtm/api-client';
import type { EstructuraDeTabla } from '../../catalogo';
import { TablaDePantalla } from './TablaDePantalla';

/**
 * El paginador se dibuja **cuando el servidor pagina**, y no antes.
 *
 * Cuantas filas hay solo lo sabe el servidor: un padron del manual son cientos
 * de miles. Un paginador que no sabe el total no puede decir si hay pagina
 * siguiente, asi que mientras la respuesta no traiga la paginacion no hay nada
 * que pintar.
 */

const ESTRUCTURA: EstructuraDeTabla = {
  title: 'Padrón',
  cols: ['Código', 'Nombre'],
  claves: ['codigo', 'nombre'],
};

const FILAS: DatosDeTabla = { filas: [[{ texto: '001' }, { texto: 'SANTA ROSA' }]] };

describe('el paginador', () => {
  it('no aparece si la respuesta no pagina', () => {
    render(
      <TablaDePantalla
        estructura={ESTRUCTURA}
        datos={FILAS}
        cargando={false}
        onPagina={() => {}}
      />,
    );
    expect(screen.queryByRole('navigation', { name: /Paginación/ })).not.toBeInTheDocument();
  });

  it('dice en que pagina se esta, de cuantas', () => {
    render(
      <TablaDePantalla
        estructura={ESTRUCTURA}
        datos={{ ...FILAS, paginacion: { pagina: 2, tamano: 50, filas: 320 } }}
        cargando={false}
        onPagina={() => {}}
      />,
    );
    expect(screen.getByText('Página 2 de 7')).toBeInTheDocument();
  });

  it('en la primera no deja retroceder; en la ultima, avanzar', () => {
    const { unmount } = render(
      <TablaDePantalla
        estructura={ESTRUCTURA}
        datos={{ ...FILAS, paginacion: { pagina: 1, tamano: 50, filas: 60 } }}
        cargando={false}
        onPagina={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled();
    unmount();

    render(
      <TablaDePantalla
        estructura={ESTRUCTURA}
        datos={{ ...FILAS, paginacion: { pagina: 2, tamano: 50, filas: 60 } }}
        cargando={false}
        onPagina={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });

  it('pasar de pagina pide la siguiente, no reordena lo que ya hay', async () => {
    const usuario = userEvent.setup();
    const pedida = vi.fn();
    render(
      <TablaDePantalla
        estructura={ESTRUCTURA}
        datos={{ ...FILAS, paginacion: { pagina: 2, tamano: 50, filas: 320 } }}
        cargando={false}
        onPagina={pedida}
      />,
    );
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(pedida).toHaveBeenCalledWith(3);
  });
});

describe('ordenar es del servidor', () => {
  it('la cabecera pide el orden por el nombre de la columna, no reordena las filas', async () => {
    const usuario = userEvent.setup();
    const ordenada = vi.fn();
    render(
      <TablaDePantalla
        estructura={ESTRUCTURA}
        datos={FILAS}
        cargando={false}
        onOrdenar={ordenada}
      />,
    );
    await usuario.click(screen.getByRole('button', { name: 'Código' }));
    expect(ordenada).toHaveBeenCalledWith('codigo');
  });

  it('sin quien atienda el orden, la cabecera no promete que se pueda ordenar', () => {
    render(<TablaDePantalla estructura={ESTRUCTURA} datos={FILAS} cargando={false} />);
    expect(screen.queryByRole('button', { name: 'Código' })).not.toBeInTheDocument();
  });
});
