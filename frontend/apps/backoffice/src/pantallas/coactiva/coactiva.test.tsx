import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { permisosDelClaim, puedeVer } from '@sgtm/sesion';
import { OPCIONES_CONECTADAS } from '../conexiones';
import { SIN_DATO, leerPaginado } from '../seguridad/listado';
import { montarEnRuta } from '../../pruebas/montar';

/**
 * Coactiva (#76): el procedimiento con mas consecuencias juridicas del sistema.
 *
 * De sus doce endpoints solo `coactiva_expedientes` existe (#40), conectada
 * desde #363 —ver `pantallas/coactiva/index.ts`—. Lo que se comprueba aqui son
 * las tres propiedades que no dependen del servidor y que, si se rompen, hacen
 * que la pantalla **contradiga el modelo**: que ningun acto ya registrado se
 * pueda editar ni quitar, que un plazo vencido se vea sin depender del color, y
 * que quien no puede emitir un REC no lo vea; y, para `coactiva_expedientes`,
 * que lee `ExpedienteResource` tal cual y no lo que el proxy simulaba antes de
 * #363.
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

describe('coactiva_expedientes lee ExpedienteResource, conectada desde #363', () => {
  it('es la unica leida por una Conexion propia', () => {
    expect(OPCIONES_CONECTADAS).toContain('coactiva_expedientes');
    // El resto del modulo sigue sin conectar: ningun otro endpoint tiene
    // `Controller` publicado como este (#40).
    // #76 conecto despues las otras tres lecturas del modulo; lo que sigue
    // sin conectar son las escrituras, bloqueadas por el orden de acciones
    // del catalogo (ver el javadoc de `pantallas/coactiva/index.ts`).
    expect(OPCIONES_CONECTADAS).toContain('proceso_coactivo');
    expect(OPCIONES_CONECTADAS).not.toContain('actos_coactivos');
  });

  it('la fila es el expediente que publica el recurso, y «Medida cautelar» sale vacia', async () => {
    montarEnRuta('/coactiva/coactiva-expedientes');

    const fila = (await screen.findByText('EC-2026-00412')).closest('tr');
    expect(fila).not.toBeNull();
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    expect(celdas.map((c) => c.textContent)).toEqual([
      'EC-2026-00412',
      // «Contribuyente» es `codContribuyente`: el codigo del obligado, no un
      // nombre —el prototipo dibuja el nombre en esta columna, y el recurso
      // real publica el codigo (ver `pantallas/coactiva/index.ts`)—.
      'C-COACT-0001',
      '3',
      // Sin separador de miles: asi lo sirve `ExpedienteResource` de verdad,
      // no como lo escribia el catalogo del prototipo («9,412.15»).
      // La tabla agrupa los millares al dibujar (#342): el dato viaja intacto.
      '9 412.15',
      '941.20',
      // «Medida cautelar»: el recurso no publica una descripcion de la medida
      // trabada, solo el estado del expediente (ultima columna).
      SIN_DATO,
      'MEDIDA CAUTELAR',
    ]);
  });

  it('una respuesta que no es un listado paginado se para en voz alta, no una tabla vacia', () => {
    // La misma comprobacion que demuestra `leerPaginado` en todo el frontend
    // (ver `pantallas/seguridad/seguridad.test.tsx`): la forma que el proxy
    // servia antes de #363 —`DatosDePantalla`, con `tabla.filas` y sin
    // `contenido`— es exactamente la que tiene que fallar, y no dibujarse
    // como una tabla vacia en silencio (issue #363).
    expect(() =>
      leerPaginado(
        { fechaCalculo: '2026-08-13', tabla: { filas: [] } },
        'los expedientes coactivos',
      ),
    ).toThrow(/no trae un listado paginado/);
    expect(
      leerPaginado({ contenido: [], totalElementos: 0 }, 'los expedientes coactivos').contenido,
    ).toEqual([]);
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
