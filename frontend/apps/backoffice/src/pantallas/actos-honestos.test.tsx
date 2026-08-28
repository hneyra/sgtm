import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { escribe } from '@sgtm/api-client';
import { todasLasPantallas } from '../catalogo';
import { montarEnRuta } from '../pruebas/montar';
import { motivoDeLaPrimaria, primariaApagada } from '../pruebas/acciones';
import { ACTOS_SIN_CAMPO, impedimentoDelActo } from './actos';
import type { ActoSinCampo } from './actos';
import { operacionDe } from './busqueda';
import { OPCIONES_QUE_ESCRIBEN } from './escrituras';

/**
 * `ACTOS_SIN_CAMPO` esta vacia desde #73: las dos transferencias que la
 * abrian ya declaran su escritura, con el campo que faltaba anadido por un
 * resolutor (`rentas/composicion.ts`). El mecanismo se queda —puede volver a
 * hacer falta— y esta prueba lo ejercita **sin** una opcion real: mutando el
 * registro en tiempo de ejecucion, que es lo unico que queda cuando la lista
 * que se prueba esta vacia a proposito. `readonly` es solo de TypeScript; en
 * JavaScript el objeto se puede escribir, y aqui se restaura despues.
 */
const registro = ACTOS_SIN_CAMPO as Record<string, ActoSinCampo>;
const MUESTRA_SIN_CAMPO = 'muestra_sin_campo';
function conUnaMuestraDeSinCampo<T>(cuerpo: () => T): T {
  registro[MUESTRA_SIN_CAMPO] = {
    dato: 'el dato de la muestra',
    porque: 'Por lo que sea, para la prueba.',
    campos: ['campoDeLaMuestra'],
  };
  try {
    return cuerpo();
  } finally {
    delete registro[MUESTRA_SIN_CAMPO];
  }
}

/**
 * **Ningun acto promete lo que no puede** (#332), en las 134.
 *
 * El defecto que esto cierra no era de una pantalla: `useEscritura` se activaba
 * para cualquier verbo de escritura, y una opcion sin declarar en
 * `escrituras.ts` «mandaba solo su observacion». En ventanilla eso significa
 * rellenar catorce campos, pulsar la primaria y recibir un rechazo —o ninguno,
 * porque no hay backend que rechace—. La negacion por omision de la lista blanca
 * no cambia; lo que cambia es que ahora **lo dice**, y dice cual de las dos
 * cosas falta.
 */

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => desinstalarProxyDeDatos());

describe('la causa se lee de lo que ya se sabe, sin ninguna lista aparte', () => {
  it('una opcion declarada no tiene impedimento; una sin declarar, si', () => {
    // Declarada: guarda de verdad, y lo que la apague sera su formulario.
    expect(impedimentoDelActo('alta_deuda')).toBeUndefined();
    expect(impedimentoDelActo('baja_deuda')).toBeUndefined();

    // Sin declarar y con verbo de escritura: falta trabajo del sistema.
    expect(impedimentoDelActo('predial_masivo')?.causa).toBe('sin-declaracion');
    /* Y con **un dato que la pantalla no tiene donde escribir** (#73):
       `sin-declaracion` diria que basta con declarar sus campos, y eso no
       arregla nada cuando lo que falta no esta en el formulario del manual.
       Hoy ninguna opcion vive ahi —las dos transferencias que lo hacian ya
       declararon su escritura, con el campo anadido por un resolutor
       (`rentas/composicion.ts`)—, asi que se ejercita con una muestra. */
    expect(
      conUnaMuestraDeSinCampo(() => impedimentoDelActo(MUESTRA_SIN_CAMPO, ['Guardar'])?.causa),
    ).toBe('sin-campo');
    // Y las dos transferencias, declaradas: sin impedimento ninguno.
    expect(impedimentoDelActo('transferencia_predio')).toBeUndefined();
    expect(impedimentoDelActo('transferencia_vehiculo')).toBeUndefined();
    // Sin declarar y con verbo de lectura: no hay a donde guardar.
    expect(impedimentoDelActo('contribuyentes')?.causa).toBe('sin-backend');
    /* Y sin declarar, con verbo de escritura, pero con una primaria que **pide
       una determinacion** (#333): ninguna de las dos frases de arriba es cierta.
       `predial_individual` declara un `POST` y no declara escritura, asi que
       hasta hoy decia «la pantalla aún no manda estos campos» sobre una pantalla
       con 15 de sus 19 campos en `"ro"` — no hay campos que mandar, y lo que
       falta es la capa web entera de la determinacion. */
    expect(impedimentoDelActo('predial_individual', ['Buscar', 'Simular', 'Calcular'])?.causa).toBe(
      'sin-determinacion',
    );
  });

  it('las cuatro causas hablan de la ventanilla, y la tecnica se queda en el `data-`', () => {
    const sinBackend = impedimentoDelActo('contribuyentes')?.detalle ?? '';
    const sinDeclaracion = impedimentoDelActo('predial_masivo')?.detalle ?? '';
    const sinDeterminacion =
      impedimentoDelActo('predial_individual', ['Buscar', 'Calcular'])?.detalle ?? '';
    const sinCampo = conUnaMuestraDeSinCampo(
      () => impedimentoDelActo(MUESTRA_SIN_CAMPO, ['Guardar'])?.detalle ?? '',
    );

    // Los cuatro dicen **por donde se sale**: el acto existe fuera del sistema, y
    // quedarse en «no se puede» deja el mostrador parado.
    for (const texto of [sinBackend, sinDeclaracion, sinDeterminacion, sinCampo]) {
      expect(texto).toMatch(/Registra el acto por el procedimiento actual/);
      expect(texto).toMatch(/avísale a sistemas/);
      // Y **ninguno habla de desarrollador**: quien atiende no sabe qué es «el
      // backend» ni qué son campos «declarados», y leyéndolo sólo puede
      // concluir que la pantalla está rota y que la culpa es suya.
      expect(texto).not.toMatch(/backend|endpoint|declarad|contrato|API/i);
    }
    // No son el mismo texto con otro nombre: si lo fueran, distinguir las causas
    // no serviria de nada.
    expect(new Set([sinBackend, sinDeclaracion, sinDeterminacion, sinCampo]).size).toBe(4);
    // Y la cuarta nombra **el dato que falta**, que es lo que la separa de la
    // segunda: en `sin-declaracion` lo que falta es una lista blanca (#73).
    expect(sinCampo).toMatch(/el dato de la muestra/);
    // Y la que se suma dice **lo que esa pantalla hace**: no calcula, muestra lo
    // que el servidor determine, y mientras tanto los importes salen con «—».
    expect(sinDeterminacion).toMatch(/Aquí no se calcula nada/);
    expect(sinDeterminacion).toMatch(/—/);
  });

  it('cada una de las 134 cae en su casilla, y las cuentas son las que son', async () => {
    const pantallas = await todasLasPantallas();
    const declaradas = new Set(OPCIONES_QUE_ESCRIBEN);
    const porCausa = {
      declarada: 0,
      salida: 0,
      'sin-backend': 0,
      'sin-declaracion': 0,
      'sin-determinacion': 0,
      'sin-campo': 0,
    };

    for (const [opcion, estructura] of Object.entries(pantallas)) {
      const acciones = estructura.acciones ?? [];
      const impedimento = impedimentoDelActo(opcion, acciones);
      if (impedimento === undefined) {
        /* Sin impedimento **solo** por una de dos razones, y las dos son
           honestas: la opcion declaro su escritura, o su primaria no guarda nada
           —imprime, exporta, limpia, abre—. Cualquier otra seria la funcion
           callandose. */
        if (declaradas.has(opcion)) {
          porCausa.declarada += 1;
          continue;
        }
        const primaria = acciones[acciones.length - 1] ?? '';
        expect(
          /^(imprimir|impresi|exportar|excel|pdf|descargar|limpiar|ver\b|abrir|visualizar|previsualizar|consultar|buscar)/i.test(
            primaria,
          ),
          `«${opcion}» sin impedimento, sin declarar y con primaria «${primaria}»`,
        ).toBe(true);
        porCausa.salida += 1;
        continue;
      }
      porCausa[impedimento.causa] += 1;
    }

    /* Recuentos fijos, y no la formula que decide la funcion.
       La version anterior recalculaba aqui el cuerpo de `impedimentoDelActo`
       —«si escribe, `sin-declaracion`; si no, `sin-backend`»— y comparaba el
       resultado consigo mismo: pasaba con cualquier implementacion, incluida una
       que devolviera siempre la misma causa. Estos numeros no salen de la
       funcion: salen de contar el catalogo, y cambian cuando cambia el catalogo
       o cuando una opcion declara su escritura, que son exactamente los dos
       cambios sobre los que hay que llamar la atencion. */
    expect(porCausa).toEqual({
      // Trece declaran: las seis de antes, `anulacion_recibo` (#74), las dos
      // transferencias (#73, que salen de `sin-campo` al ganar su resolutor) y
      // las cuatro de Valores (#75) — y `pase_coactiva` llega desde `salida`,
      // porque su primaria del catalogo («Imprimir») pasaba el filtro aunque
      // la pantalla de verdad escribe con «Derivar a coactiva».
      declarada: 13,
      salida: 49,
      'sin-backend': 41,
      // Tres se van a `declarada` con #75, una con #74; y tres se mudan a
      // `sin-campo` con #74: `caja_tributaria` y `caja_tasas` —les falta el
      // medio de pago, un campo distinto de «Forma de pago»— y
      // `fraccionamiento` —le falta la grilla de deuda a acoger—. Con #80 se
      // van tres mas, a `sin-campo`: `fisc_programa`, `fisc_predial` y
      // `fisc_vehicular` —a las tres les falta un identificador interno para
      // el que ninguna seccion del catalogo dibuja un campo editable—.
      'sin-declaracion': 24,
      'sin-determinacion': 1,
      // Las tres de tesoreria (#74) y las tres de fiscalizacion (#80); las dos
      // transferencias ya no estan (#73).
      'sin-campo': 6,
    });
    const total = Object.values(porCausa).reduce((a, b) => a + b, 0);
    expect(total).toBe(Object.keys(pantallas).length);
  });

  it('una opcion testigo por causa, nombrada: los recuentos solos no dicen cual', () => {
    // Lectura pura, con una primaria que **si** es un acto: «Registrar pago».
    expect(impedimentoDelActo('cuenta_corriente', ['Exportar', 'Registrar pago'])?.causa).toBe(
      'sin-backend',
    );
    // Escribe en el contrato y no ha declarado su cuerpo: `cierre_caja` (#36,
    // #74) — el `declarado` que exige `PeticionDeCierre` es un mapa por forma
    // de pago, y `CampoDelCuerpo`/`TablaDelCuerpo` no saben construirlo todavía.
    expect(
      impedimentoDelActo('cierre_caja', ['Cuadrar', 'Imprimir arqueo', 'Cerrar caja'])?.causa,
    ).toBe('sin-declaracion');
    // Y sin declarar, con verbo de escritura, pero con **un dato que la pantalla
    // no tiene donde escribir** (#33, #74): a `caja_tributaria` le falta el
    // medio de pago —EFECTIVO/CHEQUE/DEPOSITO/TARJETA/TRANSFERENCIA—, un campo
    // distinto de «Forma de pago» (que en el backend es `tipoDePago`).
    expect(impedimentoDelActo('caja_tributaria', ['Cobrar'])?.causa).toBe('sin-campo');
    // Y declarada: sin impedimento ninguno.
    expect(impedimentoDelActo('notificacion_valores', ['Registrar notificación'])).toBeUndefined();
    /* «Conciliar seleccionadas» de la consulta de fichas (#322, ADR-0015 §3):
       la accion masiva a ciegas del prototipo **no se implementa**, y la
       operacion de esa pantalla es un `GET`. Es `sin-backend` y no ninguna otra:
       `sin-declaracion` pediria una lista blanca para una escritura que no
       existe, y las de salida no valen —«Conciliar» no imprime ni exporta—. El
       acto que concilia es registrar la declaracion jurada, y eso lo dice el
       aviso permanente de la pantalla, no esta franja. */
    expect(
      impedimentoDelActo('consulta_fichas', ['Exportar Excel', 'Conciliar seleccionadas'])?.causa,
    ).toBe('sin-backend');
    expect(escribe(operacionDe('consulta_fichas') ?? 'inicio')).toBe(false);
    // La misma pareja, comprobada por el otro lado: la causa es la del verbo.
    expect(escribe(operacionDe('caja_tributaria') ?? 'inicio')).toBe(true);
    expect(escribe(operacionDe('cuenta_corriente') ?? 'inicio')).toBe(false);
  });

  /**
   * **La franja no regana donde no hay ningun acto pendiente** (#337).
   *
   * `impedimentoDelActo` miraba solo el verbo de la operacion, asi que en la
   * mitad del sistema —50 de las 134— decia «registra el acto por el
   * procedimiento actual y avísale a sistemas» debajo de un boton que dice
   * «Imprimir liquidación». Ahi no hay acto que registrar por el procedimiento
   * actual: lo que hay es una consulta y su impresion. Una advertencia que
   * aparece donde no advierte nada es la forma mas rapida de que dejen de leerse
   * las que si dicen algo.
   *
   * Se decide **por el catalogo** —la etiqueta de la ultima accion, que es la
   * primaria (FRO-03 §5)— y no por una lista de pantallas: una lista hay que
   * mantenerla al dia contra 134 opciones y empieza a mentir en cuanto una
   * cambie su primaria.
   */
  it.each([
    { primaria: 'Imprimir liquidación', hay: false },
    { primaria: 'Exportar a Excel', hay: false },
    { primaria: 'Limpiar campos', hay: false },
    { primaria: 'Ver ficha', hay: false },
    // Y los verbos que si son actos: la franja se queda donde hace falta.
    { primaria: 'Registrar pago', hay: true },
    { primaria: 'Dar de baja', hay: true },
    { primaria: 'Emitir', hay: true },
    { primaria: 'Cobrar', hay: true },
  ])('«$primaria»: ¿franja? $hay', ({ primaria, hay }) => {
    expect(impedimentoDelActo('cuenta_corriente', ['Nuevo', primaria]) !== undefined).toBe(hay);
  });
});

describe('la franja aparece en la pantalla, y la primaria la referencia', () => {
  it.each([
    {
      caso: 'operacion de lectura',
      ruta: '/rentas-registro/contribuyentes',
      causa: 'sin-backend',
    },
    {
      caso: 'operacion que escribe y opcion sin declarar',
      ruta: '/rentas-registro/predial-masivo',
      causa: 'sin-declaracion',
    },
    // La cuarta causa —`sin-campo`— no tiene hoy ninguna pantalla real que la
    // muestre: se prueba a nivel de funcion, con una muestra, arriba. Las dos
    // transferencias que la usaban tienen su propia bateria en
    // `rentas/transferencias.test.tsx`, ya conectadas.
  ])('$caso: la accion se queda apagada y la franja lo explica', async ({ ruta, causa }) => {
    const montada = montarEnRuta(ruta);
    await waitFor(() => expect(document.querySelector('.sgtm-acciones')).not.toBeNull());

    primariaApagada();
    // `motivoDeLaPrimaria` exige ademas que la franja exista de verdad y lleve
    // `role="status"`: un `aria-describedby` a un `id` que no esta no lo lee nadie.
    expect(motivoDeLaPrimaria()).toMatch(/Registra el acto por el procedimiento actual/);
    // La causa tecnica **no se pinta**: viaja en el `data-` para quien mantiene.
    expect(document.getElementById('sgtm-motivo-de-la-accion')).toHaveAttribute(
      'data-causa',
      causa,
    );

    montada.unmount();
  });

  /**
   * **Con impedimento, los secundarios no llevan el `title` de RNF-052**
   * (revision de #331).
   *
   * Ese texto —«la operación se conecta junto con su campo de observación»— era
   * cierto cuando la unica causa posible era esa, y dejo de serlo cuando la
   * franja aprendio a decir tres cosas distintas: en «Cálculo individual del
   * impuesto predial» afirmaba que falta la observacion, y lo que falta es la
   * capa web del calculo. **Y ademas no llegaba a nadie**: esos botones se
   * dibujan `disabled`, y un `title` sobre un boton deshabilitado no existe ni
   * para el teclado —no se puede enfocar— ni para el lector de pantalla
   * (FRO-04 §6). Lo que hay que leer ya esta pintado en la franja.
   */
  it.each([
    { caso: 'sin-determinacion', ruta: '/rentas-registro/predial-individual' },
    { caso: 'sin-backend', ruta: '/rentas-registro/contribuyentes' },
    { caso: 'sin-declaracion', ruta: '/rentas-registro/predial-masivo' },
  ])('$caso: los secundarios no repiten un motivo que ya no es cierto', async ({ ruta }) => {
    const montada = montarEnRuta(ruta);
    await waitFor(() => expect(document.querySelector('.sgtm-acciones')).not.toBeNull());

    const botones = [...document.querySelectorAll<HTMLButtonElement>('.sgtm-acciones .sgtm-boton')];
    expect(botones.length).toBeGreaterThan(0);
    for (const boton of botones) {
      expect(boton.getAttribute('title'), `«${boton.textContent}» lleva un title`).toBeNull();
    }
    // Y lo que si se lee sigue estando, pintado y en una region viva.
    expect(motivoDeLaPrimaria()).toMatch(/\S/);

    montada.unmount();
  });

  /** Sin impedimento, el `title` de RNF-052 se queda donde si dice la verdad. */
  it('sin impedimento, el secundario sigue explicando que la operacion no esta', async () => {
    montarEnRuta('/rentas-registro/alta-deuda');
    await screen.findByRole('region', { name: 'Observación del usuario' });

    const secundario = screen.getByRole('button', { name: 'Validar' });
    expect(secundario).toHaveAttribute(
      'title',
      'La operación se conecta junto con su campo de observación (RNF-052)',
    );
  });

  it('una opcion declarada no lleva franja de impedimento: lleva la de su formulario', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/rentas-registro/alta-deuda');
    await screen.findByRole('region', { name: 'Observación del usuario' });

    /* Lo que la apaga es **lo que su formulario exige** (`escrituras.ts`), no el
       sistema: el concepto —desde la revision de #331 hay que elegirlo, porque
       sin el el cuerpo saldria sin `tributo`—, el año y el documento —desde
       #342, nit 3, con la misma dureza— y despues la observacion (regla 10).
       Las cuatro son de la opcion; ninguna es un impedimento del acto. */
    expect(motivoDeLaPrimaria()).toMatch(/Falta el concepto/);
    await usuario.selectOptions(
      await screen.findByLabelText('Concepto / tributo'),
      'IMPUESTO PREDIAL',
    );
    expect(motivoDeLaPrimaria()).toMatch(/Falta el año/);
    await usuario.selectOptions(await screen.findByLabelText('Año'), '2026');
    expect(motivoDeLaPrimaria()).toMatch(/Falta el número del documento/);
    await usuario.type(screen.getByLabelText('Nº del documento'), 'RD-2026-000123');
    expect(motivoDeLaPrimaria()).toMatch(/Falta la observación/);
    expect(motivoDeLaPrimaria()).not.toMatch(/avísale a sistemas/);
    expect(document.getElementById('sgtm-motivo-de-la-accion')).not.toHaveAttribute('data-causa');
  });

  /**
   * Y tampoco donde la primaria **no guarda porque no le toca** (#337): la
   * pantalla de salida, con su boton de imprimir.
   */
  it('una pantalla de consulta con primaria de salida no lleva franja', async () => {
    montarEnRuta('/consultas/consulta-deuda?codContribuyente=00000006550');
    await waitFor(() => expect(document.querySelector('.sgtm-acciones')).not.toBeNull());

    // La primaria del catalogo es «Imprimir liquidación»: no hay ningun acto
    // pendiente que registrar por el procedimiento actual.
    expect(
      await screen.findByRole('button', { name: 'Imprimir liquidación de deuda' }),
    ).toBeInTheDocument();
    expect(document.getElementById('sgtm-motivo-de-la-accion')?.textContent).toBe('');
    expect(document.getElementById('sgtm-motivo-de-la-accion')).not.toHaveAttribute('data-causa');
  });

  /**
   * **La franja no aparece donde la composicion ya da un acto** (#332).
   *
   * `calles` y `sectores` son de lectura —su operacion es un `GET`—, asi que la
   * causa salia `sin-backend` y la pantalla decia «aquí todavía no se puede
   * guardar nada» **al lado de un «Nuevo» que abre un formulario y da de alta de
   * verdad** desde #321. Y la franja quedaba ademas huerfana: la primaria es el
   * boton del alta, que no la referencia, asi que nadie la leia nunca.
   */
  it.each([
    { caso: 'un alta en panel', ruta: '/catastro/calles', accion: 'Nuevo' },
    { caso: 'un alta en panel', ruta: '/catastro/sectores', accion: 'Nuevo sector' },
    { caso: 'un flujo guiado', ruta: '/catastro/ficha-urbana', accion: 'Nuevo' },
  ])('$ruta compone $caso: ni franja, ni causa, ni promesa rota', async ({ ruta, accion }) => {
    const montada = montarEnRuta(ruta);
    await waitFor(() => expect(document.querySelector('.sgtm-acciones')).not.toBeNull());

    // El acto existe y esta vivo: es el que el prototipo ya dibujaba.
    expect(await screen.findByRole('button', { name: accion })).toBeEnabled();
    // Y la franja se queda vacia: no hay nada que explicar.
    expect(document.getElementById('sgtm-motivo-de-la-accion')?.textContent).toBe('');
    expect(motivoDeLaPrimaria()).toBeUndefined();

    montada.unmount();
  });
});
