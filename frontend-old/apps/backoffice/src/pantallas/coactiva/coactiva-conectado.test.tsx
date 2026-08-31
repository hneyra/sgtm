import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { censoDeAportes, censoDeConectadas } from '../aportes-de-modulo';
import { controlesDeclarados } from '../composicion';
import { esIrreversible } from '../escritura';
import { escrituraDe } from '../escrituras';
import { montarEnRuta } from '../../pruebas/montar';
import { SIN_DATO } from '../seguridad/listado';

/* El censo de conectadas del catalogo entero, SIN registrar ninguna: desde #433 las
   conexiones llegan con el trozo de su modulo, y quien las registra es la espera de
   `Pantalla`. Registrarlas aqui dejaria a este archivo tapandose a si mismo —sus
   pantallas encontrarian su conexion aunque el renderizador no la hubiera pedido—. */
const OPCIONES_CONECTADAS = await censoDeConectadas();

/* Los controles anadidos de los doce modulos, por el mismo camino y por el mismo
   motivo: desde #433 las composiciones tambien llegan con el trozo de su modulo. */
const CONTROLES_DECLARADOS = controlesDeclarados((await censoDeAportes()).composiciones);

/**
 * Coactiva, conectado entero: las cuatro lecturas de #76 y las ocho escrituras
 * de #426. El javadoc de `pantallas/coactiva/index.ts` dice, opcion por opcion,
 * que la tenia parada y con que se solto.
 */

/** Las ocho escrituras del modulo, en el orden en que el issue las lista. */
const LAS_OCHO = [
  'importacion_valores',
  'rec_impresion',
  'expediente_historial',
  'actos_coactivos',
  'costas_procesales',
  'notificaciones_coactivas',
  'cambiar_direccion_ref',
  'fraccionamiento_coactivo',
];

const dibujada = async (): Promise<void> => {
  await screen.findByRole('heading', { level: 1 });
  await waitFor(() => expect(document.querySelector('.sgtm-acciones')).not.toBeNull());
};

beforeEach(() => instalarProxyDeDatos({ latencia: false }));
afterEach(() => desinstalarProxyDeDatos());

describe('las cuatro lecturas de coactiva estan conectadas', () => {
  it('exactamente estas cuatro, ni una mas', () => {
    const deCoactiva = OPCIONES_CONECTADAS.filter((opcion) => opcion.startsWith('coactiva_'));
    expect(deCoactiva.sort()).toEqual(
      ['coactiva_consulta_deudas', 'coactiva_deudas_beneficio', 'coactiva_expedientes'].sort(),
    );
    // `proceso_coactivo` no lleva el prefijo `coactiva_` en su id de catalogo.
    expect(OPCIONES_CONECTADAS).toContain('proceso_coactivo');
    /* Y las tres de #426, que **no son opciones de lectura**: son escrituras que
       leen bajo su clave lo que sus filas necesitan, como `baja_deuda` lee
       `consulta_deuda` (#332). Se afirman aparte para que quitar una ponga rojo
       este conteo y no solo su pantalla. */
    for (const opcion of ['rec_impresion', 'costas_procesales', 'fraccionamiento_coactivo']) {
      expect(OPCIONES_CONECTADAS, opcion).toContain(opcion);
    }
  });

  it('coactiva-expedientes dibuja el codigo del contribuyente que publica ExpedienteResource, y el estado con su texto', async () => {
    montarEnRuta('/coactiva/coactiva-expedientes');
    const tabla = await screen.findByRole('table');
    await esperarFilas(tabla);

    const filas = within(tabla).getAllByRole('row').slice(1);
    expect(filas.length).toBeGreaterThan(0);
    // La columna «Contribuyente» es un codigo (`C-COACT-…`), no la razon
    // social: `ExpedienteResource` no publica el nombre (ver el javadoc de la
    // conexion). Que no aparezca ningun apellido en mayusculas del prototipo
    // demuestra que la tabla ya no lee el mock generico.
    expect(tabla.textContent).toMatch(/C-COACT-\d{4}/);
    // «Medida cautelar» sale con SIN_DATO en las cuatro filas: el recurso no
    // la publica en esta grilla.
    const insignias = within(tabla).getAllByText(/./, { selector: '.sgtm-insignia' });
    expect(insignias.length).toBeGreaterThan(0);
    expect(insignias.every((i) => (i.textContent ?? '').trim() !== '')).toBe(true);
  });

  it('proceso-coactivo dibuja los campos de ExpedienteResource, con su fecha de deuda', async () => {
    montarEnRuta('/coactiva/proceso-coactivo/EC-2026-00412');
    await dibujada();
    // `deudaAlDia` es la fecha a la que estan las cinco cifras de deuda
    // (regla 9): tiene que verse en algun sitio de la pantalla.
    await waitFor(() =>
      expect(screen.queryAllByText(/Cifras actualizadas al/).length).toBeGreaterThan(0),
    );
  });

  it('coactiva-consulta-deudas dibuja el nombre del contribuyente, que si publica DeudaCoactivaResource', async () => {
    montarEnRuta('/coactiva/coactiva-consulta-deudas');
    const tabla = await screen.findByRole('table');
    await esperarFilas(tabla);
    expect(tabla.textContent).toMatch(/[A-ZÁÉÍÓÚÑ]{3,}/);
  });

  it('coactiva-deudas-beneficio no inventa el desglose que DeudaCoactivaResource no publica', async () => {
    montarEnRuta('/coactiva/coactiva-deudas-beneficio');
    const tabla = await screen.findByRole('table');
    await esperarFilas(tabla);
    // «Insoluto S/», «Interés S/» y «Con beneficio S/» —columnas 4, 5 y 8—
    // salen con SIN_DATO en cada fila: el recurso solo publica el total, y
    // «con beneficio» esta fuera de proposito (D-02b, #191).
    const filas = within(tabla).getAllByRole('row').slice(1);
    expect(filas.length).toBeGreaterThan(0);
    for (const fila of filas) {
      const celdas = within(fila)
        .getAllByRole('cell')
        .map((c) => (c.textContent ?? '').trim());
      expect(celdas[3]).toBe(SIN_DATO);
      expect(celdas[4]).toBe(SIN_DATO);
      expect(celdas[7]).toBe(SIN_DATO);
    }
  });
});

/**
 * **Las ocho escrituras de Coactiva, declaradas** (#426).
 *
 * Hasta este issue la prueba de aqui exigia lo contrario —«ninguna de las ocho
 * esta declarada»—, y era la guarda que protegia el hallazgo de #76: conectarlas
 * antes de #421 habria encendido el boton equivocado en seis de las ocho.
 * Resueltas las tres cosas que faltaban, lo que se afirma es cada cuerpo campo a
 * campo: **lo que viaja y lo que no**, que es donde vive la mentira silenciosa.
 */
describe('las ocho escrituras de coactiva declaran su cuerpo', () => {
  it('las ocho, y ninguna se queda fuera', () => {
    for (const opcion of LAS_OCHO) {
      expect(escrituraDe(opcion), opcion).toBeDefined();
    }
  });

  /**
   * **El cuerpo de cada una, clave por clave.**
   *
   * Es la unica forma de afirmar lo que **no** viaja, que es donde vive la
   * mentira silenciosa: una declaracion de mas no rompe nada, no da error y no
   * la ve ninguna de las otras pruebas —la pantalla se dibuja igual, la primaria
   * se enciende igual y el `POST` sale con un campo mas—. Este archivo lo midio:
   * declarar `activo2` en el historial del expediente pasaba en VERDE con las
   * 94 pruebas del modulo y del camino de escritura puestas, y `activo` es
   * justamente lo que `PeticionDeEstadoDelExpediente` excluye a proposito
   * —«el movimiento que rige es el ultimo y eso se deriva»—: admitirlo dejaria
   * marcar como vigente un estado que no es el ultimo.
   */
  it('cada una declara exactamente su cuerpo, y ni una clave mas', () => {
    const camposDe = (opcion: string) => Object.keys(escrituraDe(opcion)?.campos ?? {}).sort();

    expect(camposDe('importacion_valores')).toEqual(
      ['asunto', 'auxiliar', 'direccionReferencialDelContribuyente', 'ejecutor'].sort(),
    );
    // Ninguno: los doce que el catalogo dibuja son «ro» o son el filtro.
    expect(camposDe('rec_impresion')).toEqual([]);
    /* `motivo2` es la del formulario; `motivo` a secas es la del historial, que
       es «ro». Y `activo2` **no esta**: el `record` lo excluye a proposito. */
    expect(camposDe('expediente_historial')).toEqual(
      ['documentoDeRespaldoFecha', 'documentoDeRespaldoNumero', 'motivo2', 'nuevoEstado'].sort(),
    );
    expect(camposDe('cambiar_direccion_ref')).toEqual(
      ['motivoDelCambio', 'nuevaDireccionReferencial'].sort(),
    );
    // Ni un importe: los pone el arancel de costas (regla 5, D-02c).
    expect(camposDe('costas_procesales')).toEqual(['fecha']);
    /* `glosaDelActo` es la del acto; `glosa` a secas es el area de «Medida
       cautelar», y esa seccion entera no viaja: el `record` no tiene ningun
       campo para el numero del embargo, su monto ni la entidad financiera. */
    expect(camposDe('actos_coactivos')).toEqual(
      ['fecDoc', 'glosaDelActo', 'tipoDeActoCoactivo'].sort(),
    );
    /* Sin la serie ni el numero de la notificacion —los pone el servidor—, sin
       `nroVisita` —el intento lo pone el sistema—, sin `vence` —se deriva del
       plazo— y sin representante, firma, vivienda ni testigos. */
    expect(camposDe('notificaciones_coactivas')).toEqual(
      [
        'dNIDelReceptor',
        'domicilio',
        'fecha',
        'nombreDelReceptor',
        'notificador',
        'numeroDelActoNotificado',
        'recibidoPor',
        'tipoDeNotificacion',
      ].sort(),
    );
    expect(camposDe('fraccionamiento_coactivo')).toEqual(
      ['cuotaInicialPorcentaje', 'nDeCuotas', 'nroExpedCoact'].sort(),
    );
  });

  /**
   * **El expediente y el contribuyente salen del filtro, no de un campo.**
   *
   * Las dos opciones cuyo sujeto ya lo pregunta el bloque de busqueda lo llevan
   * al cuerpo con `delFiltro` (#423), en vez de dibujar una segunda caja para lo
   * mismo. Y la de costas lo declara **ademas** de mandarlo por la consulta
   * (#425), que es lo unico que apaga la primaria: `Conexion.exige` apaga la
   * lectura, no el boton.
   */
  it('la importacion abre el expediente del contribuyente del filtro, y las costas las del suyo', () => {
    expect(Object.keys(escrituraDe('importacion_valores')?.delFiltro ?? {})).toEqual([
      'contribuyente',
    ]);
    expect(escrituraDe('importacion_valores')?.delFiltro?.['contribuyente']?.campo).toBe(
      'codContribuyente',
    );
    expect(escrituraDe('costas_procesales')?.delFiltro?.['nroExpedCoact']?.campo).toBe(
      'nroExpedCoact',
    );
  });

  /**
   * **Ni el numero del expediente ni la observacion se declaran como campo**, y
   * las dos por motivos distintos que conviene no confundir: el numero lo compone
   * el servidor sobre su correlativo (D-09) y la observacion la pide ya
   * `useEscritura` (regla 10). Declarar cualquiera de los dos daria dos sitios
   * para el mismo dato.
   */
  it('la importacion no manda el numero del expediente ni su segunda caja de observaciones', () => {
    const campos = Object.keys(escrituraDe('importacion_valores')?.campos ?? {});
    expect(campos.sort()).toEqual(
      ['asunto', 'auxiliar', 'direccionReferencialDelContribuyente', 'ejecutor'].sort(),
    );
    expect(campos).not.toContain('numero');
    expect(campos).not.toContain('ano');
    expect(campos).not.toContain('observaciones');
  });

  /**
   * **La REC-1 va como constante, y «Carátula» no manda nada.**
   *
   * Es el hallazgo de este issue y el que mas se parece al defecto que #421
   * nombra. `ActoCoactivoController.recDe` acepta la palabra «CARATULA» y la
   * mapea a `REC1` —`TipoDeActoCoactivo` no tiene ninguna constante para ella—,
   * asi que un boton rotulado «Carátula» que la mandara **dictaria la REC-1**:
   * un acto irreversible que se notifica al obligado, bajo un rotulo que promete
   * un papel. Se comprueba por los dos lados: que `rec` viaja fijado a `REC1` y
   * que la opcion no declara ningun discriminador por accion.
   */
  it('la impresion de REC emite la REC-1 y solo la REC-1', () => {
    const declarada = escrituraDe('rec_impresion');
    expect(declarada?.constantes).toEqual({ rec: 'REC1' });
    expect(declarada?.segunLaAccion).toBeUndefined();
    // Ningun campo del formulario viaja: los doce del catalogo son «ro» o filtro.
    expect(Object.keys(declarada?.campos ?? {})).toEqual([]);
    // Lo que viaja son los expedientes marcados, por su numero impreso y nada mas.
    expect(declarada?.tablas?.['expedientes']?.campo).toBe('expedientes');
    expect(declarada?.tablas?.['expedientes']?.columnaUnica).toBe('numero');
    // Y `proyectarInteresAl` **no** se declara: viaja por la consulta (#425).
    expect(Object.keys(declarada?.delFiltro ?? {})).toEqual([]);
  });

  /**
   * **El vocabulario de la diligencia se traduce, y lo que no se reconoce no
   * viaja.**
   *
   * Dos desplegables del prototipo, dos campos del cuerpo: `recibidoPor` dice
   * **como** se diligencio y `tipoDeNotificacion` **con que resultado**. Las dos
   * opciones que el manual escribe para no haber ubicado a nadie —«DIRECCIÓN NO
   * EXISTE» y «DESTINATARIO DESCONOCIDO»— dan `NO_UBICADO`, que es lo que
   * sostiene el cedulon del art. 104 f) y el reintento de #39.
   */
  it('la notificacion coactiva traduce los dos ejes, y no inventa el que falte', () => {
    const campos = escrituraDe('notificaciones_coactivas')?.campos ?? {};
    expect(campos['recibidoPor']?.campo).toBe('modalidad');
    expect(campos['tipoDeNotificacion']?.campo).toBe('resultado');
    expect(campos['recibidoPor']?.valor?.('CEDULÓN')).toBe('CEDULON');
    expect(campos['recibidoPor']?.valor?.('NEGATIVA A RECIBIR')).toBe('NEGATIVA');
    expect(campos['recibidoPor']?.valor?.('FAMILIAR')).toBe('PERSONAL');
    expect(campos['tipoDeNotificacion']?.valor?.('DIRECCIÓN NO EXISTE')).toBe('NO_UBICADO');
    expect(campos['tipoDeNotificacion']?.valor?.('DESTINATARIO DESCONOCIDO')).toBe('NO_UBICADO');
    expect(campos['tipoDeNotificacion']?.valor?.('NOTIFICACIÓN NEGATIVA')).toBe('RECHAZADO');
    // Una palabra que ninguna tabla reconoce deja el campo sin poner: el backend
    // lo dice nombrandolo, que es mejor que mandar la mas parecida.
    expect(campos['recibidoPor']?.valor?.('CEDULON')).toBeUndefined();
    expect(campos['tipoDeNotificacion']?.valor?.('NOTIFICACION CON EXITO')).toBeUndefined();
  });

  /**
   * **La cuota inicial es un porcentaje, y «Pago inicial (S/)» son soles.**
   *
   * Es la mentira silenciosa que este issue evito: `PeticionDeConvenioCoactivo.cuotaInicial`
   * es un `Alicuota.de` de 0 a 100, y el unico campo editable parecido del
   * catalogo es un importe. Atarlos convertiria «20» soles en un 20 % de cuota
   * inicial —una cifra plausible y equivocada que sale impresa en el cronograma
   * que el contribuyente firma—.
   */
  it('el fraccionamiento no ata el importe del prototipo al porcentaje del backend', () => {
    const declarada = escrituraDe('fraccionamiento_coactivo');
    expect(Object.keys(declarada?.campos ?? {}).sort()).toEqual(
      ['cuotaInicialPorcentaje', 'nDeCuotas', 'nroExpedCoact'].sort(),
    );
    // El campo del prototipo NO viaja, y ese es el punto.
    expect(declarada?.campos?.['pagoInicialS']).toBeUndefined();
    expect(declarada?.campos?.['cuotaInicialPorcentaje']?.campo).toBe('cuotaInicial');
    // Ni las seis cifras «ro» de «Resultado del convenio».
    for (const cifra of [
      'deudaTotalS',
      'deudaAcogidaS',
      'deudaConBeneficioS',
      'tasa',
      'beneficioS',
    ]) {
      expect(declarada?.campos?.[cifra], cifra).toBeUndefined();
    }
    // Y la tabla identifica la obligacion sin valorarla: ningun importe viaja.
    expect(Object.keys(declarada?.tablas?.['obligaciones']?.columnas ?? {}).sort()).toEqual(
      ['ano', 'predioId', 'tributo', 'vehiculoId'].sort(),
    );
  });

  /**
   * **Los cinco controles anadidos son cinco, y cada uno llena un campo que su
   * opcion declara** (#422).
   *
   * `controles-declarados.test.ts` ya comprueba de cada uno que su seccion
   * existe, que su clave no pisa ninguna del catalogo y que su etiqueta es
   * propia. Lo que se afirma aqui es el **censo del modulo**: cinco y no seis,
   * porque el sexto candidato —el contribuyente de la importacion— no hacia falta
   * (lo pregunta el filtro) y anadirlo habria dado dos cajas para lo mismo.
   */
  it('coactiva anade cinco controles, ni uno mas', () => {
    const deCoactiva = CONTROLES_DECLARADOS.filter(({ opcion }) => LAS_OCHO.includes(opcion));
    expect(deCoactiva.map(({ opcion, control }) => `${opcion}.${control.campo}`).sort()).toEqual(
      [
        'actos_coactivos.tipoDeActoCoactivo',
        'cambiar_direccion_ref.motivoDelCambio',
        'fraccionamiento_coactivo.cuotaInicialPorcentaje',
        'fraccionamiento_coactivo.nroExpedCoact',
        'notificaciones_coactivas.numeroDelActoNotificado',
      ].sort(),
    );
    // Y el que NO esta: el acto se pregunta aparte del papel que lo materializa.
    expect(escrituraDe('actos_coactivos')?.campos?.['documento']).toBeUndefined();
    // `glosaDelActo` es la del acto; `glosa` a secas es el area de «Medida cautelar».
    expect(escrituraDe('actos_coactivos')?.campos?.['glosaDelActo']?.campo).toBe('glosa');
    expect(escrituraDe('actos_coactivos')?.campos?.['glosa']).toBeUndefined();
  });

  /**
   * **La importacion se confirma antes de importar** (AC 2 de #426, RF-100).
   *
   * `ImportarValoresACoactiva` abre el expediente, le pone su numero definitivo y
   * mueve los valores a fase COACTIVA: no hay vuelta atras (regla 4). El rotulo
   * del boton es «Importar valores», sin la palabra «coactiva» que el patron ya
   * cazaba en «Pase de valores a coactiva».
   */
  it('importar valores es irreversible, y por eso se confirma', () => {
    expect(esIrreversible('Importar valores')).toBe(true);
    expect(esIrreversible('Generar')).toBe(true);
    // Y las que no lo son siguen sin serlo: esto ensancha el patron, no lo abre.
    expect(esIrreversible('Limpiar campos')).toBe(false);
    expect(esIrreversible('Expedientes libres')).toBe(false);
    expect(esIrreversible('Listar expedientes')).toBe(false);
  });
});

/**
 * Las tres pantallas que ahora tienen filas que marcar, montadas de verdad.
 */
describe('las tablas que dan filas a una escritura traen filas', () => {
  it('la REC se emite sobre expedientes de verdad, y la columna «Nombre» sale «—»', async () => {
    montarEnRuta('/coactiva/rec-impresion');
    const tabla = await screen.findByRole('table');
    await esperarFilas(tabla);

    const filas = within(tabla).getAllByRole('row').slice(1);
    expect(filas.length).toBeGreaterThan(0);
    const celdas = within(filas[0] as HTMLElement)
      .getAllByRole('cell')
      .map((c) => (c.textContent ?? '').trim());
    // Siete columnas: la primera es «Seleccione», que el catalogo si dibuja y la
    // casilla ocupa —por eso el adaptador emite ahi una celda vacia—.
    expect(celdas.length).toBe(7);
    expect(celdas[0]).toMatch(/^Elegir el expediente/);
    // «Nombre»: `ExpedienteResource` publica el codigo, no la razon social.
    expect(celdas[4]).toBe(SIN_DATO);
    expect(celdas[3]).toMatch(/C-COACT-\d{4}/);
  });

  it('las costas listan las liquidaciones, y «Cod. Contrib.» sale «—»', async () => {
    montarEnRuta('/coactiva/costas-procesales');
    const tabla = await screen.findByRole('table');
    await esperarFilas(tabla);

    const filas = within(tabla).getAllByRole('row').slice(1);
    expect(filas.length).toBeGreaterThan(0);
    for (const fila of filas) {
      const celdas = within(fila)
        .getAllByRole('cell')
        .map((c) => (c.textContent ?? '').trim());
      // `LiquidacionResource` no publica ni el codigo ni el nombre del obligado.
      expect(celdas[1]).toBe(SIN_DATO);
    }
    // Y el estado sale con las dos palabras que el sistema deriva del libro.
    expect(tabla.textContent).toMatch(/ACTIVA|CANCELADA/);
  });

  /**
   * **La grilla del fraccionamiento no tiene filas hasta que hay expediente**, y
   * eso lo dice la pantalla en vez de dibujar una tabla vacia.
   */
  it('el fraccionamiento pide su expediente antes de traer nada', async () => {
    montarEnRuta('/coactiva/fraccionamiento-coactivo');
    await dibujada();
    expect(
      await screen.findByText(/Escribe el expediente coactivo que se va a fraccionar/),
    ).toBeInTheDocument();
  });

  /**
   * Y con el expediente escrito, las filas llegan **sin ninguna cifra
   * compuesta**: seis de las trece columnas salen «—» porque el recurso no las
   * publica, y «Unidad» es la que mas dice —el recurso da un identificador
   * interno y el prototipo dibuja ahi un codigo catastral, que es otra cosa—.
   */
  it('escrito el expediente, la tabla trae sus obligaciones y no inventa columnas', async () => {
    const usuario = userEvent.setup();
    montarEnRuta('/coactiva/fraccionamiento-coactivo');
    await dibujada();

    await usuario.type(
      await screen.findByLabelText('Nº del expediente coactivo que se fracciona'),
      '0000001096',
    );

    const tabla = await screen.findByRole('table');
    await esperarFilas(tabla);
    const filas = within(tabla).getAllByRole('row').slice(1);
    const celdas = within(filas[0] as HTMLElement)
      .getAllByRole('cell')
      .map((c) => (c.textContent ?? '').trim());
    /* Catorce celdas: las trece del catalogo **mas** la que la casilla anade
       (`columnaPropia`). Es la unica tabla que elige y no trae columna para la
       casilla; sin eso, «Año» habria desaparecido de la pantalla, y el ejercicio
       es uno de los cuatro datos con los que se identifica lo que se acoge. */
    expect(celdas.length).toBe(14);
    expect(celdas[0]).toMatch(/^Elegir la obligación/);
    // «Año» sigue estando, que es lo que la columna propia salva.
    expect(celdas[1]).toMatch(/^\d{4}$/);
    // «Unidad», «Cuota», «Nom. Trib.», «Fase», «Conc.» y «Est.»: seis «—».
    for (const columna of [2, 3, 5, 6, 7, 8]) {
      expect(celdas[columna], `columna ${columna}`).toBe(SIN_DATO);
    }
    // Y «Trib.» si sale, que es lo que distingue una costa de un tributo.
    expect(celdas[4]).not.toBe(SIN_DATO);

    /* **Y el pie congelado del prototipo no se dibuja** (`PIES`, #426). Decia
       «Deuda total 1,848.66 · acogida 1,848.66 · con beneficio 1,845.51»: tres
       cifras de la captura del manual que se pintaban bajo la tabla fuera cual
       fuera el expediente. La segunda es ademas imposible —«acogida» depende de
       lo que se marque—, asi que no es una cifra vieja: es una que no puede
       existir antes de marcar nada. */
    expect(screen.queryByText(/Deuda total 1,848\.66/)).toBeNull();
    expect(screen.queryByText(/con beneficio 1,845\.51/)).toBeNull();
  });
});

async function esperarFilas(tabla: HTMLElement): Promise<void> {
  await waitFor(() => expect(within(tabla).queryAllByRole('row').length).toBeGreaterThan(1));
}
