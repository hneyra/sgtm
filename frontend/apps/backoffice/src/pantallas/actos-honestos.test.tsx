import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { escribe } from '@sgtm/api-client';
import { todasLasPantallas } from '../catalogo';
import { montarEnRuta } from '../pruebas/montar';
import { motivoDeLaPrimaria, primariaApagada } from '../pruebas/acciones';
import { impedimentoDelActo } from './actos';
import { operacionDe } from './busqueda';
import { OPCIONES_QUE_ESCRIBEN } from './escrituras';

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
    expect(impedimentoDelActo('transferencia_predio')?.causa).toBe('sin-declaracion');
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

  it('las tres causas hablan de la ventanilla, y la tecnica se queda en el `data-`', () => {
    const sinBackend = impedimentoDelActo('contribuyentes')?.detalle ?? '';
    const sinDeclaracion = impedimentoDelActo('predial_masivo')?.detalle ?? '';
    const sinDeterminacion =
      impedimentoDelActo('predial_individual', ['Buscar', 'Calcular'])?.detalle ?? '';

    // Los tres dicen **por donde se sale**: el acto existe fuera del sistema, y
    // quedarse en «no se puede» deja el mostrador parado.
    for (const texto of [sinBackend, sinDeclaracion, sinDeterminacion]) {
      expect(texto).toMatch(/Registra el acto por el procedimiento actual/);
      expect(texto).toMatch(/avísale a sistemas/);
      // Y **ninguno habla de desarrollador**: quien atiende no sabe qué es «el
      // backend» ni qué son campos «declarados», y leyéndolo sólo puede
      // concluir que la pantalla está rota y que la culpa es suya.
      expect(texto).not.toMatch(/backend|endpoint|declarad|contrato|API/i);
    }
    // No son el mismo texto con otro nombre: si lo fueran, distinguir las causas
    // no serviria de nada.
    expect(new Set([sinBackend, sinDeclaracion, sinDeterminacion]).size).toBe(3);
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
      declarada: 6,
      salida: 50,
      'sin-backend': 41,
      // Una se muda de casilla al sumarse la tercera causa (#333): «Cálculo
      // individual del impuesto predial», cuya primaria es «Calcular».
      'sin-declaracion': 36,
      'sin-determinacion': 1,
    });
    const total = Object.values(porCausa).reduce((a, b) => a + b, 0);
    expect(total).toBe(Object.keys(pantallas).length);
  });

  it('una opcion testigo por causa, nombrada: los recuentos solos no dicen cual', () => {
    // Lectura pura, con una primaria que **si** es un acto: «Registrar pago».
    expect(impedimentoDelActo('cuenta_corriente', ['Exportar', 'Registrar pago'])?.causa).toBe(
      'sin-backend',
    );
    // Escribe en el contrato y no ha declarado su cuerpo.
    expect(impedimentoDelActo('caja_tributaria', ['Cobrar'])?.causa).toBe('sin-declaracion');
    // Y declarada: sin impedimento ninguno.
    expect(impedimentoDelActo('notificacion_valores', ['Registrar notificación'])).toBeUndefined();
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
      ruta: '/rentas-registro/transferencia-predio',
      causa: 'sin-declaracion',
    },
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

  it('una opcion declarada no lleva franja de impedimento: lleva la de su formulario', async () => {
    montarEnRuta('/rentas-registro/alta-deuda');
    await screen.findByRole('region', { name: 'Observación del usuario' });

    // Lo que la apaga es la observacion que falta (regla 10), no el sistema.
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
