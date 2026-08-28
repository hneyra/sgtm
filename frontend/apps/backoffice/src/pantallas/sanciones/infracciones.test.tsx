import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { permisosDelClaim, puedeVer } from '../../app/sesion/permisos';
import { cifrasDeLaTabla, cifrasEnPantalla, cifrasServidas } from '../../pruebas/cifras';
import { montarEnRuta } from '../../pruebas/montar';
import { motivoDeLaPrimaria, primariaApagada } from '../../pruebas/acciones';

/**
 * Infracciones administrativas (#78).
 *
 * Comparte contexto con Transito y una diferencia que la interfaz tiene que
 * respetar: aqui **la notificacion previa es un paso obligatorio del
 * procedimiento**, no un documento que se emite despues. Una interfaz que
 * permita levantar el acta sin ella invita a un vicio de nulidad.
 *
 * Ninguno de sus trece endpoints existe. Lo que se comprueba es lo que ya se
 * puede: que los reportes **reusan** el bloque de #77 en vez de copiarlo, que
 * ninguna cifra de sancion se recompone, que toda escritura pide observacion, y
 * que quien no tiene el modulo no lo ve.
 */

/** Las dos pantallas del modulo que son hoja de reporte. */
const HOJAS: readonly string[] = ['adm-resolucion-gerencia', 'adm-notificacion-resolucion'];

/** Las tres que escriben. */
const ESCRIBEN: readonly string[] = ['adm-notificacion', 'adm-valores', 'adm-reportes'];

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => desinstalarProxyDeDatos());

/** Espera a que la pantalla este dibujada de verdad, no solo titulada (#76). */
async function dibujada(selector: string): Promise<void> {
  await screen.findByRole('heading', { level: 1 });
  await waitFor(() => expect(document.querySelector(selector)).not.toBeNull());
}

describe('los reportes reusan el bloque de #77, no una copia', () => {
  it.each(HOJAS)(
    '%s se dibuja con la misma hoja, con sus firmas y sin imprimir la interfaz',
    async (ranura) => {
      const montada = montarEnRuta(`/infracciones-administrativas/${ranura}`);
      await dibujada('[data-hoja="1"]');

      const hoja = document.querySelector('[data-hoja="1"]');
      expect(hoja?.querySelector('.sgtm-hoja__firmas')?.textContent).toContain('Contribuyente');
      expect(
        document.querySelector('.sgtm-hoja__botones')?.getAttribute('data-no-imprimible'),
      ).toBe('1');

      montada.unmount();
    },
  );
});

describe('ninguna cifra de sancion se recompone', () => {
  it('el estado de cuenta ensena lo que sirvio la API, tal cual', async () => {
    montarEnRuta('/infracciones-administrativas/adm-estado-cuenta');
    await dibujada('table');
    // Una fila con datos, no la tabla vacia con su esqueleto (#76, #77).
    await waitFor(() => expect(cifrasEnPantalla().length).toBeGreaterThan(0));

    const servidas = cifrasServidas('adm_estado_cuenta');
    // El importe de la sancion sale del CUIS y de la UIT vigente el dia de la
    // infraccion. Recomponerlo al mostrar haria que la pantalla dejara de decir
    // lo que dice el documento notificado (RNF-083).
    for (const cifra of cifrasEnPantalla()) expect(servidas).toContain(cifra);
    // Y en la otra direccion: cada cifra de la respuesta sigue estando en la
    // pantalla. Sin esto, una transformacion que cambie el formato se escapa
    // —deja de parecer dinero y se cae del filtro—.
    for (const cifra of cifrasDeLaTabla('adm_estado_cuenta'))
      expect(cifrasEnPantalla()).toContain(cifra);
  });
});

/**
 * **La semantica que cambio en #332.** Estas tres decian «no habilita su accion
 * primaria sin observacion, y con ella si»: era cierto y era el defecto. Ninguna
 * de las tres declara su escritura en `escrituras.ts`, asi que lo que la
 * observacion habilitaba era mandar **solo la observacion** —un acto que el
 * backend rechaza, o que no rechaza nadie porque no existe—.
 *
 * Ahora la primaria se queda apagada y **dice por que**. La observacion sigue
 * siendo la condicion de guardado de toda opcion que si escribe (regla 10,
 * RNF-052): eso se comprueba en `pantallas/escritura.test.tsx`, sobre las que
 * pueden recorrer el camino entero.
 */
describe('ningun acto de este modulo promete lo que no puede', () => {
  it.each(ESCRIBEN)('%s deja su primaria apagada, y la franja dice por que', async (ranura) => {
    const montada = montarEnRuta(`/infracciones-administrativas/${ranura}`);
    await dibujada('.sgtm-acciones');

    primariaApagada();

    // Sin declaracion no hay a donde escribir, asi que tampoco hay caja de
    // observacion: pedirla seria pedirla para nada.
    expect(
      screen.queryByRole('region', { name: 'Observación del usuario' }),
    ).not.toBeInTheDocument();

    expect(motivoDeLaPrimaria()).toMatch(/Registra el acto por el procedimiento actual/);
    expect(document.getElementById('sgtm-motivo-de-la-accion')).toHaveAttribute('data-causa');

    montada.unmount();
  });
});

describe('las notificaciones vencidas son una pantalla de trabajo', () => {
  it('se abren sin filtrar: es la lista de lo que hay que atender hoy', async () => {
    const peticiones: string[] = [];
    const proxy = globalThis.fetch;
    globalThis.fetch = (entrada, opciones) => {
      peticiones.push(typeof entrada === 'string' ? entrada : String(entrada));
      return proxy(entrada, opciones);
    };

    montarEnRuta('/infracciones-administrativas/adm-notificaciones-vencidas');
    await dibujada('table');

    const suya = peticiones.filter((u) => u.includes('/reportes/vencidas'));
    expect(suya).toHaveLength(1);
    // Sin un solo filtro: quien la abre quiere ver **todo** lo vencido, no un
    // subconjunto que alguien eligio por el.
    expect(suya[0]).not.toContain('?');

    globalThis.fetch = proxy;
  });
});

describe('el operador de licencias no ve este modulo', () => {
  it('no ve ninguna de sus opciones, y si las suyas', () => {
    const LICENCIAS = permisosDelClaim({
      licencia_funcionamiento: ['lectura', 'registro'],
      ciiu: ['lectura'],
      certificados: ['lectura', 'impresion'],
    });

    for (const opcion of ['infracciones_adm', 'adm_notificacion', 'adm_resolucion_gerencia']) {
      expect(puedeVer(LICENCIAS, opcion)).toBe(false);
    }
    expect(puedeVer(LICENCIAS, 'licencia_funcionamiento')).toBe(true);
  });
});
