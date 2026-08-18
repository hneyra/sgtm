import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { ProveedorDeEjercicio, useEjercicio } from '../../app/ejercicio';
import { clienteDePruebas, montarEnRuta } from '../../pruebas/montar';
import { leerPaginado } from './listado';

/**
 * El modulo de seguridad, conectado (#70).
 *
 * Lo que se comprueba aqui no es que las pantallas se dibujen —eso ya lo hacen
 * las 134— sino tres cosas que solo son ciertas cuando estan conectadas de
 * verdad: que leen **el recurso que publica el backend** y no la forma que
 * comparten las 134, que el ejercicio de trabajo viaja y se ve, y que lo que
 * escriben es exactamente lo que declararon y nada mas.
 */

let peticiones: { url: string; metodo: string; cuerpo: string }[] = [];

beforeEach(() => {
  instalarProxyDeDatos({ latencia: false });
  peticiones = [];
  const proxy = globalThis.fetch;
  globalThis.fetch = (entrada, opciones) => {
    peticiones.push({
      url:
        typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url,
      metodo: opciones?.method ?? 'GET',
      cuerpo: typeof opciones?.body === 'string' ? opciones.body : '',
    });
    return proxy(entrada, opciones);
  };
});

afterEach(() => desinstalarProxyDeDatos());

const aLaOperacion = (camino: string) => peticiones.filter((p) => p.url.includes(camino));

/* ── Leen el recurso del backend ───────────────────────────────────────── */

describe('los listados leen el recurso que publica el backend', () => {
  it('la tabla de usuarios sale del listado paginado, con el hueco a la vista', async () => {
    montarEnRuta('/seguridad/usuarios');

    // La cuenta y el nombre los trae `UsuarioResource`; la unidad organica, el
    // grupo y la caja que el manual pide, no. Salen con «—» y no inventadas:
    // que se vea el hueco es lo que dice que falta y a quien le toca.
    const fila = (await screen.findByText('jcardenas')).closest('tr');
    expect(fila).not.toBeNull();
    expect(within(fila as HTMLElement).getByText('CÁRDENAS VEGA, JOSÉ')).toBeInTheDocument();
    expect(within(fila as HTMLElement).getAllByText('—')).toHaveLength(4);

    expect(aLaOperacion('/api/v1/seguridad/usuarios')).toHaveLength(1);
  });

  it('el conteo y la paginacion salen del sobre, no de contar las filas dibujadas', async () => {
    montarEnRuta('/seguridad/modulos');
    expect(await screen.findByText('3 módulos')).toBeInTheDocument();
    // El sobre dice pagina 0; quien lee cuenta desde 1.
    expect(await screen.findByText(/Página 1 de 1/)).toBeInTheDocument();
  });

  it('una respuesta que no es un listado paginado se para en voz alta', () => {
    // Media pantalla mal dibujada es peor que un error que dice que la
    // respuesta no era la esperada: aqui no se sigue adelante con lo que haya.
    expect(() => leerPaginado({ tabla: { filas: [] } }, 'los usuarios')).toThrow(
      /no trae un listado paginado/,
    );
    expect(leerPaginado({ contenido: [], totalElementos: 0 }, 'los usuarios').contenido).toEqual(
      [],
    );
  });
});

/* ── El ejercicio de trabajo ───────────────────────────────────────────── */

describe('el ejercicio de trabajo es de la sesion', () => {
  it('se ve en la cabecera de cualquier pantalla, tambien de una sin conectar', async () => {
    montarEnRuta('/catastro/calles');
    const cabecera = await screen.findByRole('banner');
    expect(within(cabecera).getByText('Ejercicio')).toBeInTheDocument();
    expect(within(cabecera).getByText(String(new Date().getFullYear()))).toBeInTheDocument();
  });

  it('la bitacora lo manda siempre, aunque nadie lo escriba en un filtro', async () => {
    montarEnRuta('/seguridad/auditoria');
    await screen.findByText('jcardenas');

    // Es la clave de particion de la tabla y el controlador lo exige (#13). No
    // sale de la URL: sale de la sesion.
    const [peticion] = aLaOperacion('/api/v1/seguridad/auditoria');
    expect(peticion?.url).toContain(`ejercicio=${new Date().getFullYear()}`);
  });
});

describe('cambiar el ejercicio vacia la cache antes de pedir con el nuevo', () => {
  /**
   * **Que se comprueba, y que no.**
   *
   * Lo que se comprueba es que la cache queda vacia **en el mismo turno** en
   * que cambia el ejercicio, y que la primera peticion con el ejercicio nuevo
   * no encuentra nada de antes. Es la propiedad que importa: si el vaciado se
   * dejara para una promesa —`await invalidateQueries()` y despues limpiar, que
   * es como se escribe este defecto de verdad—, entre las dos cosas hay un
   * render, y en ese render la pantalla ensena cifras de 2026 bajo el rotulo de
   * 2025.
   *
   * Lo que **no** se comprueba, y conviene decirlo en vez de fingir que si: que
   * `clear()` este escrito antes o despues del `setState` dentro del mismo
   * manejador. React agrupa los cambios de estado, asi que las dos lineas se
   * aplican en el mismo turno y ningun render las separa. Una prueba que
   * afirmara comprobar ese orden pasaria con las dos versiones, y una
   * verificacion que no puede fallar no protege nada.
   */
  function conElProveedor(): { adoptar: (r: unknown) => void; cliente: QueryClient } {
    const cliente = clienteDePruebas();
    let adoptar: ((r: unknown) => void) | null = null;

    function Sonda() {
      adoptar = useEjercicio().adoptar;
      return null;
    }

    render(
      <QueryClientProvider client={cliente}>
        <ProveedorDeEjercicio>
          <Sonda />
        </ProveedorDeEjercicio>
      </QueryClientProvider>,
    );
    return { adoptar: (r) => adoptar?.(r), cliente };
  }

  it('lo guardado con el ejercicio anterior desaparece en el acto, sin esperar a nada', () => {
    const { adoptar, cliente } = conElProveedor();
    cliente.setQueryData(['operacion', 'auditoria', { ejercicio: '2026' }], { filas: [] });
    expect(cliente.getQueryCache().getAll()).toHaveLength(1);

    let alInstante = -1;
    act(() => {
      adoptar({ ejercicioDeTrabajo: 2021 });
      // Sin `await` y antes de que React vuelva a dibujar: si el vaciado se
      // aplazara, aqui seguirian las respuestas del ejercicio anterior.
      alInstante = cliente.getQueryCache().getAll().length;
    });

    expect(alInstante).toBe(0);
  });

  it('y la primera peticion con el ejercicio nuevo no encuentra nada de antes', async () => {
    const linea: string[] = [];
    const cliente = clienteDePruebas();

    function Sonda() {
      const { ejercicio, adoptar } = useEjercicio();
      useQuery({
        queryKey: ['sonda', ejercicio],
        queryFn: () => {
          // Lo que habia guardado cuando sale esta peticion, sin contarse a si
          // misma. Si queda algo, la pantalla pudo pintarlo antes de responder.
          linea.push(
            `pide ${ejercicio} · guardado: ${cliente.getQueryCache().getAll().length - 1}`,
          );
          return Promise.resolve(ejercicio);
        },
      });
      return (
        <button type="button" onClick={() => adoptar({ ejercicioDeTrabajo: 2021 })}>
          Cambiar
        </button>
      );
    }

    render(
      <QueryClientProvider client={cliente}>
        <ProveedorDeEjercicio>
          <Sonda />
        </ProveedorDeEjercicio>
      </QueryClientProvider>,
    );

    const actual = new Date().getFullYear();
    await waitFor(() => expect(linea).toHaveLength(1));

    await userEvent.click(screen.getByRole('button', { name: 'Cambiar' }));
    await waitFor(() => expect(linea).toHaveLength(2));

    expect(linea).toEqual([`pide ${actual} · guardado: 0`, 'pide 2021 · guardado: 0']);
  });
});

/* ── Lo que escriben, y lo que no ──────────────────────────────────────── */

const observacion = async (): Promise<HTMLElement> =>
  within(await screen.findByRole('region', { name: 'Observación del usuario' })).getByLabelText(
    'Observación',
  );

describe('la lista blanca decide que viaja', () => {
  it('cambiar el ano manda el ejercicio y la observacion, y nada del resto de la pantalla', async () => {
    montarEnRuta('/seguridad/cambiar-anio');

    await userEvent.selectOptions(await screen.findByLabelText('Cambiar al año'), '2021');
    await userEvent.type(await observacion(), 'Cierre del ejercicio anterior.');
    await userEvent.click(screen.getByRole('button', { name: 'Aceptar' }));

    await waitFor(() => expect(aLaOperacion('/api/v1/seguridad/sesion/ejercicio')).toHaveLength(1));
    const [peticion] = aLaOperacion('/api/v1/seguridad/sesion/ejercicio');
    expect(peticion?.metodo).toBe('PUT');
    // Los otros cuatro campos de la pantalla —ano actual, ejercicio contable,
    // ultimo cierre, advertencia— los pinta el servidor y no vuelven.
    expect(JSON.parse(peticion?.cuerpo ?? '{}')).toEqual({
      ejercicio: 2021,
      observacion: 'Cierre del ejercicio anterior.',
    });
  });

  it('y la cabecera adopta el ejercicio que respondio el servidor, no el que se eligio', async () => {
    montarEnRuta('/seguridad/cambiar-anio');

    await userEvent.selectOptions(await screen.findByLabelText('Cambiar al año'), '2021');
    await userEvent.type(await observacion(), 'Cierre del ejercicio anterior.');
    await userEvent.click(screen.getByRole('button', { name: 'Aceptar' }));

    const cabecera = await screen.findByRole('banner');
    await waitFor(() => expect(within(cabecera).getByText('2021')).toBeInTheDocument());
  });
});

describe('la pantalla de contrasena no puede retener una contrasena', () => {
  /** Un usuario elegido: la operacion cambia la clave de `{id}`, no la de nadie. */
  const CLAVE = '/seguridad/cambiar-clave/7';

  it('los campos de clave no se escriben: el valor no llega ni al estado de React', async () => {
    montarEnRuta(CLAVE);

    const nueva = await screen.findByLabelText('Nueva contraseña');
    expect(nueva).toHaveAttribute('readonly');
    await userEvent.type(nueva, 'secreto-de-verdad');
    expect(nueva).toHaveValue('');
  });

  it('y el cuerpo lleva solo la observacion, porque el backend no acepta ninguna clave', async () => {
    montarEnRuta(CLAVE);

    await userEvent.type(await observacion(), 'Caducó la contraseña del cajero.');
    await userEvent.click(screen.getByRole('button', { name: 'Aceptar' }));

    await waitFor(() => expect(aLaOperacion('/api/v1/seguridad/usuarios/7/clave')).toHaveLength(1));
    const [peticion] = aLaOperacion('/api/v1/seguridad/usuarios/7/clave');
    expect(JSON.parse(peticion?.cuerpo ?? '{}')).toEqual({
      observacion: 'Caducó la contraseña del cajero.',
    });
    // Y se dice antes de que alguien lo teclee, no despues.
    expect(screen.getByText(/el sistema no la recibe/i)).toBeInTheDocument();
  });
});
