import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';

/**
 * La constancia de no adeudo se exporta a `.xls` y `.rtf` (RNF-081, #72).
 *
 * Es el último criterio de #72 que quedaba a medias: la hoja se imprimía en A4
 * —el bloque de reporte ya la dibuja así— pero no se podía guardar en ningún
 * formato, porque `ConstanciaController` solo entregaba datos. Con
 * `?formato=PDF|XLS|RTF` el backend devuelve el documento, y esto comprueba lo
 * que le toca a la interfaz: que la acción existe, que manda **el formato que
 * se pulsó** y **la fecha de corte que está en pantalla**, y que no se ofrece
 * mientras no haya constancia que exportar.
 */

let peticiones: { url: string; metodo: string }[] = [];

beforeEach(() => {
  instalarProxyDeDatos({ latencia: false });
  peticiones = [];
  const proxy = globalThis.fetch;
  globalThis.fetch = (entrada, opciones) => {
    peticiones.push({
      url:
        typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url,
      metodo: opciones?.method ?? 'GET',
    });
    return proxy(entrada, opciones);
  };
  // jsdom no define ninguna de las dos, asi que no hay nada que `vi.spyOn`
  // pueda envolver: se asignan a mano, como en el reporte de la ficha.
  URL.createObjectURL = vi.fn(() => 'blob:simulado');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  desinstalarProxyDeDatos();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const RUTA = '/consultas/constancia/00000025673';
const OPERACION = '/api/v1/consultas/constancias/no-adeudo';

const aLaOperacion = () => peticiones.filter((p) => p.url.includes(OPERACION));
const conFormato = () => aLaOperacion().filter((p) => p.url.includes('formato='));

describe('la constancia se guarda en los tres formatos (RNF-081)', () => {
  it('«Descargar XLS» pide el archivo con formato=XLS y se lo entrega al navegador', async () => {
    montarEnRuta(RUTA);
    await screen.findByRole('button', { name: 'Descargar XLS' });
    // Hasta que la constancia no esta cargada no hay nada que exportar.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Descargar XLS' })).not.toBeDisabled(),
    );

    /* Lo que se guarda no es «un blob» cualquiera: es el archivo que la
       respuesta declara. El nombre se lee del enlace en el momento del clic, y
       sale del `Content-Disposition` que devuelve quien sirve la ruta. Es lo
       unico que distingue una descarga de verdad de un JSON bajado con otro
       nombre: sin esta asercion, quitarle al proxy la ruta de la constancia
       dejaba las seis pruebas en verde. */
    let nombreGuardado: string | undefined;
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      nombreGuardado = this.download;
    });
    await userEvent.click(screen.getByRole('button', { name: 'Descargar XLS' }));

    await waitFor(() => expect(conFormato()).toHaveLength(1));
    expect(conFormato()[0]?.url).toContain('formato=XLS');
    expect(conFormato()[0]?.url).toContain('codContribuyente=00000025673');

    await waitFor(() => expect(clic).toHaveBeenCalledTimes(1));
    expect(nombreGuardado).toBe('constancia-simulada.xls');
    clic.mockRestore();
  });

  it('«Descargar RTF» manda RTF, no el formato del boton de al lado', async () => {
    montarEnRuta(RUTA);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Descargar RTF' })).not.toBeDisabled(),
    );

    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await userEvent.click(screen.getByRole('button', { name: 'Descargar RTF' }));

    await waitFor(() => expect(conFormato()).toHaveLength(1));
    expect(conFormato()[0]?.url).toContain('formato=RTF');
    expect(conFormato()[0]?.url).not.toContain('formato=XLS');
  });

  it('los tres formatos de RF-132 estan, y ninguno mas', async () => {
    montarEnRuta(RUTA);
    await screen.findByRole('button', { name: 'Descargar PDF' });

    expect(screen.getByRole('button', { name: 'Descargar XLS' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Descargar RTF' })).toBeInTheDocument();
    // Y sigue existiendo el de imprimir: la hoja A4 no se sustituye por la
    // descarga, se le suma (RNF-084).
    expect(screen.getByRole('button', { name: 'Imprimir' })).toBeInTheDocument();
  });
});

describe('sin constancia cargada no hay nada que exportar', () => {
  it('los tres botones estan deshabilitados mientras la hoja no ha llegado, y dicen por que', async () => {
    // Se congela la lectura de la constancia para poder observar la hoja en
    // esqueleto: con la respuesta del proxy resuelve tan rapido que el estado
    // intermedio —el unico en que exportar bajaria un documento que nadie ha
    // visto— nunca llegaria a verse.
    let liberar: (() => void) | undefined;
    const congelada = new Promise<void>((resuelve) => (liberar = resuelve));
    const proxy = globalThis.fetch;
    globalThis.fetch = async (entrada, opciones) => {
      const url =
        typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
      if (url.includes(OPERACION) && !url.includes('formato=')) await congelada;
      return proxy(entrada, opciones);
    };

    montarEnRuta(RUTA);

    const xls = await screen.findByRole('button', { name: 'Descargar XLS' });
    expect(xls).toBeDisabled();
    expect(xls).toHaveAttribute('title', 'Primero hay que cargar el reporte');
    expect(screen.getByRole('button', { name: 'Descargar PDF' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Descargar RTF' })).toBeDisabled();
    // Y no se pidio ningun archivo por el camino.
    expect(conFormato()).toHaveLength(0);

    liberar?.();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Descargar XLS' })).not.toBeDisabled(),
    );
  });
});

describe('la descarga lleva la misma fecha de corte que la hoja que se mira', () => {
  it('con ?fecha= en la URL, el archivo se pide a esa fecha y no a la de hoy', async () => {
    montarEnRuta(`${RUTA}?fecha=2026-03-31`);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Descargar PDF' })).not.toBeDisabled(),
    );

    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await userEvent.click(screen.getByRole('button', { name: 'Descargar PDF' }));

    await waitFor(() => expect(conFormato()).toHaveLength(1));
    expect(conFormato()[0]?.url)
      // Una cifra sin su fecha es otra cifra tres dias despues (regla 9,
      // RNF-075): el papel tiene que salir del mismo corte que la pantalla.
      .toContain('fecha=2026-03-31');
  });
});

describe('lo que no cambia: sin formato, la constancia sigue siendo JSON', () => {
  it('abrir la pantalla no pide ningun archivo, solo la constancia', async () => {
    montarEnRuta(RUTA);
    await screen.findByText(/SE EMITE|SE NIEGA/);

    await waitFor(() => expect(aLaOperacion()).toHaveLength(1));
    expect(aLaOperacion()[0]?.url).not.toContain('formato=');
  });
});
