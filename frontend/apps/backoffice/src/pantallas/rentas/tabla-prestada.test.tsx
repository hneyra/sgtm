import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { entraCon, limpiarSesion } from '../../pruebas/sesion';
import { OPCIONES } from '../../catalogo';
import { COMPOSICION_DE_RENTAS } from './composicion';

/**
 * **La lista de predios, donde habia seis contadores en blanco** (#503 F2).
 *
 * «Unidades afectas del contribuyente» son seis campos de solo lectura y
 * `ContribuyenteResource` **no publica ninguno**: los seis salen «—». La lista
 * de verdad ya existe —es la de `predios_rentas`, otra opcion del mismo
 * destino— y esta seccion la toma prestada con su operacion, su tabla, su
 * permiso y su titulo.
 *
 * Los seis contadores **se quedan**: son campos del manual (RNF-080), y lo que
 * les falta es que el backend los publique.
 *
 * **Y la seccion sigue arrancando cerrada**, que es lo que su `hint` del
 * prototipo pide —«Solo lectura», uno de los tres que FRO-03 §5 colapsa—. No se
 * le cambia: el indice lleva a ella y abrirla es un clic, que es mucho menos que
 * los nueve que costaba antes de #330 y que los seis guiones que habia dentro.
 */

/** Abre la seccion, que arranca cerrada por su `hint` del prototipo. */
async function abrirLasUnidades(usuario: ReturnType<typeof userEvent.setup>): Promise<void> {
  await usuario.click(
    await screen.findByRole(
      'button',
      { name: /Unidades afectas del contribuyente/ },
      { timeout: 5000 },
    ),
  );
}

const CONTRIBUYENTE = '00000025673';
/* En la ruta, no en el filtro: el expediente se abre por el registro (#503). */
const PADRON = `/rentas-registro/contribuyentes/${CONTRIBUYENTE}`;

let pedidas: string[] = [];

beforeEach(() => {
  instalarProxyDeDatos({ latencia: false });
  pedidas = [];
  const proxy = globalThis.fetch;
  globalThis.fetch = (entrada, opciones) => {
    pedidas.push(typeof entrada === 'string' ? entrada : String(entrada));
    return proxy(entrada, opciones);
  };
});
afterEach(() => {
  limpiarSesion();
  desinstalarProxyDeDatos();
});

describe('la guarda: una tabla prestada no cruza de modulo', () => {
  /**
   * **Las conexiones llegan con el trozo de su modulo** (#433). Tomar prestada
   * la tabla de otro modulo traeria ese trozo al abrir esta pantalla, y —peor—
   * dejaria a quien tiene este modulo y no el otro con un aviso de permiso
   * dentro de su propio expediente.
   */
  it('cada tabla prestada es de una opcion del mismo modulo', () => {
    for (const [id, composicion] of Object.entries(COMPOSICION_DE_RENTAS)) {
      const suyo = OPCIONES.find((o) => o.id === id)?.modulo.id;
      for (const prestada of composicion.tablasPrestadas ?? []) {
        const ajeno = OPCIONES.find((o) => o.id === prestada.opcion);
        expect(ajeno, `${id} presta de «${prestada.opcion}», que no existe`).toBeDefined();
        expect(ajeno?.modulo.id, `${id} presta de otro modulo`).toBe(suyo);
      }
    }
  });

  it('la seccion que nombra existe en el catalogo de esa opcion', async () => {
    const { PANTALLAS } = await import('../../catalogo/pantallas/rentas-registro.generado');
    for (const [id, composicion] of Object.entries(COMPOSICION_DE_RENTAS)) {
      for (const prestada of composicion.tablasPrestadas ?? []) {
        const secciones = (PANTALLAS[id]?.tabs ?? []).flatMap((tab) => tab.secciones);
        expect(
          secciones.some((seccion) => seccion.label === prestada.seccion),
          `${id}: la sección «${prestada.seccion}»`,
        ).toBe(true);
      }
    }
  });
});

describe('la tabla, dibujada bajo la seccion', () => {
  it('los seis contadores del manual se quedan, y la lista va debajo', { timeout: 20000 }, async () => {
    const usuario = userEvent.setup();
    montarEnRuta(PADRON);
    await abrirLasUnidades(usuario);

    // Los seis siguen siendo campos del manual, con su rótulo.
    for (const contador of ['Predios registrados', 'Autovalúo acumulado (S/)', 'Vehículos afectos']) {
      expect(await screen.findByLabelText(contador), contador).toBeInTheDocument();
    }

    // Y la lista de predios llega con las columnas de `predios_rentas`.
    const tabla = await waitFor(
      () => {
        const encontrada = [...document.querySelectorAll('.sgtm-tabla')].find((nodo) =>
          nodo.textContent?.includes('Código predial'),
        );
        expect(encontrada).toBeDefined();
        return encontrada as HTMLElement;
      },
      { timeout: 5000 },
    );
    expect(within(tabla).getByText('Uso')).toBeInTheDocument();
  });

  /**
   * **Sin el permiso de la opcion prestada no se pide nada y se dice cual
   * falta.** Una tabla vacia se leeria como «no tiene predios», que es una
   * afirmacion — y falsa (ADR-0016 §2).
   */
  it('sin el permiso de «Predios del contribuyente», nombra la que falta', { timeout: 20000 }, async () => {
    const usuario = userEvent.setup();
    entraCon({ contribuyentes: ['lectura'] });
    montarEnRuta(PADRON);
    await abrirLasUnidades(usuario);

    expect(
      await screen.findByText(/Falta «Predios del contribuyente»/, undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
    // Y ninguna tabla de predios: no se pide, no se dibuja.
    await waitFor(() =>
      expect(
        [...document.querySelectorAll('.sgtm-tabla')].some((n) =>
          n.textContent?.includes('Código predial'),
        ),
      ).toBe(false),
    );
  });
});

/**
 * **Y los vehículos, desde #524.** Antes no se podían dibujar: la única lectura
 * que los lista por contribuyente vivía en el módulo Consultas, y prestarla de
 * otro módulo traería su trozo aquí y dejaría a quien tiene Rentas y no
 * Consultas con un aviso de permiso ajeno dentro de su propio expediente.
 *
 * Lo que hay ahora es `GET /rentas/vehiculos`, detrás del permiso de «Ficha de
 * vehículo» —la opción de Rentas que ya existía—. Es el primer caso en que la
 * tabla prestada **nombra su operación**: la de la opción es la ficha por placa,
 * que no lista nada.
 */
describe('la segunda tabla prestada: los vehículos', () => {
  it(
    'se dibuja con las columnas del catálogo de «Ficha de vehículo»',
    { timeout: 20000 },
    async () => {
      const usuario = userEvent.setup();
      montarEnRuta(PADRON);
      await abrirLasUnidades(usuario);

      const tabla = await waitFor(
        () => {
          const encontrada = [...document.querySelectorAll('.sgtm-tabla')].find((nodo) =>
            nodo.textContent?.includes('Año fab.'),
          );
          expect(encontrada).toBeDefined();
          return encontrada as HTMLElement;
        },
        { timeout: 5000 },
      );
      // Las ocho del catálogo, sin redactar ninguna (RNF-080).
      for (const columna of ['Est.', 'Placa', 'Clase', 'Marca', 'Modelo', 'Afectación']) {
        expect(within(tabla).getByText(columna), columna).toBeInTheDocument();
      }

      /* **Y con filas dentro, que es la mitad que de verdad protege.** Las
         cabeceras salen del catálogo y se dibujan con cero filas: una prueba que
         sólo las mirara pasaría en verde con la tabla vacía, que es exactamente
         el defecto de #363. Medido: leerla por la operación de la opción —la
         ficha por placa, que no lista nada— deja las ocho cabeceras y ni una
         fila. */
      const filas = tabla.querySelectorAll('tbody tr');
      expect(filas.length, 'la colección trae vehículos, no sólo cabeceras').toBeGreaterThan(0);
      expect(filas[0]?.querySelectorAll('td').length).toBe(8);

      /* **Y se pidió a la colección, con su contribuyente.** Es lo único que
         distingue lo correcto de lo plausible: la operación de la opción es la
         ficha **por placa**, y en el proxy —que sirve las 134 en la forma
         común— pedirla por ahí devuelve una tabla con filas igualmente. Con el
         backend de verdad esa misma confusión daría la forma que no es y la
         tabla saldría vacía en silencio, que es el defecto de #363. */
      expect(
        pedidas.some(
          (url) => url.includes('/rentas/vehiculos?') && url.includes('contribuyente='),
        ),
        `se pidió la colección; lo pedido fue: ${pedidas.filter((u) => u.includes('vehiculos')).join(' | ')}`,
      ).toBe(true);
      expect(
        pedidas.some((url) => /\/rentas\/vehiculos\/[^?]/.test(url)),
        'y no la ficha por placa, que no lista nada',
      ).toBe(false);
    },
  );

  /**
   * **La conexión se nombra aparte, y por eso hay dos claves.** La operación de
   * `vehiculos` es `GET /rentas/vehiculos/{placa}` —la ficha— y no lista nada;
   * leerla por ahí dejaría la tabla vacía en silencio, que es el defecto de #363.
   */
  it('la declaración nombra la operación de la colección, no la de la ficha', () => {
    const prestadas = COMPOSICION_DE_RENTAS['contribuyentes']?.tablasPrestadas ?? [];
    const deVehiculos = prestadas.find((tabla) => tabla.opcion === 'vehiculos');
    expect(deVehiculos?.conexion).toBe('vehiculos_del_contribuyente');
    // Y la de predios no la necesita: su opción sí lista.
    expect(prestadas.find((tabla) => tabla.opcion === 'predios_rentas')?.conexion).toBeUndefined();
  });

  it('sin el permiso de «Ficha de vehículo», nombra la que falta', { timeout: 20000 }, async () => {
    const usuario = userEvent.setup();
    entraCon({ contribuyentes: ['lectura'], predios_rentas: ['lectura'] });
    montarEnRuta(PADRON);
    await abrirLasUnidades(usuario);

    expect(
      await screen.findByText(/Falta «Ficha de vehículo»/, undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
    // Y la de predios sí se dibuja: un permiso no se lleva por delante al otro.
    await waitFor(() =>
      expect(
        [...document.querySelectorAll('.sgtm-tabla')].some((n) =>
          n.textContent?.includes('Código predial'),
        ),
      ).toBe(true),
    );
  });
});
