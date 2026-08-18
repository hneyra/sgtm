import { afterEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { crearClienteDeConsultas } from '../app/App';
import { montarEnRuta } from '../pruebas/montar';

/**
 * El camino de escritura completo (regla 10 de CLAUDE.md, RNF-052).
 *
 * Ninguna accion de las 134 pantallas escribia, y no por falta de backend:
 * **toda modificacion de datos exige observacion del usuario**, y un boton que
 * guardara sin ella seria un defecto del formulario, no una funcionalidad a
 * medias. Esto comprueba que ahora escribe, y que no puede hacerlo sin ella.
 */

/** Una pantalla cuya operacion escribe: `POST /rentas/predial/calculo-masivo`. */
const MASIVO = '/rentas-registro/predial-masivo';
/** Su accion primaria emite, que no se deshace: `POST /rentas/vehicular/calculo`. */
const CUPONERA = '/rentas-registro/vehicular-calculo';

interface Peticion {
  readonly url: string;
  readonly metodo: string;
  readonly clave: string | null;
  readonly cuerpo: string;
}

const original = globalThis.fetch;
let peticiones: Peticion[] = [];

function laApiResponde(estado: number, cuerpo: unknown = { fechaCalculo: '2026-08-13' }): void {
  peticiones = [];
  globalThis.fetch = (entrada, opciones) => {
    const cabeceras = new Headers(opciones?.headers);
    peticiones.push({
      url: typeof entrada === 'string' ? entrada : String(entrada),
      metodo: opciones?.method ?? 'GET',
      clave: cabeceras.get('idempotency-key'),
      cuerpo: typeof opciones?.body === 'string' ? opciones.body : '',
    });
    return Promise.resolve(
      new Response(JSON.stringify(cuerpo), {
        status: estado,
        headers: { 'content-type': 'application/json' },
      }),
    );
  };
}

afterEach(() => {
  globalThis.fetch = original;
});

/** La caja de escritura, cuando ya llego el trozo del modulo. */
const observacion = async (): Promise<HTMLElement> =>
  within(await screen.findByRole('region', { name: 'Observación del usuario' })).getByLabelText(
    'Observación',
  );

describe('sin observacion no se guarda', () => {
  it('abrir una pantalla que escribe no escribe nada', async () => {
    laApiResponde(201);
    montarEnRuta(MASIVO);

    await screen.findByRole('heading', { level: 1 });
    // Abrir «cálculo masivo» no puede lanzar un cálculo masivo.
    expect(peticiones).toEqual([]);
  });

  it.each([
    { pantalla: 'cálculo masivo', ruta: MASIVO, primaria: 'Ejecutar proceso' },
    { pantalla: 'cuponera vehicular', ruta: CUPONERA, primaria: 'Emitir cuponera' },
  ])(
    '$pantalla: la accion primaria esta deshabilitada hasta que hay observacion',
    async ({ ruta, primaria }) => {
      const usuario = userEvent.setup();
      laApiResponde(201);
      montarEnRuta(ruta);

      const accion = await screen.findByRole('button', { name: primaria });
      expect(accion).toBeDisabled();

      await usuario.type(await observacion(), 'Corrección solicitada por el contribuyente.');
      expect(accion).toBeEnabled();

      // Y si se borra, vuelve a deshabilitarse: no es una puerta que se abre una vez.
      await usuario.clear(await observacion());
      expect(accion).toBeDisabled();
    },
  );

  it('la observacion viaja en el cuerpo, que es donde la audita el backend', async () => {
    const usuario = userEvent.setup();
    laApiResponde(201);
    montarEnRuta(MASIVO);

    await usuario.type(await observacion(), 'Emisión anual 2026.');
    await usuario.click(await screen.findByRole('button', { name: 'Ejecutar proceso' }));

    await waitFor(() => expect(peticiones).toHaveLength(1));
    expect(peticiones[0]?.metodo).toBe('POST');
    expect(JSON.parse(peticiones[0]?.cuerpo ?? '{}')).toEqual({
      observacion: 'Emisión anual 2026.',
    });
  });
});

describe('idempotencia: una clave por intento', () => {
  it('el reintento del mismo intento manda la misma clave', async () => {
    const usuario = userEvent.setup();
    laApiResponde(503, {
      title: 'Servicio no disponible',
      status: 503,
      detail: 'Vuelve a intentarlo.',
    });
    montarEnRuta(MASIVO);

    await usuario.type(await observacion(), 'Emisión anual 2026.');
    await usuario.click(await screen.findByRole('button', { name: 'Ejecutar proceso' }));
    await waitFor(() => expect(peticiones).toHaveLength(1));

    await usuario.click(await screen.findByRole('button', { name: 'Ejecutar proceso' }));
    await waitFor(() => expect(peticiones).toHaveLength(2));

    // Dos envios del mismo intento: para el servidor es **uno**. Regenerar la
    // clave aqui convertiria un reintento en un segundo proceso.
    expect(peticiones[0]?.clave).toBe(peticiones[1]?.clave);
    expect(peticiones[0]?.clave).toBeTruthy();
  });

  it('corregir lo que se manda empieza un intento nuevo, con otra clave', async () => {
    const usuario = userEvent.setup();
    laApiResponde(503, {
      title: 'Servicio no disponible',
      status: 503,
      detail: 'Vuelve a intentarlo.',
    });
    montarEnRuta(MASIVO);

    await usuario.type(await observacion(), 'Emisión anual.');
    await usuario.click(await screen.findByRole('button', { name: 'Ejecutar proceso' }));
    await waitFor(() => expect(peticiones).toHaveLength(1));

    await usuario.type(await observacion(), ' Corregida.');
    await usuario.click(await screen.findByRole('button', { name: 'Ejecutar proceso' }));
    await waitFor(() => expect(peticiones).toHaveLength(2));

    // Con la clave anterior, el servidor devolveria el resultado del intento que
    // se estaba corrigiendo, y la correccion se perderia.
    expect(peticiones[0]?.clave).not.toBe(peticiones[1]?.clave);
  });
});

describe('una escritura no se reintenta sola', () => {
  it('el cliente de la aplicacion lo tiene fijado, no solo el de las pruebas', () => {
    // Es una linea que alguien «optimiza» algun dia. Un reintento automatico de
    // un cobro es un cobro doble (FRO-04 §5).
    const cliente = crearClienteDeConsultas();
    expect(cliente.getDefaultOptions().mutations?.retry).toBe(false);
  });

  it('un fallo deja una peticion, no cuatro', async () => {
    const usuario = userEvent.setup();
    laApiResponde(500, { title: 'Error', status: 500, detail: 'No se pudo.' });
    // Con el cliente **de produccion**: con el de pruebas, que ya trae
    // `retry: false`, esta prueba no diria nada.
    montarEnRuta(MASIVO, crearClienteDeConsultas());

    await usuario.type(await observacion(), 'Emisión anual.');
    await usuario.click(await screen.findByRole('button', { name: 'Ejecutar proceso' }));

    await screen.findByText('No se pudo.');
    // Un reintento automatico de un cobro es un cobro doble (FRO-04 §5).
    expect(peticiones).toHaveLength(1);
  });

  it('pulsar dos veces rapido manda una vez', async () => {
    const usuario = userEvent.setup();
    laApiResponde(201);
    montarEnRuta(MASIVO);

    await usuario.type(await observacion(), 'Emisión anual.');
    const accion = await screen.findByRole('button', { name: 'Ejecutar proceso' });
    await usuario.dblClick(accion);

    await waitFor(() => expect(peticiones.length).toBeGreaterThan(0));
    expect(peticiones).toHaveLength(1);
  });
});

describe('los errores se cuentan donde toca', () => {
  it('un 400 con errores por campo pinta cada mensaje junto al suyo, sin reescribirlo', async () => {
    const usuario = userEvent.setup();
    laApiResponde(400, {
      title: 'La solicitud no es válida',
      status: 400,
      detail: 'Revisa los campos marcados.',
      errores: [
        { campo: 'observacion', mensaje: 'La observación debe explicar el motivo del cálculo.' },
      ],
    });
    montarEnRuta(MASIVO);

    await usuario.type(await observacion(), 'x');
    await usuario.click(await screen.findByRole('button', { name: 'Ejecutar proceso' }));

    const mensaje = await screen.findByText('La observación debe explicar el motivo del cálculo.');
    expect(mensaje).toBeInTheDocument();
    // Pegado a su campo, no en un aviso suelto arriba.
    expect(await observacion()).toHaveAttribute('aria-describedby', mensaje.id);
    expect(await observacion()).toHaveAttribute('aria-invalid', 'true');
  });

  it('un 403 dice que falta permiso y no que hay detras', async () => {
    const usuario = userEvent.setup();
    laApiResponde(403, {
      title: 'Sin permiso',
      status: 403,
      detail: 'El usuario no tiene el nivel de accesibilidad requerido.',
    });
    montarEnRuta(MASIVO);

    await usuario.type(await observacion(), 'Emisión anual.');
    await usuario.click(await screen.findByRole('button', { name: 'Ejecutar proceso' }));

    expect(await screen.findByText('Sin permiso')).toBeInTheDocument();
    expect(
      screen.getByText('El usuario no tiene el nivel de accesibilidad requerido.'),
    ).toBeInTheDocument();
  });
});

describe('lo irreversible se confirma diciendo que va a pasar', () => {
  it('emitir no manda hasta confirmar, y la confirmacion dice que se emite', async () => {
    const usuario = userEvent.setup();
    laApiResponde(201);
    montarEnRuta(CUPONERA);

    await usuario.type(await observacion(), 'Emisión anual 2026.');
    await usuario.click(await screen.findByRole('button', { name: 'Emitir cuponera' }));

    // Todavia no se ha mandado nada.
    expect(peticiones).toEqual([]);
    expect(screen.getByText(/no se deshace/)).toBeInTheDocument();
    expect(screen.getByText(/En el SGTM no se borra/)).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /^Confirmar/ }));
    await waitFor(() => expect(peticiones).toHaveLength(1));
  });

  it('cancelar no manda nada', async () => {
    const usuario = userEvent.setup();
    laApiResponde(201);
    montarEnRuta(CUPONERA);

    await usuario.type(await observacion(), 'Emisión anual 2026.');
    await usuario.click(await screen.findByRole('button', { name: 'Emitir cuponera' }));
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(peticiones).toEqual([]);
    expect(screen.queryByText(/no se deshace/)).not.toBeInTheDocument();
  });
});
