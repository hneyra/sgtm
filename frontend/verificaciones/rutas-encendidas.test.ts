import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { OPERACIONES } from '@sgtm/api-client';
import type { IdDeOperacion } from '@sgtm/api-client';
import { YA_SERVIDAS, laPublicaConLaFormaDelBackend } from '@sgtm/api-mock';
import { censoDeAportes } from '../apps/backoffice/src/pantallas/aportes-de-modulo';
import { OPCIONES_QUE_ESCRIBEN, escrituraDe } from '../apps/backoffice/src/pantallas/escrituras';
import { LECTURAS_POR_POST_DECLARADAS } from '../apps/backoffice/src/pantallas/lecturas-por-post';
import { LECTURAS } from '../apps/portal/src/lecturas';

/**
 * **La guarda de las rutas encendidas** (#400).
 *
 * Encender una ruta —moverla a `YA_SERVIDAS` en `packages/api-mock/src/servidas.ts`—
 * es lo unico que hace falta para que el proxy la deje pasar y conteste el
 * backend de verdad. Es una linea, y hasta hoy **nada la miraba**.
 *
 * Los dos errores que esa linea puede cometer no se parecen en nada, y ninguno
 * de los dos hace ruido:
 *
 *   1. **Una ruta que no existe.** `laSirveElBackend` compila la cadena que se
 *      le de: `/catastro/fichaz` no casa con ninguna peticion, asi que no deja
 *      pasar nada y **la operacion sigue contestandola el proxy**. El 502 de
 *      `noLaSirve` —que existe justo para que un desajuste no caiga al proxy en
 *      silencio— no llega a dispararse, porque para dispararse hay que casar
 *      primero. Una errata de una letra deja la integracion parada y con
 *      aspecto de estar hecha.
 *
 *   2. **Una ruta cuya pantalla sigue en el camino comun.** Las 134 piden
 *      `DatosDePantalla` —campos, tabla, totales— y el backend **no sirve nunca
 *      esa forma**: publica el recurso del dominio dentro del sobre de
 *      `RespuestaPaginada`. Encenderla no produce ningun error: la pantalla
 *      recibe el recurso real, no encuentra `tabla.filas` y **la tabla sale
 *      vacia en silencio**. Es el defecto que #363 documento en transito y
 *      coactiva, y que #397 volvio a medir en infracciones.
 *
 * Contra el primero, la entrada tiene que casar letra por letra con una
 * operacion del contrato. Contra el segundo, dos comprobaciones que miran las
 * dos mitades del relevo:
 *
 *   - **El proxy ya la habla en la forma del backend** (`recursos.ts`), asi que
 *     la pantalla lleva tiempo leyendo lo que el servidor va a mandarle y el
 *     relevo no le cambia la forma de nada;
 *   - **la interfaz declara como consumirla** —una conexion, una adaptacion, una
 *     escritura, una lectura por `POST` o la peticion de un componente propio—.
 *     El camino comun **no cuenta**, y esa es la mitad que importa: una opcion
 *     que solo tiene `endpoint` en el catalogo no consume nada, lo consume el
 *     renderizador por ella, y lo que consume es la forma que el backend no
 *     sirve.
 *
 * ── Y el censo ────────────────────────────────────────────────────────────
 *
 * Lo demas de este archivo no es una guarda sino una **cuenta**: cuantas
 * operaciones del contrato se pueden encender hoy y cuantas no. #400 se
 * describia en prosa —«101 de las 134 opciones declaran conexion»—, y una
 * prosa no se pone roja. Las cifras se fijan aqui para que moverlas sea una
 * linea del diff y no un parrafo que envejece.
 */

/** El contrato entero, como pares «METODO /ruta» con el nombre de su operacion. */
const DEL_CONTRATO: readonly (readonly [IdDeOperacion, string, string])[] = Object.entries(
  OPERACIONES,
).map(([id, descriptor]) => [id as IdDeOperacion, descriptor.metodo, descriptor.ruta] as const);

const laOperacionDe = (metodo: string, ruta: string): IdDeOperacion | undefined =>
  DEL_CONTRATO.find(([, verbo, camino]) => verbo === metodo.toUpperCase() && camino === ruta)?.[0];

/**
 * Las operaciones que un componente propio pide **por su cuenta**, por el
 * archivo donde se escribe su nombre.
 *
 * Las cuatro puertas declarativas —conexion, adaptacion, escritura y lectura por
 * `POST`— se leen de su registro, que es la fuente de verdad. Esta quinta no
 * tiene registro: son `pedirOperacion('…')`, `useDescargaDeArchivo('…')` y el
 * tipo `OperacionDeValuacion`, escritos dentro de un componente.
 *
 * Se declaran a mano y **se comprueba que no esten rancias**: el archivo que se
 * nombra tiene que seguir escribiendo o el nombre de la operacion o su ruta del
 * contrato —hay dos formas de pedir, `pedirOperacion('id')` y `solicitar('/ruta')`,
 * y las dos cuentan—. Es el mecanismo de `LECTURAS` en
 * `apps/portal/src/lecturas.ts` —la mitad que el tipo no puede sostener,
 * comprobada por una prueba—, y tiene su limite escrito: **una peticion directa
 * que nadie declare aqui no se ve**. El sintoma de ese hueco es el comodo —su
 * ruta no se deja encender, y hay que venir a declararla—, no el caro.
 */
const PETICIONES_DIRECTAS: Readonly<Record<string, string>> = {
  /* El asistente de alta de ficha valida contra el territorio y el padron, con
     las lecturas que ya existen (#320). */
  sectores: 'apps/backoffice/src/pantallas/catastro/AltaGuiadaDeFicha.tsx',
  calles: 'apps/backoffice/src/pantallas/catastro/AltaGuiadaDeFicha.tsx',
  consulta_fichas: 'apps/backoffice/src/pantallas/catastro/AltaGuiadaDeFicha.tsx',
  contribuyentes: 'apps/backoffice/src/pantallas/catastro/AltaGuiadaDeFicha.tsx',
  /* La pantalla de inicio pregunta a quien atiendes (#296) y la ficha 360° la
     compone (#297). */
  consulta_vehiculos: 'apps/backoffice/src/pantallas/inicio/InicioDeAtencion.tsx',
  consulta_unificada: 'apps/backoffice/src/pantallas/atencion/FichaDeAtencion.tsx',
  /* El resolutor de la unidad del alta de deuda (#331). */
  vehiculos: 'apps/backoffice/src/pantallas/rentas/ResolutorDeUnidad.tsx',
  /* Seguridad: la matriz de permisos de un grupo (#70) y el historico de
     respaldos, que es la unica lectura del contrato que viaja por `POST`. */
  permisos_de_grupo: 'apps/backoffice/src/pantallas/seguridad/PermisosMatrix.tsx',
  respaldo: 'apps/backoffice/src/pantallas/seguridad/Respaldos.tsx',
  /* Las tres tablas de valuacion, que comparten superficie y hook (#391). El
     literal vive en el tipo `OperacionDeValuacion`, no en la llamada: la
     operacion llega como parametro. */
  aranceles: 'apps/backoffice/src/pantallas/catastro/useTablaDeValuacion.ts',
  valores_unitarios: 'apps/backoffice/src/pantallas/catastro/useTablaDeValuacion.ts',
  depreciacion: 'apps/backoffice/src/pantallas/catastro/useTablaDeValuacion.ts',
  /* Los dos papeles que se descargan en vez de dibujarse (#71, #72). */
  ficha_contribuyente_reporte: 'apps/backoffice/src/pantallas/Pantalla.tsx',
  constancia: 'apps/backoffice/src/pantallas/Pantalla.tsx',
  /* La matriz de permisos efectivos (ADR-0013). No la pide una pantalla sino la
     sesion, y por su ruta: el paquete `@sgtm/sesion` lo comparten las dos
     aplicaciones y no puede depender del mapa de operaciones. */
  permisos_de_la_sesion: 'packages/sesion/src/ProveedorDeSesion.tsx',
};

/**
 * Las escrituras **cuya respuesta la interfaz lee**, por el archivo que la lee.
 *
 * La distincion decide si a una escritura le hace falta que el proxy publique ya
 * la forma del backend. A casi ninguna: `useEscritura` manda el cuerpo y lo
 * unico que mira es que la peticion saliera bien, asi que lo que el servidor
 * conteste da igual y el relevo no le puede cambiar nada. A estas dos no: leen
 * un campo de la respuesta —`totalCandidatos`, el conteo que el servidor calculo
 * al registrar la corrida— y lo dibujan.
 *
 * `cambiar_anio` no esta en la lista porque no hace falta declararla: lo dice
 * `escrituras.ts` con `cambiaElEjercicio`, que es la misma propiedad —la
 * interfaz adopta el ejercicio que responde el servidor— y ya se lee de ahi.
 */
const ESCRITURAS_CUYA_RESPUESTA_SE_LEE: Readonly<Record<string, string>> = {
  valores_masivo: 'apps/backoffice/src/pantallas/valores/GeneracionMasivaDeValores.tsx',
  transito_valores:
    'apps/backoffice/src/pantallas/transito/GeneracionMasivaDeValoresDeTransito.tsx',
};

/**
 * Las escrituras que un componente arma **por la salida de emergencia** de
 * `useEscritura`, sin entrada en `escrituras.ts`.
 *
 * Dos, las dos de seguridad (#70), y las dos por el mismo motivo que
 * `cierre_caja`: su cuerpo no es una lista de campos planos —una matriz de
 * privilegios por opcion, un alta o baja con su discriminador— y el mecanismo
 * declarativo no sabe construir ninguna de las dos formas todavia.
 *
 * Consumen su operacion, asi que cuentan para poder encenderla; **no leen lo que
 * vuelve**, asi que no le exigen forma al proxy. La operacion viaja en un
 * ternario —`puedeEscribirAqui ? 'permisos' : undefined`—, que es lo que la deja
 * fuera de todo registro y obliga a nombrarla aqui.
 */
const ESCRITURAS_ARMADAS_A_MANO: Readonly<Record<string, string>> = {
  permisos: 'apps/backoffice/src/pantallas/seguridad/PermisosMatrix.tsx',
  miembros: 'apps/backoffice/src/pantallas/seguridad/MiembrosDeGrupo.tsx',
};

/* Las conexiones llegan con el trozo de su modulo desde #433: hay que censar los
   doce —sin registrarlos— antes de preguntar por ninguna. */
const APORTES = await censoDeAportes();

/**
 * Las operaciones **cuya respuesta la interfaz lee**, y por que puerta la lee.
 *
 * Es la mitad que decide si a una ruta le hace falta que el proxy publique ya la
 * forma del backend: solo puede romperse por la forma quien mira lo que vuelve.
 *
 * El camino comun no esta, y no por olvido: `useDatosDePantalla` pide
 * `DatosDePantalla`, que es la forma que el backend no sirve. Una opcion que
 * solo tiene `endpoint` en el catalogo no consume su operacion; la consume el
 * renderizador por ella, con una forma que del otro lado no existe.
 */
function laRespuestaLaLee(): Readonly<Record<string, string>> {
  const puertas: Record<string, string> = {};
  const anotar = (operacion: string | undefined, puerta: string): void => {
    if (operacion !== undefined && puertas[operacion] === undefined) puertas[operacion] = puerta;
  };

  for (const [opcion, conexion] of Object.entries(APORTES.conexiones)) {
    anotar(conexion.operacion, `conexion de «${opcion}»`);
    anotar(conexion.encadenada, `segunda lectura de «${opcion}»`);
  }
  for (const [opcion, adaptacion] of Object.entries(APORTES.adaptaciones)) {
    anotar(adaptacion.operacion, `adaptacion de «${opcion}»`);
  }
  for (const [opcion, lectura] of LECTURAS_POR_POST_DECLARADAS) {
    anotar(lectura.operacion, `lectura por POST de «${opcion}»`);
  }
  for (const operacion of Object.keys(LECTURAS)) anotar(operacion, 'el portal del ciudadano');
  for (const [operacion, archivo] of Object.entries(PETICIONES_DIRECTAS)) {
    anotar(operacion, `peticion directa en ${archivo}`);
  }
  for (const [operacion, archivo] of Object.entries(ESCRITURAS_CUYA_RESPUESTA_SE_LEE)) {
    anotar(operacion, `respuesta leida en ${archivo}`);
  }
  for (const operacion of OPCIONES_QUE_ESCRIBEN) {
    if (escrituraDe(operacion)?.cambiaElEjercicio === true) {
      anotar(operacion, 'la sesion adopta el ejercicio que responde el servidor');
    }
  }
  return puertas;
}

const LEEN_LA_RESPUESTA = laRespuestaLaLee();

/**
 * Y las que la interfaz consume de alguna forma, lean o no lo que vuelve.
 *
 * A una escritura le basta con estar declarada en `escrituras.ts`: manda su
 * cuerpo y no mira la respuesta.
 */
const CONSUMIDAS: ReadonlySet<string> = new Set([
  ...Object.keys(LEEN_LA_RESPUESTA),
  ...OPCIONES_QUE_ESCRIBEN,
  ...Object.keys(ESCRITURAS_ARMADAS_A_MANO),
]);

/** Lo que le falta a una ruta para poder encenderse. Vacio = lista. */
function loQueFalta(metodo: string, ruta: string): readonly string[] {
  const operacion = laOperacionDe(metodo, ruta);
  if (operacion === undefined) {
    return [
      `«${metodo} ${ruta}» no es ninguna operacion del contrato. Una entrada que no casa no deja pasar nada: la operacion la sigue contestando el proxy, sin el 502 que avisaria del desajuste. Comprueba la ruta contra «docs/50-api/openapi/sgtm-v1.yaml».`,
    ];
  }
  const faltas: string[] = [];
  if (!CONSUMIDAS.has(operacion)) {
    faltas.push(
      `ninguna pantalla declara como consumir «${operacion}»: no tiene conexion, ni adaptacion, ni escritura, ni lectura por POST, ni peticion directa declarada. El camino comun no cuenta —pide la forma que el backend no sirve—.`,
    );
  } else if (
    LEEN_LA_RESPUESTA[operacion] !== undefined &&
    !laPublicaConLaFormaDelBackend(metodo, ruta)
  ) {
    faltas.push(
      `la interfaz lee la respuesta de «${operacion}» (${LEEN_LA_RESPUESTA[operacion]}) y el proxy todavia se la da con la forma comun (DatosDePantalla): encenderla dejaria la pantalla leyendo el recurso real como si fuera otra cosa, en silencio. Publicala con la forma de su Resource en «packages/api-mock/src/recursos.ts» primero.`,
    );
  }
  return faltas;
}

describe('las rutas encendidas: lo que se mueve a YA_SERVIDAS (#400)', () => {
  it('cada entrada es una operacion del contrato, letra por letra', () => {
    const desconocidas = YA_SERVIDAS.filter(
      ({ metodo, ruta }) => laOperacionDe(metodo, ruta) === undefined,
    ).map(({ metodo, ruta }) => `${metodo} ${ruta}`);

    expect(desconocidas, 'una entrada que no casa con el contrato no enciende nada').toEqual([]);
  });

  it('ninguna entrada esta repetida', () => {
    const escritas = YA_SERVIDAS.map(({ metodo, ruta }) => `${metodo.toUpperCase()} ${ruta}`);
    expect(escritas).toEqual([...new Set(escritas)]);
  });

  it('alguna pantalla la consume, y con la forma que el backend publica', () => {
    const problemas = YA_SERVIDAS.flatMap(({ metodo, ruta }) =>
      loQueFalta(metodo, ruta).map((falta) => `${metodo} ${ruta}: ${falta}`),
    );

    expect(problemas).toEqual([]);
  });
});

/**
 * El censo, que es la otra mitad de este archivo.
 *
 * Tres cifras y su suma, fijadas para que moverlas sea una linea del diff: las
 * **encendidas**, las **listas** —cumplen las dos condiciones, y lo unico que
 * les falta es que alguien las vea funcionando con los dos procesos levantados—
 * y las **pendientes**, que necesitan trabajo antes.
 *
 * De las pendientes, **tres lo son porque la interfaz lee su respuesta y el
 * proxy no se la da con la forma del backend**, y conviene decir por que no se
 * cierran con dos lineas en `recursos.ts`:
 *
 *   `valores_masivo` y `transito_valores` devuelven `totalCandidatos`, que es un
 *   conteo **que calcula el servidor** sobre datos que el proxy no tiene. Se
 *   podria sumar la columna «Contribuyentes» del prototipo, y saldria una cifra
 *   plausible y equivocada —cuenta dos veces a quien debe dos tributos—, que es
 *   justo lo que este archivo no hace: aqui no se inventa ni un dato. Su forma
 *   se publicara cuando haya de donde sacar la cifra, o no se publicara.
 *
 *   `ficha_contribuyente_reporte` descarga su papel por `archivoDe` cuando trae
 *   `?formato=`, pero **sin el sigue leyendo la forma comun**, que es como su
 *   pantalla se dibuja. Lo que le falta no es una entrada en el proxy: es que su
 *   pantalla lea `ReporteResource`, y eso es trabajo del modulo.
 */
describe('cuanto falta para poder apagar el proxy (#400)', () => {
  const yaEncendida = (metodo: string, ruta: string): boolean =>
    YA_SERVIDAS.some((servida) => servida.metodo.toUpperCase() === metodo && servida.ruta === ruta);
  const listas = DEL_CONTRATO.filter(
    ([, metodo, ruta]) => loQueFalta(metodo, ruta).length === 0 && !yaEncendida(metodo, ruta),
  );
  const pendientes = DEL_CONTRATO.filter(([, metodo, ruta]) => loQueFalta(metodo, ruta).length > 0);

  it('el contrato publica 179 operaciones', () => {
    expect(DEL_CONTRATO.length).toBe(179);
  });

  it('encendidas: 0', () => {
    expect(YA_SERVIDAS.length).toBe(0);
  });

  it('listas para encender: 127', () => {
    expect(listas.length).toBe(127);
  });

  it('pendientes: 52', () => {
    expect(pendientes.length).toBe(52);
  });

  it('las tres cifras cubren el contrato entero', () => {
    expect(YA_SERVIDAS.length + listas.length + pendientes.length).toBe(DEL_CONTRATO.length);
  });

  it('mientras queden pendientes o listas, el proxy no se puede apagar del todo', () => {
    // El dia que esta se ponga roja el trabajo de #400 esta hecho: no queda
    // ninguna por encender, asi que hay que borrar «servidas.ts» y con el este
    // archivo. Una guarda que sabe cuando sobra.
    expect(pendientes.length + listas.length).toBeGreaterThan(0);
  });
});

/**
 * Lo declarado a mano no envejece: cada entrada se comprueba contra su archivo.
 *
 * **Y cada lista con la evidencia que le toca**, que es lo que la primera
 * version de esta prueba no hacia: comprobaba las tres con las tres evidencias
 * en un `||`, y `alGuardar` —que solo dice algo de una de las listas— aparecia
 * de paso en archivos de las otras. Medido: cambiando en `AltaGuiadaDeFicha` el
 * `pedirOperacion('sectores')` por otra operacion, las 28 seguian en VERDE. Una
 * comprobacion que acepta la evidencia equivocada no comprueba nada.
 *
 * **Su limite, medido y escrito.** Para las peticiones directas se busca el
 * nombre en el archivo, no dentro de la llamada, asi que una mencion en otro
 * sitio del mismo archivo mantiene viva la entrada: cambiar solo el
 * `pedirOperacion('sectores')` y dejar su `queryKey: ['alta-ficha', 'sectores']`
 * sigue pasando. Lo que si muerde es que el archivo deje de nombrarla —que es lo
 * que pasa cuando la peticion se va de verdad, con su clave de cache detras—.
 * Estrecharlo a «dentro de una llamada» dejaria fuera a las tres tablas de
 * valuacion, cuyos nombres viven en el tipo `OperacionDeValuacion` y no en
 * ninguna llamada: la operacion les llega como parametro.
 */
/**
 * **La operacion que ningun controlador sirve, y ninguno va a servir.**
 *
 * `docs/50-api/formas-de-la-api.json` lo deriva el backend de sus propios
 * controladores (#400), asi que restarlo del contrato dice exactamente que
 * operacion no publica nadie. Hoy es una, y no esta pendiente: esta decidida en
 * contra —ADR-0016 §3 deja la opcion `portal` como esta, «la vista del
 * funcionario, con su id, su ruta y su permiso», y ADR-0020 le dio al ciudadano
 * `GET /portal/situacion` en su lugar—.
 *
 * Lo que su pantalla dibuja no es una consulta de deuda: es el **flujo de pago
 * en linea** —medio de pago, correo del comprobante, aceptacion de terminos y un
 * «Pagar S/ 640.06»—, y el pago del ciudadano esta aparcado en #449 con sus dos
 * decisiones abiertas (D-14, D-15).
 *
 * Se nombra aqui porque es **lo que impide apagar el proxy del todo**: cuando las
 * demas esten encendidas, esta pantalla se quedaria sin nadie que le conteste. El
 * dia que se decida —servirla, reapuntarla o retirarla del contrato— esta prueba
 * se pone roja y hay que venir a borrar la excepcion.
 */
const SIN_CONTROLADOR_Y_DECIDIDA_ASI: readonly string[] = ['GET /portal/deuda'];

describe('lo que ningun controlador sirve esta nombrado (#400)', () => {
  const publicadas = new Set(
    Object.keys(
      JSON.parse(
        readFileSync(resolve(process.cwd(), '../docs/50-api/formas-de-la-api.json'), 'utf8'),
      ) as Readonly<Record<string, unknown>>,
    ).filter((clave) => clave !== '_'),
  );

  it('el backend publica todas las operaciones del contrato menos las nombradas', () => {
    const sinControlador = DEL_CONTRATO.filter(
      ([, metodo, ruta]) => !publicadas.has(`${metodo} ${ruta}`),
    ).map(([, metodo, ruta]) => `${metodo} ${ruta}`);

    expect(sinControlador.sort()).toEqual([...SIN_CONTROLADOR_Y_DECIDIDA_ASI].sort());
  });

  it('y mientras siga ahi, el proxy no se puede apagar del todo', () => {
    // No es una guarda de estilo: es la unica pantalla de las 134 que, con todo
    // lo demas encendido, se quedaria sin backend al que preguntar.
    expect(SIN_CONTROLADOR_Y_DECIDIDA_ASI.length).toBeGreaterThan(0);
  });
});

describe('lo declarado a mano no esta rancio', () => {
  const fuenteDe = (archivo: string): string =>
    readFileSync(resolve(process.cwd(), archivo), 'utf8');
  const rutaDe = (operacion: string): string =>
    (DEL_CONTRATO.find(([id]) => id === operacion)?.[2] ?? '').replace(/\{\w+\}.*$/, '');

  it.each(Object.entries(PETICIONES_DIRECTAS))(
    'el componente sigue pidiendo «%s» en %s',
    (operacion, archivo) => {
      const fuente = fuenteDe(archivo);
      // Las dos formas de pedir: por el nombre de la operacion —`pedirOperacion`,
      // `useDescargaDeArchivo`— o por su ruta del contrato —`solicitar('/…')`—.
      const ruta = rutaDe(operacion);
      expect(
        fuente.includes(`'${operacion}'`) || (ruta !== '' && fuente.includes(ruta)),
        `«${operacion}» ya no se pide en ${archivo}: o se movio, o dejo de pedirse.`,
      ).toBe(true);
    },
  );

  it.each(Object.entries(ESCRITURAS_CUYA_RESPUESTA_SE_LEE))(
    'la escritura «%s» sigue leyendo su respuesta en %s',
    (operacion, archivo) => {
      expect(
        fuenteDe(archivo).includes('alGuardar'),
        `${archivo} ya no lee la respuesta: si «${operacion}» dejo de leerla, quitala de la lista y el proxy no tendra que publicar su forma.`,
      ).toBe(true);
    },
  );

  it.each(Object.entries(ESCRITURAS_ARMADAS_A_MANO))(
    'la escritura «%s» sigue armandose a mano en %s',
    (operacion, archivo) => {
      expect(
        fuenteDe(archivo).includes(`'${operacion}'`),
        `«${operacion}» ya no aparece en ${archivo}: comprueba si paso a declararse en escrituras.ts.`,
      ).toBe(true);
    },
  );
});
