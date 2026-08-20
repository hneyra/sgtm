import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { permisosDelClaim, puedeVer } from '../../app/sesion/permisos';
import { montarEnRuta } from '../../pruebas/montar';

/**
 * Coactiva (#76): el procedimiento con mas consecuencias juridicas del sistema.
 *
 * Ninguno de sus doce endpoints existe todavia. Lo que se comprueba aqui son
 * las tres propiedades que no dependen del servidor y que, si se rompen, hacen
 * que la pantalla **contradiga el modelo**: que ningun acto ya registrado se
 * pueda editar ni quitar, que un plazo vencido se vea sin depender del color, y
 * que quien no puede emitir un REC no lo vea.
 */

/** Las doce opciones del modulo, por su ranura. */
const LAS_DOCE: readonly string[] = [
  'coactiva-expedientes',
  'importacion-valores',
  'proceso-coactivo',
  'rec-impresion',
  'expediente-historial',
  'cambiar-direccion-ref',
  'costas-procesales',
  'fraccionamiento-coactivo',
  'actos-coactivos',
  'notificaciones-coactivas',
  'coactiva-consulta-deudas',
  'coactiva-deudas-beneficio',
];

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => desinstalarProxyDeDatos());

/**
 * Espera a que la pantalla este **dibujada de verdad**.
 *
 * El titulo lo da el catalogo de navegacion y llega enseguida; los bloques
 * llegan con el trozo del modulo, que se carga aparte (#69). Esperar solo al
 * titulo deja una pagina a medio dibujar sobre la que cualquier comprobacion
 * pasa sola —no encuentra lo que busca porque todavia no esta—, que es
 * exactamente como un `e2e` de este repositorio estuvo pasando por accidente.
 */
async function dibujada(): Promise<void> {
  await screen.findByRole('heading', { level: 1 });
  await waitFor(() => expect(document.querySelector('.sgtm-acciones')).not.toBeNull());
}

describe('ningun acto ya registrado se puede editar ni quitar', () => {
  /**
   * El prototipo dibuja «Modificar», «Quitar» y «Deshacer» en cuatro de estas
   * pantallas, y son las etiquetas del sistema de escritorio del que salio el
   * manual. El backend de coactiva **no sobrescribe**: el historial del
   * expediente *es* el expediente. Una interfaz que dejara pulsarlas
   * contradiria el modelo, y quien la usara se llevaria una idea equivocada de
   * lo que el sistema garantiza.
   */
  const MODIFICAN = /modificar|quitar|deshacer|eliminar|borrar/i;

  it.each(LAS_DOCE)('%s no habilita ninguna accion que modifique lo asentado', async (ranura) => {
    const usuario = userEvent.setup();
    const montada = montarEnRuta(`/coactiva/${ranura}`);
    await dibujada();

    // **Con todo listo para guardar**, que es lo que hace que la prueba diga
    // algo: sin observacion no se habilita nada y la comprobacion pasaria sola.
    const caja = screen.queryByRole('region', { name: 'Observación del usuario' });
    if (caja) await usuario.type(within(caja).getByLabelText('Observación'), 'Acto del proceso.');

    const sospechosas = [
      ...document.querySelectorAll<HTMLButtonElement>('.sgtm-acciones .sgtm-boton'),
    ].filter((boton) => MODIFICAN.test(boton.textContent ?? ''));

    for (const boton of sospechosas) {
      expect((boton as HTMLButtonElement).disabled).toBe(true);
    }

    montada.unmount();
  });
});

describe('un plazo vencido se ve sin depender del color', () => {
  it.each(LAS_DOCE)('%s: toda insignia lleva su texto', async (ranura) => {
    const montada = montarEnRuta(`/coactiva/${ranura}`);
    await dibujada();

    const insignias = [...document.querySelectorAll('.sgtm-insignia')];
    // Puede no haber ninguna; lo que no puede haber es una vacia. En este
    // modulo los plazos son la informacion mas importante de la pantalla, y
    // «rojo» no se lee en una impresion en blanco y negro ni con daltonismo
    // (FRO-02 §2.1, FRO-04 §7).
    for (const insignia of insignias) {
      expect((insignia.textContent ?? '').trim().length).toBeGreaterThan(0);
    }

    montada.unmount();
  });

  it('el expediente marca sus estados con texto, no solo con tono', async () => {
    montarEnRuta('/coactiva/coactiva-expedientes');

    const tabla = await screen.findByRole('table');
    const insignias = await within(tabla).findAllByText(/./, { selector: '.sgtm-insignia' });
    expect(insignias.length).toBeGreaterThan(0);
    expect(insignias.every((i) => (i.textContent ?? '').trim() !== '')).toBe(true);
  });
});

describe('el ejecutor y el auxiliar no ven lo mismo (REQ-03 §3)', () => {
  /** El auxiliar registra dentro de los expedientes asignados y **no emite REC**. */
  const AUXILIAR = permisosDelClaim({
    coactiva_expedientes: ['lectura'],
    actos_coactivos: ['lectura', 'registro'],
    notificaciones_coactivas: ['lectura', 'registro'],
    expediente_historial: ['lectura'],
  });

  /** El ejecutor coactivo: el que firma el REC. */
  const EJECUTOR = permisosDelClaim({
    coactiva_expedientes: ['lectura', 'registro', 'modificacion'],
    rec_impresion: ['lectura', 'ejecucion', 'impresion'],
    actos_coactivos: ['lectura', 'registro'],
  });

  it('la accion de emitir REC no se dibuja deshabilitada para el auxiliar: no se dibuja', () => {
    expect(puedeVer(AUXILIAR, 'rec_impresion')).toBe(false);
    expect(puedeVer(EJECUTOR, 'rec_impresion')).toBe(true);

    // Lo que si hace el auxiliar, lo hace.
    expect(puedeVer(AUXILIAR, 'actos_coactivos')).toBe(true);
    expect(puedeVer(AUXILIAR, 'coactiva_expedientes')).toBe(true);
  });
});
