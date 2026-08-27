import { useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ProblemaDeApi, enviarOperacion, nuevaClaveDeIdempotencia } from '@sgtm/api-client';
import type { CuerpoDe, IdDeOperacion, ParametrosDe } from '@sgtm/api-client';

/**
 * El camino de escritura, entero y en un solo sitio.
 *
 * **Toda modificacion de datos exige observacion del usuario** (regla 10 de
 * CLAUDE.md, RNF-052). No es un `placeholder` amable: es la condicion de
 * guardado, y por eso vive aqui y no en cada pantalla —una pantalla que se
 * olvidara de pedirla no podria guardar, porque no hay otra forma de guardar—.
 *
 * Lo demas que resuelve, y que ninguna pantalla deberia volver a resolver:
 *
 * - **Idempotencia.** Una clave por intento del usuario, estable mientras dure
 *   ese intento. Regenerarla en cada reintento convierte un reintento en un
 *   segundo cobro; no regenerarla nunca hace que corregir un dato devuelva el
 *   resultado del intento anterior. Por eso cambia cuando cambia lo que se
 *   manda, y no cuando se vuelve a mandar lo mismo.
 * - **Sin reintento automatico.** Lo fija el cliente de consultas
 *   (`mutations: { retry: false }`) y lo comprueba una prueba, porque es una
 *   linea que alguien «optimiza» algun dia.
 * - **Errores por campo.** `ProblemaDeApi.errores` trae `{ campo, mensaje }`;
 *   el mensaje se pinta junto a su campo **sin reescribirlo** (RNF-080).
 * - **Un envio por pulsacion.** Pulsar dos veces rapido no manda dos veces.
 * - **Lista blanca de campos.** El cuerpo lleva la observacion y **nada mas**,
 *   salvo los campos que la opcion declare uno a uno en `pantallas/escrituras.ts`.
 *   No es una comodidad: es lo que impide que una contrasena escrita en un
 *   formulario acabe viajando a un servidor que no la pide y no sabria que
 *   hacer con ella. Lo que no esta declarado no se guarda ni se manda, asi que
 *   tampoco esta en el estado de React cuando termina el envio.
 */
export interface Escritura {
  /** Que operacion se va a escribir, si la pantalla escribe alguna. */
  readonly operacion?: IdDeOperacion;
  /** Los campos del formulario que esta pantalla puede escribir. Los demas, no. */
  readonly campos: ReadonlySet<string>;
  /** Lo escrito en esos campos, todavia sin enviar. */
  readonly borrador: Readonly<Record<string, string>>;
  /** Escribe un campo. Uno que no este declarado se ignora, y no se guarda. */
  readonly fijarCampo: (campo: string, valor: string) => void;
  readonly observacion: string;
  readonly fijarObservacion: (texto: string) => void;
  /** Sin observacion no se habilita la accion. Esa es toda la regla. */
  readonly puedeEnviar: boolean;
  readonly enviando: boolean;
  readonly enviada: boolean;
  readonly errorPorCampo: Readonly<Record<string, string>>;
  readonly error: unknown;
  readonly enviar: () => void;
  /** La clave del intento en curso. La prueba de idempotencia la mira. */
  readonly clave: string;
}

/**
 * Un campo del formulario, visto desde el cuerpo de la peticion.
 *
 * `entero` existe porque el formulario solo produce texto y hay campos que el
 * backend declara numericos —`int ejercicio`—. **Nunca se usa para importes**:
 * esos son cadenas decimales de punta a punta (regla 1, RNF-055), y convertir
 * uno a `number` perderia centimos. Aqui solo pasan enteros de dominio: anos,
 * codigos, contadores.
 *
 * `valor` existe para el mismo problema que ya resuelve la lectura con `Fase`
 * (`FASES_DEL_BACKEND` en `pantallas/consultas`): el prototipo dibuja un
 * vocabulario («IMPUESTO PREDIAL») y el backend espera otro («PREDIAL»). Es
 * una traduccion, no una validacion: un valor que la funcion no reconoce
 * devuelve `undefined`, y ese campo simplemente no viaja —lo mismo que pasa
 * hoy si el usuario no lo llena—, en vez de mandar el texto del prototipo tal
 * cual y dejar que el backend lo rechace con un mensaje que no explica nada.
 */
export interface CampoDelCuerpo {
  /** Como se llama en el cuerpo que espera el backend. */
  readonly campo: string;
  /** El backend lo declara entero, no cadena. Nunca para importes. */
  readonly entero?: boolean;
  /** Traduce el texto del formulario al que espera el backend. Ver el javadoc de arriba. */
  readonly valor?: (texto: string) => string | undefined;
}

/** Sin campos declarados. Constante para que la lista blanca no cambie cada render. */
const SIN_CAMPOS: Readonly<Record<string, CampoDelCuerpo>> = {};

export interface OpcionesDeEscritura {
  /**
   * Los unicos campos del formulario que viajan, **por su clave del catalogo**,
   * con el nombre que llevan en el cuerpo.
   *
   * Los dos nombres hacen falta porque no coinciden y no tienen por que: el
   * catalogo sale del prototipo —«Cambiar al año» es `cambiarAlAno`— y el
   * cuerpo lo declara el backend —`ejercicio`—. Traducir aqui es lo que permite
   * que ninguno de los dos tenga que ceder.
   *
   * Vacio por omision: **una pantalla que no declara campos manda solo su
   * observacion**, y sus controles no se pueden escribir.
   */
  readonly campos?: Readonly<Record<string, CampoDelCuerpo>>;
  /**
   * Que hacer con la respuesta cuando lo guardado cambia algo global a la
   * sesion —hoy, el ejercicio de trabajo—.
   *
   * Si devuelve `'cache-vaciada'`, la invalidacion general no se ejecuta: ya se
   * vacio entera, y volver a invalidar pediria otra vez lo que se acaba de
   * pedir.
   */
  readonly alGuardar?: (respuesta: unknown) => 'cache-vaciada' | void;
  /**
   * Sustituye el cuerpo entero (salvo la observacion) por lo que devuelva esta
   * funcion, en vez de `soloDeclarados(borrador, campos)`.
   *
   * Existe para las pantallas cuyo cuerpo no es un formulario de campos
   * planos: `permisos` manda una lista de niveles, `actualizacion_catastro`
   * una lista de construcciones, y `CampoDelCuerpo` no tiene forma de
   * expresar un arreglo. Se lee en cada envio —es un cierre sobre el estado
   * de quien la declara—, igual que `borrador` se lee en cada envio hoy.
   */
  readonly cuerpo?: () => Readonly<Record<string, unknown>>;
}

export function useEscritura(
  operacion: IdDeOperacion | undefined,
  parametros: Readonly<Record<string, string>>,
  { campos = SIN_CAMPOS, alGuardar, cuerpo }: OpcionesDeEscritura = {},
): Escritura {
  const [observacion, fijarTexto] = useState('');
  const [borrador, fijarBorrador] = useState<Readonly<Record<string, string>>>({});
  const clave = useRef(nuevaClaveDeIdempotencia());
  const clientes = useQueryClient();
  // La lista blanca en forma de conjunto, estable entre renders: entra en la
  // dependencia de lo que se manda y en si un control se puede escribir.
  const declarados = useMemo(() => new Set(Object.keys(campos)), [campos]);

  // Este es el unico sitio del frontend donde se escribe, y es el que exige la
  // observacion: la regla de ESLint protege a todos los demas de saltarsela.
  // eslint-disable-next-line no-restricted-syntax
  const mutacion = useMutation({
    mutationFn: async () => {
      if (operacion === undefined) throw new Error('Esta pantalla no escribe ninguna operacion.');
      return enviarOperacion(
        operacion,
        parametros as ParametrosDe<IdDeOperacion>,
        // La observacion va siempre; lo demas, solo lo declarado —o lo que
        // `cuerpo` construya, para la pantalla que no cabe en campos planos—.
        {
          ...(cuerpo ? cuerpo() : soloDeclarados(borrador, campos)),
          observacion,
        } as CuerpoDe<IdDeOperacion>,
        clave.current,
      );
    },
    onSuccess: async (respuesta) => {
      // El intento termino: el siguiente es otro, con otra clave.
      clave.current = nuevaClaveDeIdempotencia();
      fijarTexto('');
      // Y el borrador se vacia: lo que se escribio ya esta guardado, y dejarlo
      // en memoria es exactamente lo que la pantalla de contrasena no permite.
      fijarBorrador({});
      // Lo global a la sesion se atiende primero y puede quedarse con la cache
      // entera; si no lo hace, se invalida lo que este afectado.
      if (alGuardar?.(respuesta) === 'cache-vaciada') return;
      await clientes.invalidateQueries();
    },
  });

  return {
    ...(operacion === undefined ? {} : { operacion }),
    campos: declarados,
    borrador,
    fijarCampo: (campo: string, valor: string) => {
      // Un campo que la opcion no declaro no entra en el estado. Es la misma
      // regla que impide que viaje, aplicada un paso antes: si nunca se guarda,
      // no hay valor que se pueda filtrar despues.
      if (!declarados.has(campo)) return;
      if (borrador[campo] !== valor) clave.current = nuevaClaveDeIdempotencia();
      fijarBorrador((previo) => ({ ...previo, [campo]: valor }));
    },
    observacion,
    fijarObservacion: (texto: string) => {
      // Cambiar lo que se manda empieza un intento nuevo: con la clave anterior,
      // el servidor devolveria el resultado del intento de antes —el que se esta
      // corrigiendo— en vez de aplicar la correccion.
      if (texto !== observacion) clave.current = nuevaClaveDeIdempotencia();
      fijarTexto(texto);
    },
    puedeEnviar: operacion !== undefined && observacion.trim() !== '' && !mutacion.isPending,
    enviando: mutacion.isPending,
    enviada: mutacion.isSuccess,
    errorPorCampo: erroresPorCampo(mutacion.error),
    error: mutacion.error,
    enviar: () => {
      // Pulsar dos veces rapido es una pulsacion: el boton se deshabilita al
      // primer envio, y esto cubre la carrera entre las dos.
      if (mutacion.isPending || observacion.trim() === '') return;
      mutacion.mutate();
    },
    clave: clave.current,
  };
}

/**
 * El cuerpo, filtrado por la lista blanca.
 *
 * Se filtra **al enviar** y no solo al escribir: las dos barreras protegen de
 * cosas distintas. La de escritura evita que el valor exista; esta evita que
 * viaje si alguien un dia rellena el borrador por otro camino.
 */
function soloDeclarados(
  borrador: Readonly<Record<string, string>>,
  campos: Readonly<Record<string, CampoDelCuerpo>>,
): Readonly<Record<string, string | number>> {
  const cuerpo: Record<string, string | number> = {};
  for (const [campo, valor] of Object.entries(borrador)) {
    const declarado = campos[campo];
    if (declarado === undefined || valor === '') continue;
    if (declarado.valor !== undefined) {
      // Un valor que la traduccion no reconoce no viaja: ver el javadoc de `CampoDelCuerpo`.
      const traducido = declarado.valor(valor);
      if (traducido !== undefined) cuerpo[declarado.campo] = traducido;
    } else if (declarado.entero === true) {
      const entero = Number.parseInt(valor, 10);
      // Un entero que no lo es no viaja: mandar `NaN` produciria un 400 con un
      // mensaje del deserializador en vez de un error del dominio.
      if (Number.isInteger(entero)) cuerpo[declarado.campo] = entero;
    } else {
      cuerpo[declarado.campo] = valor;
    }
  }
  return cuerpo;
}

function erroresPorCampo(error: unknown): Readonly<Record<string, string>> {
  if (!(error instanceof ProblemaDeApi)) return {};
  const porCampo: Record<string, string> = {};
  for (const { campo, mensaje } of error.errores) porCampo[campo] = mensaje;
  return porCampo;
}

/**
 * Acciones que no se deshacen (regla 4, RNF-051).
 *
 * En el SGTM no se borra: se anula, se da de baja o se reversa, y eso queda
 * asentado. Como no hay vuelta atras, la accion se confirma diciendo **que** va
 * a pasar y **sobre cuantos**, no preguntando si se esta seguro: quien pulsa
 * siempre esta seguro.
 *
 * La lista crecio con los cuatro actos que #75 nombra y que no estaban:
 * **generar una tanda de valores**, **notificar** —el acuse sostiene el plazo, y
 * un plazo mal notificado tumba el procedimiento— y **pasar a coactiva**. Se
 * mira la etiqueta de la accion y no la operacion porque es lo que el usuario
 * lee: si el boton dice «Derivar a coactiva», eso es lo que cree que va a
 * hacer.
 */
const IRREVERSIBLES =
  /anular|anulaci|dar de baja|baja de|emitir|emisi|generar valor|notificar|notificaci|coactiva|reversar|quiebre|prescri|transferir|transferencia/i;

export const esIrreversible = (accion: string): boolean => IRREVERSIBLES.test(accion);
