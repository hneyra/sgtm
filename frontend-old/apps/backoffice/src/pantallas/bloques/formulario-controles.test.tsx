import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ControlDeclarado } from '../composicion';
import type { SeccionDePantalla } from '../../catalogo';

/**
 * **El campo que la opción añade, dibujado por el renderizador común** (#422).
 *
 * El hueco que cierra lo censó `ACTOS_SIN_CAMPO`: opciones cuyo `POST` exige un
 * dato para el que ninguna sección del catálogo dibuja un campo editable. Hasta
 * #422 la única salida probada era un componente propio por pantalla (#73), y
 * eso no se puede copiar doce veces.
 *
 * Aquí se prueba el mecanismo solo, con una declaración inventada y una sección
 * inventada: lo que hace de verdad `transito_descargos` se prueba en
 * `transito/transito.test.tsx`, montando la pantalla. Lo de aquí es la regla.
 *
 * El registro de composiciones se sustituye entero porque es lo que `Formulario`
 * consulta, igual que hace `formulario-resolutor.test.tsx`.
 */

/** El control declarado de la prueba: **su propia etiqueta**, distinta de la del catálogo. */
const DECLARADO: ControlDeclarado = {
  campo: 'nDeExpedienteDeMesaDePartes',
  etiqueta: 'Nº de expediente de mesa de partes',
  tipo: 'text',
  ph: 'EXP-2026-004182',
  ayuda: 'El número con que el escrito entró por mesa de partes.',
  seccion: 'Solicitud',
};

/** Un segundo, de otra sección: el filtro por etiqueta tiene que dejarlo fuera. */
const DE_OTRA_SECCION: ControlDeclarado = {
  ...DECLARADO,
  campo: 'otroCampo',
  etiqueta: 'De otra sección',
  seccion: 'Evaluación y resolución',
};

vi.mock('../composicion', () => ({
  resolutorDeCampo: () => undefined,
  memoriaDeSeccion: () => undefined,
  controlesDeLaSeccion: (_opcion: string, seccion: string): readonly ControlDeclarado[] =>
    [DECLARADO, DE_OTRA_SECCION].filter((control) => control.seccion === seccion),
  // Ni ninguna tabla prestada (#503 F2): eso lo mira `rentas/tabla-prestada.test.tsx`.
  tablasDeLaSeccion: () => [],
}));

const { Formulario } = await import('./Formulario');

/**
 * La sección del catálogo, con **su** «Nº de expediente» de solo lectura: es
 * exactamente la forma que tiene `transito_descargos`, y la que hace que la
 * etiqueta propia del control importe.
 */
const SECCION: readonly SeccionDePantalla[] = [
  {
    label: 'Solicitud',
    campos: [
      { clave: 'nDeExpediente2', label: 'Nº de expediente', t: 'ro' },
      { clave: 'papeletaImpugnada', label: 'Papeleta impugnada', t: 'text' },
    ],
  },
];

const DECLARABLES = new Set(['papeletaImpugnada', 'nDeExpedienteDeMesaDePartes']);

function montar(opciones: {
  readonly escribibles?: ReadonlySet<string>;
  readonly puedeActuar?: boolean;
  readonly borrador?: Readonly<Record<string, string>>;
  readonly onCampo?: (campo: string, valor: string) => void;
  readonly errorPorCampo?: Readonly<Record<string, string>>;
}) {
  render(
    <Formulario
      opcion="transito_descargos"
      secciones={SECCION}
      valores={{ nDeExpediente2: 'EXP-2025-000001' }}
      cargando={false}
      cerradas={{}}
      onAlternar={() => {}}
      pestana={0}
      escribibles={opciones.escribibles ?? DECLARABLES}
      borrador={opciones.borrador ?? {}}
      onCampo={opciones.onCampo ?? (() => {})}
      puedeActuar={opciones.puedeActuar ?? true}
      errorPorCampo={opciones.errorPorCampo ?? {}}
    />,
  );
}

describe('el control declarado lo dibuja el renderizador comun, sin componente propio', () => {
  it('aparece en su seccion, y el de otra seccion no', () => {
    montar({});
    expect(screen.getByLabelText('Nº de expediente de mesa de partes')).toBeInTheDocument();
    expect(screen.queryByLabelText('De otra sección')).not.toBeInTheDocument();
  });

  /**
   * **Su propia etiqueta, nunca la del catálogo** (RNF-080, AC 3 de #422).
   *
   * Las dos conviven en la misma sección y dicen cosas distintas: el «Nº de
   * expediente» de arriba es el del descargo que se consulta —`"ro"`— y el
   * añadido es el del escrito que se registra. Si el renderizador le pasara la
   * del campo del catálogo, en la pantalla habría **dos** controles llamados «Nº
   * de expediente» y nadie podría decir cuál es cuál: ni con lector ni sin él.
   */
  it('el añadido no toma prestada ninguna etiqueta del catalogo', () => {
    montar({});
    // El del catálogo sigue donde estaba, y con su nombre.
    expect(screen.getByLabelText('Nº de expediente')).toBeInTheDocument();
    // Y el añadido tiene el suyo: la pantalla no dibuja dos «Nº de expediente».
    expect(screen.getAllByLabelText(/^Nº de expediente$/)).toHaveLength(1);
    expect(screen.getByLabelText('Nº de expediente de mesa de partes')).toBeInTheDocument();
  });

  it('va al final de la rejilla, detras de los campos del manual', () => {
    montar({});
    const etiquetas = [...document.querySelectorAll('.sgtm-campo__etiqueta')].map(
      (nodo) => nodo.textContent,
    );
    expect(etiquetas).toEqual([
      'Nº de expediente',
      'Papeleta impugnada',
      'Nº de expediente de mesa de partes',
    ]);
  });

  it('lo tecleado llega al borrador con la clave declarada', async () => {
    const usuario = userEvent.setup();
    const escrito: [string, string][] = [];
    montar({ onCampo: (campo, valor) => escrito.push([campo, valor]) });

    await usuario.type(screen.getByLabelText('Nº de expediente de mesa de partes'), 'A1');

    expect(escrito).toEqual([
      ['nDeExpedienteDeMesaDePartes', 'A'],
      ['nDeExpedienteDeMesaDePartes', '1'],
    ]);
  });

  it('dibuja su ayuda: un campo que el manual no tiene sin decir de donde sale se lee inventado', () => {
    montar({});
    expect(
      screen.getByText('El número con que el escrito entró por mesa de partes.'),
    ).toBeInTheDocument();
  });

  it('pinta el error que el backend devolvio para ese campo', () => {
    montar({ errorPorCampo: { nDeExpedienteDeMesaDePartes: 'Ya hay un descargo con ese número' } });
    expect(screen.getByText('Ya hay un descargo con ese número')).toBeInTheDocument();
  });
});

describe('el control declarado no promete lo que no puede', () => {
  /**
   * Sin la clave en `escrituras.ts`, `fijarCampo` se tragaría lo tecleado en
   * silencio: la misma guarda que ya tenía el resolutor (`ResolutorProps.bloqueado`).
   */
  it('bloqueado si la opcion no declara ese campo en su lista blanca', () => {
    montar({ escribibles: new Set(['papeletaImpugnada']) });
    expect(screen.getByLabelText('Nº de expediente de mesa de partes')).toHaveAttribute('readonly');
  });

  it('bloqueado si quien mira no tiene el privilegio del acto (ADR-0013)', () => {
    montar({ puedeActuar: false });
    expect(screen.getByLabelText('Nº de expediente de mesa de partes')).toHaveAttribute('readonly');
  });

  it('bloqueado, lo tecleado no llega a ninguna parte', async () => {
    const usuario = userEvent.setup();
    const escrito: [string, string][] = [];
    montar({ puedeActuar: false, onCampo: (campo, valor) => escrito.push([campo, valor]) });

    await usuario.type(screen.getByLabelText('Nº de expediente de mesa de partes'), 'A1');

    expect(escrito).toEqual([]);
  });
});

/**
 * **Un control declarado solo escribe el campo que declaró** (AC 2 de #422).
 *
 * En el resolutor esa propiedad la sostiene `soloSusCampos`, con la muestra que
 * la viola en `formulario-resolutor.test.tsx`: ahí el control es **código
 * ajeno** y puede llamar a `onCampo` con la clave que quiera. Aquí no hay
 * código —la clave sale de la declaración— así que la propiedad se comprueba por
 * donde sí se puede observar: lo que llega al borrador al teclear, y **solo**
 * eso. Envolver además con `soloSusCampos` se midió y no pone nada en rojo: es
 * una guarda que no puede fallar, y una regla que no puede fallar no protege
 * nada; lo que sí muerde es el censo de `controles-declarados.test.ts`.
 */
describe('un control declarado no escribe fuera de lo suyo', () => {
  it('teclear en el anadido no toca ninguna otra clave de la opcion', async () => {
    const usuario = userEvent.setup();
    const escrito: [string, string][] = [];
    montar({
      // Las cuatro las declara `transito_descargos` en `escrituras.ts`: si el
      // control se saliera de lo suyo, tendria a donde ir.
      escribibles: new Set([
        'papeletaImpugnada',
        'nDeExpedienteDeMesaDePartes',
        'fechaDePresentacion',
        'fundamentoDelAdministrado',
      ]),
      onCampo: (campo, valor) => escrito.push([campo, valor]),
    });

    await usuario.type(screen.getByLabelText('Nº de expediente de mesa de partes'), 'AB');

    expect(new Set(escrito.map(([campo]) => campo))).toEqual(
      new Set(['nDeExpedienteDeMesaDePartes']),
    );
  });
});
