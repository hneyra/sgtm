import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { entraCon, limpiarSesion } from '../../pruebas/sesion';

/**
 * **Los resultados de la fiscalizacion, una superficie de tres hojas** (#506 F1).
 *
 * Las tres responden la misma pregunta —como acabo un proceso fiscalizador— por
 * acta, por contribuyente y por version, y hasta hoy lo hacian en tres pantallas
 * con tres formas distintas.
 *
 * Esta bateria vigila **dos cosas, y la segunda es la que se olvida**:
 *
 * 1. que la tira lleve de una hoja a otra sin volver al menu, navegando y no con
 *    un `useState` —lo que importa aqui mas que en ninguna otra superficie, por
 *    SoD-4—;
 * 2. que la superficie **no cueste nada**: las tres siguen dibujando sus filtros,
 *    sus secciones, sus columnas y sus seis pestañas. Es la mitad que un
 *    `COMPONENTES_PROPIOS` se lleva por delante cuando hay que rehacer el cuerpo
 *    a mano, y por eso aqui no se hizo asi.
 */

const MODULO = '/fiscalizacion';
const POR_ACTA = `${MODULO}/fisc-resultados`;
const POR_CONTRIBUYENTE = `${MODULO}/fisc-estado-cuenta`;
/* El estado de cuenta **exige** un contribuyente antes de pedir nada
   (`Conexion.exige`), asi que las pruebas que miran su cuerpo entran con uno. */
const CONTRIBUYENTE = '00000093199';
const POR_CONTRIBUYENTE_CON_SUJETO = `${POR_CONTRIBUYENTE}?contribuyente=${CONTRIBUYENTE}`;
const POR_VERSION = `${MODULO}/fisc-historico`;

/** Los rotulos son los titulos del catalogo, sin reescribir (RNF-080). */
const HOJA_POR_ACTA = 'Resultados y determinaciones';
const HOJA_POR_CONTRIBUYENTE = 'Estado de cuenta de fiscalización';
const HOJA_POR_VERSION = 'Histórico de fiscalización predial';

const TODAS = {
  fisc_resultados: ['lectura', 'registro'],
  fisc_estado_cuenta: ['lectura'],
  fisc_historico: ['lectura'],
} as const;

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => {
  desinstalarProxyDeDatos();
  limpiarSesion();
});

const laTira = (): HTMLElement | null =>
  screen.queryByRole('tablist', { name: 'Hojas de Resultados de la fiscalización' });

/** Espera a que la pantalla este dibujada de verdad, no solo titulada (#76). */
const dibujada = async (selector: string): Promise<void> => {
  await screen.findByRole('heading', { level: 1 });
  await waitFor(() => expect(document.querySelector(selector)).not.toBeNull());
};

describe('la tira lleva de una hoja a otra', () => {
  it('las tres la dibujan, con la activa marcada', async () => {
    montarEnRuta(POR_ACTA);
    await dibujada('table');

    expect(laTira()).not.toBeNull();
    expect(screen.getByRole('tab', { name: HOJA_POR_ACTA })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    for (const otra of [HOJA_POR_CONTRIBUYENTE, HOJA_POR_VERSION]) {
      expect(screen.getByRole('tab', { name: otra })).toHaveAttribute('aria-selected', 'false');
    }
  });

  it('y desde la tercera hoja, la marcada es la tercera', async () => {
    montarEnRuta(POR_VERSION);
    await dibujada('table');

    expect(screen.getByRole('tab', { name: HOJA_POR_VERSION })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: HOJA_POR_ACTA })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('cambiar de hoja NAVEGA: el enlace se comparte y el guardia vuelve a correr', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(POR_ACTA);
    await dibujada('table');

    const aLaDeVersiones = screen.getByRole('tab', { name: HOJA_POR_VERSION });
    // Es un enlace, no un boton: con `useState` el permiso de la otra hoja no lo
    // decidiria ningun guardia (REQ-03 §5).
    expect(aLaDeVersiones.tagName).toBe('A');
    expect(aLaDeVersiones).toHaveAttribute('href', POR_VERSION);

    await usuario.click(aLaDeVersiones);
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(/Histórico/);
  });

  it('la busqueda viaja con el enlace: el contribuyente no se vuelve a teclear', async () => {
    montarEnRuta(POR_CONTRIBUYENTE_CON_SUJETO);
    await dibujada('table');

    expect(screen.getByRole('tab', { name: HOJA_POR_VERSION })).toHaveAttribute(
      'href',
      `${POR_VERSION}?contribuyente=${CONTRIBUYENTE}`,
    );
  });
});

describe('SoD-4: la hoja desde la que se transfiere no se ofrece a quien no la tiene', () => {
  /* Es la guarda que mas pesa de las tres superficies del sistema. El
     fiscalizador de campo levanta actas y **no ve** `fisc_resultados`, que es
     desde donde un dato de fiscalizacion pasa a ser el dato oficial del padron
     (#52). Ofrecerle la pestaña seria ofrecerle un enlace a un aviso de «no
     tienes permiso» — y, con `useState` en vez de enlaces, la pantalla ya habria
     dibujado su estructura antes de que ningun guardia opinara. */
  it('con las tres permitidas, la tira ofrece las tres', async () => {
    entraCon(TODAS);
    montarEnRuta(POR_CONTRIBUYENTE);
    await waitFor(() => expect(laTira()).not.toBeNull());

    for (const hoja of [HOJA_POR_ACTA, HOJA_POR_CONTRIBUYENTE, HOJA_POR_VERSION]) {
      expect(screen.getByRole('tab', { name: hoja })).toBeInTheDocument();
    }
  });

  it('sin `fisc_resultados`, su pestaña no se dibuja y las otras dos siguen', async () => {
    entraCon({ fisc_estado_cuenta: ['lectura'], fisc_historico: ['lectura'] });
    montarEnRuta(POR_CONTRIBUYENTE);
    await waitFor(() => expect(laTira()).not.toBeNull());

    expect(screen.queryByRole('tab', { name: HOJA_POR_ACTA })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: HOJA_POR_CONTRIBUYENTE })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: HOJA_POR_VERSION })).toBeInTheDocument();
  });

  it('con una sola hoja visible no hay tira: una pestaña sola no es navegacion', async () => {
    entraCon({ fisc_historico: ['lectura'] });
    montarEnRuta(POR_VERSION);
    await waitFor(() => expect(document.querySelector('.sgtm-acciones')).not.toBeNull());

    expect(laTira()).toBeNull();
  });
});

describe('la superficie no cuesta nada: las tres siguen dibujando lo suyo', () => {
  it('el estado de cuenta conserva sus filtros, sus secciones y su tabla', async () => {
    montarEnRuta(POR_CONTRIBUYENTE_CON_SUJETO);
    await dibujada('table');

    // Sigue pasando por el renderizador comun: la tira se añade, no sustituye.
    expect(document.querySelector('.sgtm-filtros')).not.toBeNull();
    // Las trece columnas del manual, letra por letra en la primera y la ultima.
    const cabeceras = [...document.querySelectorAll('table thead th')].map((th) =>
      th.textContent?.trim(),
    );
    expect(cabeceras).toContain('Deuda');
    expect(cabeceras).toContain('UnidIden');
  });

  it('el historico conserva las seis pestañas del manual, dentro de la tira', async () => {
    montarEnRuta(POR_VERSION);
    await dibujada('table');

    /* Seis rotulos del manual que el prototipo cambiaba por una linea de tiempo
       (RNF-080). La tira de la superficie va **por encima** y no las sustituye,
       asi que en esta pantalla hay dos niveles de pestañas a proposito. */
    for (const pestana of [
      'Datos Generales',
      'Versiones',
      'Estado de predios',
      'Documentos',
      'Infracciones',
      'Observaciones',
    ]) {
      expect(screen.getByRole('tab', { name: pestana })).toBeInTheDocument();
    }
  });

  it('los resultados conservan sus siete columnas', async () => {
    montarEnRuta(POR_ACTA);
    await dibujada('table');

    const cabeceras = [...document.querySelectorAll('table thead th')].map((th) =>
      th.textContent?.trim(),
    );
    expect(cabeceras).toContain('Acta');
    expect(cabeceras).toContain('Deuda omitida S/');
  });
});

describe('el vocabulario de accion de las tres hojas', () => {
  /* Las dos de consulta dibujan entre las dos siete botones y ninguno registra
     un acto. Con la regla puesta se caen «Filtrar» y «Actualizar» —que son la
     misma busqueda de la barra de filtros con otro nombre— y quedan las de
     salida, **sin primaria**. */
  it('el estado de cuenta pierde «Filtrar» y conserva las de salida, sin primaria', async () => {
    montarEnRuta(POR_CONTRIBUYENTE_CON_SUJETO);
    await dibujada('.sgtm-acciones');

    const barra = [...document.querySelectorAll('.sgtm-acciones button')].map((b) =>
      b.textContent?.trim(),
    );
    expect(barra).toContain('Imprimir');
    expect(barra).toContain('Limpiar');
    expect(barra).not.toContain('Filtrar');
    expect(document.querySelector('.sgtm-acciones .sgtm-boton--primario')).toBeNull();
  });

  it('el historico pierde «Actualizar», por lo mismo', async () => {
    montarEnRuta(POR_VERSION);
    await dibujada('.sgtm-acciones');

    const barra = [...document.querySelectorAll('.sgtm-acciones button')].map((b) =>
      b.textContent?.trim(),
    );
    expect(barra).toContain('Imprimir');
    expect(barra).not.toContain('Actualizar');
    expect(document.querySelector('.sgtm-acciones .sgtm-boton--primario')).toBeNull();
  });

  /**
   * **El contraste, y es el que sostiene la decision.**
   *
   * `fisc_resultados` **no** declara el vocabulario uniforme. Su ultima accion
   * si es el acto —el unico por el que un dato de fiscalizacion pasa a ser el
   * dato oficial del padron—, y esta en `ACTOS_SIN_CAMPO` porque le faltan
   * cuatro campos que su catalogo no dibuja (#431). Aplicarle la regla la
   * borraria de la barra, y con el boton se iria la franja que explica que le
   * falta: RNF-082, el defecto que #385 corrigio en `alcabala` y #429 en las
   * tres hojas de Transito.
   */
  it('los resultados conservan su primaria apagada, y su franja sigue explicando por que', async () => {
    entraCon(TODAS);
    montarEnRuta(POR_ACTA);
    await dibujada('.sgtm-acciones');

    const primaria = document.querySelector<HTMLButtonElement>(
      '.sgtm-acciones .sgtm-boton--primario',
    );
    expect(primaria?.textContent?.trim()).toBe('Emitir resoluciones de determinación');
    /* Apagada con `aria-disabled` y **no** con `disabled`, que es justo lo que
       hace que su motivo se pueda leer: un boton `disabled` no toma el foco, y
       entonces el lector de pantalla nunca llega a su franja (RNF-082). */
    expect(primaria).toHaveAttribute('aria-disabled', 'true');

    // Y la franja que la describe se lee: sin boton no habria `aria-describedby`.
    const franja = primaria?.getAttribute('aria-describedby');
    expect(franja).not.toBeNull();
    expect(document.getElementById(franja ?? '')?.textContent).toMatch(/no tiene dónde escribir/i);
  });
});
