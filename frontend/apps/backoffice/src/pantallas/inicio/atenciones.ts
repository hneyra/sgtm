import { alOlvidarLaSesion } from '../../app/sesion/olvidos';

/**
 * **Las ultimas personas atendidas, en memoria y no en el navegador** (#296).
 *
 * ── La decision, con la regla delante ──────────────────────────────────────
 *
 * `app/recientes.ts` guarda en `localStorage` las cinco ultimas opciones
 * visitadas, y se permite a si mismo hacerlo con una frase que dice exactamente
 * por que puede: «duran mas que la pestana y **no valen nada para nadie**: son
 * nombres de menu. El token no, y esa es la linea que FRO-01 §5 traza».
 *
 * Un contribuyente no es un nombre de menu. La lista de a quien se atendio es,
 * junta, el registro de quien paso por la ventanilla y a que hora, y cada
 * entrada lleva el codigo que lo identifica en el padron de **esa**
 * municipalidad. La exencion que `recientes.ts` se concede no alcanza hasta
 * aqui, y no hace falta forzarla:
 *
 * - **La regla escrita de ESLint no lo bloquea** —vigila claves con `token`,
 *   `jwt`, `credencial`…— asi que esto no es «la regla me obliga»: es que
 *   guardarlo pasaria la comprobacion y seguiria estando mal. Relajar la regla
 *   no era una opcion, pero ampararse en su silencio tampoco.
 * - El puesto de ventanilla es **compartido**: `localStorage` sobrevive al
 *   cierre de sesion, al cambio de operador y al cambio de municipalidad, y el
 *   navegador no tiene ni token ni RLS. La barrera que protege al padron se
 *   queda del otro lado del cristal.
 * - El backend ya trazo esta misma linea, y mas estrecha: `CriterioDeBusqueda`
 *   sobrescribe su `toString` para que **ni el codigo, ni el nombre, ni el
 *   documento** acaben en un log —«esto acaba en un log, y ahi no van datos
 *   identificatorios de una persona»—. Si el codigo no puede ir a un log del
 *   servidor, no puede ir al disco de una maquina de ventanilla.
 *
 * **Lo que cuesta:** cerrar el navegador borra la lista. Es el precio, y es el
 * correcto: esto sirve para «la persona que acaba de salir ha vuelto», que se
 * mide en minutos. Lo que dura mas que la sesion ya tiene su sitio, y es la
 * auditoria del servidor (RNF-052), que si sabe quien miro que y cuando.
 *
 * **Pero no basta con no persistirla.** Una variable de modulo sobrevive a todo
 * lo que no recargue la pagina, y hay dos caminos que cambian de quien sin
 * recargar: cerrar sesion sin `finDeSesion` configurado y **cambiar de
 * municipalidad**, que no recarga nunca —por eso `ProveedorDeSesion` vacia ahi
 * la cache a mano—. Sin olvidarla, el operador siguiente veria a quien atendio
 * el anterior, y en la otra municipalidad, a gente de la primera. Por eso esta
 * lista se apunta al registro de olvidos de la sesion (`app/sesion/olvidos.ts`).
 *
 * ── Que se guarda ──────────────────────────────────────────────────────────
 *
 * Lo que la respuesta trajo y la franja ya enseño: el codigo, el nombre y el
 * documento, tal cual. Nada recompuesto y nada pedido de mas —no se vuelve a
 * consultar al padron para dibujar esta lista—.
 *
 * Y no se dibuja sin el permiso de `contribuyentes`: quien deja de tener esa
 * lectura deja de ver estas filas, aunque sigan en memoria. Lo decide quien
 * dibuja, que es quien tiene el catalogo visible.
 */
export interface Atencion {
  /** El codigo del padron. Es lo unico con lo que se vuelve a abrir la ficha. */
  readonly codigo: string;
  readonly nombre: string;
  /** El documento, tal como lo publico `ContribuyenteResource`. Puede faltar. */
  readonly documento: string;
}

/** Cuantas se recuerdan. Las mismas cinco que los recientes de la barra lateral. */
const MAXIMO = 5;

/**
 * El estado, en una variable del modulo.
 *
 * Es el mismo mecanismo con el que `@sgtm/api-client` guarda el token —«una
 * variable del modulo»—, y por el mismo motivo: sobrevive a la navegacion
 * porque la aplicacion no se recarga al cambiar de ruta, y no sobrevive a nada
 * mas.
 */
let atenciones: readonly Atencion[] = [];

export const leerAtenciones = (): readonly Atencion[] => atenciones;

/** La mas reciente primero, sin repetir a nadie. */
export function anotarAtencion(atencion: Atencion): void {
  if (atencion.codigo.trim() === '') return;
  atenciones = [
    atencion,
    ...atenciones.filter((previa) => previa.codigo !== atencion.codigo),
  ].slice(0, MAXIMO);
}

/**
 * Vacia la lista.
 *
 * La usan las pruebas —una variable de modulo no se reinicia entre casos— y la
 * llama el cierre de sesion y el cambio de municipalidad, por el registro de
 * abajo. **No es una comodidad de pruebas**: los dos caminos cambian de quien
 * sin recargar la pagina, asi que sin esto la lista los sobrevive.
 */
export function olvidarAtenciones(): void {
  atenciones = [];
}

/* Y se apunta al cargar el modulo, no al montar la pantalla: la lista existe
   para sobrevivir al desmontaje, asi que una suscripcion en un `useEffect` se
   iria justo cuando hay algo que olvidar. */
alOlvidarLaSesion(olvidarAtenciones);
