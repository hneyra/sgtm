import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { entraCon, limpiarSesion } from '../../pruebas/sesion';

/**
 * **Los movimientos de deuda, una superficie de dos hojas** (#442 C).
 *
 * `alta_deuda` y `baja_deuda` tocan el mismo objeto —una obligacion de la cuenta
 * corriente— con dos actos opuestos, y hasta hoy pasar de uno a otro era volver
 * al menu.
 *
 * **Lo que esta bateria vigila no es que la tira exista, sino que no cueste
 * nada.** La otra mitad de eso la lleva `censo-de-rentas.test.tsx`, que monta
 * las quince y compara filtros, secciones, columnas, barra y franja contra lo
 * que dibujaban: si la superficie se hubiera llevado por delante un filtro o una
 * seccion —que es lo que pasa cuando una opcion entra en `COMPONENTES_PROPIOS`—,
 * el censo lo diria nombrando la opcion. Aqui se comprueba lo que el censo no
 * mira: la navegacion.
 */

const ALTA = '/rentas-registro/alta-deuda';
const BAJA = '/rentas-registro/baja-deuda';
const HOJA_DE_ALTA = 'Alta de deuda';
const HOJA_DE_BAJA = 'Baja de deuda';
const CONTRIBUYENTE = '00000006550';

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => {
  desinstalarProxyDeDatos();
  limpiarSesion();
});

const laTira = (): HTMLElement | null =>
  screen.queryByRole('tablist', { name: 'Hojas de Movimientos de deuda' });

describe('las dos hojas de los movimientos de deuda', () => {
  it('las dos dibujan la tira, con el rotulo del catalogo y la activa marcada', async () => {
    montarEnRuta(ALTA);
    await waitFor(() => expect(document.querySelector('.sgtm-esqueleto')).toBeNull());

    expect(laTira()).not.toBeNull();
    // Los rotulos son los titulos del catalogo, sin reescribir (RNF-080).
    expect(screen.getByRole('tab', { name: HOJA_DE_ALTA })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: HOJA_DE_BAJA })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('y desde la otra hoja, al reves', async () => {
    montarEnRuta(BAJA);
    await waitFor(() => expect(document.querySelector('.sgtm-esqueleto')).toBeNull());

    expect(screen.getByRole('tab', { name: HOJA_DE_BAJA })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: HOJA_DE_ALTA })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('cambiar de hoja NAVEGA: el enlace se puede compartir y el guardia vuelve a correr', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(ALTA);
    await waitFor(() => expect(document.querySelector('.sgtm-esqueleto')).toBeNull());

    // Es un enlace, no un boton: con `useState` el permiso de la otra hoja no lo
    // decidiria ningun guardia (REQ-03 §5).
    const aLaBaja = screen.getByRole('tab', { name: HOJA_DE_BAJA });
    expect(aLaBaja.tagName).toBe('A');
    expect(aLaBaja).toHaveAttribute('href', BAJA);

    await usuario.click(aLaBaja);
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(HOJA_DE_BAJA);
  });

  it('la busqueda viaja con el enlace: el contribuyente no se vuelve a teclear', async () => {
    montarEnRuta(`${BAJA}?codContribuyente=${CONTRIBUYENTE}`);
    await waitFor(() => expect(document.querySelector('.sgtm-esqueleto')).toBeNull());

    expect(screen.getByRole('tab', { name: HOJA_DE_ALTA })).toHaveAttribute(
      'href',
      `${ALTA}?codContribuyente=${CONTRIBUYENTE}`,
    );
  });

  /* **Las dos mitades, y la segunda es la que hace falta.**
     Una prueba que solo comprueba la ausencia pasa aunque la guarda no exista:
     los permisos se piden por red, y antes de que lleguen no hay ninguna
     pestaña que encontrar. Medido: sin el control positivo, quitar
     `puedeVer` del filtro dejaba las seis en verde. */
  it('con las dos hojas permitidas, la tira ofrece las dos', async () => {
    entraCon({ alta_deuda: ['lectura', 'registro'], baja_deuda: ['lectura', 'registro'] });
    montarEnRuta(BAJA);
    await waitFor(() => expect(laTira()).not.toBeNull());

    expect(screen.getByRole('tab', { name: HOJA_DE_ALTA })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: HOJA_DE_BAJA })).toBeInTheDocument();
  });

  it('la hoja que el perfil no puede ver no se ofrece, y entonces no hay tira', async () => {
    // Con una sola hoja visible no hay superficie: una tira de una pestaña es un
    // titulo con aspecto de navegacion.
    entraCon({ baja_deuda: ['lectura', 'registro'] });
    montarEnRuta(BAJA);
    // **Se espera a que la pantalla este montada del todo**: si no, esto pasaria
    // por no haber llegado todavia, no por la guarda.
    await waitFor(() => expect(document.querySelector('.sgtm-acciones')).not.toBeNull());

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(HOJA_DE_BAJA);
    expect(screen.queryByRole('tab', { name: HOJA_DE_ALTA })).not.toBeInTheDocument();
    expect(laTira()).toBeNull();
  });

  it('las hojas siguen siendo pantallas del catalogo: la primaria de cada una escribe', async () => {
    montarEnRuta(ALTA);
    await waitFor(() => expect(document.querySelector('.sgtm-esqueleto')).toBeNull());
    // No es un componente propio: sigue pasando por el renderizador comun, con
    // su formulario, su barra y su caja de observacion.
    expect(
      screen.getByRole('region', { name: 'Observación del usuario' }),
    ).toBeInTheDocument();
    expect(
      document.querySelector('.sgtm-acciones .sgtm-boton--primario')?.textContent?.trim(),
    ).toBe('Dar de alta');
  });
});
