import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import * as dominio from '@sgtm/dominio';
import { OPCIONES_CONECTADAS } from '../conexiones';
import { montarEnRuta } from '../../pruebas/montar';
import { SIN_DATO } from '../seguridad/listado';

/**
 * Consultas (#72): **ninguna cifra sin su fecha**.
 *
 * Es el modulo que mas usa quien atiende en ventanilla, y donde la regla 9 de
 * CLAUDE.md se ve o no se ve. **Diez de las once** ya tienen backend y estan
 * conectadas —`cuenta_corriente` (#21), `consulta_deuda` (#22, #175),
 * `constancia` (#25, #179), `consulta_vehiculos` (#25, #184),
 * `consulta_altas_bajas` (#24), `consulta_pagos` (#25, #219),
 * `consulta_predios` (#25, #222), y ahora `consulta_unificada`,
 * `consulta_resumen_predial` y `consulta_valores` (#25)—; la que falta,
 * `consulta_deudas_beneficio`, no tiene controlador. Lo que **no** espera a
 * nadie es la propiedad que da sentido al modulo, y es lo que se verifica aqui
 * sobre las once a la vez.
 *
 * Las tres que entran con este cambio traen cada una una ausencia, y las
 * pruebas de abajo defienden sobre todo eso: que el hueco **siga siendo un
 * hueco**. Rellenarlas con lo que dibuja el prototipo es facil —esta ahi, el
 * proxy lo sirve para las otras pantallas— y produce una cifra plausible que
 * nadie puede sustentar. Cada una tiene su prueba y las tres se ponen rojas si
 * alguien lo hace.
 */

/** Las once opciones del modulo, por su ranura. Si el catalogo cambia, cambia esto. */
const LAS_ONCE: readonly string[] = [
  'cuenta-corriente/00000025673',
  'consulta-deuda',
  'consulta-unificada/00000025673',
  'consulta-resumen-predial',
  'consulta-altas-bajas',
  'consulta-deudas-beneficio',
  'consulta-pagos',
  'consulta-predios',
  'consulta-vehiculos',
  'consulta-valores',
  'constancia',
];

/**
 * Una cifra de dinero, como se ve en pantalla.
 *
 * `1,842.60`, `S/ 18.42 M`, `-26.40`. No pretende ser exhaustiva: pretende
 * reconocer lo que quien atiende lee como un importe.
 */
const DINERO = /^(S\/\s*)?-?\d{1,3}(,\d{3})*\.\d{2}$/;

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => desinstalarProxyDeDatos());

const cifrasEnPantalla = (): string[] =>
  [...document.querySelectorAll('td, .sgtm-totales__valor, .sgtm-campo__control')]
    .map((nodo) => (nodo.textContent ?? '').trim())
    .filter((texto) => DINERO.test(texto));

describe('ninguna de las once pantallas muestra un importe sin su fecha', () => {
  it.each(LAS_ONCE)('%s dice a que fecha estan sus cifras', async (ranura) => {
    const montada = montarEnRuta(`/consultas/${ranura}`);
    await screen.findByRole('heading', { level: 1 });

    // Se espera a que la pantalla tenga datos: antes de la respuesta no hay
    // cifras que fechar, y la prueba pasaria sin comprobar nada.
    await waitFor(() => expect(cifrasEnPantalla().length + fechas().length).toBeGreaterThan(0));

    if (cifrasEnPantalla().length > 0) {
      // La fecha es de la respuesta, no del bloque de totales: siete de estas
      // once ensenan cifras en una tabla y no tienen banda de totales.
      expect(fechas().length).toBeGreaterThan(0);
    }
    montada.unmount();
  });
});

const fechas = (): HTMLElement[] => screen.queryAllByText(/Cifras actualizadas al/);

describe('la interfaz no suma nada', () => {
  it('`@sgtm/dominio` no exporta ninguna funcion de sumar, y es intencional', () => {
    // Los totales llegan calculados (RNF-083). La ausencia de una funcion de
    // sumar **es** la medida: mientras no exista, no hay forma comoda de
    // componer una cifra que el backend no pueda sustentar.
    const suma = /sum|total|acumul|agrega/i;
    const culpables = Object.keys(dominio).filter((nombre) => suma.test(nombre));
    expect(culpables).toEqual([]);
  });

  it('el saldo del estado de cuenta sale vacio, no restado', async () => {
    montarEnRuta('/consultas/cuenta-corriente/00000025673');

    // El asiento publica un monto y un tipo; «emitido» y «pagado» son la misma
    // cifra en la columna que le toca, y el saldo es el proyectado (#23).
    // Restarlo aqui produciria una cifra que el backend no puede sustentar.
    // Dentro de la tabla: «IMPUESTO PREDIAL» tambien es una opcion del filtro.
    const tabla = await screen.findByRole('table');
    const fila = (await within(tabla).findAllByText('IMPUESTO PREDIAL'))[0]?.closest('tr');
    expect(fila).not.toBeNull();
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    expect(celdas[6]?.textContent).toBe(SIN_DATO);
  });

  it('y los cuatro totales tambien, mientras el saldo proyectado no exista', async () => {
    montarEnRuta('/consultas/cuenta-corriente/00000025673');

    // La banda existe desde el principio con su esqueleto: hay que esperar a que
    // llegue la respuesta, o la prueba mediria el hueco en vez de la cifra.
    await screen.findByText(/Cifras actualizadas al/);
    const saldo = screen.getByText('Saldo total');
    expect(saldo.closest('.sgtm-totales__celda')?.textContent).toContain(SIN_DATO);
  });
});

describe('el estado de cuenta es el libro, y se ve como tal', () => {
  it('lee los asientos del backend, con su monto y su fecha', async () => {
    montarEnRuta('/consultas/cuenta-corriente/00000025673');

    expect(await screen.findByText(/Cifras actualizadas al/)).toBeInTheDocument();
    // Un asiento por movimiento: el cargo y el abono de una cuota son dos.
    expect(await screen.findAllByText('147.98')).toHaveLength(2);
  });

  it('ninguna accion de la pantalla modifica un asiento', async () => {
    montarEnRuta('/consultas/cuenta-corriente/00000025673');
    await screen.findByRole('heading', { level: 1 });

    // El catalogo declara «Excel» e «Imprimir estado de cuenta», y ninguna
    // escribe. Si un dia apareciera una que si, esta prueba lo dice: el libro no
    // se edita, se reversa (regla 4).
    const acciones = screen.getAllByRole('button').map((b) => b.textContent ?? '');
    expect(acciones.some((texto) => /modificar|editar|anular|corregir/i.test(texto))).toBe(false);
  });

  it('diez de las once estan conectadas; la que falta no tiene controlador', () => {
    // `consulta_deudas_beneficio` no se conecta y no es un olvido: un beneficio
    // cambia el importe que se debe, y los valores que lo cuantifican son D-02b
    // —sin ordenanza ratificada—. Sin `Controller` no hay operacion que pedir,
    // y una tabla rellena con lo del prototipo se leeria como deuda rebajada.
    expect(OPCIONES_CONECTADAS).not.toContain('consulta_deudas_beneficio');
    for (const opcion of [
      'cuenta_corriente',
      'consulta_deuda',
      'constancia',
      'consulta_vehiculos',
      'consulta_altas_bajas',
      'consulta_pagos',
      'consulta_predios',
      'consulta_unificada',
      'consulta_resumen_predial',
      'consulta_valores',
    ]) {
      expect(OPCIONES_CONECTADAS).toContain(opcion);
    }
  });
});

describe('consulta_deuda lee ObligacionConDeudaResource', () => {
  it('la fase del prototipo se traduce al enum del backend, y «Todas» no filtra', async () => {
    montarEnRuta('/consultas/consulta-deuda?fase=Valor%20emitido');

    // El mock no filtra de verdad (ADR-0010): lo que importa aqui es que la
    // peticion no truena por mandar «VALOR EMITIDO» donde el enum espera
    // «VALOR» (Fase.valueOf lanzaria). Si la pantalla se dibuja, no trono.
    // Con `findAllBy`: el tributo se repite en mas de una fila del mock.
    expect(await screen.findAllByText('IMPUESTO PREDIAL')).not.toHaveLength(0);
  });

  it('los cuatro totales no se componen: RNF-083', async () => {
    montarEnRuta('/consultas/consulta-deuda');

    await screen.findByText(/Cifras actualizadas al/);
    const total = screen.getByText('Deuda total');
    expect(total.closest('.sgtm-totales__celda')?.textContent).toContain(SIN_DATO);
  });
});

describe('constancia se niega o se emite, y lo dice antes que la tabla', () => {
  it('la hoja trae el resultado en su meta y las filas con su tributo', async () => {
    montarEnRuta('/consultas/constancia/00000025673');

    expect(await screen.findByText('Impuesto predial')).toBeInTheDocument();
    expect(screen.getByText(/SE EMITE|SE NIEGA/)).toBeInTheDocument();
  });
});

describe('consulta_vehiculos lee VehiculoEncontradoResource', () => {
  it('la deuda de la fila viene del recurso, no de sumar nada en la interfaz', async () => {
    montarEnRuta('/consultas/consulta-vehiculos');

    expect(await screen.findByText('T2G-418')).toBeInTheDocument();
    await screen.findByText(/Cifras actualizadas al/);
  });

  it('«Base imponible» sale vacia: el recurso no manda ese campo (D-02)', async () => {
    montarEnRuta('/consultas/consulta-vehiculos');

    const tabla = await screen.findByRole('table');
    const fila = (await within(tabla).findByText('T2G-418')).closest('tr');
    expect(fila).not.toBeNull();
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    // Placa, Clase, Marca y modelo, Año fab., Titular, Afectación, Base imponible, Deuda.
    expect(celdas[6]?.textContent).toBe(SIN_DATO);
  });

  it('«Afectación» es el rango que manda el recurso, no una palabra inventada', async () => {
    montarEnRuta('/consultas/consulta-vehiculos');

    // El mock lee «2019 — 2021» del prototipo y lo parte en afectoDesde/afectoHasta:
    // si la pantalla lo vuelve a juntar igual, el recurso real —dos enteros— tambien se lee bien.
    expect(await screen.findByText('2019 — 2021')).toBeInTheDocument();
  });
});

describe('consulta_altas_bajas lee AsientoResource, la misma forma que cuenta_corriente', () => {
  it('«A/B» sale del tipo del asiento: CARGO es alta, ABONO es baja', async () => {
    montarEnRuta('/consultas/consulta-altas-bajas');

    await screen.findByText(/Cifras actualizadas al/);
    expect(screen.getAllByText('ALTA').length).toBeGreaterThan(0);
    expect(screen.getAllByText('BAJA').length).toBeGreaterThan(0);
  });

  it('cuatro columnas de expediente salen vacias: el asiento no las trae', async () => {
    montarEnRuta('/consultas/consulta-altas-bajas');

    // La tabla existe **tambien mientras carga**, con una fila de esqueleto por
    // celda: esperarla a ella dejaba la prueba a merced de que la respuesta
    // llegara antes que el primer chequeo. Lo que dice que los datos ya estan es
    // la fecha de la respuesta, igual que en la prueba de al lado.
    await screen.findByText(/Cifras actualizadas al/);
    const tabla = await screen.findByRole('table');
    const filas = await within(tabla).findAllByRole('row');
    // La primera fila es la cabecera; la primera de datos alcanza para probarlo.
    const primeraDeDatos = filas[1];
    expect(primeraDeDatos).toBeDefined();
    if (!primeraDeDatos) return;
    const celdas = within(primeraDeDatos).getAllByRole('cell');
    // Num. Docum., A/B, A/M, Cod. Municipal, Doc. Aprob., Fec. Doc. Aprob., Fecha Reg., Est.
    expect(celdas[0]?.textContent).toBe(SIN_DATO);
    expect(celdas[2]?.textContent).toBe(SIN_DATO);
    expect(celdas[3]?.textContent).toBe(SIN_DATO);
    expect(celdas[5]?.textContent).toBe(SIN_DATO);
  });
});

describe('consulta_pagos lee AsientoResource, la misma forma que consulta_altas_bajas', () => {
  it('el recibo y el importe salen del asiento, con su fecha', async () => {
    montarEnRuta('/consultas/consulta-pagos');

    await screen.findByText(/Cifras actualizadas al/);
    expect(await screen.findByText('0003-0041182')).toBeInTheDocument();
  });

  it('«Medio» y «Caja» salen vacias: el asiento no las trae todavia', async () => {
    montarEnRuta('/consultas/consulta-pagos');

    const tabla = await screen.findByRole('table');
    const fila = (await within(tabla).findByText('0003-0041182')).closest('tr');
    expect(fila).not.toBeNull();
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    // Fecha, Recibo, Concepto, Año, Medio, Caja, Importe S/.
    expect(celdas[4]?.textContent).toBe(SIN_DATO);
    expect(celdas[5]?.textContent).toBe(SIN_DATO);
  });
});

describe('consulta_predios lee PredioEncontradoResource', () => {
  it('el codigo, la direccion y la deuda salen del recurso, con su fecha', async () => {
    montarEnRuta('/consultas/consulta-predios');

    await screen.findByText(/Cifras actualizadas al/);
    expect(await screen.findByText('02-014-D-14-01')).toBeInTheDocument();
  });

  it('«Titular», «Uso», «Terreno m²», «Const. m²» y «Autovalúo S/» salen vacias (#25, D-02a)', async () => {
    montarEnRuta('/consultas/consulta-predios');

    const tabla = await screen.findByRole('table');
    const fila = (await within(tabla).findByText('02-014-D-14-01')).closest('tr');
    expect(fila).not.toBeNull();
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    // Código predial, Titular, Dirección, Uso, Terreno m², Const. m², Autovalúo S/, Deuda S/.
    expect(celdas[1]?.textContent).toBe(SIN_DATO);
    expect(celdas[3]?.textContent).toBe(SIN_DATO);
    expect(celdas[4]?.textContent).toBe(SIN_DATO);
    expect(celdas[5]?.textContent).toBe(SIN_DATO);
    expect(celdas[6]?.textContent).toBe(SIN_DATO);
  });
});

describe('consulta_unificada lee ConsultaUnificadaResource', () => {
  it('las cinco cifras del resumen las suma el servidor, y traen su fecha de corte', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/consultas/consulta-unificada/00000025673');

    // «Resumen de saldos» lleva el hint «Solo lectura», y esas arrancan
    // cerradas (FRO-03 §5): hay que abrirla para ver lo que hay dentro.
    await usuario.click(await screen.findByRole('button', { name: /Resumen de saldos/ }));

    // Las cinco salen de `resumenDeSaldos`, cada una como `ImporteActualizado`:
    // el total no se recompone aqui a partir de las partes (RNF-083).
    expect((await screen.findByLabelText('Insoluto')).textContent).toBe('186.48');
    expect(screen.getByLabelText('Gasto').textContent).toBe('92.55');
    expect(screen.getByLabelText('Total').textContent).toBe('279.03');
    // Y la frase que las explica la redacta el backend (RNF-080).
    expect(screen.getByLabelText('Estado de la consulta').textContent).toBe(
      'CONSULTA FINALIZADA',
    );
    // `aLaFecha` de la respuesta, no el reloj del navegador (regla 9).
    expect(screen.getByText(/Cifras actualizadas al/).textContent).toContain('13/08/2026');
  });

  /**
   * **La prueba que sostiene esta conexion.**
   *
   * La rejilla «Impuesto anual» tiene trece columnas y el recurso no publica
   * ninguna: valuo afecto, valuo exonerado, valuo total, impuesto predial y los
   * cuatro arbitrios, por ejercicio. El prototipo si las dibuja —«15,821.60» de
   * valuo afecto de 2026 esta en `respuestas.generado.ts`, a un `filasDe` de
   * distancia—, asi que rellenarla es de una linea. Si alguien lo hace, esto se
   * pone rojo y le obliga a decir de donde salio la cifra.
   */
  it('la rejilla «Impuesto anual» sale vacia: ninguna de sus trece columnas se publica', async () => {
    montarEnRuta('/consultas/consulta-unificada/00000025673');

    await screen.findByText(/Cifras actualizadas al/);
    // Ninguna cifra del prototipo se cuela en la tabla.
    expect(screen.queryByText('15,821.60')).toBeNull();
    expect(screen.queryByText('26,320.00')).toBeNull();
    const tabla = screen.queryByRole('table');
    // Sin filas no hay tabla que dibujar: se ve el vacio, no una rejilla con
    // ceros. Un cero aqui se leeria como «este contribuyente no debe nada».
    expect(tabla).toBeNull();
  });

  it('y el aviso permanente dice por que esta vacia', async () => {
    montarEnRuta('/consultas/consulta-unificada/00000025673');

    // Sin esta linea, la tabla vacia dice «Todavía no hay impuesto anual», que
    // es la lectura equivocada: no es que no deba, es que no existe la cifra.
    expect(
      await screen.findByText(/El resumen de saldos es real; la rejilla «Impuesto anual»/),
    ).toBeInTheDocument();
  });

  it('sin contribuyente no se pide nada, y lo dice', async () => {
    // `GET /consultas/unificada` declara `contribuyente` obligatorio: pedirla
    // sin el es un 400 contra el backend real —el proxy lo tapa, porque
    // contesta igual con filtro o sin el—, y un 400 ahi no le dice nada a quien
    // atiende.
    montarEnRuta('/consultas/consulta-unificada');

    expect(
      await screen.findByText(/Busca un contribuyente para ver su ficha unificada/),
    ).toBeInTheDocument();
    // Y no se dibuja ninguna cifra mientras falte.
    expect(screen.queryByText('186.48')).toBeNull();
  });
});

describe('consulta_resumen_predial lee PredioDelResumenResource', () => {
  it('las cuatro columnas de la tabla salen del recurso', async () => {
    montarEnRuta('/consultas/consulta-resumen-predial');

    expect(await screen.findByText('200601005670320A01...')).toBeInTheDocument();
    expect(screen.getByText('SANTIAGO MOSCOL-GASPAR')).toBeInTheDocument();
    expect(
      screen.getByText('A.H. CUATRO DE NOVIEMBRE — SANTO TORIBIO 17'),
    ).toBeInTheDocument();
  });

  /**
   * **Las dos pestañas de cifras salen con «—», y por dos motivos distintos.**
   *
   * «Impuesto Predial» por predio **no existe**: los tramos se aplican al
   * conjunto de los predios del contribuyente (NEG-05 §1), asi que una cifra por
   * predio seria un reparto inventado. «Valúo Predial / Arbitrios» si es del
   * predio, pero depende de tablas sin firmar (D-02a) y de ordenanzas sin
   * ratificar (D-02b).
   *
   * Las diez cifras del prototipo estan servidas en `respuestas.generado.ts` y
   * llegarian solas si esta pantalla siguiera sin conectar: la prueba las busca
   * una a una.
   */
  it('las cifras de «Impuesto Predial» salen con «—», no con lo del prototipo', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/consultas/consulta-resumen-predial');

    await screen.findByText(/Cifras actualizadas al/);
    // «Solo lectura» arranca cerrada: sin abrirla, esta prueba pasaria mirando
    // una seccion que no esta en la pagina.
    await usuario.click(await screen.findByRole('button', { name: /Determinación por ejercicio/ }));

    // Los cinco campos de la seccion, los cinco con guion.
    for (const etiqueta of [
      'Total deuda predial — insoluto (S/)',
      'Reajuste (S/)',
      'Interés (S/)',
      'Gasto (S/)',
      'Total (S/)',
    ]) {
      expect(screen.getByLabelText(etiqueta).textContent, etiqueta).toBe(SIN_DATO);
    }
    // Y ninguna de las del prototipo se cuela.
    for (const delPrototipo of ['319.32', '141.50', '460.82']) {
      expect(screen.queryByText(delPrototipo), delPrototipo).toBeNull();
    }
  });

  it('y las de «Valúo Predial / Arbitrios» tambien, que es otra decision abierta', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/consultas/consulta-resumen-predial');

    await screen.findByText(/Cifras actualizadas al/);
    await usuario.click(screen.getByRole('tab', { name: /Valúo Predial \/ Arbitrios/ }));
    await usuario.click(
      await screen.findByRole('button', { name: /Valúo y arbitrios por ejercicio/ }),
    );

    for (const etiqueta of [
      'Valúo afecto (S/)',
      'Limpieza pública (S/)',
      'Parques y jardines (S/)',
      'Serenazgo (S/)',
      'Relleno sanitario (S/)',
    ]) {
      expect(screen.getByLabelText(etiqueta).textContent, etiqueta).toBe(SIN_DATO);
    }
    for (const delPrototipo of ['15,821.60', '84.78', '25.20', '37.08']) {
      expect(screen.queryByText(delPrototipo), delPrototipo).toBeNull();
    }
  });

  it('el aviso permanente separa las dos causas', async () => {
    montarEnRuta('/consultas/consulta-resumen-predial');

    expect(
      await screen.findByText(/Lo que este resumen publica hoy, y lo que no/),
    ).toBeInTheDocument();
  });

  /**
   * **«Palabra» garantiza un 422** (`ResumenPredialController`).
   *
   * Es texto libre sin columna a la que apuntar. Vivo, este campo era la unica
   * forma de romper la busqueda desde la propia pantalla, y ninguna prueba lo
   * veia porque el proxy de datos ignora los filtros. Mismo trato —y misma
   * causa— que `consulta_fichas.conciliadaConRentas`.
   */
  it('el filtro «Palabra» se dibuja bloqueado y con su motivo', async () => {
    montarEnRuta('/consultas/consulta-resumen-predial');

    const palabra = await screen.findByLabelText('Palabra');
    expect(palabra).toHaveAttribute('readonly');
    expect(screen.getByText(/La búsqueda por palabra suelta no se puede resolver/)).toBeInTheDocument();
  });
});

describe('consulta_valores lee ValorConsultadoResource', () => {
  it('el numero, el tributo, el periodo y el monto salen del recurso, con su fecha', async () => {
    montarEnRuta('/consultas/consulta-valores');

    expect(await screen.findByText('OP-2026-004182')).toBeInTheDocument();
    const fila = screen.getByText('OP-2026-004182').closest('tr');
    expect(fila).not.toBeNull();
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    // Nro. valor, Tipo, Contribuyente, Tributo, Periodo, Monto S/, Notificado, Estado.
    expect(celdas[3]?.textContent).toBe('IMPUESTO PREDIAL');
    expect(celdas[4]?.textContent).toBe('2025 — cuota 3');
    expect(celdas[5]?.textContent).toBe('195.98');
    // Es lo que `valores_busqueda` (RF-092) no puede dar: su recurso no trae ni
    // tributo ni periodo, y los deja en «—».
    await screen.findByText(/Cifras actualizadas al/);
  });

  /**
   * **«Estado» es la situacion que publica el backend, no la etiqueta del
   * prototipo.**
   *
   * `SituacionDelValor` no tiene «Firme» ni «Reclamado»: lo primero es
   * `EXIGIBLE` —el plazo vencio— y lo segundo no existe en el dominio, porque
   * no hay reclamacion de valores todavia. Reescribirlo a las palabras del
   * prototipo seria volver a redactar lo que el backend ya redacto (RNF-080), y
   * ademas diria dos cosas que no son.
   */
  it('el estado es el que redacta el backend, no «Firme» ni «Reclamado»', async () => {
    montarEnRuta('/consultas/consulta-valores');

    await screen.findByText(/Cifras actualizadas al/);
    const tabla = screen.getByRole('table');
    expect(within(tabla).getByText('EXIGIBLE')).toBeInTheDocument();
    expect(within(tabla).queryByText('Firme')).toBeNull();
    expect(within(tabla).queryByText('Reclamado')).toBeNull();
  });

  it('un valor sin diligencia no tiene fecha de notificacion: sale «—», no «Pendiente»', async () => {
    montarEnRuta('/consultas/consulta-valores');

    // «Pendiente» del prototipo no es una fecha: es la ausencia de diligencia,
    // y el recurso la publica como nulo. Una palabra bajo una cabecera que dice
    // «Notificado» se lee como un estado mas de la notificacion.
    const fila = (await screen.findByText('RM-2026-000912')).closest('tr');
    expect(fila).not.toBeNull();
    const celdas = within(fila as HTMLElement).getAllByRole('cell');
    expect(celdas[6]?.textContent).toBe(SIN_DATO);
  });
});
