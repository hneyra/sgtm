import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { ProveedorDeSesion } from '@sgtm/sesion';
import { App } from './App';
import { Portal } from './Portal';
import { LECTURAS } from './lecturas';

/**
 * **El portal del contribuyente, con sesion propia** (#57, #298, ADR-0016 §3,
 * ADR-0020).
 *
 * Lo que estas pruebas defienden, en una linea cada cosa:
 *
 * 1. **aqui no se teclea ningun documento**: la caja se fue con ADR-0020 y el
 *    sujeto llega firmado en el token. Una peticion con un documento como
 *    parametro es la vulnerabilidad que este issue cierra;
 * 2. se ve **una entrada por municipalidad** donde la persona figura, con su
 *    codigo de contribuyente **de alli** y su deuda con su fecha;
 * 3. **el total lo suma el servidor**, y cuando falta una municipalidad no hay
 *    total: se dice cual falta, y no se dibuja un cero;
 * 4. una municipalidad donde esta **dado de baja** se muestra igual y marcada:
 *    la deuda sobrevive a la baja del padron;
 * 5. **la situacion que llega tiene que ser la de este token**: si no lo es, no
 *    se dibuja nada de ella;
 * 6. sin sesion se ofrece **su** puerta —la del ciudadano—, que hasta ADR-0020
 *    no existia;
 * 7. ninguna cifra sin su fecha (regla 9, RNF-075).
 */

/** La primera persona del padron del prototipo, la misma con la que se prueba la ficha. */
const DNI = '03593174';
const CODIGO = '00000025673';
const NOMBRE = 'SUC. RUFINA MEDINA MEDINA';

const SULLANA = 'MUNICIPALIDAD PROVINCIAL DE SULLANA';
const CATACAOS = 'MUNICIPALIDAD DISTRITAL DE CATACAOS';

beforeEach(() => {
  instalarProxyDeDatos({ latencia: false });
});

afterEach(() => {
  desinstalarProxyDeDatos();
});

/**
 * El portal, con un cliente de consultas **por prueba**.
 *
 * Sin proveedor de identidad configurado la sesion queda «sin proveedor», que es
 * como se trabaja contra el proxy: la puerta deja pasar y lo que se prueba es la
 * pantalla. La puerta tiene su propia prueba mas abajo.
 */
function montar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <ProveedorDeSesion quienEntra="ciudadano">
        <Portal />
      </ProveedorDeSesion>
    </QueryClientProvider>,
  );
}

/**
 * Se pone **encima del proxy ya instalado**: apunta lo que sale y, si se le da un
 * `responder`, contesta por su cuenta.
 */
function interceptar(responder?: (url: URL) => Response | undefined) {
  const pedidas: string[] = [];
  const anterior = globalThis.fetch;
  globalThis.fetch = async (entrada: RequestInfo | URL, opciones?: RequestInit) => {
    const url = new URL(
      typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url,
      globalThis.location.origin,
    );
    pedidas.push(`${url.pathname}${url.search}`);
    return responder?.(url) ?? anterior(entrada, opciones);
  };
  return { pedidas, restaurar: () => (globalThis.fetch = anterior) };
}

const RUTA = `/api/v1${LECTURAS.portal_mi_situacion}`;

/** Un importe con su fecha, como lo publica `ImporteActualizado`. */
const importe = (cifra: string) => ({ importe: cifra, actualizadoA: '2026-08-13' });

/** Una municipalidad de la respuesta, con lo minimo y lo que se le quiera cambiar. */
const enMunicipalidad = (extra: Readonly<Record<string, unknown>> = {}) => ({
  ubigeo: '200601',
  nombre: SULLANA,
  codigoContribuyente: CODIGO,
  nombreContribuyente: NOMBRE,
  activo: true,
  resumenDeSaldos: {
    insoluto: importe('100.00'),
    reajuste: importe('0.00'),
    interes: importe('20.00'),
    gasto: importe('0.00'),
    total: importe('120.00'),
    estadoDeLaConsulta: '1 obligacion con saldo al 2026-08-13',
  },
  obligaciones: [{ tributo: 'PREDIAL', ejercicio: 2026, total: importe('120.00') }],
  predios: [
    {
      codigoReferenciaCatastral: '00001182',
      tipo: 'URBANO',
      direccion: 'JR. UNION 123',
      porcentajeTitularidad: '50.0000',
    },
  ],
  ...extra,
});

/** Una respuesta de `/portal/situacion` con lo que se le quiera cambiar. */
const situacionCon = (extra: Readonly<Record<string, unknown>> = {}): Response =>
  new Response(
    JSON.stringify({
      tipoDocumento: 'DNI',
      numeroDocumento: DNI,
      aLaFecha: '2026-08-13',
      municipalidadesRecorridas: 2,
      totalConsolidado: importe('240.00'),
      notaDelTotal: null,
      sinRegistros: false,
      municipalidades: [enMunicipalidad(), enMunicipalidad({ ubigeo: '200104', nombre: CATACAOS })],
      ...extra,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );

describe('el portal se abre sin nada del back-office, y sin caja que teclear', () => {
  it('tiene su encabezado dentro de un `main`, y ni un modulo que navegar', () => {
    montar();

    const principal = screen.getByRole('main');
    expect(
      within(principal).getByRole('heading', { level: 1, name: /Tu deuda/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('**no hay caja de documento**, que es lo que ADR-0020 retira', () => {
    montar();

    /* La caja era la vulnerabilidad: quien tecleara ocho digitos preguntaba por
       cualquiera. Ahora el sujeto sale del token, y no hay nada que escribir. */
    expect(screen.queryByLabelText('Número de documento')).toBeNull();
    expect(screen.queryByLabelText('Tipo de documento')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Consultar' })).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('dice, antes de nada, que de aqui no sale ningun pago', () => {
    montar();

    expect(screen.getByText('Aquí solo se consulta')).toBeInTheDocument();
    expect(screen.getByText(/El pago en línea todavía no está disponible/)).toBeInTheDocument();
  });

  it('pregunta **una** ruta, sin un solo parametro', async () => {
    const espia = interceptar();
    try {
      montar();
      await screen.findByRole('heading', { name: SULLANA });

      const alaApi = espia.pedidas.filter((ruta) => ruta.startsWith('/api/'));
      expect(alaApi).toEqual([RUTA]);
      /* Ni `?doc=`, ni `?dNI=`, ni nada: la operacion del contrato no declara
         ningun parametro y la peticion no lleva ninguno. */
      expect(alaApi.every((ruta) => !ruta.includes('?'))).toBe(true);
    } finally {
      espia.restaurar();
    }
  });
});

/**
 * **La rama anonima, con proveedor de identidad y sin sesion** (ADR-0020).
 *
 * Las pruebas de arriba corren en estado «sin proveedor» —como se trabaja contra
 * el proxy— y ahi la puerta **deja pasar por diseno**. Con las tres
 * `VITE_SGTM_PORTAL_OIDC_*` puestas la sesion arranca «entrando», pide token, el
 * proveedor lo rechaza y queda «anonima». Lo que entonces tiene que verse es la
 * invitacion **del ciudadano** —con su boton, que hasta ADR-0020 no se podia
 * ofrecer— y nada de la pantalla.
 */
describe('sin sesion se ofrece la puerta del ciudadano, no la del funcionario', () => {
  it('con proveedor configurado y el canje rechazado, solo la invitacion', async () => {
    vi.stubEnv('VITE_SGTM_PORTAL_OIDC_CLIENTE', 'sgtm-portal');
    vi.stubEnv('VITE_SGTM_PORTAL_OIDC_AUTORIZACION', '/oidc/ciudadano/auth');
    vi.stubEnv('VITE_SGTM_PORTAL_OIDC_TOKEN', '/oidc/ciudadano/token');
    const espia = interceptar((url) =>
      url.pathname === '/oidc/ciudadano/token' ? new Response('{}', { status: 400 }) : undefined,
    );

    try {
      render(<App />);

      expect(await screen.findByText('Entra para ver tu deuda')).toBeInTheDocument();
      // La puerta esta puesta: es lo que ADR-0020 hace posible.
      expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument();
      // Y la pantalla no se monto: ni titulo, ni peticion a la API.
      expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
      expect(espia.pedidas.filter((ruta) => ruta.startsWith('/api/'))).toEqual([]);
    } finally {
      espia.restaurar();
      vi.unstubAllEnvs();
    }
  });

  it('y no se piden los permisos del funcionario, que darian 401', async () => {
    /* `GET /seguridad/sesion/permisos` es un endpoint de funcionario y el token
       del ciudadano no autentica en el: la cadena general valida contra el otro
       emisor. Pedirlo seria un 401 en cada arranque del portal. */
    const espia = interceptar();
    try {
      montar();
      await screen.findByRole('heading', { name: SULLANA });

      expect(espia.pedidas.some((ruta) => ruta.includes('/seguridad/sesion/permisos'))).toBe(false);
    } finally {
      espia.restaurar();
    }
  });
});

describe('una entrada por municipalidad donde figura', () => {
  it('las dos, con su nombre, su ubigeo y el codigo de contribuyente de alli', async () => {
    montar();

    const sullana = (await screen.findByRole('heading', { name: SULLANA }))
      .parentElement as HTMLElement;
    expect(within(sullana).getByText('200601')).toBeInTheDocument();
    expect(within(sullana).getByText(CODIGO)).toBeInTheDocument();
    expect(within(sullana).getByText(NOMBRE)).toBeInTheDocument();

    expect(await screen.findByRole('heading', { name: CATACAOS })).toBeInTheDocument();
  });

  it('cada predio con **su** porcentaje, y sin nombrar a ningun copropietario', async () => {
    const espia = interceptar((url) => (url.pathname === RUTA ? situacionCon() : undefined));
    try {
      montar();
      const sullana = (await screen.findByRole('heading', { name: SULLANA }))
        .parentElement as HTMLElement;

      expect(within(sullana).getByText('% de tu titularidad')).toBeInTheDocument();
      expect(within(sullana).getByText('50.0000')).toBeInTheDocument();
      // ADR-0019: la porcion que no le corresponde no se menciona.
      expect(document.body.textContent ?? '').not.toMatch(/copropietari/i);
    } finally {
      espia.restaurar();
    }
  });

  it('la deuda de cada una lleva su fecha (regla 9)', async () => {
    const espia = interceptar((url) => (url.pathname === RUTA ? situacionCon() : undefined));
    try {
      montar();
      const sullana = (await screen.findByRole('heading', { name: SULLANA }))
        .parentElement as HTMLElement;

      expect(within(sullana).getByText('Deuda S/')).toBeInTheDocument();
      expect(within(sullana).getAllByText('120.00').length).toBeGreaterThan(0);
      expect(within(sullana).getAllByText(/Cifras actualizadas al/).length).toBeGreaterThan(0);
    } finally {
      espia.restaurar();
    }
  });

  it('una municipalidad donde esta dado de baja se muestra igual, **y marcada**', async () => {
    /* La deuda sobrevive a la baja del padron (RNF-051): ocultarla seria decirle
       que no debe nada, que es una afirmacion distinta y falsa. */
    const espia = interceptar((url) =>
      url.pathname === RUTA
        ? situacionCon({ municipalidades: [enMunicipalidad({ activo: false })] })
        : undefined,
    );
    try {
      montar();
      const sullana = (await screen.findByRole('heading', { name: SULLANA }))
        .parentElement as HTMLElement;

      expect(within(sullana).getByText('Dado de baja')).toBeInTheDocument();
      expect(within(sullana).getAllByText('120.00').length).toBeGreaterThan(0);
    } finally {
      espia.restaurar();
    }
  });
});

describe('el total lo suma el servidor, o no hay total', () => {
  it('con todas las ramas leidas, el total con su fecha', async () => {
    const espia = interceptar((url) => (url.pathname === RUTA ? situacionCon() : undefined));
    try {
      montar();
      const resumen = (await screen.findByRole('heading', { name: 'Lo que debes en total' }))
        .parentElement as HTMLElement;

      // La cifra que mando el servidor, tal cual: aqui no se suma nada (RNF-083).
      expect(within(resumen).getByText('240.00')).toBeInTheDocument();
      expect(within(resumen).getByText(/Cifras actualizadas al/)).toBeInTheDocument();
    } finally {
      espia.restaurar();
    }
  });

  it('si falta una municipalidad **no hay total**, y se dice cual falta', async () => {
    /* Un total al que le falta una municipalidad es un importe plausible y
       equivocado. Y un cero seria peor: diria que no debe nada. */
    const espia = interceptar((url) =>
      url.pathname === RUTA
        ? situacionCon({
            totalConsolidado: null,
            notaDelTotal: `No se pudo consultar ${CATACAOS}, asi que no se puede dar un total de todo.`,
            municipalidades: [enMunicipalidad()],
          })
        : undefined,
    );
    try {
      montar();
      const resumen = (await screen.findByRole('heading', { name: 'Lo que debes en total' }))
        .parentElement as HTMLElement;

      expect(within(resumen).getByText('—')).toBeInTheDocument();
      expect(within(resumen).queryByText('0.00')).toBeNull();
      expect(
        within(resumen).getByText(new RegExp(`No se pudo consultar ${CATACAOS}`)),
      ).toBeInTheDocument();
      // Y lo que si se pudo leer se muestra: la que falla no se lleva a las demas.
      expect(await screen.findByRole('heading', { name: SULLANA })).toBeInTheDocument();
    } finally {
      espia.restaurar();
    }
  });

  it('sin registros en ninguna se dice asi, y no como «no debes nada»', async () => {
    const espia = interceptar((url) =>
      url.pathname === RUTA
        ? situacionCon({ sinRegistros: true, municipalidades: [], totalConsolidado: null })
        : undefined,
    );
    try {
      montar();

      expect(await screen.findByText('No figuras en ninguna municipalidad')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Lo que debes en total' })).toBeNull();
      // Se dice cuantas se miraron: decirlo no revela nada, solo puede
      // preguntarlo quien presenta ese documento firmado.
      expect(screen.getByText(/Se consultaron 2 municipalidades/)).toBeInTheDocument();
    } finally {
      espia.restaurar();
    }
  });
});

/**
 * **La guarda de vuelta** (ADR-0020, heredera de `identidadesQueCoinciden`).
 *
 * El proxy no filtra (ADR-0010) y un fallo del backend que compusiera la
 * situacion de otra persona **no se distingue** de una correcta: trae un nombre,
 * un codigo y unas cifras que existen. Con token puesto, la respuesta tiene que
 * ser la de **ese** documento o no se dibuja.
 */
describe('la situacion que llega tiene que ser la de este token', () => {
  /** Un token cuyo cuerpo se puede leer: `leerToken` solo descodifica la carga. */
  const tokenCon = (documento: string): string => {
    const carga = btoa(JSON.stringify({ sub: documento, numero_documento: documento, exp: 0 }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    return `cabecera.${carga}.firma`;
  };

  const conSesionDe = (documento: string, respuesta: (url: URL) => Response | undefined) => {
    vi.stubEnv('VITE_SGTM_PORTAL_OIDC_CLIENTE', 'sgtm-portal');
    vi.stubEnv('VITE_SGTM_PORTAL_OIDC_AUTORIZACION', '/oidc/ciudadano/auth');
    vi.stubEnv('VITE_SGTM_PORTAL_OIDC_TOKEN', '/oidc/ciudadano/token');
    return interceptar((url) => {
      if (url.pathname === '/oidc/ciudadano/token') {
        return new Response(
          JSON.stringify({ access_token: tokenCon(documento), expires_in: 300 }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return respuesta(url);
    });
  };

  it('con el documento del token, se dibuja', async () => {
    const espia = conSesionDe(DNI, (url) => (url.pathname === RUTA ? situacionCon() : undefined));
    try {
      render(<App />);

      expect(await screen.findByRole('heading', { name: SULLANA })).toBeInTheDocument();
    } finally {
      espia.restaurar();
      vi.unstubAllEnvs();
    }
  });

  it('con otro documento **no se dibuja nada de lo que llego**', async () => {
    const espia = conSesionDe('44218937', (url) =>
      url.pathname === RUTA ? situacionCon() : undefined,
    );
    try {
      render(<App />);

      expect(await screen.findByText('Esto no corresponde a tu documento')).toBeInTheDocument();
      // Ni el nombre, ni el codigo, ni una sola cifra de la respuesta ajena.
      expect(screen.queryByRole('heading', { name: SULLANA })).toBeNull();
      expect(screen.queryByText(NOMBRE)).toBeNull();
      expect(screen.queryByText('240.00')).toBeNull();
    } finally {
      espia.restaurar();
      vi.unstubAllEnvs();
    }
  });
});

describe('lo que falla no se dice como «no debes nada»', () => {
  it('en un 403 la region viva no invita a reintentar', async () => {
    /* El aviso dibujado ya distingue el rechazo; `role=status` tiene que decir
       lo mismo, o quien consulta con lector de pantalla oye lo contrario de lo
       que la pantalla dice (el patron que #331 ya pago). */
    const espia = interceptar((url) =>
      url.pathname === RUTA
        ? new Response(JSON.stringify({ title: 'Acceso denegado', status: 403 }), {
            status: 403,
            headers: { 'content-type': 'application/problem+json' },
          })
        : undefined,
    );

    try {
      montar();

      expect(
        // El hook reintenta una vez (`retry: 1`) y el reintento corre por
        // detras del tope por defecto: mismo trato que en la ficha 360°.
        await screen.findByText(
          'El servidor rechazó la consulta; reintentar dará lo mismo',
          undefined,
          { timeout: 4000 },
        ),
      ).toBeInTheDocument();
      expect(screen.queryByText('La consulta no se pudo hacer')).toBeNull();
      expect(screen.queryByRole('heading', { name: 'Lo que debes en total' })).toBeNull();
    } finally {
      espia.restaurar();
    }
  });
});
