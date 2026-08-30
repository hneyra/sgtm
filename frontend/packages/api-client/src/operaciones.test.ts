import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { OPERACIONES, consultaDeOperacion, descriptorDe, rutaDeOperacion } from './index';

/**
 * Lo que el contrato genera es lo que el contrato dice.
 *
 * Tres de los criterios de #61 se verifican **sobre la salida generada** y no
 * sobre el codigo escrito a mano, que es donde la regla de ESLint no llega: un
 * generador que se tragara un `municipalidadId` lo repartiria por las 134
 * operaciones sin que ninguna regla del proyecto lo viera pasar.
 */

// Se lee como texto, no como modulo: lo que hay que comprobar es lo que el
// generador escribio, incluidos los tipos, que en tiempo de ejecucion no existen.
const GENERADO = readFileSync(
  resolve(process.cwd(), 'packages/api-client/src/operaciones.generado.ts'),
  'utf8',
);

/**
 * El archivo sin sus comentarios. Lo que se comprueba es el codigo generado: la
 * prosa del encabezado habla de la municipalidad precisamente para explicar por
 * que ninguna operacion la recibe.
 */
const CODIGO = GENERADO.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

/** La misma lista de nombres con dinero que usan la regla de ESLint y el generador. */
const CAMPOS_DE_DINERO =
  'monto|importe|saldo|deuda|total|insoluto|interes|autovaluo|arbitrio|recargo|vuelto|recibido';

describe('las operaciones generadas son las del contrato', () => {
  it('son las 134 del manual, mas cincuenta y seis operaciones sin pantalla propia', () => {
    // Operaciones que no son opciones del catalogo y no tienen pantalla propia
    // de la que salir (generar-openapi.mjs, OPERACIONES_ADICIONALES):
    //   - `permisos_de_grupo` (#70): el GET que carga la matriz que `permisos`
    //     guarda antes de guardarla.
    //   - `permisos_de_la_sesion` (ADR-0013): la matriz de permisos efectivos
    //     del usuario en curso, de la que la interfaz dibuja el menu.
    //   - `registrar_via` / `editar_via` (#290): el alta y la edicion de la
    //     pantalla `calles`, que declara «GET /catastro/vias» como su endpoint
    //     —la lectura— y necesita un verbo aparte para escribir.
    //   - `registrar_sector` / `editar_sector` / `registrar_manzana` (#290): lo
    //     mismo para `sectores`, que declara «GET /catastro/sectores». Las
    //     manzanas no tienen pantalla propia en el manual: cuelgan del sector,
    //     y solo se dan de alta —el codigo de una manzana es un tramo del
    //     codigo catastral de sus predios, asi que no se edita—.
    //   - `registrar_ficha_urbana` / `_economica` / `_bienes` / `_rural`
    //     (#290): el alta de la primera version de cada ficha. Las cuatro
    //     pantallas declaran «GET .../{codigo}» —leer la ficha de un predio—,
    //     y el alta no lleva codigo en la ruta porque el predio todavia no
    //     existe: nace en el mismo acto que su ficha.
    //   - `actualizar_ficha_economica` / `_bienes` / `_rural` (#290): el
    //     versionado de los otros tres tipos. `actualizacion_catastro` es una
    //     sola opcion del manual y su endpoint ya publica el PUT de la urbana,
    //     asi que los otros tres necesitan verbo propio bajo la misma opcion.
    //   - `costas_procesales_listado` (#42): la grilla «Liquidaciones
    //     encontradas» de la pantalla `costas_procesales`, que declara «POST
    //     /coactiva/liquidaciones-costas» como su endpoint —la liquidacion— y
    //     necesita un verbo aparte para listar. Hacer que el POST devolviera
    //     tambien la grilla convertiria una consulta en una escritura, y una
    //     pantalla que lista al abrirse consumiria un correlativo cada vez.
    //   - `emitir_licencia` / `registrar_ciiu` (#44): la emision de la
    //     licencia de funcionamiento y el alta en el catalogo CIIU. Sus
    //     pantallas (`licencia_funcionamiento`, `ciiu`) declaran el GET de la
    //     grilla y el catalogo como su endpoint, y escribir necesita verbo
    //     propio bajo la misma opcion.
    //   - `registrar_internamiento` / `liberar_internamiento` (#50): las dos
    //     acciones de la pantalla `internamiento`, que declara «GET
    //     /transito/internamientos» —la grilla del deposito—.
    //   - `notificar_resolucion_transito` (#50): notificar la resolucion de
    //     gerencia de transito. Infracciones administrativas tiene su pantalla
    //     de notificacion en el manual; transito no, y sin ella la
    //     sancionadora no se puede dictar nunca, porque su plazo se cuenta
    //     desde que la ordinaria surte efecto.
    //   - `liquidar_fiscalizacion` / `reliquidar_fiscalizacion` (#49): la
    //     pantalla `fisc_resultados` declara «GET /fiscalizacion/resultados»
    //     —la grilla— y emitir la liquidacion de un acta y corregirla con otra
    //     version necesitan sus propios verbos.
    //   - `estado_de_liquidacion` (#49): mover la liquidacion por sus estados
    //     desde `fisc_historico`, que declara solo su GET. No actualiza
    //     ninguna fila: agrega un movimiento y el estado se deriva.
    //   - `presentar_fue` / `completar_seccion_fue` /
    //     `emitir_licencia_edificacion` / `revalidar_licencia_edificacion`
    //     (#48): el FUE se presenta, se completa POR PARTES y solo entonces se
    //     emite, y su plazo se prorroga con otro acto. Su pantalla
    //     (`fue_edificacion`) declara el GET de la grilla como su endpoint, y
    //     los cuatro actos necesitan verbo propio bajo la misma opcion. No hay
    //     PUT: las secciones se versionan, y la cabecera no admite UPDATE.
    //   - `registrar_anuncio` / `renovar_anuncio` / `cesar_anuncio` /
    //     `retirar_anuncio` (#51): el registro de la autorizacion de anuncio
    //     —que ademas genera su deuda por la tasa— y los tres tramites que la
    //     pantalla `anuncios` enumera. Ella declara «GET /autorizaciones/
    //     anuncios» como su endpoint —la grilla—, y `anuncio` no admite UPDATE
    //     desde V45: renovar, cesar y retirar son ACTOS que producen una fila
    //     nueva, no ediciones del formulario, asi que cada uno lleva su verbo.
    //   - `transferir_a_rentas` (#52): la accion de `fisc_resultados` que
    //     convierte lo hallado en el dato oficial del padron —version nueva de
    //     la ficha, cargos de la diferencia y resolucion de determinacion, en
    //     una transaccion—. La pantalla declara su grilla como endpoint, y la
    //     frontera delicada del sistema necesita verbo propio.
    //   - `certificados_listado` / `imprimir_certificado` (#54): la pantalla
    //     `certificados` declara «POST /licencias/certificados» —la emisión—
    //     como su endpoint, y su grilla y su acción «Imprimir certificado»
    //     necesitan verbo propio. Hacer que el POST devolviera también la
    //     grilla convertiría una consulta en una escritura, y una pantalla que
    //     lista al abrirse consumiría un correlativo cada vez. No hay PUT:
    //     `certificado` no admite UPDATE desde V51, y uno equivocado se
    //     sustituye emitiendo otro.
    //   - `consulta_fichas_conciliacion` (#344, ADR-0015): la misma grilla de
    //     `consulta_fichas` con la columna «Conciliada» y el filtro
    //     `conciliadaConRentas`. No cabe en la operacion de la pantalla porque
    //     el derivado sale de `declaracion_jurada` —que es de rentas— y
    //     catastro no puede depender de rentas: la sirve rentas, en su propia
    //     ruta, y la de catastro redirige alli con 307 la peticion que trae el
    //     filtro.
    //   - `titulares_del_predio` (#366, ADR-0015 §2.4): quien es titular de un
    //     predio a una fecha, con su codigo del padron. No cabe en ninguna de
    //     las dos pantallas que la usan: la grilla de `consulta_fichas` publica
    //     el nombre del titular y no su identificador —anadirlo la convertiria
    //     en un extractor de la correlacion predio→persona—, asi que el codigo
    //     se resuelve AL CLIC, de un predio cada vez, con el permiso del padron
    //     (`contribuyentes`) y dejando fila de ACCESO en la bitacora.
    //   - `presentar_declaracion_jurada`, `rectificar_declaracion_jurada`,
    //     `observar_declaracion_jurada` y `anular_declaracion_jurada` (#365,
    //     ADR-0015 §3): la pantalla `declaracion_jurada` declara «GET
    //     /rentas/declaraciones/{djNro}» —consultar la DJ ya presentada— y los
    //     cuatro actos necesitan verbo propio. Presentar es **el acto que
    //     concilia**: hasta #365 el caso de uso existia y ningun controlador lo
    //     exponia, asi que un predio solo aparecia conciliado si alguien
    //     sembraba la fila a mano.
    //   - `portal_mi_situacion` (#57, ADR-0020): la unica operacion del portal
    //     del contribuyente, y la unica de toda la API que se sirve con el
    //     token del realm del CIUDADANO. No sale de ninguna pantalla del
    //     catalogo —la opcion `portal` de las 134 es la vista del funcionario y
    //     sigue sin backend—, sino de `apps/portal`. Y en la misma tanda
    //     **desaparece un parametro**: el `doc` de `GET /portal/deuda`, que era
    //     el endpoint de enumeracion del padron que D-07 describia.
    //   - `fisc_programas_listado` (#431): la lectura del programa de
    //     fiscalizacion, que faltaba. `/fiscalizacion/programas` declaraba solo
    //     `post` —programar—, asi que un programa se podia registrar y no se
    //     podia volver a encontrar: ni por su pantalla, cuya operacion del
    //     catalogo es ese POST y no se pide al abrirla, ni por las dos actas,
    //     que exigen el `programaId` de un programa ya generado.
    //   - `coactiva_deuda_del_expediente` (#426): la deuda del expediente
    //     **obligacion por obligacion**. Es la lectura de la que
    //     `fraccionamiento_coactivo` saca sus filas —su cuerpo pide `tributo`,
    //     `ejercicio` y `predioId`/`vehiculoId` una a una— y ninguna lectura del
    //     modulo tenia esa granularidad: la deuda del expediente es una suma, y
    //     un convenio no se fracciona sobre una suma.
    //   - `fisc_programa_muestra` y `fisc_programa_generar_muestra` (#481): la
    //     muestra sorteada de un programa y el acto que la sortea. Es la grilla
    //     «Predios seleccionados» de `fisc_programa` y **la misma fila** de la
    //     que el acta predial resuelve sus tres identificadores —su catalogo los
    //     dibuja de solo lectura y no declara ni filtros ni tabla, asi que solo
    //     se puede abrir desde una fila ya resuelta.
    //   - `listado_de_predios`, `dar_de_baja_predio` y `reactivar_predio`
    //     (#400): el predio como recurso propio. Los datos PROPIOS del predio
    //     —direccion, via, numero municipal, sector, manzana, lote, ubigeo y
    //     tipo— solo se podian escribir al inscribirlo, asi que una direccion
    //     mal tecleada al fichar era para siempre; y `RegistrarPredio.darDeBaja`
    //     existia desde #290 sin que ningun endpoint la llamara. El listado no
    //     es la consulta de fichas con otro nombre: aquella lista fichas
    //     vigentes a una fecha, y esta lista predios —incluidos **los que nadie
    //     ficho** y los dados de baja—, que es lo unico que encuentra lo que
    //     entra por una carga cartografica. La reactivacion existe porque sin
    //     ella la baja seria una puerta de un solo sentido: el alta rechaza a
    //     proposito fichar un predio retirado.
    //   - Las ocho del padron (#488): `registrar_contribuyente`,
    //     `modificar_contribuyente`, `ficha_del_contribuyente`,
    //     `mudar_contribuyente`, `registrar_contacto`, `modificar_contacto`,
    //     `registrar_responsable_solidario` y `cerrar_responsable_solidario`. La
    //     pantalla `contribuyentes` declara UN endpoint —el GET de la grilla— y
    //     el alta, la correccion, la baja y toda la ficha que cuelga del
    //     contribuyente necesitan verbo propio. Hasta #488 los casos de uso
    //     existian desde #11 y #15 y ningun controlador los publicaba: una
    //     municipalidad recien implantada no podia registrar a su primer
    //     contribuyente sino por el proceso batch de importacion.
    // Las 134 opciones del manual siguen siendo 134.
    expect(Object.keys(OPERACIONES)).toHaveLength(190);
  });

  it('cada una declara verbo y camino relativo a /api/v1', () => {
    for (const [id, operacion] of Object.entries(OPERACIONES)) {
      expect(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], id).toContain(operacion.metodo);
      expect(operacion.ruta, id).toMatch(/^\//);
      // El camino base lo pone el cliente: repetirlo aqui daria /api/v1/api/v1.
      expect(operacion.ruta, id).not.toMatch(/^\/api\/v1/);
    }
  });

  it('los parametros de ruta declarados son los que la ruta trae entre llaves', () => {
    for (const [id, operacion] of Object.entries(OPERACIONES)) {
      const enLaRuta = [...operacion.ruta.matchAll(/\{(\w+)\}/g)].map(([, nombre]) => nombre);
      expect([...operacion.parametrosDeRuta], id).toEqual(enLaRuta);
    }
  });
});

describe('las reglas del proyecto, verificadas sobre lo generado', () => {
  it('ninguna firma generada acepta la municipalidad (regla 2, FRO-01 §4)', () => {
    expect(CODIGO).not.toMatch(/municipalidad/i);
  });

  it('ningun campo de importe se genera como number (regla 1, RNF-055)', () => {
    const importeComoNumero = new RegExp(`(${CAMPOS_DE_DINERO})\\w*\\??:\\s*number`, 'i');
    expect(CODIGO).not.toMatch(importeComoNumero);
  });

  it('el archivo generado dice que lo es, y como se regenera', () => {
    expect(GENERADO.startsWith('/* ARCHIVO GENERADO')).toBe(true);
    expect(GENERADO).toContain('yarn generar-operaciones');
  });
});

describe('la URL de una operacion sale del contrato', () => {
  it('sustituye el parametro de ruta por el valor que se le da', () => {
    expect(rutaDeOperacion('ficha_urbana', { codRefCatastral: '01-02-03' })).toBe(
      '/catastro/fichas/urbana/01-02-03',
    );
  });

  it('un parametro con barras no se cuela en el camino', () => {
    expect(rutaDeOperacion('ficha_urbana', { codRefCatastral: 'a/b' })).toBe(
      '/catastro/fichas/urbana/a%2Fb',
    );
  });

  it('sin el valor no hay peticion: no se inventa un registro', () => {
    expect(() => rutaDeOperacion('ficha_urbana', { codRefCatastral: '' })).toThrow(/necesita/);
  });

  it('el descriptor es el que declara el contrato', () => {
    expect(descriptorDe('inicio')).toEqual({
      metodo: 'GET',
      ruta: '/indicadores/recaudacion',
      parametrosDeRuta: [],
      parametrosDeConsulta: ['ejercicio'],
    });
  });
});

describe('la consulta solo lleva lo que el contrato declara y trae valor', () => {
  it('un filtro con valor viaja', () => {
    expect(consultaDeOperacion('inicio', { ejercicio: '2026' })).toEqual({ ejercicio: '2026' });
  });

  it('un filtro vacio no manda el parametro, ni siquiera vacio', () => {
    expect(consultaDeOperacion('inicio', { ejercicio: '' })).toEqual({});
    expect(consultaDeOperacion('inicio', {})).toEqual({});
  });
});
