import { MODULOS, opcionPorId } from '../catalogo';
import { registrarConexiones } from './conexiones';
import type { Adaptacion, Conexion } from './conexiones';
import { registrarComposiciones } from './composicion';
import type { ComposicionDeOpcion } from './composicion';

/**
 * **Lo que cada modulo aporta al renderizador, cargado al entrar en el** (#433).
 *
 * Un adaptador de Transito no tiene nada que hacer en el paquete que descarga
 * quien abre Catastro, y hasta este issue viajaba ahi: `conexiones.ts` y
 * `composicion.ts` importaban los doce registros de forma estatica, asi que las
 * 79 opciones conectadas —su `parametros`, su `leer` y su `adaptar`— entraban
 * enteras en el trozo de arranque, y con ellas las composiciones de los cinco
 * modulos que declaran alguna. Medido: **155,7 → 141,4 KB comprimidos**.
 *
 * Y lo que arregla no es solo la cifra de hoy: es la **pendiente**. Cada opcion
 * que se conecta suma su `leer` y su `adaptar`, de modo que las seis oleadas de
 * conexion que faltan (#426–#432) engordaban el arranque de todo el mundo. Desde
 * aqui engordan el trozo de su modulo, que solo paga quien entra en el.
 *
 * ── Por que aqui y no en cada archivo ─────────────────────────────────────
 *
 * El catalogo ya se parte por modulo (`catalogo/pantallas.generado.ts`) y
 * `Pantalla` **ya espera** a que llegue el trozo del suyo antes de dibujar nada.
 * Este cargador se engancha a esa misma espera —el mismo `Promise.all`—, asi que
 * no anade ni un viaje mas ni un `Suspense` mas: cuando la pantalla aparece, su
 * modulo esta registrado y `conexionDe` responde igual de sincrono que antes.
 *
 * ── Y por que no falla en silencio ────────────────────────────────────────
 *
 * Una carga diferida mal hecha no revienta: la opcion se queda sin conexion,
 * cae al camino comun de las 134 y la tabla sale **vacia**, que es el defecto
 * que #363 documento. Contra eso hay tres cosas, y ninguna es una promesa:
 *
 *   1. `aportes-de-modulo.test.ts` exige que los doce modulos del catalogo
 *      tengan cargador —ni uno mas, ni uno menos—;
 *   2. y que cada opcion que un cargador entrega sea **de ese modulo** segun el
 *      catalogo: un cargador apuntando al modulo vecino se ve al instante;
 *   3. y las pruebas de cada modulo montan sus pantallas conectadas y comparan
 *      celda por celda, asi que un modulo sin cargador se pone rojo ahi tambien.
 *
 * La tercera **hubo que ganarsela**, y es el hallazgo del issue: los doce
 * archivos que censan el catalogo lo hacian cargando y REGISTRANDO los doce
 * modulos, de modo que se tapaban a si mismos. Con la espera quitada de
 * `Pantalla` —el defecto que esta carga diferida puede introducir— la suite daba
 * 28 archivos y 236 pruebas en rojo, y `transito.test.tsx` seguia en VERDE los
 * 44, junto con los 35 de coactiva: su propio censo habia registrado el modulo
 * antes de montar la primera pantalla. Con {@link censoDeAportes}, que carga sin
 * registrar, la misma mutacion da **44 archivos y 403 pruebas**, y esos 79
 * incluidos.
 */
export interface AporteDeModulo {
  /** Las opciones del modulo con operacion tipada y adaptador propios. */
  readonly conexiones: Readonly<Record<string, Conexion>>;
  /** Las que ademas leen la respuesta de un `POST` (`Adaptacion`). */
  readonly adaptaciones?: Readonly<Record<string, Adaptacion>>;
  /** Lo que sus opciones componen alrededor de los diez bloques comunes. */
  readonly composiciones?: Readonly<Record<string, ComposicionDeOpcion>>;
}

/**
 * Un `import()` por modulo, con la clave del **catalogo**.
 *
 * Las carpetas de `pantallas/` no se llaman siempre como el modulo del manual
 * —`rentas` sirve a «rentas-registro», `sanciones` a
 * «infracciones-administrativas» y `licencias` a
 * «autorizaciones-y-licencias»—, y la clave que manda es la del catalogo,
 * que es con la que llega la ruta.
 *
 * `inicio` entra como uno mas aunque su unico aporte sea el panel de
 * recaudacion: si se dejara fuera «por ser una sola conexion», seria el unico
 * modulo cuyo adaptador viaja en el arranque, y esa excepcion es la que despues
 * nadie recuerda.
 */
const CARGADORES: Readonly<Record<string, () => Promise<AporteDeModulo>>> = {
  inicio: async () => ({
    conexiones: { inicio: (await import('./inicio/recaudacion')).conexionDeRecaudacion },
  }),
  catastro: async () => {
    const [registro, composicion] = await Promise.all([
      import('./catastro'),
      import('./catastro/composicion'),
    ]);
    return {
      conexiones: registro.CONEXIONES_DE_CATASTRO,
      composiciones: composicion.COMPOSICION_DE_CATASTRO,
    };
  },
  'rentas-registro': async () => {
    const [registro, composicion] = await Promise.all([
      import('./rentas'),
      import('./rentas/composicion'),
    ]);
    return {
      conexiones: registro.CONEXIONES_DE_RENTAS,
      adaptaciones: registro.ADAPTACIONES_DE_RENTAS,
      composiciones: composicion.COMPOSICION_DE_RENTAS,
    };
  },
  fiscalizacion: async () => ({
    conexiones: (await import('./fiscalizacion')).CONEXIONES_DE_FISCALIZACION,
  }),
  transito: async () => {
    const [registro, composicion] = await Promise.all([
      import('./transito'),
      import('./transito/composicion'),
    ]);
    return {
      conexiones: registro.CONEXIONES_DE_TRANSITO,
      composiciones: composicion.COMPOSICION_DE_TRANSITO,
    };
  },
  'infracciones-administrativas': async () => ({
    conexiones: (await import('./sanciones')).CONEXIONES_DE_SANCIONES,
    /* La septima composicion, llegada con #428 mientras este issue se escribia,
       por el mismo camino que la de licencias. */
    composiciones: (await import('./sanciones/composicion')).COMPOSICION_DE_SANCIONES,
  }),
  tesoreria: async () => {
    const [registro, composicion] = await Promise.all([
      import('./tesoreria'),
      import('./tesoreria/composicion'),
    ]);
    return {
      conexiones: registro.CONEXIONES_DE_TESORERIA,
      composiciones: composicion.COMPOSICION_DE_TESORERIA,
    };
  },
  consultas: async () => {
    const [registro, composicion] = await Promise.all([
      import('./consultas'),
      import('./consultas/composicion'),
    ]);
    return {
      conexiones: registro.CONEXIONES_DE_CONSULTAS,
      composiciones: composicion.COMPOSICION_DE_CONSULTAS,
    };
  },
  valores: async () => ({ conexiones: (await import('./valores')).CONEXIONES_DE_VALORES }),
  coactiva: async () => {
    /* La octava composicion, llegada con #426: cinco controles anadidos, dos
       tablas que eligen filas y el filtro que la liquidacion de costas no puede
       usar. Por el mismo camino que las otras siete. */
    const [registro, composicion] = await Promise.all([
      import('./coactiva'),
      import('./coactiva/composicion'),
    ]);
    return {
      conexiones: registro.CONEXIONES_DE_COACTIVA,
      composiciones: composicion.COMPOSICION_DE_COACTIVA,
    };
  },
  'autorizaciones-y-licencias': async () => ({
    conexiones: (await import('./licencias')).CONEXIONES_DE_LICENCIAS,
    /* La sexta composicion, llegada con #427 A mientras este issue se escribia:
       se declara aqui por lo mismo que las otras cinco, y no en el registro
       estatico que este issue retira. */
    composiciones: (await import('./licencias/composicion')).COMPOSICION_DE_LICENCIAS,
  }),
  seguridad: async () => ({ conexiones: (await import('./seguridad')).CONEXIONES_DE_SEGURIDAD }),
};

/**
 * La promesa se guarda, no el resultado, igual que en `pantallasDelModulo`.
 *
 * Dos pantallas del mismo modulo abiertas uno detras de otro comparten la
 * descarga en vez de pedirla dos veces, y dos montajes simultaneos no se pisan.
 */
const cargas = new Map<string, Promise<void>>();

/**
 * Registra lo que aporta un modulo, y lo hace **una sola vez**.
 *
 * Falla nombrando el modulo si no tiene cargador. No es paranoia: el unico
 * sintoma de no tenerlo seria que sus pantallas conectadas se dibujan por el
 * camino comun —con la tabla vacia y sin un solo error—, que es exactamente lo
 * que no puede pasar en silencio.
 */
export function cargarAporteDelModulo(moduloId: string): Promise<void> {
  const encurso = cargas.get(moduloId);
  if (encurso !== undefined) return encurso;

  const cargador = CARGADORES[moduloId];
  if (cargador === undefined) {
    return Promise.reject(
      new Error(
        `El modulo «${moduloId}» no declara su aporte en «pantallas/aportes-de-modulo.ts»: ` +
          'sus pantallas conectadas se dibujarian por el camino comun, con la tabla vacia.',
      ),
    );
  }

  const carga = cargador().then((aporte) => {
    registrarConexiones(aporte.conexiones, aporte.adaptaciones);
    registrarComposiciones(aporte.composiciones);
  });
  cargas.set(moduloId, carga);
  return carga;
}

/**
 * El aporte del modulo **al que pertenece esa opcion**, para quien la compone
 * desde fuera de su modulo.
 *
 * Lo pide la ficha 360° (#297): sus pestanas leen opciones de Consultas, de
 * Transito, de Infracciones y de Coactiva desde una ruta que no es la de ningun
 * modulo, asi que ninguna espera del renderizador se las registro.
 *
 * Falla nombrando la opcion si no esta en el catalogo, por lo mismo que arriba:
 * devolver `undefined` la mandaria al camino comun sin decir nada.
 */
export async function cargarConexionesDeLaOpcion(opcion: string): Promise<void> {
  const situada = opcionPorId(opcion);
  if (situada === undefined) {
    throw new Error(`La opcion «${opcion}» no esta en el catalogo: no hay modulo que cargar.`);
  }
  await cargarAporteDelModulo(situada.modulo.id);
}

/**
 * Los doce, cargados de golpe **y registrados**. Para las pruebas del propio
 * registro; **no** para las que montan pantallas.
 *
 * Llamarlo desde `src/` devolveria al arranque los 14,4 KB que este issue le
 * quito, y eso no se queda en una advertencia: `yarn comprobar-compilaciones`
 * lo mide y se pone rojo con el numero.
 */
export async function cargarTodosLosAportes(): Promise<void> {
  await Promise.all(MODULOS.map((modulo) => cargarAporteDelModulo(modulo.id)));
}

/** Lo que aportan los doce, junto. Ver {@link censoDeAportes}. */
export interface CensoDeAportes {
  readonly conexiones: Readonly<Record<string, Conexion>>;
  readonly adaptaciones: Readonly<Record<string, Adaptacion>>;
  readonly composiciones: Readonly<Record<string, ComposicionDeOpcion>>;
}

/**
 * Todo lo que los doce aportan, **sin registrar nada**.
 *
 * Es lo que usan las pruebas que censan el catalogo entero, y la diferencia con
 * `cargarTodosLosAportes` no es de estilo: **una prueba que registra los doce se
 * tapa a si misma**. Medido con la mutacion de este issue —quitarle a `Pantalla`
 * la espera del aporte, que es el defecto que la carga diferida puede
 * introducir—: la suite entera se pone roja en 29 archivos, pero
 * `transito.test.tsx` sigue en VERDE los 44, porque su propio censo habia
 * registrado Transito antes de montar la primera pantalla. Con el censo que no
 * registra, la unica forma de que una pantalla conectada encuentre su conexion
 * es que `Pantalla` la haya pedido, que es lo que se quiere comprobar.
 */
export async function censoDeAportes(): Promise<CensoDeAportes> {
  const aportes = await Promise.all(MODULOS.map((modulo) => aporteDelModulo(modulo.id)));
  return {
    conexiones: Object.assign({}, ...aportes.map((a) => a.conexiones)) as CensoDeAportes['conexiones'],
    adaptaciones: Object.assign(
      {},
      ...aportes.map((a) => a.adaptaciones ?? {}),
    ) as CensoDeAportes['adaptaciones'],
    composiciones: Object.assign(
      {},
      ...aportes.map((a) => a.composiciones ?? {}),
    ) as CensoDeAportes['composiciones'],
  };
}

/** Las opciones conectadas del catalogo entero, sin registrar ninguna. */
export const censoDeConectadas = async (): Promise<readonly string[]> =>
  Object.keys((await censoDeAportes()).conexiones);

/** Que modulos declaran cargador. Lo cruza `aportes-de-modulo.test.ts` con el catalogo. */
export const MODULOS_CON_APORTE: readonly string[] = Object.keys(CARGADORES);

/** Lo que aporta un modulo, sin registrarlo. Lo usa la prueba que cruza opcion ↔ modulo. */
export const aporteDelModulo = (moduloId: string): Promise<AporteDeModulo> => {
  const cargador = CARGADORES[moduloId];
  if (cargador === undefined) throw new Error(`El modulo «${moduloId}» no declara aporte.`);
  return cargador();
};
