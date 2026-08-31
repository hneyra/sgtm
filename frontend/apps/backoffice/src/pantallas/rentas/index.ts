import type { Celda, DatosDePantalla } from '@sgtm/api-client';
import { definirConexion } from '../conexiones';
import type { Conexion, ContextoDePantalla } from '../conexiones';
import { parametrosDeBusqueda } from '../busqueda';
import {
  SIN_DATO,
  datosDe,
  estado,
  hoy,
  leerObjeto,
  leerPaginado,
  tablaDe,
  texto,
} from '../seguridad/listado';
import { fechaDeCorteDe, obligacionDeDeuda } from '../consultas';

/**
 * Rentas · Registro, conectado hasta donde llega el backend: **once opciones de quince**.
 *
 * ── La portada del modulo, y por que sigue siendo la generica (#503 F6) ─────
 *
 * El rediseño dibuja como portada el **estado de la emision**: las cinco etapas
 * de la corrida anual y cuatro indicadores. De las nueve cifras, **una** tiene
 * de donde salir —«Contribuyentes en el padron», que es el `totalElementos` de
 * `contribuyentes`—; las etapas viajan **solo en la respuesta del `POST`** que
 * corre la emision (`CorridaPredialResource.etapas`), y los otros tres
 * indicadores salen de esa misma corrida o del panel de recaudacion, que es de
 * otro modulo y mide la municipalidad entera.
 *
 * Una portada con un numero de verdad y siete guiones no es mejor que el hub
 * generico, que al menos lista lo que se puede hacer. Lo que la desbloquea es
 * **una lectura que publique el resumen de la ultima corrida**, y hay una prueba
 * que se pone roja el dia que exista: `panel-del-modulo.test.ts`.
 *
 * `contribuyentes` (#11), `vehiculos` (#26), `declaracion_jurada` (#28), `beneficios` (#27),
 * `arbitrios` (#31), `alta_deuda` (#24), `baja_deuda` (#332), `transferencia_predio` y
 * `transferencia_vehiculo` (#73) ya estaban. Se suman las **tres del predial** (#395), que
 * eran las que #333b anoto como «lo que la capa web de la determinacion tendra que
 * publicar»: `predios_rentas` por su `Conexion` de siempre, y `predial_individual` y
 * `predial_masivo` por una `Adaptacion` —la puerta lateral de un `POST`, ver
 * `determinaciones.ts`—.
 *
 * ── El campo que resuelve, y el que ademas anade (#331, #73) ────────────────
 *
 * `escrituras.ts` no tenia forma de expresar «esto se busca antes de mandarse», y eso bloqueaba
 * cinco opciones. `alta_deuda` lo resolvio primero: el opt-in `resolutores` de `composicion.ts` y
 * `ResolutorDeUnidad` resuelven su «Unidad (predio / placa)» contra `consulta_fichas` y
 * `vehiculos`, que son las dos lecturas que **si publican** el identificador interno
 * —`FichaEncontradaResource.predioId` y `VehiculoResource.id`—.
 *
 * Las dos transferencias necesitaban algo mas, y por eso el mecanismo crecio: no solo resolver
 * un identificador, tambien **anadir un campo que el catalogo no dibuja en absoluto**.
 * `TransferenciaPredioController` y `TransferenciaVehiculoController` exigen
 * **`valorTransferencia`** —`dineroDe` lo pasa por `exigir`, y `Transferencia` lo declara
 * obligatorio— y ninguna de las dos pantallas del manual tiene un campo para el; el prototipo lo
 * dibuja en **otra**, «Impuesto de alcabala» (`valorDeTransferenciaS`), que es justo la que el
 * backend **no** lee para esto. La salida no fue editar el catalogo —`rentas-registro.generado.ts`
 * no se toca a mano— ni inventar el importe con un cero: `pantallas/rentas/ResolutorDeTransferencia.tsx`
 * declara dos controles que **sustituyen** a un campo existente y **anaden** el que falta, con su
 * propia etiqueta —nunca la del campo al que sustituyen, RNF-080—.
 *
 * - En «Transferencia de predio», el control sustituye a «Código predial»: resuelve `predioId`
 *   contra `consulta_fichas` —la misma lectura de `alta_deuda`, sin la mitad «por placa», que
 *   aqui no tiene sentido— y, junto a el, pide el valor. Los dos son el mismo gesto: fijar el
 *   objeto del acto y su valor.
 * - En «Transferencia de vehiculo» no hay ningun identificador que resolver: `placa` viaja tal
 *   cual —`TransferenciaVehiculoController` la resuelve el mismo contra el padron— y **sin
 *   `codTransferente`**, porque el transferente es quien figura hoy como titular y el
 *   controlador lo lee de ahi. El control se cuelga de «Transferente — documento», un campo que
 *   **hoy no llega a ningun sitio** —ninguna de las dos peticiones del controlador lo acepta para
 *   un vehiculo—, y lo sigue dibujando exactamente igual que antes de declararse: no escribible,
 *   porque no lo era.
 *
 * `ACTOS_SIN_CAMPO` de `pantallas/actos.ts` queda **vacia**, y no se borra: es el mecanismo que
 * demostro que un acto puede necesitar un dato que ninguna pantalla del manual dibuja, y es
 * exactamente lo que le pasa hoy a `alcabala` y a `espectaculos` (ver abajo) — solo que sus
 * primarias del catalogo son «Imprimir liquidación», que `DE_SALIDA` reconoce **antes** de llegar
 * a esa lista, asi que hoy se leen como pantallas de consulta y la franja no se ve.
 *
 * `codTransferente`/`codAdquiriente` no se resuelven contra `contribuyentes`: los dos
 * controladores los reciben como **codigos**, no como identificadores internos, y el codigo es
 * exactamente lo que se teclea en «Transferente/Adquirente — documento». El rotulo del prototipo
 * dice «documento» y lo que viaja es un codigo (el ejemplo del prototipo, «44218937», parece un
 * DNI); no se corrige aqui —el catalogo no se edita— y queda anotado en la escritura declarada.
 *
 * **El historico de las transferencias tampoco se puede dibujar todavia**:
 * `TransferenciaRepository.historicoDePredio` existe en el dominio y **ningun controlador lo
 * publica**, asi que no hay `GET` que devuelva quien transfirio, cuando y con que sustento. No se
 * compone de otra lectura: se anota (ADR-0010 §4) y no se dibuja ninguna tabla de historico.
 *
 * ── `alcabala` y `espectaculos`: el mismo hueco, sin salida honesta todavia ─
 *
 * Las dos tienen ya su backend (#32) y las dos tienen el mismo tipo de bloqueo que las
 * transferencias tenian —un dato que el acto exige y que ninguna pantalla puede escribir—, pero
 * en ninguna de las dos hay un campo al que colgar un resolutor: son bloqueos dobles.
 *
 * - `alcabala` pide `transferenciaId` (el identificador interno de una `Transferencia` **ya
 *   registrada**) y `autoavaluoAjustado`. El primero **no es resoluble**: ninguna operacion del
 *   contrato lista transferencias —`POST /rentas/transferencias/predio` la crea y no hay ningun
 *   `GET` que la devuelva—, asi que no hay lectura contra la que resolver, ni campo del prototipo
 *   que lo pida (su unico campo de texto libre, «Nº de expediente», no es ese identificador). El
 *   segundo **si tiene el campo mas cercano** —`autovaluoAjustadoS`— pero el catalogo lo dibuja
 *   `"ro"` (solo lectura, `Campo.tsx` lo bloquea siempre, sin importar lo que declare
 *   `escrituras.ts`), mientras que `AlcabalaController` lo pide como **dato de entrada**: su
 *   propio javadoc dice que «quien complete esta pantalla lo trae ya calculado», porque el ajuste
 *   por el IPM no esta resuelto todavia (D-11). El campo que si es de texto libre en esta
 *   pantalla, `valorDeTransferenciaS`, es el que el backend **no** lee.
 * - `espectaculos` pide `organizadorId` —resoluble, en principio: `ContribuyenteResource` publica
 *   `id`, y «Organizador» es un campo de texto que podria colgar un resolutor contra
 *   `contribuyentes`— e `ingresoDeclarado`, que **no lo es**: el catalogo dibuja
 *   `recaudacionDeclaradaS` `"ro"`, esperando que el servidor lo componga de aforo por precio, y
 *   `EspectaculoController.registrar` lo pide como argumento obligatorio, sin componerlo. Resolver
 *   solo `organizadorId` no desbloquea nada —el acto sigue sin poder registrarse sin el ingreso—,
 *   asi que no se construye el resolutor mientras el otro campo siga cerrado.
 *
 *   En las dos, y a diferencia de las transferencias, el campo mas cercano que el catalogo dibuja
 *   ya esta **ocupado por otro dato** (`"ro"`, o el valor que el backend no lee): no hay un campo
 *   «vacio de significado» al que anadirle uno nuevo sin volver a mentir sobre lo que muestra. Se
 *   anota y no se puentea (ADR-0010 §4); conectarlas sigue siendo rellenar un formulario, confirmar
 *   un acto irreversible y recibir un 422 por un campo que no se puede escribir.
 *
 * ── (#432) Las dos preguntas de `alcabala`, contestadas ─────────────────────
 *
 * #432 no pedia codigo primero: pedia **responder dos preguntas por escrito**, porque de la
 * segunda depende si esta opcion se puede cerrar hoy. Aqui estan, contestadas contra el catalogo
 * portado y contra el controlador, no de memoria.
 *
 * **1. ¿De donde sale `transferenciaId`?** De la transferencia ya registrada —no hay otra fuente:
 * `RegistrarAlcabala.determinar` la busca por su identificador y de ella toma el predio, el
 * adquiriente, la fecha y el valor de transferencia—. Pero **no de una lectura**, que es lo que el
 * issue daba por hecho: el contrato **no tiene ningun `GET` de transferencias**; lo que declara es
 * `POST /rentas/transferencias/predio` y `.../vehiculo`, y `/fiscalizacion/transferencias`, que es
 * otra cosa (la transferencia a rentas de un resultado fiscalizado). Sale de otro sitio:
 *
 *   de la respuesta   `TransferenciaResource` —lo que devuelve el `POST` que la interfaz **ya
 *   del propio acto   llama**, porque `transferencia_predio` declara su escritura desde #73—
 *                     publica `id` y `afectaAlcabala`. Liquidar la alcabala de una transferencia
 *                     **recien registrada** no necesita ninguna lectura nueva: necesita que las
 *                     dos pantallas sean una sola superficie, que es lo que propone
 *                     `design/propuestas/rentas-superficies` (propuesta B, «el acto de
 *                     transferencia con su alcabala dentro»)
 *   de una lectura    liquidar la de **otro dia** si la necesita, y no existe:
 *   que falta         `TransferenciaRepository` tiene `findById` e `historicoDePredio(predioId)` y
 *                     **ningun controlador los publica**. Eso es backend, no interfaz
 *
 * Asi que la pregunta del issue —«¿se convierte `alcabala` en una pantalla con grilla?»— **se
 * contesta que no**: la grilla exigiria la lectura que no hay, y el camino que si esta disponible
 * no es una grilla sino una superficie compartida. Y ninguno de los dos se hace todavia, porque la
 * pregunta 2 deja la pantalla sin poder liquidar aunque la transferencia se resuelva.
 *
 * **2. ¿El autovaluo ajustado lo teclea alguien o lo determina el sistema?** Lo determina el
 * sistema, y el catalogo lo dice sin ambiguedad: dibuja **la cuenta entera**, tres campos
 * seguidos y los tres `"ro"` —«Autovalúo del predio (S/)», «IPM aplicado», «Autovalúo ajustado
 * (S/)»—. Un campo de solo lectura cuyo vecino de arriba es su operando no es un campo de entrada
 * mal marcado: es un resultado.
 *
 * Y **no viene del papel de la transferencia**, que es la otra rama que el issue planteaba. Lo que
 * trae la escritura publica es el *valor de transferencia*, y ese si esta dibujado editable
 * (`valorDeTransferenciaS`, `"text"`). El autovaluo del predio es del padron de la municipalidad y
 * el indice lo publica el INEI: ninguno de los dos los conoce quien liquida en ventanilla.
 *
 * Por eso **abrir el campo seria peor que dejarlo cerrado**: el TUO LTM art. 24 manda tomar **el
 * mayor** entre el valor de transferencia y el autovaluo ajustado, asi que teclear un autovaluo
 * bajo elige la base y baja el impuesto, con una cifra indistinguible de la correcta. Es el mismo
 * defecto que #51 midio con la tasa por omision —«un valor inventado no cobra de mas, perdona de
 * mas»—, solo que aqui lo inventaria quien liquida. `"ro"` **esta bien puesto** (RNF-080): no se
 * abre.
 *
 * **Consecuencia, que es lo que #432 pedia saber: `alcabala` se queda esperando.** Las dos piezas
 * de esa cuenta faltan, y cada una por su lado:
 *
 *   el autovaluo     el sistema no sabe valorizar un predio todavia —faltan el cuadro de valores
 *   del predio       unitarios y la depreciacion (GOB-03 H-14/H-15) y los aranceles (D-02b)—, asi
 *                    que #395 lo dejo **declarado** en la peticion del predial y guardado en
 *                    `determinacion_predio_detalle`. Existe cuando hay determinacion del
 *                    ejercicio, y **ninguna lectura lo publica**
 *   el indice del    TUO LTM art. 24 lo nombra —IPM de Lima Metropolitana del INEI— asi que tiene
 *   art. 24          fuente; lo que no tiene es archivo del corpus ni fila del derivado
 *                    publicable, que es el camino de #188. Mientras no este, **no se aplica**:
 *                    inventarlo es exactamente lo que CLAUDE.md prohibe de los factores que
 *                    multiplican importes
 *
 * **Y un hallazgo del cotejo, que no es de interfaz**: `AlcabalaController` pide
 * `autoavaluoAjustado` **ya multiplicado** en el cuerpo —su javadoc lo dice: «quien complete esta
 * pantalla lo trae ya calculado»—, o sea que traslada el factor a quien liquida. La forma honesta
 * es la que #399 dejo para `minimoImponible`: el autovaluo se **declara** (como en el predial) y el
 * ajuste sale del conjunto sellado, con 422 nombrando la llave que falte. Es backend y es de las
 * cifras (#188/#194); se anota aqui y no se cambia desde la interfaz.
 *
 * ── (#432) Y la de `espectaculos`, que es otra ──────────────────────────────
 *
 * Los dos datos que le faltan no se parecen a los de la alcabala, y por eso su franja tampoco lo
 * dice igual:
 *
 * - **`organizadorId` es resoluble**, y es la forma 1 de #422 —el dato lo teclea quien atiende y
 *   solo falta el control—: «Organizador» es texto libre y `ContribuyenteResource` publica `id`.
 * - **`ingresoDeclarado` no lo es.** El catalogo dibuja `nDeEntradasVendidas` y `precioPromedioS`
 *   editables y `recaudacionDeclaradaS` `"ro"`: otra vez la cuenta dibujada entera. Pero aqui el
 *   resultado **no lo compone nadie**: la interfaz no puede —una cifra de dinero no se compone en
 *   la pantalla (RNF-083), y la regla de ESLint lo impide— y `RegistrarEspectaculo` lo recibe ya
 *   hecho. Abrirlo tampoco vale: dejaria teclear una recaudacion que no cuadra con las entradas y
 *   el precio que estan encima, sin que nada lo compare.
 *
 * Resolver solo el organizador no desbloquea nada —el acto sigue sin poder registrarse—, asi que
 * las dos se quedan en `ACTOS_SIN_CAMPO` con su motivo, y lo que #432 cambia es **lo que la franja
 * cuenta**: el dato, dicho para quien atiende, y no el nombre del campo del backend.
 *
 * **Y quien tiene que componer la recaudacion declarada, que era lo que quedaba por decidir.**
 * No la interfaz, y no por comodidad: una cifra de dinero no se compone en la pantalla (RNF-083,
 * con su regla de ESLint), y aunque se pudiera, esa multiplicacion **es la base imponible del
 * art. 56**, que trae ademas su propio minimo —«cuando el valor de la entrada incluye otros
 * servicios, la base imponible no podra ser inferior al 50 % de ese valor total»
 * (`valores-normativos/espectaculos.md` §1)—. Una regla tributaria no vive en un componente de
 * React (regla 6).
 *
 * Le toca al **backend**, y con la forma que #399 ya dejo probada para `minimoImponible`: la
 * peticion recibe los **dos operandos** —las entradas vendidas y el valor de la entrada— y el
 * dominio compone la base, con el minimo del art. 56 aplicado donde se puede comprobar. Hoy
 * `PeticionDeEspectaculo` **no tiene ni campo para las entradas vendidas** y
 * `RegistrarEspectaculo.registrar` recibe `ingresoDeclarado` ya hecho, asi que esto es trabajo de
 * backend y de la decision normativa que lo acompana, no de esta pantalla.
 *
 * ── (#432) Y una tercera cosa, que no estaba en el issue y bloquea igual ────
 *
 * **La alicuota del espectaculo tiene tres vocabularios para lo mismo**, y es el hueco de #192
 * —publicar bajo un nombre que nadie pide se ve igual que no publicar— multiplicado por tres:
 *
 *   el desplegable   CONCIERTO DE MÚSICA POPULAR · ESPECTÁCULO TAURINO · CARRERA DE CABALLOS ·
 *   del prototipo    DISCOTECA · CINE · TEATRO · FOLCLORE NACIONAL
 *   el corpus        `ESPECTACULO_ALICUOTA-<codigo>`: `TAURINO-SUPERIOR-0.5-UIT`,
 *   (VERIFICADO)     `TAURINO-RESTO`, `CARRERAS-CABALLOS`, `CINEMATOGRAFICO`, `MUSICA-GENERAL`,
 *                    `FOLCLOR-TEATRO-ZARZUELA-OPERA-BALLET-CIRCO`, `OTROS`
 *   el backend       `ALICUOTA_ESPECTACULO:<el literal del desplegable en mayusculas>`
 *
 * Y dos de las diferencias **no se arreglan traduciendo**: «DISCOTECA» no es ninguna de las siete
 * categorias del art. 57 —seria «otros espectaculos», 10 %, y eso es una **calificacion**, no una
 * equivalencia—; y el espectaculo taurino tiene **dos** alicuotas segun si el valor promedio
 * ponderado de la entrada supera el 0.5 % de la UIT, condicion que `RegistrarEspectaculo` no puede
 * expresar porque lee **una** llave por tipo. `espectaculos.md` §3 ya lo dice: «decidir cual de las
 * dos aplica exige conocer el precio de sus entradas — eso es logica de liquidacion, no un valor
 * transcribible». Ninguna fila de `publicacion/parametros-2026.csv` publica todavia esta alicuota.
 *
 * ── (#432) Lo unico que si se pudo cerrar aqui: los cuatro filtros ──────────
 *
 * `espectaculos` dibuja cuatro filtros —«Nº de expediente», «Organizador», «Desde», «Hasta»— que
 * **no filtran nada**: su unica operacion es el `POST` que registra, el controlador no lee ninguno
 * de los cuatro, y ninguna lectura del contrato lista los espectaculos declarados, asi que la
 * tabla que el prototipo dibuja debajo no se llena con nada. Estaban **vivos**: elegir cualquiera
 * cambiaba la URL y no cambiaba nada mas. Se bloquean con su motivo
 * (`rentas/composicion.ts` + `prosa-textos.ts`), como los de `consulta_fichas` (#322) y los de los
 * dos resumenes de transito (#398). `alcabala` no necesita lo mismo: su catalogo no dibuja ninguno.
 *
 * ── (#399) El calculo vehicular, que estaba fuera por un desacuerdo de transporte ─
 *
 * - `vehicular_calculo`: **conectado desde #399, y lo que hubo que mover fue el controlador.**
 *   `VehicularController` leia `placa`, `codContribuyente`, `vehiculoId`, `ejercicio`,
 *   `minimoImponible` y `simulacion` del **cuerpo**, y `sgtm-v1.yaml` declara los tres primeros
 *   como parametros de **consulta** (#333c). Los filtros de una pantalla viajan por la URL, nunca
 *   por el cuerpo (`bloques/Filtros.tsx`), asi que la peticion salia con los tres en la URL y el
 *   controlador los leia nulos: la operacion figuraba en `IMPLEMENTADAS` y ninguna pantalla podia
 *   llamarla. Se corrigio el controlador —lee los tres de la consulta y sigue aceptandolos en el
 *   cuerpo, igual que `PredialController` desde #395— y no el contrato, porque el contrato esta
 *   derivado del prototipo y los tres salen de sus `filtros` (#312). `minimoImponible` **se fue
 *   del cuerpo**: es una cifra normativa —el 1.5 % de la UIT del art. 34— y sale del conjunto
 *   sellado; sin ella la operacion responde 422 nombrando `VEHICULAR_MINIMO`. Su lectura vive en
 *   `determinaciones.ts` y llena cuatro de las seis columnas de su tabla; las otras dos y la banda
 *   de totales se quedan en «—», con su motivo escrito ahi.
 *
 * ── (#393) El expediente predial, y por que solo una de sus seis secciones se compone ─
 *
 * La propuesta C de #393 reunia bajo un solo contribuyente las seis secciones que
 * hoy se abren de una en una: predios, declaracion jurada, determinacion,
 * arbitrios, beneficios y movimientos de deuda. El sitio donde se compone ya
 * existe —la **ficha 360°** (ADR-0016 §2), que es composicion de navegacion y no
 * una pantalla que absorba a las demas: cada seccion conserva su ruta, su
 * operacion y su permiso—, asi que no hace falta ninguna opcion nueva.
 *
 * De las seis, **una** se puede componer por contribuyente hoy, y se compuso:
 *
 *   `beneficios`   `GET /rentas/beneficios?contribuyente=` — el filtro esta en
 *                  el contrato y en el `Resource`. Es ademas la que mas se
 *                  pregunta en ventanilla de las que faltaban: si le corre la
 *                  deduccion de 50 UIT decide lo que se le cobra
 *
 * Las otras cinco no, y ninguna por descuido:
 *
 *   predios        **ya esta en la ficha**, por `consulta_predios`, que es la
 *                  lectura de Consultas que la ficha ya componia. Anadir
 *                  `predios_rentas` —que desde #395 si tiene `Controller` y si
 *                  esta conectada— seria una segunda pestaña de lo mismo: las
 *                  dos leen los predios de un contribuyente, y la de Consultas
 *                  ademas publica su deuda
 *   `declaracion_jurada`  su ruta lleva el numero de la declaracion en el
 *                  **camino** —`GET /rentas/declaraciones/{djNro}`— y una ficha
 *                  abierta por contribuyente no lo tiene. Sin `djNro` no hay
 *                  peticion que hacer; con uno inventado, se ensenaria la
 *                  declaracion de otro
 *   determinacion  no hay **lectura**: su operacion es un `POST`, y un `POST`
 *                  no se pide al abrir una ficha. Desde #395 el controlador
 *                  existe y la pantalla lo pide cuando alguien lo pulsa, que
 *                  es un gesto y no una composicion
 *   `arbitrios`    su contrato **no tiene filtro por contribuyente**: se
 *                  pregunta por ejercicio, codigo predial, zona y uso. Componer
 *                  por predio exigiria elegir cual de los suyos, que es otra
 *                  pantalla; y declarar un filtro que el backend no tiene seria
 *                  inventar contrato (ADR-0010 §4)
 *   altas y bajas  **ya estan en la ficha**, dentro de las seis rejillas de la
 *                  unificada, y ademas son escrituras: ninguna sale de la ficha
 *                  (ADR-0016 §2)
 *
 * Lo que falta para las cinco es backend o contrato, no interfaz, y por eso se
 * anota aqui en vez de puentearse.
 *
 * ── (#395) El predial, conectado, y lo que de el sigue sin poder dibujarse ─
 *
 * Las tres operaciones que #333b pedia existen ya, y las tres estan conectadas. Lo que
 * **no** llega con ellas, opcion por opcion:
 *
 * - `predios_rentas` (`GET /rentas/predios`). `PredioDeRentasResource` **no publica el
 *   autovaluo del predio ni su area construida, y es a proposito**: el sistema no sabe
 *   valorizar un predio todavia (D-11, y los dos cuadros que GOB-03 no puede cargar). Las
 *   dos columnas que el prototipo dibuja para eso —«Const. m²» y «Autovalúo S/»— salen con
 *   «—», y componerlas aqui seria inventarse la cifra sobre la que se cobra. Las dos
 *   secciones de campos de la pantalla —«Datos del predio» y «Valuación»— tampoco se
 *   llenan: la operacion es un padron paginado, no la ficha de un predio, y el catalogo no
 *   declara ningun parametro de ruta con el que pedir uno. `sector` viaja como filtro
 *   —el contrato lo declara y el controlador lo lee— aunque el recurso lo publique nulo
 *   para todas sus filas en el proxy: filtrar es del servidor (ADR-0010).
 * - `predial_individual` (`POST /rentas/predial/calculo-individual`). Se conecta como
 *   **simulacion**, que es la unica mitad de la operacion que la pantalla puede pedir hoy:
 *   el cuerpo lleva `simulacion: true` y el backend calcula sin asentar nada. Asentar la
 *   determinacion —`simulacion: false`— exige ademas la observacion del usuario (regla 10)
 *   y una lista blanca en `escrituras.ts`, y eso es otro issue: la primaria «Calcular»
 *   sigue apagada con su franja `sin-determinacion`. La seccion «Beneficios aplicados» se
 *   queda entera en «—»: el recurso no publica la deduccion, ni la resolucion, ni la
 *   inafectacion, ni el monto deducido.
 * - `predial_masivo` (`POST /rentas/predial/calculo-masivo`). Lo mismo, y con dos huecos
 *   propios. El primero: `CorridaPredialResource` **no publica ningun sujeto**, asi que la
 *   banda de la determinacion no se dibuja en esta pantalla — el sujeto de una corrida
 *   masiva no es un registro sino un alcance, y redactarlo aqui a partir de `alcance` y
 *   `ejercicio` es exactamente lo que `DatosDeDeterminacion.sujeto` existe para impedir. El
 *   segundo: de los ocho campos de «Parámetros del proceso» solo dos vienen en el recurso
 *   —el ejercicio y el alcance—; `uitDelEjercicioS` es el que mas se echa de menos y el que
 *   menos se puede componer, porque la UIT de un ejercicio vive en el conjunto sellado y
 *   esta respuesta trae el **nombre** del conjunto, no su contenido. Y la lista de
 *   observados, que su tercera accion promete, tampoco: el recurso la publica, pero el
 *   catalogo no reserva ninguna tabla ni ningun panel donde ensenarla.
 */

/** El registro que abre la ficha o la declaracion. Sin el no hay peticion. */
const registro = ({ ruta }: ContextoDePantalla): string => ruta['codigo'] ?? '';

/**
 * El padron de contribuyentes.
 *
 * Ocho columnas para un recurso que publica seis campos. Las dos que faltan son
 * las que mas se miran —**cuantos predios tiene y cuanto debe**— y las dos salen
 * vacias a proposito: los predios los tiene `catastro` y la deuda es
 * `deudaActualizadaA(fecha)` (#22), que no existe todavia. Componer aqui
 * cualquiera de las dos seria inventarse la respuesta a «¿cuanto debo?», que es
 * la pregunta que trae a la gente a la ventanilla.
 */
const contribuyentes = definirConexion({
  operacion: 'contribuyentes',
  parametros: ({ ruta, busqueda }) =>
    parametrosDeBusqueda('contribuyentes', ruta['codigo'], busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'los contribuyentes'),
  adaptar: (paginado) =>
    datosDe(
      tablaDe(
        paginado,
        (contribuyente): readonly Celda[] => {
          // El documento viaja como tipo y numero; la pantalla tiene una
          // columna para cada tipo, asi que el numero va a la que le toca.
          const esRuc = contribuyente['tipoDocumento'] === 'RUC';
          const numero = texto(contribuyente['numeroDocumento']);
          return [
            estado(contribuyente['activo'], 'A', 'I'),
            { texto: texto(contribuyente['codigo']) },
            { texto: texto(contribuyente['nombreRazonSocial']) },
            { texto: esRuc ? SIN_DATO : numero },
            { texto: esRuc ? numero : SIN_DATO },
            // El domicilio fiscal es #15; los predios, de catastro; la deuda,
            // de #22. Ninguna se compone aqui.
            { texto: SIN_DATO },
            { texto: SIN_DATO },
            { texto: SIN_DATO },
          ];
        },
        'contribuyentes',
      ),
    ),
});

/**
 * Ficha de vehiculo (RF-024, #26). `VehiculoResource` es registro puro: ni el valor
 * referencial, ni el impuesto, ni el titular con nombre —solo `contribuyenteId`, y unir con
 * `contribuyentes` no es cosa de este endpoint—. De las mas de cuarenta claves que el prototipo
 * dibuja en sus seis pestanas, ocho tienen de donde salir; el resto sale con «—», que es lo que
 * distingue «no llego» de «vale cero».
 *
 * `categoria` (M1/M2/M3...) es la unica que podria confundirse con `clase`
 * (AUTOMOVIL/CAMIONETA...): el dominio solo guarda `categoria`, asi que es la que se usa y
 * `clase` se deja sin dato en vez de adivinar cual de las dos es.
 *
 * El historial de placas que trae `ConsultaDeVehiculos` no se dibuja: el catalogo no reserva
 * una tabla para el en esta pantalla —la unica `tabla` declarada es «Vehiculos encontrados», el
 * resultado de una busqueda que este endpoint (por placa unica) no hace—. Anadirla ahi mostraria
 * un historial de cambios de placa bajo un titulo que dice otra cosa.
 */
const vehiculos = definirConexion({
  operacion: 'vehiculos',
  parametros: (contexto) => ({ placa: registro(contexto) }),
  leer: (cuerpo) => leerObjeto(cuerpo, 'el vehiculo'),
  adaptar: (vehiculo): DatosDePantalla => ({
    // Registro puro (#26): ninguna cifra que fechar. hoy() es el mismo recurso
    // que usa `contribuyentes` para el mismo motivo (ver su doc en listado.ts).
    fechaCalculo: hoy(),
    campos: {
      placa2: texto(vehiculo['placa']),
      anoDeFabricacion: texto(vehiculo['anioFabricacion']),
      marca: texto(vehiculo['marca']),
      modelo: texto(vehiculo['modelo']),
      categoria: texto(vehiculo['categoria']),
      nroDeMotor: texto(vehiculo['numeroMotor']),
      nroDeSerie: texto(vehiculo['numeroSerie']),
    },
  }),
});

/**
 * Los predios del contribuyente (RF-021, #395).
 *
 * `PredioDeRentasResource` es registro de padron: codigo de referencia catastral, tipo,
 * direccion, uso, sector, area de terreno, `%` de propiedad y condicion. **No publica el
 * autovaluo del predio ni su area construida, y es a proposito**: el sistema no sabe
 * valorizar un predio todavia (D-11, GOB-03), asi que las dos columnas que el prototipo
 * dibuja para eso salen con «—».
 *
 * Y son justo las dos que mas se miran, asi que conviene decir por que no se componen:
 * el area construida esta en `construccion` de la ficha catastral —otro modulo, otra
 * operacion— y sumarla aqui daria un numero que no es el que uso la determinacion; y el
 * autovaluo **es** la determinacion, que se pide en la pantalla de al lado y con su
 * conjunto sellado (RNF-083, `ARQ-09` §3). Un autovaluo compuesto en la interfaz seria una
 * cifra parecida a la que se cobra y ninguna regla la sostendria.
 *
 * `exige` el contribuyente por lo mismo que `baja_deuda`: sin el, `PrediosDeRentasController`
 * contesta **una pagina vacia**, y una tabla vacia se lee como «este contribuyente no tiene
 * predios», que es exactamente lo contrario de lo que pasa. Lo que hay que decir ahi es que
 * se busque a alguien.
 *
 * La condicion se dibuja como texto y sin tono: «Afecto», «Inafecto», «Exonerado» y
 * «Transferido» no se reparten en bueno y malo —un predio exonerado no esta mal— y
 * pintarlos de colores seria una lectura que el dominio no hace.
 */
const predios_rentas = definirConexion({
  operacion: 'predios_rentas',
  parametros: ({ ruta, busqueda }) =>
    parametrosDeBusqueda('predios_rentas', ruta['codigo'], busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'los predios del contribuyente'),
  exige: [
    {
      parametro: 'codContribuyente',
      titulo: 'Busca un contribuyente para ver sus predios',
      detalle:
        'El padrón predial se lee por contribuyente: escribe su código arriba y pulsa «Buscar». Sin él la respuesta vendría vacía, y una tabla vacía aquí se leería como «no tiene predios».',
    },
  ],
  adaptar: (paginado) =>
    datosDe(
      tablaDe(
        paginado,
        (predio): readonly Celda[] => [
          { texto: texto(predio['codigoReferenciaCatastral']) },
          { texto: texto(predio['direccion']) },
          { texto: texto(predio['uso']) },
          { texto: texto(predio['areaTerreno']) },
          // Area construida y autovaluo: ver el doc de arriba. No llegan, y no
          // se componen.
          { texto: SIN_DATO },
          { texto: texto(predio['porcentajePropiedad']) },
          { texto: SIN_DATO },
          { texto: texto(predio['condicion']) },
        ],
        'predios',
      ),
    ),
});

/**
 * Declaracion jurada (RF-023, #28). `GET /rentas/declaraciones/{djNro}?ano=` trae **una**
 * declaracion, mientras que el prototipo dibuja «Declaraciones presentadas» como si fuera un
 * padron entero de resultados —el mismo desajuste que #175 encontro y reescribio en
 * `consulta_deuda`—. Aqui no se reescribe el contrato (no es este issue): la unica declaracion que
 * el backend puede traer se dibuja como una tabla de **una fila**, con lo que el recurso
 * publica; contribuyente y predios no estan en `DeclaracionJuradaResource` y salen con «—».
 *
 * El bloque «Formularios a emitir» (HR/PU/PR, ejemplares, OpenOffice) no son datos que esta
 * pantalla lea: son casillas de una accion de impresion, y esta conexion es de solo lectura.
 */
const declaracion_jurada = definirConexion({
  operacion: 'declaracion_jurada',
  parametros: (contexto) => {
    const ano = contexto.busqueda.get('ano') ?? '';
    return { djNro: registro(contexto), ...(ano === '' ? {} : { ano }) };
  },
  leer: (cuerpo) => leerObjeto(cuerpo, 'la declaracion jurada'),
  adaptar: (dj): DatosDePantalla => {
    const fechaPresentacion = texto(dj['fechaPresentacion']);
    return {
      // La fecha de la propia declaracion, si la trajo; hoy() solo si no.
      fechaCalculo: fechaPresentacion === SIN_DATO ? hoy() : fechaPresentacion,
      tabla: {
        filas: [
          [
            { texto: texto(dj['numero']) },
            { texto: texto(dj['ejercicio']) },
            // Ni el contribuyente ni el conteo de predios salen de este recurso.
            { texto: SIN_DATO },
            { texto: texto(dj['tipo']) },
            { texto: fechaPresentacion },
            { texto: SIN_DATO },
            // El valuo afecto es D-02: depende de la determinacion, no de la DJ.
            { texto: SIN_DATO },
            { texto: texto(dj['estado']) },
          ],
        ],
        conteo: '1 declaración',
      },
    };
  },
});

/**
 * Beneficios y exoneraciones (RF-029, #27). Solo lectura: el alta y el cese de
 * `RegistrarBeneficio` no tienen `POST` en el contrato todavia —lo dice el propio
 * `BeneficioController`—, asi que «Solicitud de beneficio» no se puede escribir aqui.
 *
 * `Expediente`/`Resolucion` no son dos campos en `Beneficio`: el dominio solo guarda
 * `documentoOrigen` (con que se registro) y `baseLegal` (que lo sustenta). Van ahi, que es lo mas
 * cerca que hay, y no a un tercer campo que el recurso no tiene.
 *
 * `Estado` tampoco es una columna del recurso: se deriva de `vigenciaHasta` —nulo es vigente,
 * con fecha es cesado—, que son los dos unicos estados que el dominio modela. «EN TRAMITE» y
 * «DENEGADO» son del catalogo de un flujo de aprobacion que `Beneficio` no tiene: cada fila que
 * llega aqui ya fue registrada, no esta pendiente de nada.
 */
const beneficios = definirConexion({
  operacion: 'beneficios',
  parametros: ({ busqueda }) => parametrosDeBusqueda('beneficios', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'los beneficios'),
  adaptar: (paginado) =>
    datosDe(
      tablaDe(
        paginado,
        (beneficio): readonly Celda[] => {
          const vigenciaHasta = beneficio['vigenciaHasta'];
          const vigente = vigenciaHasta === null || vigenciaHasta === undefined;
          const vigencia = vigente
            ? `Desde ${texto(beneficio['vigenciaDesde'])}`
            : `${texto(beneficio['vigenciaDesde'])} — ${texto(vigenciaHasta)}`;
          const porcentaje = beneficio['porcentaje'];
          const monto = beneficio['monto'];
          const deduccion =
            typeof porcentaje === 'string'
              ? `${porcentaje}%`
              : typeof monto === 'string'
                ? `S/ ${monto}`
                : SIN_DATO;
          return [
            { texto: texto(beneficio['documentoOrigen']) },
            // contribuyenteId es un identificador interno, no el codigo del
            // contribuyente: mostrarlo confundiria a quien lee la columna.
            { texto: SIN_DATO },
            { texto: texto(beneficio['tipo']) },
            { texto: texto(beneficio['baseLegal']) },
            { texto: vigencia },
            { texto: deduccion },
            estado(vigente, 'VIGENTE', 'CESADO'),
          ];
        },
        'beneficios',
      ),
    ),
});

/**
 * Arbitrios municipales (RF-022, #31). `GET /rentas/arbitrios?anio=&ejercicio=&codigoPredial=&zona=&uso=`
 * trae un padron paginado de `CuotaDeArbitrio` —una fila por servicio y mes—, no una fila por
 * servicio con su tasa mensual y su anual ya sumado como dibuja «Determinacion por servicio»: por
 * eso solo dos de las seis columnas del catalogo salen de `ArbitrioResource` (`servicio`, y
 * `monto` en «Tasa mensual», que es literalmente eso —la cuota de un mes—). `criterioDeDistribucion`,
 * `frecuencia`, `anualS` y `condicion` no estan en el recurso, y componer el anual sumando doce
 * cuotas es justo lo que RNF-083 prohibe: se dejan en `SIN_DATO`.
 *
 * `zona` y `uso` viajan porque el contrato los declara como filtro de esta pantalla, pero
 * `ArbitriosController` todavia no los lee (solo `anio` y `codigoPredial`) — un filtro que el
 * backend no aplica todavia, no uno que esta pantalla se inventa (ADR-0010).
 */
const arbitrios = definirConexion({
  operacion: 'arbitrios',
  parametros: ({ busqueda }) => parametrosDeBusqueda('arbitrios', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'los arbitrios'),
  adaptar: (paginado) =>
    datosDe(
      tablaDe(
        paginado,
        (cuota): readonly Celda[] => [
          { texto: texto(cuota['servicio']) },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
          { texto: texto(cuota['monto']) },
          { texto: SIN_DATO },
          { texto: SIN_DATO },
        ],
        'cuotas de arbitrio',
      ),
    ),
});

/**
 * La deuda que se puede dar de baja (RF-044, #332).
 *
 * **Es la unica conexion del sistema cuya operacion no se llama como su opcion**, y esa
 * excepcion tiene un motivo concreto: la operacion de `baja_deuda` es un `POST`, y una
 * operacion que escribe no se pide al abrir la pantalla —abrir «Baja de deuda» no puede dar
 * de baja nada—. Su tabla se quedaba por tanto vacia para siempre, y la columna de seleccion
 * que el prototipo dibuja no tenia sobre que actuar.
 *
 * Lo que se lee es `GET /consultas/deuda`, que es **exactamente** lo que la pantalla necesita:
 * las obligaciones pendientes de un contribuyente, con su desglose calculado por el backend a
 * una fecha de corte (#22, #175). No es un dato inventado ni un cruce de dos respuestas: es la
 * misma deuda, publicada por la unica operacion que la publica.
 *
 * **Depende de un permiso que no es el suyo, y hay que decirlo** (#332): quien tenga «Baja de
 * deuda» y no tenga **lectura sobre «Consulta de deuda»** recibe un 403 al abrir la pantalla.
 * No es un caso raro: son dos opciones distintas del catalogo, con dos permisos distintos, y el
 * manual las reparte en dos modulos. Sin nombrarlo, el sintoma es una tabla vacia y muda —«no
 * hay deuda»—, que es exactamente lo contrario de lo que pasa. Por eso esta conexion declara su
 * propio `sinPermiso`: el aviso dice **cual** permiso falta, no «no tienes permiso».
 *
 * Lo que no viaja, y por que:
 *
 * - `ano` y `tributo` (los otros dos filtros de la pantalla): `consulta_deuda` no los declara
 *   como parametros, y `parametrosDeBusqueda` no manda lo que el contrato no declara
 *   (ADR-0010). Se quedan en la URL hasta que el backend decida su semantica.
 * - `Unidad` (el predio o la placa de la fila): `ObligacionDeDeudaResource` publica el
 *   identificador interno, no el codigo catastral ni la placa. Ensenar un identificador
 *   interno en la columna que dice «Unidad» seria ensenar otra cosa con ese rotulo.
 *
 * Pero **el identificador si viaja**, y por `valores` en vez de por una columna: `ClaveDeSaldo`
 * lo compara con igualdad exacta —(contribuyente, tributo, ejercicio, periodo, predioId,
 * vehiculoId)—, asi que una baja sin el no senala a la obligacion que se eligio, sino a la que
 * ese contribuyente tenga **sin unidad**. Es la diferencia entre extinguir la cuota que se marco
 * y extinguir otra. Los importes van por el mismo camino y por un motivo hermano: la celda dice
 * «1,842.60» y `new BigDecimal` con la coma dentro lanza.
 *
 * La primera celda va vacia a proposito: es la columna de la casilla, y la dibuja
 * `TablaDePantalla` cuando la opcion declara seleccion (`rentas/composicion.ts`).
 */
const baja_deuda = definirConexion({
  operacion: 'consulta_deuda',
  /* **La deuda se lee a la fecha del acto, no a la de hoy** (regla 9, y #337).
     `fechaValor` de la baja es la fecha de la resolucion, y el backend valida
     `deudaActualizadaA(fechaValor)` contra el insoluto y el interes que se
     mandan (`RegistrarMovimientoDeDeuda`). Con la tabla leida a hoy —que es lo
     que pasaba, porque la pantalla no mandaba fecha de corte— y una resolucion
     anterior —que es lo normal: primero se resuelve y despues se registra—, el
     interes que viaja es **mayor** que el que el backend calcula a esa fecha, y
     la baja vuelve como 422 despues de confirmar un acto irreversible.
     Mandando la fecha, lo que se ve y lo que se manda son de la misma fecha. */
  parametros: ({ busqueda, borrador }) => {
    const fechaDeCorte = (borrador['fechaDeResolucion'] ?? '').trim();
    return {
      ...parametrosDeBusqueda('consulta_deuda', undefined, busqueda),
      // Solo cuando esta escrita entera: el campo se teclea, y una fecha a
      // medias («2026-0») es un 400 por cada pulsacion.
      ...(FECHA_ISO.test(fechaDeCorte) ? { fechaDeCorte } : {}),
    };
  },
  leer: (cuerpo) => leerPaginado(cuerpo, 'la deuda del contribuyente'),
  /* Sin contribuyente no hay deuda que leer: `codContribuyente` es
     `@RequestParam` obligatorio de `GET /consultas/deuda`, asi que abrir la
     pantalla sin buscar a nadie es un 400 contra el backend real —el proxy lo
     tapa porque contesta igual—. Lo que hay que decir ahi no es el 400. */
  exige: [
    {
      parametro: 'codContribuyente',
      titulo: 'Busca un contribuyente para ver su deuda',
      detalle:
        'La baja se registra sobre la cuenta corriente de un contribuyente: escribe su código arriba y pulsa «Buscar». Hasta entonces no hay ninguna cuota que elegir.',
    },
  ],
  sinPermiso: {
    titulo: 'Falta el permiso de lectura de «Consulta de deuda»',
    detalle:
      'Para elegir las cuotas hace falta lectura de «Consulta de deuda»: la tabla de aquí es la deuda del contribuyente, y esa la publica esa otra opción. Pídesela al administrador del sistema de tu municipalidad.',
  },
  adaptar: (paginado): DatosDePantalla => ({
    // Toda cifra con su fecha de calculo (regla 9, RNF-075): la de corte con que
    // el backend actualizo el interes, no la del reloj del navegador.
    fechaCalculo: fechaDeCorteDe(paginado.contenido),
    tabla: tablaDe(
      paginado,
      (obligacion): readonly Celda[] => {
        const leida = obligacionDeDeuda(obligacion);
        return [
          { texto: '' },
          { texto: leida.ejercicio },
          { texto: SIN_DATO },
          { texto: leida.cuota },
          { texto: leida.tributo },
          { texto: leida.insoluto },
          { texto: leida.interes },
          // El total lo calcula el backend. Sumar insoluto e interes aqui daria
          // una cifra parecida y equivocada: falta el reajuste y faltan los
          // gastos (RNF-083).
          { texto: leida.total },
        ];
      },
      'cuotas',
      // Lo que identifica la obligacion, **leido del cuerpo y no de la celda**.
      // Las claves son las de las columnas del catalogo, salvo `predioId` y
      // `vehiculoId`, que ninguna columna dibuja: son el identificador interno
      // que `ClaveDeSaldo` compara, y ensenarlo bajo «Unidad» seria ensenar otra
      // cosa con ese rotulo.
      (obligacion) => {
        const leida = obligacionDeDeuda(obligacion);
        return {
          ano: leida.ejercicio,
          cuota: leida.cuota,
          tributo: leida.tributo,
          insolutoS: leida.insoluto,
          interesS: leida.interes,
          predioId: identificador(obligacion['predioId']),
          vehiculoId: identificador(obligacion['vehiculoId']),
          /* Y la fase, que tampoco dibuja ninguna columna. Sin ella la baja
             resuelve a `ORDINARIA` y `SaldoRepositoryJdbc.proyectar` hace
             `DO UPDATE SET fase = EXCLUDED.fase`: una baja parcial sobre deuda
             en COACTIVA o en CONVENIO la devolvia a la fase ordinaria sin que
             nada lo dijera. */
          fase: leida.fase,
        };
      },
    ),
  }),
});

/**
 * `predioId`/`vehiculoId` como texto, o vacio si no lo trae.
 *
 * Vacio y no `SIN_DATO`: esto no se dibuja en ninguna parte, y un campo vacio es
 * lo que la lista blanca ya sabe no mandar. Una obligacion que no cuelga de
 * ninguna unidad —la de un contribuyente, sin predio ni vehiculo— es un caso
 * legitimo del libro, y su clave lleva los dos identificadores nulos.
 */
const identificador = (valor: unknown): string =>
  typeof valor === 'number' ? String(valor) : typeof valor === 'string' ? valor : '';

/** Una fecha entera, como la escribe un `input[type=date]` y como la lee `LocalDate`. */
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * **Los vehiculos de un contribuyente** (#524), que no es una opcion del catalogo.
 *
 * Su clave en el registro es el `operationId` y no un id de opcion, a proposito:
 * esta lectura no tiene pantalla propia —ninguna del manual la dibuja— y existe
 * para que el expediente del contribuyente pueda tomarla prestada bajo el
 * permiso de «Ficha de vehiculo», que es la opcion de Rentas que si existe.
 * `Pantalla` nunca la pide: solo consulta el registro por id de opcion.
 *
 * La fila es la de `VehiculoEncontradoResource` —la misma que publica
 * `/consultas/vehiculos`— repartida en las **ocho columnas que el catalogo de
 * `vehiculos` declara**. No se redacta ninguna: la primera es el estado, y la
 * afectacion se lee como en Consultas —`BAJA` gana al rango— porque es el mismo
 * dato leido dos veces y decir dos cosas distintas del mismo vehiculo es lo que
 * este endpoint existe para no hacer.
 */
const vehiculos_del_contribuyente = definirConexion({
  operacion: 'vehiculos_del_contribuyente',
  parametros: ({ busqueda }) =>
    parametrosDeBusqueda('vehiculos_del_contribuyente', undefined, busqueda),
  leer: (cuerpo) => leerPaginado(cuerpo, 'los vehiculos del contribuyente'),
  adaptar: (paginado): DatosDePantalla =>
    datosDe(
      tablaDe(
        paginado,
        (vehiculo): readonly Celda[] => [
          { texto: texto(vehiculo['estado']) },
          { texto: texto(vehiculo['placa']) },
          { texto: texto(vehiculo['clase']) },
          { texto: texto(vehiculo['marca']) },
          { texto: texto(vehiculo['modelo']) },
          { texto: texto(vehiculo['anioFabricacion']) },
          { texto: texto(vehiculo['titular']) },
          { texto: afectacionDelVehiculo(vehiculo) },
        ],
        'vehículos',
      ),
    ),
});

/** `estado === 'BAJA'` gana; si no, el rango que ya manda el recurso. Igual que en Consultas. */
function afectacionDelVehiculo(vehiculo: Readonly<Record<string, unknown>>): string {
  if (vehiculo['estado'] === 'BAJA') return 'BAJA';
  const desde = vehiculo['afectoDesde'];
  const hasta = vehiculo['afectoHasta'];
  if (typeof desde !== 'number' || typeof hasta !== 'number') return SIN_DATO;
  return `${desde} — ${hasta}`;
}

/** Las opciones de Rentas ya conectadas. Crece cuando crezca su backend. */
export const CONEXIONES_DE_RENTAS: Readonly<Record<string, Conexion>> = {
  contribuyentes,
  predios_rentas,
  vehiculos,
  declaracion_jurada,
  beneficios,
  arbitrios,
  baja_deuda,
  vehiculos_del_contribuyente,
};

/**
 * Y las dos que no se leen al abrir sino que se **piden**: las determinaciones
 * prediales (#395). Van por la otra puerta —`Adaptacion`— porque su operacion
 * es un `POST`: ver `determinaciones.ts`.
 */
export { ADAPTACIONES_DE_RENTAS } from './determinaciones';
