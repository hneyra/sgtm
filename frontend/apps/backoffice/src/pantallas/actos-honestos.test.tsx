import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { desinstalarProxyDeDatos, instalarProxyDeDatos } from '@sgtm/api-mock';
import { escribe } from '@sgtm/api-client';
import { todasLasPantallas } from '../catalogo';
import { montarEnRuta } from '../pruebas/montar';
import { COMPONENTES_PROPIOS } from './Pantalla';
import { motivoDeLaPrimaria, primariaApagada } from '../pruebas/acciones';
import {
  ACTOS_SIN_CAMPO,
  LA_QUE_ESCRIBE,
  VOCABULARIO_UNIFORME,
  accionesDeLaBarra,
  impedimentoDelActo,
} from './actos';
import type { ActoSinCampo } from './actos';
import { operacionDe } from './busqueda';
import { altasDeclaradas } from './composicion';
import { censoDeAportes } from './aportes-de-modulo';
import { OPCIONES_QUE_ESCRIBEN, escrituraDe } from './escrituras';
import { OPCIONES_QUE_LEEN_POR_POST } from './lecturas-por-post';

/* Las altas declaradas llegan con el trozo de su modulo desde #433: el censo se hace
   sobre lo que los doce aportan, leido **sin registrarlo** —este archivo monta
   pantallas, y registrarlas aqui lo dejaria tapandose a si mismo—. */
const ALTAS_DECLARADAS = altasDeclaradas((await censoDeAportes()).composiciones);

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

/**
 * Los rotulos que abren un alta **de verdad** en esa opcion, leidos de la
 * composicion y no de una lista escrita aqui: es lo que decide si «Nuevo» se
 * queda en la barra o es un boton que no abre ningun formulario (#391 §2).
 */
const altasDe = (opcion: string): readonly string[] =>
  ALTAS_DECLARADAS.filter((alta) => alta.opcion === opcion).map((alta) => alta.accion);

describe('la causa se lee de lo que ya se sabe, sin ninguna lista aparte', () => {
  it('una opcion declarada no tiene impedimento; una sin declarar, si', () => {
    // Declarada: guarda de verdad, y lo que la apague sera su formulario.
    expect(impedimentoDelActo('alta_deuda')).toBeUndefined();
    expect(impedimentoDelActo('baja_deuda')).toBeUndefined();

    // Sin declarar y con verbo de escritura: falta trabajo del sistema.
    // Era `predial_masivo` hasta #445, que declaro su escritura; el ejemplo pasa
    // a la otra determinacion que escribe y todavia no declara.
    expect(impedimentoDelActo('vehicular_calculo')?.causa).toBe('sin-declaracion');
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
    const sinDeclaracion = impedimentoDelActo('vehicular_calculo')?.detalle ?? '';
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
    const leenPorPost = new Set(OPCIONES_QUE_LEEN_POR_POST);
    const porCausa = {
      declarada: 0,
      lectura: 0,
      salida: 0,
      'sin-backend': 0,
      'sin-declaracion': 0,
      'sin-determinacion': 0,
      'sin-campo': 0,
    };

    for (const [opcion, estructura] of Object.entries(pantallas)) {
      /* **La barra que se dibuja, no la lista cruda del catalogo** (#391 §2).
         `impedimentoDelActo` promete explicar «la ultima accion, la misma que
         dibuja `BarraDeAcciones`», y desde ese issue las cinco opciones del
         predio componen su barra con un solo vocabulario: preguntar por la
         lista del catalogo dejaria a la funcion explicando un boton que ya no
         existe —el «Guardar» de una ficha que es `GET`—. Para las 129 restantes
         `accionesDeLaBarra` devuelve la lista intacta, y esto es un no-op. */
      const acciones = accionesDeLaBarra(
        opcion,
        estructura.acciones ?? [],
        altasDe(opcion),
      ).acciones;
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
        /* O declaro su **lectura por `POST`** (#424): su acto funciona y no
           guarda nada, asi que no tiene impedimento y tampoco es una primaria
           de salida —«Cancelar», en el emisor de reportes de transito—. Sin
           esta rama el bucle exigiria ahi un rotulo de impresion y se pondria
           rojo nombrandolo, que es exactamente lo que hay que evitar contando
           mal en vez de contar otra casilla. */
        if (leenPorPost.has(opcion)) {
          porCausa.lectura += 1;
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
      // Quince declaran: las seis de antes, `anulacion_recibo` (#74), las dos
      // transferencias (#73, que salen de `sin-campo` al ganar su resolutor),
      // las cuatro de Valores (#75) y las dos de Transito (#77:
      // `transito_cambio_numero`, `transito_valores`) — `pase_coactiva` y
      // `transito_valores` llegan desde `salida`, porque su primaria del
      // catalogo («Imprimir») pasaba el filtro aunque la pantalla de verdad
      // escribe con otro boton («Derivar a coactiva», «Generar valores»); y
      // `transito_cambio_numero` llega desde `sin-declaracion`, porque su
      // primaria del catalogo («Salir») no pasa ningun filtro de salida.
      //
      // **Y una mas con #422**: `transito_descargos`, la primera que sale de
      // `sin-campo` por el mecanismo declarativo —`ComposicionDeOpcion.controles`,
      // no un componente propio—. Necesito las dos declaraciones de esta onda a
      // la vez: `LA_QUE_ESCRIBE` para que la primaria sea «Registrar descargo» y
      // no «Notificar al administrado», y el control anadido para el numero de
      // expediente de mesa de partes, que el catalogo dibuja de solo lectura.
      //
      // **Y dos mas con #423**: `cierre_caja` y `anulacion_convenio`, las dos
      // que #74 dejo fuera porque `escrituras.ts` no sabia declarar sus cuerpos
      // —un mapa por forma de pago y un discriminador por accion—. Las dos
      // llegan desde `sin-declaracion`, que es donde estaban.
      //
      // **Y una mas con #445**: `predial_masivo`, la primera de las cinco
      // determinaciones que asienta su corrida en vez de solo simularla.
      //
      // **Y una mas con #427**: `certificados`. Llega desde `sin-declaracion`
      // —donde #421 la habia dejado al poner «Emitir» de primaria— y necesita a
      // la vez las dos formas del resolutor de #422: el control anadido del
      // `nDeRecibo` que el backend exige y ninguna seccion dibuja, y el
      // resolutor del `solicitante`, que es un codigo y la pantalla teclea como
      // nombre.
      //
      // **Y dos mas con #428**: `adm_notificacion` y `adm_valores`. Las dos
      // llegan de `sin-declaracion`, donde #421 las habia dejado al poner de
      // primaria la accion que de verdad escribe. La segunda es declaracion
      // pura —la gemela de `transito_valores`, el mismo caso de uso con otra
      // `Familia`—; la primera necesito ademas un resolutor, porque el manual
      // teclea el numero en tres campos y `notif_adm_numero_uq` (V4) lo guarda
      // en uno.
      //
      // **Y ocho mas con #426**: las ocho de Coactiva, de golpe. Las doce
      // opciones del modulo tenian `Controller` desde #40-#42 y ninguna
      // escritura declaraba: lo que faltaba eran las tres cosas que los tres
      // issues anteriores fueron dejando —cual boton guarda (#421), donde se
      // escribe un campo que el manual no dibuja (#422, cinco controles aqui) y
      // de donde salen las filas que se marcan (#332, con una lectura nueva del
      // backend para la que fracciona)—. Las ocho llegan desde
      // `sin-declaracion`, que es donde las seis de #421 se habian quedado y
      // donde las otras dos ya estaban.
      //
      // **Y una mas con #430**: `caja_tributaria`, la primera pantalla del
      // sistema desde la que entra dinero. Llega de `sin-campo`, y necesito tres
      // controles anadidos —el medio de pago, la caja y el cajero— mas la
      // seleccion de filas de #332 sobre la grilla que ya leia.
      declarada: 31,
      // **Una, y es nueva con #424**: `transito_reportes`. Viene de
      // `sin-declaracion` —su operacion es un `POST` y no declara escritura—, y
      // esa causa decia de ella lo unico que no es cierto: que «la pantalla aún
      // no manda estos campos». Los manda; lo que no hace es guardar nada. Es la
      // tercera puerta (`lecturas-por-post.ts`), y su acto funciona.
      //
      // **Y la segunda con #428**: `adm_reportes`, el emisor gemelo. Llega por
      // el mismo camino y por el mismo motivo, con una diferencia que era la que
      // la tenia fuera: su desplegable ofrecia diez tipos de reporte y el
      // backend implementa tres.
      //
      // **Y dos mas con #427**: `anuncios_reportes` y `licencia_padron`, los dos
      // padrones de Autorizaciones y licencias. Mismo camino y mismo motivo:
      // `POST` que no escribe, cuyos criterios no caben en una URL y cuya
      // respuesta publica sus filas bajo `filas`, no bajo `contenido`.
      lectura: 4,
      // Dos menos que en la onda 4: `alcabala` y `espectaculos` se mudan a
      // `sin-campo` (#385). Su primaria de impresion las dejaba aqui, con el
      // boton apagado y el motivo real —los campos que el backend exige y la
      // pantalla dibuja de solo lectura— silenciado; desde #385
      // `ACTOS_SIN_CAMPO` gana a `DE_SALIDA` y la franja lo cuenta.
      //
      // Y **una mas con #391 §2**: `ficha_urbana`. Su ultima accion del
      // catalogo es «Guardar» sobre una operacion `GET`, asi que caia en
      // `sin-backend` —«aquí todavía no se puede guardar nada»— por un boton
      // que la barra uniforme ya no dibuja. Lo que queda de ella es «Nuevo ·
      // Imprimir»: una consulta y su impresion, que es `salida`.
      //
      // **Seis menos con #421**, y las seis por el mismo motivo: su primaria
      // del catalogo era de salida —«Limpiar campos», «Limpiar», «Imprimir»,
      // «Imprimir», «Imprimir», «Imprimir certificado»— y la que de verdad
      // escribe estaba antes. `importacion_valores`, `expediente_historial`,
      // `costas_procesales`, `adm_notificacion`, `adm_valores` y `certificados`
      // pasan a `sin-declaracion`, que es lo que les toca: su operacion escribe
      // y no han declarado sus campos. Estaban aqui **por el boton equivocado**,
      // asi que ninguna de las seis se leia como lo que es.
      //
      // **Y dos mas con #442**: «Contribuyentes» y «Ficha de vehículo». Las dos
      // declaran el vocabulario uniforme, se les cae el «Guardar» que no podia
      // guardar sobre un `GET`, y lo que queda de su barra es lo que de verdad
      // hacen: imprimir y exportar.
      salida: 43,
      // Dos menos con #391 §2, y las dos son el mismo defecto contado de dos
      // maneras: `ficha_urbana` se va a `salida` y `ficha_bienes` a
      // `sin-determinacion`. Las dos estaban aqui por su «Guardar» del
      // catalogo, que ni existe ni podria existir sobre un `GET`.
      // Treinta y siete desde #442: «Contribuyentes» y «Ficha de vehículo»
      // declaran el vocabulario uniforme, se les cae el «Guardar» que no podia
      // guardar sobre un `GET`, y con el su impedimento: su barra pasa a ser de
      // salida —«Imprimir», «Excel»—, que es lo que de verdad hacen.
      //
      // **Uno menos con #431**: `fisc_resultados`. Su franja decia «aquí todavía
      // no se puede guardar nada: lo que hay es de consulta», y las dos mitades
      // eran falsas — su primaria, «Emitir resoluciones de determinación», tiene
      // backend desde #52 (`POST /fiscalizacion/transferencias`, que
      // `ResolucionController` declara con el acceso de esta opcion). Lo que le
      // falta son los cuatro datos de esa transferencia, que su catalogo no
      // dibuja: `sin-campo`.
      'sin-backend': 36,
      // Nueve se mudan a `sin-campo` en la onda 4: cuatro de transito (#77),
      // tres de fiscalizacion (#80) — mas las tres de tesoreria y las dos
      // transferencias que ya se habian movido antes; y dos se van a
      // `declarada` con #77.
      //
      // **Seis mas con #421**, las mismas seis que salen de `salida`. Las otras
      // cinco de `LA_QUE_ESCRIBE` ya estaban aqui —su primaria del catalogo no
      // pasaba ningun filtro de salida («REC 2», «Padrón», «Resol. consentida»,
      // «Cancelar» y «Cancelar»)—, asi que cambian de boton sin cambiar de
      // casilla: el censo cuenta la causa, no el rotulo.
      //
      // **Y una menos con #424**: `transito_reportes` se va a `lectura`; y otra
      // con #428, `adm_reportes`, que es la segunda que lee por `POST`. Las dos
      // mudanzas van en direcciones opuestas y **el numero no se sumo a mano**:
      // se recompuso ejecutando el censo sobre el arbol ya mergeado.
      //
      // **Y dos menos con FRO-06** (#427): `licencia_resolucion_cancelacion` y
      // `licencia_resolucion_duplicado` se van a `sin-campo`. Son hojas sin ni
      // una seccion —el prototipo capturo el papel, no el formulario—, asi que
      // `sin-declaracion` («la pantalla aún no manda estos campos») pedia
      // declarar campos que no existen. Las tres hojas gemelas de transito ya
      // estaban donde toca desde #77.
      //
      // **Y dos menos con #423**: las dos de tesoreria que ya declaran su
      // cuerpo. Este numero tampoco se sumo a mano: se recompuso ejecutando.
      // **Y una menos con #445**: `predial_masivo` se va a `declarada`.
      //
      // **Y tres menos con #428**: `adm_resolucion_gerencia` y
      // `adm_notificacion_resolucion` se van a `sin-campo` —las dos ultimas
      // hojas sin superficie que quedaban descolocadas, y con ellas las siete
      // que `hojas-sin-superficie` computa del catalogo estan **todas** alli—, y
      // `adm_reportes` se va a `lectura`: su `POST` no escribe, y lo que la
      // tenia fuera de la tercera puerta era su desplegable.
      //
      // **Y tres menos con #427**: `anuncios_reportes` y `licencia_padron` se
      // van a `lectura` y `certificados` a `declarada`. El numero no se sumo a
      // mano: se recompuso ejecutando el censo.
      //
      // **Y dos menos con #428**: `adm_notificacion` y `adm_valores`, las dos a
      // `declarada`. Tampoco se sumo a mano.
      //
      // **Y ocho menos con #426**, que es el modulo de Coactiva entero: las seis
      // que #421 dejo aqui con el boton ya correcto y sin nada que mandar, mas
      // `cambiar_direccion_ref` y `fraccionamiento_coactivo`, que nunca
      // necesitaron #421 —su ultima accion del catalogo ya era la que escribe—.
      // Las ocho pasan a `declarada`, y con ellas **se vacia la casilla de
      // Coactiva**: de las doce opciones del modulo, ninguna queda con
      // impedimento.
      'sin-declaracion': 3,
      // Dos desde #391 §2: `predial_individual` y `ficha_bienes`. La segunda
      // llega porque su barra uniforme deja «Distribuir valor» de ultima —el
      // «Guardar» de una ficha `GET` se cae— y repartir el valor de una
      // edificacion entre sus unidades es exactamente una determinacion que el
      // servidor no hace todavia (D-02a): su total de bienes comunes sale «—».
      'sin-determinacion': 2,
      // Tesoreria (3, #74) + transito (4, #77) + fiscalizacion (3, #80) +
      // las dos de rentas que #385 rescata de `salida` (`alcabala`,
      // `espectaculos`) + las dos hojas de resolucion de licencias que FRO-06
      // (#427) trae desde `sin-declaracion`.
      //
      // **Una menos con #422**: `transito_descargos` se va a `declarada`. Es la
      // primera de las tres formas del hueco —el dato lo teclea quien atiende y
      // solo faltaba el control—, y las trece que quedan son de las otras dos: un
      // identificador que hay que resolver contra una lista, una hoja que el
      // prototipo nunca capturo, o una cifra que determina el sistema y hoy no
      // determina nadie (D-11, D-02a). Que generalizar el mecanismo no las
      // arrastre a todas lo exige `controles-declarados.test.ts`.
      //
      // **Dos mas con #428**: las dos hojas de resolucion de infracciones
      // administrativas, que llegan de `sin-declaracion` por lo mismo que las de
      // licencias en #427 (FRO-06 §1.4).
      //
      // **Y uno mas con #431**: `fisc_resultados`, que llega de `sin-backend`
      // por el mismo movimiento. El numero no se sumo a mano: se recompuso
      // ejecutando el censo.
      //
      // **Y uno menos con #430**: `caja_tributaria` se va a `declarada`. El
      // numero no se sumo a mano: se recompuso ejecutando el censo.
      'sin-campo': 15,
    });
    const total = Object.values(porCausa).reduce((a, b) => a + b, 0);
    expect(total).toBe(Object.keys(pantallas).length);
  });

  it('una opcion testigo por causa, nombrada: los recuentos solos no dicen cual', () => {
    // Lectura pura, con una primaria que **si** es un acto: «Registrar pago».
    expect(impedimentoDelActo('cuenta_corriente', ['Exportar', 'Registrar pago'])?.causa).toBe(
      'sin-backend',
    );
    /* Escribe en el contrato y no ha declarado su cuerpo: `respaldo` (#13). Es
       el **tercer** testigo de esta casilla, y el cambio se lee como la historia
       de las tres ondas de conexion: era `cierre_caja` hasta #423, que le enseño
       a `escrituras.ts` a declarar un mapa por forma de pago, y
       `costas_procesales` hasta #426, que conecto el modulo de Coactiva entero.
       De los dos anteriores se comprueba **tambien** que ya no estan aqui, que es
       lo que convierte cada cambio de testigo en una afirmacion y no en un apaño:
       el anterior sale de la casilla porque declara, no porque se le haya dejado
       de mirar.

       Y de la casilla quedan tres: `respaldo`, `permisos` y `vehicular_calculo`
       —las tres fuera de las doce ondas de modulo—. */
    expect(impedimentoDelActo('respaldo', ['Restaurar', 'Ejecutar respaldo'])?.causa).toBe(
      'sin-declaracion',
    );
    expect(
      impedimentoDelActo('cierre_caja', ['Cuadrar', 'Imprimir arqueo', 'Cerrar caja']),
    ).toBeUndefined();
    expect(
      impedimentoDelActo('costas_procesales', [
        'Nuevo',
        'Modificar',
        'Anular',
        'Imprimir',
        'Guardar',
      ]),
    ).toBeUndefined();
    /* Y sin declarar, con verbo de escritura, pero con **un dato que la pantalla
       no tiene donde escribir** (#33, #74): a `caja_tasas` le faltan los
       conceptos del TUPA —ninguna consulta publica todavia su tarifa vigente— y,
       con ellos, el medio de pago, la caja y el cajero.

       El testigo era `caja_tributaria` hasta #430, que la conecto: ahora declara
       su escritura, y lo que la apaga es `exigir`. Su gemela sigue aqui, y sirve
       igual de testigo porque su hueco es el mismo con un dato mas. */
    expect(impedimentoDelActo('caja_tasas', ['Limpiar', 'Cobrar y emitir recibo'])?.causa).toBe(
      'sin-campo',
    );
    // Y la misma causa **cuando la primaria es de salida** (#385): en
    // `alcabala` la ultima accion del catalogo es «Imprimir liquidación», y
    // hasta #385 ese filtro devolvia `undefined` antes de consultar
    // `ACTOS_SIN_CAMPO` —el boton salia apagado con el motivo real silenciado—.
    // Este testigo es el que se pone rojo si el orden se invierte de vuelta.
    expect(
      impedimentoDelActo('alcabala', ['Liquidar', 'Generar orden de pago', 'Imprimir liquidación'])
        ?.causa,
    ).toBe('sin-campo');
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

/**
 * **Un solo vocabulario de accion** (#391 §2), en el mecanismo.
 *
 * Lo que se comprueba aqui es la regla, sin montar nada: una primaria por
 * pantalla, siempre la ultima y siempre la que escribe; lo que no escribe es
 * secundario y va a su izquierda; y una pantalla sin ninguna accion que escriba
 * no tiene primaria. Lo que se ve en pantalla lo comprueba
 * `catastro/vocabulario-y-buscador.test.tsx`.
 */
describe('un solo vocabulario de accion, y solo donde se declara', () => {
  it('las 113 que no declaran nada reciben su lista del catalogo, intacta', async () => {
    const pantallas = await todasLasPantallas();
    let intactas = 0;
    for (const [opcion, estructura] of Object.entries(pantallas)) {
      if (VOCABULARIO_UNIFORME.has(opcion) || Object.hasOwn(LA_QUE_ESCRIBE, opcion)) continue;
      const acciones = estructura.acciones ?? [];
      const barra = accionesDeLaBarra(opcion, acciones, altasDe(opcion));
      expect(barra.acciones, `«${opcion}» cambio de barra sin declararlo`).toEqual(acciones);
      // Y siguen teniendo primaria: la regla de FRO-03 §5, tal cual.
      expect(barra.conPrimaria).toBe(true);
      intactas += 1;
    }
    /* Y **cuantas son**, que es lo que convierte el bucle en una comprobacion.
       Sin esta cifra, meter media docena de opciones en cualquiera de las dos
       listas las sacaria del bucle sin que nada lo dijera: el recorrido pasaria
       igual, con menos vueltas. 134 − 9 − 13. */
    expect(intactas).toBe(112);
    // Seis de catastro y **tres de rentas** desde #442: las tres lecturas del
    // padron, que son el mismo caso que las cuatro fichas catastrales.
    expect(VOCABULARIO_UNIFORME.size).toBe(9);
    // Once desde #421, la doceava con #429 y la treceava con #423
    // (`anulacion_convenio`, cuya primaria del catalogo no es la que anula).
    expect(Object.keys(LA_QUE_ESCRIBE).length).toBe(13);
    // Y las seis que si lo declaran existen de verdad en el catalogo: sin
    // esto, un identificador mal escrito dejaria la regla sin aplicarse a nada
    // y las pruebas de abajo seguirian en verde.
    for (const opcion of VOCABULARIO_UNIFORME) {
      expect(Object.hasOwn(pantallas, opcion), `«${opcion}» no esta en el catalogo`).toBe(true);
    }
  });

  it.each([
    {
      opcion: 'ficha_urbana',
      // «Modificar» y «Deshacer» son modos; «Guardar», un `GET` que no guarda.
      barra: ['Nuevo', 'Imprimir'],
      conPrimaria: false,
    },
    // El «Nuevo» de la economica **no abre nada**: el alta guiada la declara la
    // modalidad urbana, que es la que se abre por el codigo catastral.
    { opcion: 'ficha_economica', barra: ['Imprimir'], conPrimaria: false },
    { opcion: 'ficha_bienes', barra: ['Distribuir valor'], conPrimaria: false },
    { opcion: 'ficha_rural', barra: ['Calcular', 'Imprimir ficha rural'], conPrimaria: false },
    // La unica de las cinco que escribe, y su «Guardar» pasa **al final**: el
    // catalogo lo dibuja tercero, con «Quitar» detras.
    { opcion: 'actualizacion_catastro', barra: ['Imprimir', 'Guardar'], conPrimaria: true },
    /* La sexta, y la que #421 rescata: su catalogo dibuja «Nuevo · Guardar ·
       Inactivar» sobre `GET /catastro/vias`, asi que la regla de FRO-03 §5
       hacia de «Inactivar» —una baja logica— el boton navy. Los dos verbos se
       caen porque no hay a donde escribir, y queda el alta, que es el unico
       acto que esta pantalla puede hacer hoy. */
    { opcion: 'calles', barra: ['Nuevo'], conPrimaria: false },
  ])('$opcion compone $barra', async ({ opcion, barra, conPrimaria }) => {
    const pantallas = await todasLasPantallas();
    const compuesta = accionesDeLaBarra(opcion, pantallas[opcion]?.acciones ?? [], altasDe(opcion));
    expect(compuesta.acciones).toEqual(barra);
    expect(compuesta.conPrimaria).toBe(conPrimaria);
  });

  /**
   * **Un modo nunca se convierte en la primaria de la pantalla que si escribe.**
   *
   * Esta va con una lista de acciones **inventada**, y hace falta que lo sea: en
   * las cinco opciones de hoy la clasificacion de «Modificar» y «Deshacer» no se
   * puede observar. En las cuatro fichas cae en un empate —son `GET`, asi que lo
   * que no se reconoce como modo se cae igual, por no tener a donde escribir—, y
   * la unica que escribe no dibuja ninguno de los dos. Es la misma situacion que
   * `MUESTRA_SIN_CAMPO` de arriba: la propiedad importa, el catalogo no la
   * ejercita, y comprobarla sobre una muestra es lo unico que queda.
   *
   * Y la propiedad importa **mucho**: con un modo detras del verbo que guarda,
   * la primaria pasa a ser el modo. Ahi la observacion del usuario armaria un
   * boton que no guarda nada (regla 10, RNF-052), y la franja explicaria un
   * guardado que ese boton no hace.
   */
  it('un modo detras del verbo que guarda no le roba la primaria', () => {
    const compuesta = accionesDeLaBarra(
      'actualizacion_catastro',
      ['Nuevo', 'Guardar', 'Imprimir', 'Modificar', 'Deshacer', 'Quitar'],
      [],
    );
    expect(compuesta.acciones).toEqual(['Imprimir', 'Guardar']);
    expect(compuesta.conPrimaria).toBe(true);
  });

  /**
   * Los dos testigos del censo, nombrados: los recuentos solos no dicen cual se
   * movio ni por que.
   */
  it('las dos que se mudan de casilla lo hacen por su barra, no por su catalogo', async () => {
    const pantallas = await todasLasPantallas();
    const causaDe = (opcion: string, acciones: readonly string[]) =>
      impedimentoDelActo(opcion, acciones)?.causa ?? 'ninguna';

    // Con la lista cruda del catalogo, las dos decian «aquí todavía no se puede
    // guardar nada» por un «Guardar» que la barra ya no dibuja.
    expect(causaDe('ficha_urbana', pantallas['ficha_urbana']?.acciones ?? [])).toBe('sin-backend');
    expect(causaDe('ficha_bienes', pantallas['ficha_bienes']?.acciones ?? [])).toBe('sin-backend');

    // Con la barra que se dibuja, cada una cae donde le toca.
    const barraDe = (opcion: string) =>
      accionesDeLaBarra(opcion, pantallas[opcion]?.acciones ?? [], altasDe(opcion)).acciones;
    expect(causaDe('ficha_urbana', barraDe('ficha_urbana'))).toBe('ninguna');
    expect(causaDe('ficha_bienes', barraDe('ficha_bienes'))).toBe('sin-determinacion');
  });
});

/**
 * **La primaria que no guarda** (#421), en el mecanismo.
 *
 * Once pantallas del prototipo dibujan la accion que escribe **antes** de la
 * ultima, y FRO-03 §5 hace primaria a la ultima. El resultado no es un detalle
 * de estilo: en `importacion_valores` el boton navy decia «Limpiar campos» y lo
 * que hay detras es una importacion a coactiva, irreversible (RF-100).
 *
 * Lo que se comprueba aqui es la regla, sin montar nada; lo que llega a
 * ventanilla, mas abajo, con dos pantallas montadas de verdad.
 */
describe('la accion que escribe, cuando no es la ultima del catalogo', () => {
  it.each([
    // Coactiva (#76): las seis que su javadoc censo una a una.
    {
      opcion: 'importacion_valores',
      escribe: 'Importar valores',
      barra: ['Expedientes libres', 'Rechazar recaudo', 'Limpiar campos', 'Importar valores'],
    },
    {
      opcion: 'rec_impresion',
      escribe: 'Generar',
      barra: [
        'Listar expedientes',
        'Seleccionar todos',
        'Imprimir',
        'Carátula',
        'REC 2',
        'Generar',
      ],
    },
    {
      opcion: 'expediente_historial',
      escribe: 'Guardar cambios',
      barra: ['Nuevo', 'Modificar', 'Quitar', 'Limpiar', 'Guardar cambios'],
    },
    {
      opcion: 'costas_procesales',
      escribe: 'Guardar',
      barra: ['Nuevo', 'Modificar', 'Anular', 'Imprimir', 'Guardar'],
    },
    {
      opcion: 'actos_coactivos',
      escribe: 'Guardar',
      barra: ['Nuevo', 'Modificar', 'Imprimir', 'Padrón', 'Guardar'],
    },
    {
      opcion: 'notificaciones_coactivas',
      escribe: 'Grabar',
      barra: ['Nuevo', 'Modificar', 'Deshacer', 'Vista', 'Resol. consentida', 'Grabar'],
    },
    // Autorizaciones y licencias (#79).
    {
      opcion: 'anuncios_reportes',
      escribe: 'Pantalla',
      barra: ['Exportar', 'Imprimir', 'Cancelar', 'Pantalla'],
    },
    {
      opcion: 'licencia_padron',
      escribe: 'Pantalla',
      barra: ['Exportar', 'Imprimir', 'Cancelar', 'Pantalla'],
    },
    { opcion: 'certificados', escribe: 'Emitir', barra: ['Imprimir certificado', 'Emitir'] },
    // Infracciones administrativas (#78).
    {
      opcion: 'adm_notificacion',
      escribe: 'Guardar',
      barra: ['Nuevo', 'Modificar', 'Anular', 'Imprimir', 'Guardar'],
    },
    {
      opcion: 'adm_valores',
      escribe: 'Procesar',
      barra: ['Nuevo', 'Modificar', 'Guardar', 'Anular', 'Imprimir', 'Procesar'],
    },
    /* Tesoreria (#423), y la primera con **dos** acciones que escriben: «Anular»
       y «Quebrar» mandan las dos, con `accion` distinta. Lo que se declara aqui
       sigue siendo una sola cosa —cual es el acto de la pantalla—, y con el orden
       del catalogo el navy le tocaba a «Quebrar», que es el acto excepcional. */
    {
      opcion: 'anulacion_convenio',
      escribe: 'Anular',
      barra: ['Nuevo', 'Modificar', 'Guardar', 'Deshacer', 'Reformar', 'Quebrar', 'Anular'],
    },
  ])('$opcion pone «$escribe» al final, y no quita ninguna', async ({ opcion, escribe, barra }) => {
    const pantallas = await todasLasPantallas();
    const compuesta = accionesDeLaBarra(opcion, pantallas[opcion]?.acciones ?? [], altasDe(opcion));

    expect(compuesta.acciones).toEqual(barra);
    // La primaria es la ultima (FRO-03 §5), y ahora es la que escribe.
    expect(compuesta.acciones[compuesta.acciones.length - 1]).toBe(escribe);
    expect(compuesta.conPrimaria).toBe(true);
    /* Y **no se pierde ninguna**: esta declaracion mueve, no quita. Quitar es lo
       que hace el vocabulario uniforme, que es otra decision y otra lista. */
    expect([...compuesta.acciones].sort()).toEqual([...(pantallas[opcion]?.acciones ?? [])].sort());
  });

  /**
   * **Cada rotulo declarado existe letra por letra en el catalogo de su
   * opcion**, y la opcion existe.
   *
   * Es la misma guarda que las seis de `VOCABULARIO_UNIFORME`, y aqui hace mas
   * falta todavia porque lo declarado es texto: una errata —«Guardar cambio»,
   * «Emitír»— deja la declaracion muerta y la pantalla exactamente como estaba,
   * con su primaria equivocada y sin que nada lo diga. `conLaQueEscribeAlFinal`
   * devuelve la lista intacta a proposito para que el fallo sea este rojo y no
   * una barra en blanco en ventanilla.
   */
  it('cada rotulo declarado es uno que el catalogo de esa opcion dibuja', async () => {
    const pantallas = await todasLasPantallas();
    for (const [opcion, rotulo] of Object.entries(LA_QUE_ESCRIBE)) {
      const acciones = pantallas[opcion]?.acciones;
      expect(acciones, `«${opcion}» no esta en el catalogo`).toBeDefined();
      expect(acciones ?? [], `«${opcion}» no dibuja ninguna accion «${rotulo}»`).toContain(rotulo);
    }
  });

  /**
   * **Ninguna opcion declara las dos cosas.**
   *
   * Serian dos reglas decidiendo lo mismo —cual accion es la primaria—, y la que
   * ganaria seria la del `if` que este primero, que es la peor forma de decidir
   * una convencion. Son dos decisiones de distinto tamaño: el vocabulario
   * uniforme cambia **lo que la pantalla ofrece** (quita modos, tira los verbos
   * que no tienen a donde escribir) y esto solo dice cual de sus ofertas es el
   * acto.
   */
  it('el vocabulario uniforme y la accion declarada no se pisan', () => {
    for (const opcion of Object.keys(LA_QUE_ESCRIBE)) {
      expect(VOCABULARIO_UNIFORME.has(opcion), `«${opcion}» declara las dos reglas`).toBe(false);
    }
  });

  /**
   * **Ninguna barra del vocabulario uniforme pierde un alta en silencio.**
   *
   * `Pantalla.tsx` llama a `accionesDeLaBarra` **sin** los rotulos de las altas.
   * Ese argumento decide si un «Nuevo» se queda en la barra o se cae, asi que no
   * pasarlo solo es correcto para una opcion **que no tenga ninguna alta que
   * perder**. Hay dos formas de estarlo, y las dos valen:
   *
   *   con componente propio   lo pasa el, desde su propia composicion. Es el caso
   *                           de las seis de catastro
   *   sin ninguna alta        no hay nada que pasar. Es el caso de las tres
   *                           lecturas del padron de rentas (#442): su catalogo
   *                           dibuja «Nuevo», ninguna declara el formulario que
   *                           abriria, y por eso ese boton **debe** caerse — que
   *                           es exactamente lo que #321 cerro para el catalogo
   *                           vial
   *
   * Antes esto exigia componente propio a secas, que era mas estrecho que lo que
   * de verdad protege: dejaba fuera al caso en que no hay alta ninguna. Lo que no
   * puede pasar —y es lo que sigue vigilandose— es que una opcion con alta
   * declarada la dibuje el renderizador comun: ahi el «Nuevo» desapareceria sin
   * que nadie supiera por que.
   */
  it('ninguna del vocabulario uniforme pierde un alta por el camino comun', () => {
    for (const opcion of VOCABULARIO_UNIFORME) {
      if (Object.hasOwn(COMPONENTES_PROPIOS, opcion)) continue;
      expect(
        altasDe(opcion),
        `«${opcion}» declara un alta y la dibuja el renderizador comun, que no la pasa`,
      ).toEqual([]);
    }
  });

  /**
   * **La declaracion gana a `DE_SALIDA`**, y `certificados` es donde se ve.
   *
   * Su catalogo es «Emitir · Imprimir certificado», asi que la primaria de
   * FRO-03 §5 empieza por «imprimir» y `impedimentoDelActo` la reconoce como
   * salida **antes** de mirar nada mas: devolvia `undefined`, la franja se
   * quedaba vacia y el motivo real —`CertificadoController.emitir` exige
   * `nDeRecibo`, y esta pantalla no dibuja ningun campo para el— se quedaba en
   * un `title` sobre un boton `disabled`, que no llega ni al teclado ni al
   * lector (RNF-082). Es el mismo defecto que #385 cerro un escalon mas abajo
   * para `ACTOS_SIN_CAMPO`, y se cierra por el mismo motivo: la declaracion es
   * deliberada y escasa; `DE_SALIDA` es una heuristica sobre el rotulo.
   *
   * Gana **por construccion**: al pasar «Emitir» al final, el filtro de salida
   * ya no ve una primaria de impresion. Por eso la rotura que lo mide es
   * devolver el orden, no quitar un `if`.
   */
  it('certificados: la que emite es «Emitir», y desde #427 emite de verdad', async () => {
    const pantallas = await todasLasPantallas();
    const acciones = pantallas['certificados']?.acciones ?? [];

    // Como el catalogo la dibuja: la ultima —la primaria de FRO-03 §5— imprime.
    expect(acciones[acciones.length - 1]).toBe('Imprimir certificado');
    // Con la barra compuesta, la primaria es la que emite.
    const barra = accionesDeLaBarra('certificados', acciones, altasDe('certificados')).acciones;
    expect(barra[barra.length - 1]).toBe('Emitir');

    /* **Y lo que esta declaracion sostiene desde #427 es mas que un color.**
       `certificados` declara su escritura, asi que la primaria **dispara el
       `POST`**: sin `LA_QUE_ESCRIBE`, quien lo dispararia es un boton que dice
       «Imprimir certificado» —consumiendo un correlativo y cobrando un derecho
       al pulsar lo que parece una reimpresion—. Por eso ya no hay impedimento
       que contar: lo que apaga la primaria es `exigir`, no una franja. */
    expect(escrituraDe('certificados')).toBeDefined();
    expect(impedimentoDelActo('certificados', barra)).toBeUndefined();
  });

  /**
   * Los seis testigos del censo, nombrados: los recuentos solos dicen que algo
   * se movio, no cual ni por que.
   *
   * Las otras cinco de `LA_QUE_ESCRIBE` cambian de boton **sin** cambiar de
   * casilla —su primaria del catalogo tampoco pasaba ningun filtro de salida—,
   * y eso tambien se afirma aqui: si se movieran, el censo cuadraria por otro
   * camino y nadie se enteraria.
   *
   * **Cuatro de las once ya no llegan a `sin-declaracion`, y ese es el trabajo
   * de #426**: las cuatro de coactiva declaran su escritura, asi que
   * `impedimentoDelActo` devuelve `undefined` antes de mirar ninguna otra cosa.
   * Lo que sigue afirmandose de ellas es lo mismo de siempre, y es lo unico que
   * la barra decide: **su primaria compuesta es la que guarda**, no la de
   * salida que el prototipo dejo la ultima. Sin `LA_QUE_ESCRIBE`, declarar la
   * escritura habria encendido «Limpiar campos» —y pulsarlo habria importado
   * valores a coactiva—.
   */
  it('las ocho que se mudaron de casilla lo hicieron por su barra, no por su catalogo', async () => {
    const pantallas = await todasLasPantallas();
    const causaDe = (opcion: string, acciones: readonly string[]) =>
      impedimentoDelActo(opcion, acciones)?.causa ?? 'ninguna';
    const delCatalogo = (opcion: string) => pantallas[opcion]?.acciones ?? [];
    const deLaBarra = (opcion: string) =>
      accionesDeLaBarra(opcion, delCatalogo(opcion), altasDe(opcion)).acciones;

    /* **Ninguna de las once queda ya en la casilla `sin-declaracion`**, y eso lo
       cerro #426: las tres de licencias e infracciones declararon con #427 y
       #428, y las seis de coactiva con este. Asi que lo que se afirma de todas
       ya no es su casilla sino **lo que la barra hace con ellas**, que es de lo
       que dependia que declarar la escritura no fuera peligroso: sin
       `LA_QUE_ESCRIBE` la primaria seria la de salida que el prototipo dejo la
       ultima, y en `importacion_valores` pulsarla habria importado valores a
       coactiva —irreversible, RF-100—. */
    /* Las dos de licencias que #427 lleva a la tercera puerta: su acto
       funciona y no guarda nada, asi que no tienen casilla ni con la lista del
       catalogo ni con la compuesta. Antes las dos decian `sin-declaracion`. */
    for (const opcion of ['anuncios_reportes', 'licencia_padron']) {
      expect(causaDe(opcion, delCatalogo(opcion)), `«${opcion}» del catalogo`).toBe('ninguna');
      expect(causaDe(opcion, deLaBarra(opcion)), `«${opcion}» compuesta`).toBe('ninguna');
      expect(OPCIONES_QUE_LEEN_POR_POST, `«${opcion}» lee por POST`).toContain(opcion);
    }
    /* Y las seis de coactiva que #421 marco: de cada una, que la primaria
       compuesta es la que guarda y que la del catalogo **no** lo era. */
    for (const [opcion, guarda] of [
      ['importacion_valores', 'Importar valores'],
      ['rec_impresion', 'Generar'],
      ['expediente_historial', 'Guardar cambios'],
      ['costas_procesales', 'Guardar'],
      ['actos_coactivos', 'Guardar'],
      ['notificaciones_coactivas', 'Grabar'],
    ] as const) {
      const barra = deLaBarra(opcion);
      expect(barra[barra.length - 1], `«${opcion}» primaria compuesta`).toBe(guarda);
      expect(delCatalogo(opcion).at(-1), `«${opcion}» primaria del catalogo`).not.toBe(guarda);
      expect(causaDe(opcion, barra), `«${opcion}» compuesta`).toBe('ninguna');
    }
  });

  /**
   * **La doceava es la unica que ademas escribe** (#422).
   *
   * `transito_descargos` es donde las dos declaraciones de esta onda se
   * necesitan a la vez, y por eso vale como testigo de las dos: sin
   * `LA_QUE_ESCRIBE`, la primaria seria «Notificar al administrado» —el catalogo
   * la pone la ultima de las tres— y quien atiende pulsaria el boton navy
   * esperando registrar el escrito; sin el control anadido de
   * `transito/composicion.ts`, no habria donde teclear el numero de expediente
   * que `DescargosController` exige.
   *
   * Aqui se comprueba la primera mitad. La segunda la comprueba
   * `transito/transito.test.tsx`, montando la pantalla.
   */
  it('transito_descargos: la barra pone al final la que registra, no la que notifica', async () => {
    const pantallas = await todasLasPantallas();
    const acciones = pantallas['transito_descargos']?.acciones ?? [];

    // Como el catalogo la dibuja: la que registra es la **primera**.
    expect(acciones).toEqual(['Registrar descargo', 'Resolver', 'Notificar al administrado']);

    const barra = accionesDeLaBarra('transito_descargos', acciones, altasDe('transito_descargos'));
    expect(barra.acciones).toEqual(['Resolver', 'Notificar al administrado', 'Registrar descargo']);
    expect(barra.conPrimaria).toBe(true);
    // Y ninguna se cae: mover no es quitar.
    expect(barra.acciones).toHaveLength(acciones.length);
    // Declarada: sin impedimento que contar, con la barra compuesta o sin ella.
    expect(impedimentoDelActo('transito_descargos', barra.acciones)).toBeUndefined();
  });
});

describe('la franja aparece en la pantalla, y la primaria la referencia', () => {
  it.each([
    {
      caso: 'operacion de lectura',
      // Era «Contribuyentes» hasta #442, que le quito el «Guardar» de un `GET`
      // y con el la franja: su barra ya solo imprime. «Arbitrios municipales»
      // sigue siendo el caso —un `GET` cuya primaria promete emitir cuponera—.
      ruta: '/rentas-registro/arbitrios',
      causa: 'sin-backend',
    },
    {
      caso: 'operacion que escribe y opcion sin declarar',
      ruta: '/rentas-registro/vehicular-calculo',
      causa: 'sin-declaracion',
    },
    // La cuarta causa —`sin-campo`— tiene pantalla real desde #385: la
    // alcabala declara los dos datos que el backend exige y ella dibuja de
    // solo lectura, y la franja lo cuenta aunque su primaria sea de impresion.
    // (Las dos transferencias que estrenaron la causa tienen su propia bateria
    // en `rentas/transferencias.test.tsx`, ya conectadas.)
    {
      caso: 'acto con un dato que la pantalla no tiene donde escribir',
      ruta: '/rentas-registro/alcabala',
      causa: 'sin-campo',
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
    { caso: 'sin-backend', ruta: '/rentas-registro/arbitrios' },
    { caso: 'sin-declaracion', ruta: '/rentas-registro/vehicular-calculo' },
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
   * **La accion que escribe lleva el color del acto, y las demas no** (#421),
   * en la pantalla.
   *
   * Dos de las once, elegidas por lo que cada una demuestra:
   *
   *   `importacion_valores`  el caso que da nombre al defecto. El navy decia
   *                          «Limpiar campos» y detras hay una importacion a
   *                          coactiva, irreversible (RF-100)
   *   `certificados`         el que ademas **estrena la franja**: su ultima es
   *                          «Imprimir certificado», asi que `DE_SALIDA` la
   *                          silenciaba antes de mirar nada mas. Desde #427 es
   *                          ademas el que demuestra por que el color importa:
   *                          esa primaria **emite de verdad**
   *
   * Y las dos siguen apagadas, y **ninguna de las dos por la casilla**: las dos
   * declaran ya su escritura —`certificados` con #427, `importacion_valores` con
   * #426—, asi que lo que las apaga es lo que a cada formulario le falta, dicho
   * por su propia `exigir` y **sin** `data-causa`: ahi ya no hay ningun
   * impedimento estructural que contar. Y dicho donde se lee (RNF-082), no en un
   * `title` sobre un boton `disabled`.
   */
  it.each([
    {
      caso: 'la importacion a coactiva',
      ruta: '/coactiva/importacion-valores',
      escribe: 'Importar valores',
      ultimaDelCatalogo: 'Limpiar campos',
      motivo: /Busca al contribuyente arriba/,
      causa: undefined,
    },
    {
      caso: 'el certificado, que ademas estrena franja',
      ruta: '/autorizaciones-y-licencias/certificados',
      escribe: 'Emitir',
      ultimaDelCatalogo: 'Imprimir certificado',
      motivo: /Falta el tipo de certificado/,
      causa: undefined,
    },
  ])(
    '$caso: la primaria es «$escribe», no «$ultimaDelCatalogo»',
    async ({ ruta, escribe, ultimaDelCatalogo, motivo, causa }) => {
      const montada = montarEnRuta(ruta);
      await waitFor(() => expect(document.querySelector('.sgtm-acciones')).not.toBeNull());

      const navy = [...document.querySelectorAll('.sgtm-acciones .sgtm-boton--primario')].map(
        (boton) => boton.textContent,
      );
      expect(navy, `el boton navy de «${ruta}»`).toEqual([escribe]);
      // Y la que era primaria sigue dibujada, de secundaria: esto mueve, no quita.
      expect(screen.getByRole('button', { name: ultimaDelCatalogo })).toHaveClass(
        'sgtm-boton--secundario',
      );

      /* Apagada con `aria-disabled`, enfocable, y con la franja que su
         `aria-describedby` señala. */
      primariaApagada();
      expect(motivoDeLaPrimaria()).toMatch(motivo);
      const franja = document.getElementById('sgtm-motivo-de-la-accion');
      if (causa === undefined) {
        /* La que ya declara su escritura **no** tiene causa: no hay impedimento
           que contar, lo que la apaga es lo que le falta al formulario. */
        expect(franja).not.toHaveAttribute('data-causa');
      } else {
        expect(franja).toHaveAttribute('data-causa', causa);
      }

      montada.unmount();
    },
  );

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

  /**
   * `sectores` dice lo mismo **sin barra de acciones**, y por eso va aparte.
   *
   * Desde que las dos opciones del territorio caen en la misma superficie
   * (`catastro/Territorio.tsx`), «Nuevo sector» no vive en la barra del fondo:
   * vive al pie del carril, debajo del arbol del que cuelga. La propiedad que
   * esta prueba defiende no cambia —la pantalla no promete un guardado que no
   * puede hacer—, y aqui se puede exigir **mas fuerte** que en las de arriba: no
   * es que la franja este vacia, es que no hay ninguna franja que leer.
   */
  it('/catastro/sectores compone su alta en el carril: ni franja, ni causa, ni promesa rota', async () => {
    const montada = montarEnRuta('/catastro/sectores');

    expect(await screen.findByRole('button', { name: 'Nuevo sector' })).toBeEnabled();
    expect(document.querySelector('.sgtm-acciones')).toBeNull();
    expect(document.getElementById('sgtm-motivo-de-la-accion')).toBeNull();

    montada.unmount();
  });

  /**
   * **Las tres tablas de valuacion, sin los dos botones que no podian guardar.**
   *
   * Mismo precedente que `sectores`, y con un motivo mas fuerte todavia:
   * «Importar tabla del año» y «Guardar» no es que estuvieran dibujados y
   * muertos, es que **no pueden existir**. ADR-0017 deja valores unitarios y
   * depreciacion como catalogos nacionales que solo escribe
   * `rol_carga_parametros` (V55, con `REVOKE INSERT/UPDATE` a `sgtm_app`), y el
   * arancel municipal cuelga del conjunto que V18 vuelve inmutable al sellarse.
   *
   * La franja de la primaria decia `sin-backend` —«aquí todavía no se puede
   * guardar nada»— junto a dos botones que prometian importar y guardar. Se
   * exige lo mismo que en `sectores`, que es mas que una franja vacia: **no hay
   * barra que leer**, y los dos rotulos no estan en ninguna parte de la pagina.
   */
  it.each([
    { ruta: '/catastro/aranceles' },
    { ruta: '/catastro/valores-unitarios' },
    { ruta: '/catastro/depreciacion' },
  ])(
    '$ruta no dibuja «Importar tabla del año» ni «Guardar»: no puede escribir',
    async ({ ruta }) => {
      const montada = montarEnRuta(ruta);

      // Se espera a la superficie, que llega en su propio trozo (`lazy`).
      expect(
        await screen.findByRole('tablist', { name: 'Hojas del cuadro de valuación' }),
      ).toBeInTheDocument();

      expect(document.querySelector('.sgtm-acciones')).toBeNull();
      expect(document.getElementById('sgtm-motivo-de-la-accion')).toBeNull();
      expect(
        screen.queryByRole('button', { name: 'Importar tabla del año' }),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument();

      montada.unmount();
    },
  );
});

/**
 * `ActoSinCampo.campos` promete, en su propio javadoc, que existe «para que la
 * prueba pueda nombrarlo» — y ninguna lo nombraba (#379, esta pasada). Sin este
 * guardia, una entrada con `campos: []` pasaba en verde: documenta el dato que
 * falta y no dice como se llama en el backend, que es justo lo que le sirve a
 * quien mantiene el sistema para no tener que abrir el controlador.
 */
describe('ACTOS_SIN_CAMPO.campos nombra el campo del backend, no lo deja vacio', () => {
  it.each(Object.entries(ACTOS_SIN_CAMPO))('%s declara al menos un campo', (_opcion, acto) => {
    expect(acto.campos.length).toBeGreaterThan(0);
  });
});
