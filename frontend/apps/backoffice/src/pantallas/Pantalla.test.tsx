import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../pruebas/montar';

/**
 * El renderizador compone una pantalla a partir del catalogo y de la respuesta
 * de la API.
 *
 * Se prueba con el **proxy de datos instalado**, es decir, pidiendo por HTTP:
 * es el mismo camino que recorrera contra el backend. Una prueba que inyectara
 * los datos por props no diria nada sobre si la integracion funciona.
 */

beforeEach(() => instalarProxyDeDatos());
afterEach(() => desinstalarProxyDeDatos());

describe('la estructura se ve antes que los datos', () => {
  it('las columnas de la tabla estan desde el primer fotograma; las filas llegan despues', async () => {
    // Con el registro en la ruta: esta pantalla abre una ficha, y sin codigo no
    // pide nada —antes se pedia con un valor de relleno—.
    montarEnRuta('/catastro/ficha-urbana/200601010150010101001');

    // El catalogo ya sabe que columnas hay: no hay que esperar a nadie.
    expect(screen.getByRole('columnheader', { name: 'Nombre Calle' })).toBeInTheDocument();

    // Las filas son de la API, y llegan cuando llegan.
    expect(screen.queryByText('SANTA ROSA')).not.toBeInTheDocument();
    expect(await screen.findByText('SANTA ROSA')).toBeInTheDocument();
  });
});

describe('los bloques del descriptor', () => {
  it('el panel de recaudacion pinta indicadores y paneles con su avance', async () => {
    montarEnRuta('/inicio/inicio');

    expect(await screen.findByText('S/ 18.42 M')).toBeInTheDocument();
    expect(screen.getByText('Recaudado 2026')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Avance 89 %' })).toBeInTheDocument();
  });

  it('una celda con tono se pinta como insignia, con su texto dentro', async () => {
    montarEnRuta('/transito/papeletas');

    const tabla = (await screen.findAllByRole('table'))[0];
    expect(tabla).toBeDefined();
    if (!tabla) return;
    // El encabezado de la tabla existe desde el principio; las insignias llegan
    // con las filas, asi que hay que esperarlas.
    const insignias = await within(tabla).findAllByText(/./, { selector: '.sgtm-insignia' });
    expect(insignias.length).toBeGreaterThan(0);
    // Sin informacion solo por color (FRO-04 §7): la insignia siempre lleva texto.
    expect(insignias.every((i) => (i.textContent ?? '').trim().length > 0)).toBe(true);
  });

  it('los campos de solo lectura muestran el valor que sirvio la API', async () => {
    montarEnRuta('/catastro/ficha-urbana/200601010150010101001');
    await waitFor(() =>
      expect(screen.getAllByText('200601010150010101001').length).toBeGreaterThan(0),
    );
  });

  it('la barra de acciones deja la ultima como primaria', async () => {
    montarEnRuta('/catastro/ficha-urbana/200601010150010101001');
    // El catalogo declara «Nuevo · Modificar · Deshacer · Imprimir · Guardar»,
    // y la ultima es la primaria (FRO-03 §5).
    const primaria = await screen.findByRole('button', { name: 'Guardar' });
    expect(primaria).toHaveClass('sgtm-boton--primario');
    expect(screen.getByRole('button', { name: 'Nuevo' })).toHaveClass('sgtm-boton--secundario');
  });

  it('el reporte se puede imprimir y su hoja lleva las dos firmas', async () => {
    montarEnRuta('/consultas/constancia');
    // La hoja y la barra de acciones ofrecen «Imprimir» las dos, como en el
    // prototipo; aqui interesa la de la hoja.
    const hoja = await screen.findByText('Cajero / Responsable');
    expect(hoja).toBeInTheDocument();
    expect(screen.getByText('Contribuyente')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Imprimir' }).length).toBeGreaterThan(0);
    // Los datos del documento —codigo y fecha— vienen de la API, no del catalogo.
    expect(await screen.findByText('CNA-2026-01184')).toBeInTheDocument();
  });
});

describe('las secciones colapsables', () => {
  it('«Opcional» arranca cerrada y el resto abiertas', async () => {
    montarEnRuta('/rentas-registro/predial-individual');

    const opcional = await screen.findByRole('button', { name: /Beneficios aplicados/ });
    expect(opcional).toHaveAttribute('aria-expanded', 'false');

    const sinHint = screen.getByRole('button', { name: /Escala progresiva acumulativa/ });
    expect(sinHint).toHaveAttribute('aria-expanded', 'true');
  });

  it('«Solo lectura» tambien arranca cerrada', async () => {
    montarEnRuta('/coactiva/proceso-coactivo');
    const soloLectura = await screen.findByRole('button', { name: /Deuda del expediente/ });
    expect(soloLectura).toHaveAttribute('aria-expanded', 'false');
  });

  it('se abren y se cierran al pulsarlas', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/catastro/ficha-urbana');

    const cabecera = await screen.findByRole('button', {
      name: /Ficha catastral urbana individual/,
    });
    expect(cabecera).toHaveAttribute('aria-expanded', 'true');
    await usuario.click(cabecera);
    expect(cabecera).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('las pestanas', () => {
  it('cambiar de pestana cambia las secciones que se ven', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/catastro/ficha-urbana');

    const pestanas = await screen.findAllByRole('tab');
    expect(pestanas[0]).toHaveAttribute('aria-selected', 'true');

    const segunda = pestanas[1];
    expect(segunda).toBeDefined();
    if (!segunda) return;
    await usuario.click(segunda);
    expect(segunda).toHaveAttribute('aria-selected', 'true');
    expect(pestanas[0]).toHaveAttribute('aria-selected', 'false');
  });
});

describe('cuando la API falla', () => {
  it('se muestra el mensaje del backend, no uno inventado', async () => {
    // El proxy responde 404 a lo que no esta en el contrato; se fuerza pidiendo
    // una operacion que el catalogo no declara.
    desinstalarProxyDeDatos();
    instalarProxyDeDatos();
    montarEnRuta('/catastro/no-existe');

    expect(await screen.findByText('Esa opción no existe en el catálogo')).toBeInTheDocument();
  });
});
