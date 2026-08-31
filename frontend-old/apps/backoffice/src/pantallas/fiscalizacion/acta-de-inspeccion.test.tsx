import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { montarEnRuta } from '../../pruebas/montar';
import { entraCon, limpiarSesion } from '../../pruebas/sesion';
import { pantallasDelModulo } from '../../catalogo';

/**
 * **El acta de inspección predial, en cuatro pasos** (#506 F2).
 *
 * Lo que esta batería vigila, por orden de lo que costaría perderlo:
 *
 * 1. **Que no se pierda ni un campo.** Veintisiete campos en tres secciones
 *    pasan a cuatro pasos, y un componente propio es exactamente donde eso se
 *    pierde sin que nadie lo note (FRO-05 §6).
 * 2. **Que el lado «declarado» no se invente.** Es la prueba contra la que se
 *    fiscaliza, y sostener una determinación con un declarado inventado es peor
 *    que inventar una cifra.
 * 3. **Que la fila de la muestra sea la que se pidió.** El proxy no filtra
 *    (ADR-0010), así que sin guarda el acta se levantaría contra otro predio.
 * 4. Que el paso y el modo campo vivan en la URL (FRO-04 §5).
 */

const RUTA = '/fiscalizacion/fisc-predial';
/** El primer predio de la muestra del prototipo: `predioId` 1. */
const CON_FILA = `${RUTA}?programa=1&predio=1`;

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => {
  desinstalarProxyDeDatos();
  limpiarSesion();
});

const elRiel = (): HTMLElement => screen.getByRole('navigation', { name: 'Pasos del acta' });

/**
 * Espera a que el acta este dibujada **con su fila**, no solo titulada.
 *
 * El riel aparece de inmediato —sale del catalogo— y el cuerpo espera a la fila
 * de la muestra. Mirar solo el riel dejaba estas pruebas comprobando un
 * esqueleto (#76).
 */
const dibujada = async (): Promise<void> => {
  await screen.findByRole('heading', { level: 1 });
  await waitFor(() => expect(document.querySelector('.sgtm-acta__riel')).not.toBeNull());
  await waitFor(() => expect(document.querySelector('.sgtm-esqueleto')).toBeNull());
};

describe('los cuatro pasos', () => {
  it('son las tres secciones del catalogo mas el cierre, con sus rotulos', async () => {
    montarEnRuta(RUTA);
    await dibujada();

    const pasos = within(elRiel())
      .getAllByRole('link')
      .map((a) => a.textContent);
    expect(pasos).toHaveLength(4);
    // Los tres primeros son los del manual, letra por letra (RNF-080).
    expect(pasos[0]).toContain('Datos de la visita');
    expect(pasos[1]).toContain('Verificación de campo');
    expect(pasos[2]).toContain('Hallazgos y evidencia');
    expect(pasos[3]).toContain('Cierre');
  });

  it('el paso abierto sale de la URL, y arranca en el primero', async () => {
    montarEnRuta(RUTA);
    await dibujada();
    expect(screen.getByText('Paso 1 de 4')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Datos de la visita' })).toBeInTheDocument();
  });

  it('entrar por el tercero abre el tercero: recargar no lo pierde y el enlace lo lleva', async () => {
    montarEnRuta(`${RUTA}?paso=3`);
    await dibujada();
    expect(screen.getByText('Paso 3 de 4')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hallazgos y evidencia' })).toBeInTheDocument();
  });

  it('un paso que no existe cae en el primero en vez de dejar la pantalla en blanco', async () => {
    montarEnRuta(`${RUTA}?paso=9`);
    await dibujada();
    expect(screen.getByText('Paso 1 de 4')).toBeInTheDocument();
  });

  it('los pasos son ENLACES: cambiar de paso viaja en la direccion', async () => {
    const usuario = userEvent.setup();
    montarEnRuta(RUTA);
    await dibujada();

    const alCierre = within(elRiel()).getAllByRole('link')[3];
    expect(alCierre?.tagName).toBe('A');
    // El enlace lleva el paso en la direccion, que es lo que hace que recargar
    // no lo pierda y que se pueda compartir (FRO-04 §5).
    expect(alCierre).toHaveAttribute('href', expect.stringContaining('paso=4'));

    await usuario.click(alCierre as HTMLElement);
    expect(await screen.findByText('Paso 4 de 4')).toBeInTheDocument();
  });
});

/**
 * **Los tres rótulos que la tabla de contraste re-presenta**, y por qué está bien.
 *
 * Una tabla de contraste no puede repetir «declarado» en cada fila: lo dice ya la
 * cabecera de su columna. Así que estos tres se leen **cruzando fila y columna**
 * —«Uso» × «Declarado»— en vez de en una etiqueta seguida.
 *
 * Lo que RNF-080 protege sigue en pie, y es lo que la prueba comprueba pieza a
 * pieza: la unidad no se pierde —«Área construida (m²)», porque una superficie
 * sin unidad no se puede comparar— y ninguna de las dos mitades desaparece. Si
 * alguien quita la columna «Declarado», o la fila deja de nombrar su
 * característica, esta prueba lo dice.
 */
const RE_PRESENTADOS: Readonly<Record<string, readonly string[]>> = {
  'Uso declarado': ['Uso', 'Declarado'],
  'Área construida declarada (m²)': ['Área construida (m²)', 'Declarado'],
  'Diferencia (m²)': ['Área construida (m²)', 'Diferencia'],
};

describe('no se pierde ni un campo del manual', () => {
  it('los veintisiete del catalogo se alcanzan entre los cuatro pasos', async () => {
    const pantallas = await pantallasDelModulo('fiscalizacion');
    const declarados = (pantallas['fisc_predial']?.secciones ?? []).flatMap((s) =>
      s.campos.map((c) => c.label),
    );
    expect(declarados.length).toBe(27);

    const vistos = new Set<string>();
    for (const paso of [1, 2, 3]) {
      const montada = montarEnRuta(`${CON_FILA}&paso=${paso}`);
      await dibujada();
      for (const etiqueta of declarados) {
        if (screen.queryAllByText(etiqueta, { exact: false }).length > 0) vistos.add(etiqueta);
      }
      montada.unmount();
    }

    // Veinticuatro se dibujan con su rótulo entero, letra por letra.
    const perdidos = declarados.filter(
      (e) => !vistos.has(e) && !Object.hasOwn(RE_PRESENTADOS, e),
    );
    expect(perdidos, `campos que ya no se dibujan: ${perdidos.join(', ')}`).toEqual([]);
    // Y los tres del contraste están **enteros**, repartidos en fila y columna.
    expect(Object.keys(RE_PRESENTADOS).every((e) => declarados.includes(e))).toBe(true);
  });

  it.each(Object.entries(RE_PRESENTADOS))(
    '«%s» se lee cruzando fila y columna del contraste',
    async (_rotulo, piezas) => {
      montarEnRuta(`${CON_FILA}&paso=2`);
      await dibujada();

      const tabla = screen.getByRole('table');
      for (const pieza of piezas) {
        expect(
          within(tabla).getAllByText(pieza, { exact: false }).length,
          `falta «${pieza}» en la tabla de contraste`,
        ).toBeGreaterThan(0);
      }
    },
  );
});

describe('el contraste del paso 2', () => {
  it('contrasta las dos parejas que el catalogo dibuja, y ninguna mas', async () => {
    montarEnRuta(`${CON_FILA}&paso=2`);
    await dibujada();

    const tabla = screen.getByRole('table');
    // Cuatro columnas: la característica, los dos lados y la resta.
    const cabeceras = within(tabla)
      .getAllByRole('columnheader')
      .map((th) => th.textContent);
    expect(cabeceras).toEqual(['Característica', 'Declarado', 'Verificado', 'Diferencia']);
    // Dos filas: uso y área construida. Las otras cinco caracteristicas del
    // prototipo no tienen lado declarado en ninguna parte.
    expect(within(tabla).getAllByRole('row')).toHaveLength(3);
  });

  it('las caracteristicas sin lado declarado siguen dibujandose, como lo que son', async () => {
    montarEnRuta(`${CON_FILA}&paso=2`);
    await dibujada();

    // Fuera de la tabla, en su sección y con su rótulo del manual.
    for (const etiqueta of [
      'Área de terreno verificada (m²)',
      'Nº de pisos verificados',
      'MEP verificado',
      'ECS verificado',
      'Servicios básicos',
    ]) {
      expect(screen.getByText(etiqueta, { exact: false })).toBeInTheDocument();
    }
  });

  it('el lado declarado sale de la muestra, no de un valor escrito a mano', async () => {
    montarEnRuta(`${CON_FILA}&paso=2`);
    await dibujada();

    const tabla = screen.getByRole('table');
    const area = within(tabla).getAllByRole('row')[2];
    // `areaDeclarada` de `MuestraResource`, tal cual.
    expect(area?.textContent).toContain('164.50');
  });

  it('la diferencia sale «—»: es verificada menos declarada, y lo verificado no se ha tecleado', async () => {
    montarEnRuta(`${CON_FILA}&paso=2`);
    await dibujada();

    const filas = within(screen.getByRole('table')).getAllByRole('row');
    for (const fila of filas.slice(1)) {
      expect(within(fila).getAllByRole('cell').at(-1)?.textContent).toBe('—');
    }
  });
});

describe('la fila de la muestra es la que se pidio', () => {
  it('con programa y predio, la cabecera trae el predio y su titular', async () => {
    montarEnRuta(CON_FILA);
    await dibujada();

    const cabecera = document.querySelector('.sgtm-resumen');
    expect(cabecera?.textContent).toContain('02-014-D-14-01');
    expect(cabecera?.textContent).toContain('MEDINA MEDINA');
  });

  /**
   * **El proxy no filtra por `?predio=`** y lo dice de sí mismo (ADR-0010).
   * Quedarse con la primera fila levantaría el acta contra otro predio: es el
   * defecto que #298 encontró en el portal, aquí más caro.
   */
  it('un predio que no esta en la muestra no compone un acta con la fila de otro', async () => {
    montarEnRuta(`${RUTA}?programa=1&predio=99999`);
    await dibujada();

    const cabecera = document.querySelector('.sgtm-resumen');
    expect(cabecera?.textContent).not.toContain('02-014-D-14-01');
    expect(cabecera?.textContent).not.toContain('MEDINA MEDINA');
  });

  it('sin programa ni predio no se pide nada, y la cabecera dice por que', async () => {
    montarEnRuta(RUTA);
    await dibujada();

    expect(
      screen.getByText(/no cuelga de ninguna fila de la muestra/i),
    ).toBeInTheDocument();
  });
});

describe('el modo campo', () => {
  it('vive en la URL: quien levanta actas todo el dia no lo pierde al recargar', async () => {
    montarEnRuta(`${CON_FILA}&campo=1`);
    await dibujada();

    expect(document.querySelector('.sgtm-acta')).toHaveAttribute('data-modo-campo', '1');
    expect(screen.getByRole('switch', { name: /Modo campo/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('apagado por omision', async () => {
    montarEnRuta(CON_FILA);
    await dibujada();
    expect(document.querySelector('.sgtm-acta')).toHaveAttribute('data-modo-campo', '0');
  });
});

describe('el cierre no estrena campos, y dice lo que va a pasar', () => {
  it('no dibuja ninguna caja donde teclear algo que no viaja', async () => {
    montarEnRuta(`${CON_FILA}&paso=4`);
    await dibujada();

    /* El prototipo añade «Ejercicios a determinar» y «Multa tributaria», que no
       están en ninguna sección del catálogo y que `PeticionDeActaPredial` no
       pide: serían dos campos que se teclean y no viajan (#331). */
    expect(screen.queryByText(/Ejercicios a determinar/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Multa tributaria/i)).not.toBeInTheDocument();
    expect(document.querySelectorAll('.sgtm-cierre input, .sgtm-cierre select')).toHaveLength(0);
  });

  it('sin hallazgo, el acta se cierra como conforme', async () => {
    montarEnRuta(`${CON_FILA}&paso=4`);
    await dibujada();
    expect(screen.getByText(/se cierra como conforme/i)).toBeInTheDocument();
  });

  it('dice que el padron no cambia todavia: es la frontera de ARQ-01 §3.5', async () => {
    montarEnRuta(`${CON_FILA}&paso=4`);
    await dibujada();
    expect(screen.getByText(/no cambia todavía/i)).toBeInTheDocument();
  });

  it('ninguna consecuencia lleva importe: la determinacion es D-02a', async () => {
    montarEnRuta(`${CON_FILA}&paso=4`);
    await dibujada();
    const cierre = document.querySelector('.sgtm-cierre');
    expect(cierre?.textContent).not.toMatch(/S\/\s*[\d,]+\.\d\d/);
  });
});

describe('la barra nombra el acto de ESTA pantalla', () => {
  it('la primaria es «Cerrar acta», no «Generar determinación»', async () => {
    entraCon({ fisc_predial: ['lectura', 'registro'] });
    montarEnRuta(CON_FILA);
    await dibujada();
    await waitFor(() => expect(document.querySelector('.sgtm-acciones')).not.toBeNull());

    const primaria = document.querySelector('.sgtm-acciones .sgtm-boton--primario');
    expect(primaria?.textContent?.trim()).toBe('Cerrar acta');
    // Y las otras dos siguen en la barra: `LA_QUE_ESCRIBE` mueve, no quita.
    const barra = [...document.querySelectorAll('.sgtm-acciones button')].map((b) =>
      b.textContent?.trim(),
    );
    expect(barra).toContain('Guardar borrador');
    expect(barra).toContain('Generar determinación');
  });

  it('sigue apagada, y la franja nombra los dos datos que faltan', async () => {
    entraCon({ fisc_predial: ['lectura', 'registro'] });
    montarEnRuta(CON_FILA);
    await waitFor(() => expect(document.querySelector('.sgtm-acciones')).not.toBeNull());

    const primaria = document.querySelector('.sgtm-acciones .sgtm-boton--primario');
    expect(primaria).toHaveAttribute('aria-disabled', 'true');
    const franja = primaria?.getAttribute('aria-describedby');
    const motivo = document.getElementById(franja ?? '')?.textContent ?? '';
    expect(motivo).toMatch(/quién fiscaliza/i);
    expect(motivo).toMatch(/hallazgo/i);
  });
});
