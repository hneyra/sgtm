import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { MODULOS, OPCIONES } from '../../catalogo';
import { permisosDelClaim, puedeEscribir, puedeVer } from '@sgtm/sesion';
import { catalogoVisible } from './useCatalogoVisible';
import { montarEnRuta } from '../../pruebas/montar';
import {
  CAJERO,
  CONSULTA,
  configurarProveedor,
  entraCon,
  entraSinPoderLeerPermisos,
  limpiarSesion,
} from '../../pruebas/sesion';

/**
 * Visibilidad por rol (REQ-03).
 *
 * > **Que la interfaz oculte una opcion es comodidad, no seguridad** (REQ-03
 * > §5). La comprobacion es del servidor, que responde 403 igual. Esto reduce
 * > el error y la superficie de exploracion; no protege nada por si solo, y
 * > estas pruebas no deben leerse como si lo hiciera.
 */

beforeEach(() => {
  // El proveedor se configura suelto porque tambien lo necesitan las pruebas
  // que no llaman a `entraCon`: sin el, la sesion queda «sin proveedor» y la
  // autorizacion pasa a ser «se ve todo».
  configurarProveedor();
  instalarProxyDeDatos({ latencia: false });
});

afterEach(() => {
  limpiarSesion();
  desinstalarProxyDeDatos();
  localStorage.clear();
});

describe('el perfil de cajero no ve coactiva', () => {
  it('ni en la barra lateral, ni en el hub, ni en la paleta de comandos', async () => {
    const usuario = userEvent.setup();
    entraCon(CAJERO);
    montarEnRuta('/tesoreria/caja-tributaria');

    const navegacion = await screen.findByRole('complementary');
    expect(within(navegacion).queryByText('Coactiva')).not.toBeInTheDocument();
    expect(within(navegacion).getByText('Tesorería')).toBeInTheDocument();

    // La paleta es la que se olvida: es el camino mas rapido a una opcion.
    await usuario.keyboard('{Control>}k{/Control}');
    const paleta = await screen.findByRole('dialog');
    await usuario.type(within(paleta).getByRole('textbox'), 'coactiv');
    expect(within(paleta).queryByText(/[Cc]oactiv/)).not.toBeInTheDocument();
    // Y busca entre las tres que el cajero tiene, no entre las 134.
    expect(within(paleta).getByText('0 de 3 opciones')).toBeInTheDocument();
  });

  it('y entrar por la URL no le filtra ni el titulo ni los campos', async () => {
    entraCon(CAJERO);
    montarEnRuta('/coactiva/coactiva-expedientes');

    expect(await screen.findByText('No tienes permiso para esta opción')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Búsqueda' })).not.toBeInTheDocument();
  });

  it('un modulo sin ninguna opcion visible no se dibuja, ni siquiera vacio', async () => {
    entraCon(CAJERO);
    montarEnRuta('/coactiva');

    expect(await screen.findByText('Ese módulo no existe')).toBeInTheDocument();
  });
});

describe('el perfil de consulta ve, y no toca', () => {
  it('la accion de escritura no se habilita ni con la observacion escrita', async () => {
    entraCon(CONSULTA);
    montarEnRuta('/rentas-registro/predial-masivo');

    const accion = await screen.findByRole('button', { name: 'Ejecutar proceso' });
    expect(accion).toBeDisabled();
    // Sin `registro` ni `modificacion` no hay campo de observacion que llenar:
    // la pantalla no escribe, asi que no se le ofrece guardar.
    expect(
      screen.queryByRole('region', { name: 'Observación del usuario' }),
    ).not.toBeInTheDocument();
  });

  it('pero la pantalla se ve entera: mirar sin poder tocar es un caso normal', async () => {
    entraCon(CONSULTA);
    montarEnRuta('/catastro/calles');

    expect(await screen.findByText('SANTA ROSA')).toBeInTheDocument();
  });
});

/**
 * **Un `POST` del catalogo exige `registro`, no «escribir» a secas** (#332).
 *
 * `puedeEscribir` admite `registro` **o** `modificacion`, que es lo correcto para
 * corregir una ficha; pero los `POST` del backend piden `REGISTRO` —lo hace
 * `MovimientosDeDeudaController` en sus dos rutas, y los `POST` de sector, via y
 * ficha—. Con el criterio ancho, un perfil de `modificacion` veia la primaria de
 * «Baja de deuda» encendida, elegia su cuota, escribia la observacion, confirmaba
 * un acto irreversible y recibia un 403. Es el mismo criterio que `puedeRegistrar`
 * ya aplicaba a los paneles de alta, aplicado ahora a la barra.
 */
describe('el privilegio de la barra es el que exige el verbo de su operacion', () => {
  it('con `modificacion` y sin `registro`, la baja de deuda no ofrece escribir', async () => {
    entraCon({ baja_deuda: ['lectura', 'modificacion'], consulta_deuda: ['lectura'] });
    montarEnRuta('/rentas-registro/baja-deuda?codContribuyente=00000006550');

    await screen.findByRole('button', { name: /Dar de baja/ });
    // Sin privilegio para el `POST` no hay a donde escribir: ni caja de
    // observacion, ni promesa de guardar.
    expect(
      screen.queryByRole('region', { name: 'Observación del usuario' }),
    ).not.toBeInTheDocument();
  });

  it('con `registro`, la misma pantalla si pide su observacion', async () => {
    entraCon({ baja_deuda: ['lectura', 'registro'], consulta_deuda: ['lectura'] });
    montarEnRuta('/rentas-registro/baja-deuda?codContribuyente=00000006550');

    expect(
      await screen.findByRole('region', { name: 'Observación del usuario' }),
    ).toBeInTheDocument();
  });
});

describe('«Recientes» no resucita lo que ya no se puede ver', () => {
  it('una opcion guardada en el navegador desaparece si se pierde el permiso', async () => {
    // El cajero estuvo en coactiva cuando tenia permiso; ahora ya no lo tiene.
    localStorage.setItem(
      'sgtm.recientes',
      JSON.stringify(['coactiva_expedientes', 'caja_tributaria']),
    );
    const usuario = userEvent.setup();
    entraCon(CAJERO);
    montarEnRuta('/tesoreria/caja-tributaria');

    // «Recientes» vive en el **nivel raiz** de la barra, y al abrir una opcion
    // la barra esta en el nivel de su modulo: sin volver a la raiz, esta prueba
    // miraba la lista de opciones de Tesoreria y no la de recientes, asi que
    // pasaba sin ejercitar lo que dice ejercitar.
    await usuario.click(await screen.findByRole('button', { name: /Todos los módulos/ }));
    const navegacion = screen.getByRole('navigation', { name: 'Módulos del sistema' });

    // La que si puede ver sigue en «Recientes» —la lista se dibuja de verdad—,
    // y la que ya no puede, no resucita.
    expect(await within(navegacion).findByText('Recientes')).toBeInTheDocument();
    expect(within(navegacion).getAllByText('Caja tributaria').length).toBeGreaterThan(0);
    expect(within(navegacion).queryByText('Expedientes coactivos')).not.toBeInTheDocument();
  });
});

describe('si no se pueden leer los permisos, no se ve nada', () => {
  it('el endpoint de permisos falla y ningun modulo se dibuja: negacion por omision', async () => {
    entraSinPoderLeerPermisos();

    // Con la matriz vacia (negacion por omision), ningun modulo existe para la
    // interfaz: un menu vacio dice la verdad mejor que uno completo que falla en
    // cada pulsacion. Es la misma comprobacion que «un modulo sin opciones no se
    // dibuja», llevada al extremo.
    montarEnRuta('/tesoreria');
    expect(await screen.findByText('Ese módulo no existe')).toBeInTheDocument();
  });
});

describe('las opciones permisibles salen del catalogo, no de una lista paralela', () => {
  it('las 134 opciones son 134 accesos: no hay una segunda lista que mantener', () => {
    // Contando: si alguien agrega una opcion al catalogo, es permisible sin
    // tocar una linea de permisos (REQ-03 §1, regla 3).
    const todas = Object.fromEntries(OPCIONES.map((o) => [o.id, ['lectura'] as const]));
    const permisos = permisosDelClaim(todas);

    expect(Object.keys(permisos.porOpcion)).toHaveLength(134);
    const visibles = catalogoVisible(MODULOS, permisos);
    expect(visibles).toHaveLength(12);
    expect(visibles.reduce((n, m) => n + m.opciones.length, 0)).toBe(134);
  });

  it('sin permiso explicito no hay acceso: negacion por omision', () => {
    const ninguno = permisosDelClaim(null);
    expect(catalogoVisible(MODULOS, ninguno)).toEqual([]);
    expect(puedeVer(ninguno, 'calles')).toBe(false);
    expect(puedeEscribir(ninguno, 'calles')).toBe(false);
  });

  it('un privilegio que no existe en el manual no cuenta como permiso', () => {
    const raro = permisosDelClaim({ calles: ['inventado'] });
    expect(puedeVer(raro, 'calles')).toBe(false);
  });

  it('los niveles de accesibilidad apagan acciones, no opciones', () => {
    const soloLectura = permisosDelClaim({ calles: ['lectura'] });
    expect(puedeVer(soloLectura, 'calles')).toBe(true);
    expect(puedeEscribir(soloLectura, 'calles')).toBe(false);

    const conRegistro = permisosDelClaim({ calles: ['lectura', 'registro'] });
    expect(puedeEscribir(conRegistro, 'calles')).toBe(true);
  });
});
