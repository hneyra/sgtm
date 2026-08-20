# Frontend del SGTM

**Las 134 pantallas del manual están implementadas, y ninguna habla todavía con el backend real.**
Doce módulos, 134 opciones, un renderizador y un catálogo portado del prototipo. Los datos llegan
por HTTP desde un **proxy que simula la API**; el día que Spring Boot sirva las operaciones, se
apaga el proxy y la interfaz no se entera ([ADR-0010](../docs/30-arquitectura/adr/ADR-0010-catalogo-portado-y-proxy-de-datos.md)).

## Arrancar

```bash
cd frontend
yarn install
yarn dev            # http://localhost:5173
```

Requiere Node 22 o superior.

| Comando                    | Qué hace                                                       |
| -------------------------- | -------------------------------------------------------------- |
| `yarn verificar`           | Lint, tipos y pruebas. **Lo que hay que pasar antes de un PR** |
| `yarn lint`                | ESLint, con las prohibiciones del proyecto                     |
| `yarn typecheck`           | `tsc --build`, en modo estricto                                |
| `yarn test`                | Vitest: dominio, cliente, proxy, catálogo, shell y las 134     |
| `yarn format`              | Prettier. Si el build se queja del formato, no lo pelees       |
| `yarn build`               | Construye la aplicación                                        |
| `yarn portar-catalogo`     | Regenera el catálogo desde `design/`                           |
| `yarn generar-operaciones` | Regenera los tipos de la API desde el contrato                 |

## El catálogo se porta; no se escriben 134 pantallas

`scripts/portar-catalogo.mjs` lee los cinco archivos declarativos del prototipo
(`design/sgtm-data-{1..5}.js`) y los parte en dos, que es **la decisión que sostiene todo lo
demás**:

```
estructura → apps/backoffice/src/catalogo/     qué campos, qué columnas, qué pestañas
valor      → packages/api-mock/src/            qué dice cada campo, qué filas trae la tabla
```

La estructura la sabe la interfaz sin preguntar. El valor se **pide por HTTP** a la operación que
cada pantalla declara —`GET /api/v1/catastro/fichas`— con el mismo cliente que hablará con Spring
Boot. Por eso la pantalla se dibuja entera antes de que llegue la respuesta, y por eso conectar el
backend no es reescribir nada.

Los archivos generados llevan `.generado.ts` en el nombre y **no se editan a mano**: se regeneran.

## El contrato manda sobre los tipos

Los tipos de las 134 operaciones **no se escriben**: los genera `scripts/generar-operaciones.mjs`
desde [`sgtm-v1.yaml`](../docs/50-api/openapi/sgtm-v1.yaml) hacia
`packages/api-client/src/operaciones.generado.ts`. `yarn verificar` regenera y compara, así que el
contrato y la interfaz no pueden divergir en silencio:

```bash
yarn generar-operaciones      # escribe operaciones.generado.ts
yarn comprobar-operaciones    # falla si no cuadra con el yaml (lo corre `yarn verificar`)
```

Un campo renombrado en el `yaml` renombra la propiedad generada, y el código escrito contra el
nombre viejo **deja de compilar**. Se comprobó renombrando `codRefCatastral` de verdad y
compilando con `tsc`: el error es `'codRefCatastral' does not exist in type
'{ readonly renombrado: string; }'`.

El generador además **rechaza el contrato** antes de generar nada si viola una regla del proyecto:
un parámetro o campo de municipalidad (regla 2), un importe declarado como número (regla 1,
RNF-055) o una respuesta con cifras de deuda sin `fechaCalculo` (regla 9, RNF-075). Cada guarda
tiene su contrato de muestra que la viola en `verificaciones/generador-de-operaciones.test.ts`.

**Lo que el generador no inventa:** los esquemas de cuerpo y respuesta. El contrato de hoy declara
verbo, ruta y parámetros; el esquema de cada recurso se escribe cuando su backend existe, y hasta
entonces la respuesta se tipa como `CuerpoSinEsquema`, que es exactamente lo que el `yaml` dice.

## La pantalla se usa: registro en la ruta, búsqueda en la URL

`GET /api/v1/rentas/vehiculos/{placa}` se pedía con la cadena `ejemplo`, así que la pantalla
parecía funcionar mientras mostraba un registro que no era de nadie. Ya no: **sin placa no hay
petición**, y quien la trae es la ruta.

```
/rentas-registro/vehiculos                 la pantalla, esperando un registro
/rentas-registro/vehiculos/ABC-123         la ficha de esa placa, y su enlace se comparte
/catastro/calles?nombreDeCalle=SANTA+ROSA&orden=nombre&pagina=2
```

**Todo el estado de la búsqueda vive en la URL** (FRO-04 §5): los filtros, el orden y la página.
Recargar no lo pierde, el botón «atrás» funciona, y quien atiende en ventanilla puede pegar el
enlace de lo que está mirando. Lo único que se queda en el componente es el borrador de lo que se
está escribiendo y aún no se ha buscado.

| Qué                 | Dónde vive                    | Qué viaja                                 |
| ------------------- | ----------------------------- | ----------------------------------------- |
| El registro abierto | `/:modulo/:opcion/:codigo`    | Siempre: es el parámetro de la ruta       |
| Filtros             | `?nombreDeCalle=…`            | Solo si el contrato declara ese parámetro |
| Orden y página      | `?orden=…&sentido=…&pagina=…` | Solo si el contrato los declara           |

**Filtrar, ordenar y paginar son del servidor.** Ordenar en el cliente una página de un padrón de
cientos de miles de filas ordena media tabla y miente. Por eso la cabecera pide otro orden y el
paginador aparece **solo cuando la respuesta trae paginación**: cuántas filas hay solo lo sabe
quien las tiene.

Para que eso pueda viajar, el contrato declara ahora **los filtros de cada pantalla** y —en las de
lectura con tabla— `pagina`, `tamano`, `orden` y `sentido`. Los nombres los calculan dos
generadores en árboles distintos, y una prueba exige que coincidan.

**Buscar por el identificador abre el registro**: si la búsqueda trae un valor para el parámetro de
la ruta —`placa` en vehículos—, la pantalla navega a esa ficha. Donde el catálogo no dice cuál de
los filtros es el identificador, el registro se abre por URL hasta que su módulo lo decida; y las
filas de la tabla **no** enlazan a ninguna ficha, porque de las quince pantallas que abren registro
y traen tabla, la primera columna es ese registro en una.

## La puerta lateral: una opción con operación propia

Las 134 pantallas piden la misma forma —`DatosDePantalla`— porque comparten renderizador. Fue la
decisión correcta para dibujarlas todas, pero **no sobrevive al backend real**: una ficha catastral
versionada, un cobro de caja y un padrón paginado no son la misma respuesta.

Así que junto a `useDatosDePantalla` hay un camino por opción, y las dos conviven:

```
operación tipada (del contrato) → leer → adaptar → los mismos bloques
```

| Pieza        | Qué hace                                                              | Dónde vive               |
| ------------ | --------------------------------------------------------------------- | ------------------------ |
| `parametros` | De dónde salen los valores de la petición: ruta y consulta            | La conexión de la opción |
| `leer`       | **La frontera.** Valida el cuerpo que el contrato todavía no describe | La conexión de la opción |
| `adaptar`    | Traduce el recurso del dominio a lo que dibujan los bloques. **Puro** | La conexión de la opción |

`leer` es lo único que cambia el día que el backend sirva su recurso de verdad: el adaptador ya
trabaja sobre el dominio, no sobre el transporte.

La primera conectada es el **panel de recaudación** (`pantallas/inicio/recaudacion.ts`). Su
ejercicio sale de la URL y **entra en la clave de cache**: `['operacion', 'inicio', { ejercicio }]`.
Con la clave vieja —`['pantalla', id]`— consultar 2026 y después 2025 devolvería lo primero, que en
ventanilla no es un problema de rendimiento sino mostrar cifras de un año como si fueran de otro.

Un adaptador que pierda la `fechaCalculo` **no compila**: `DatosDePantalla` la exige, y
`verificaciones/muestras/adaptador-sin-fecha.ts` lo demuestra compilando con `tsc`.

**El primer módulo entero conectado es Seguridad** (`pantallas/seguridad/`), y es el primero porque
los demás dependen de él: sin usuarios, grupos y permisos reales el filtrado por rol no tiene de
dónde leer, y sin ejercicio de trabajo ninguna consulta sabe de qué año habla. Sus seis lecturas
—módulos, accesos, grupos, usuarios, auditoría y parámetros— leen **el recurso que publica el
backend**: `RespuestaPaginada` con su `contenido`, su página contada desde 0 y su `totalElementos`,
no la forma que comparten las 134.

Lo que el recurso no trae sale con **«—»**, no con un valor inventado: la unidad orgánica de un
usuario, la caja en la que atiende, cuántos accesos tiene un grupo. Que se vea el hueco es el punto
—dice qué falta y a quién le toca—, y el prototipo dibujaba esas columnas llenas.

La bitácora manda **siempre** el ejercicio, aunque nadie lo escriba en un filtro: es la clave de
partición de la tabla y su controlador lo exige. No sale de la URL, sale de la sesión.

De **Catastro** hay **nueve opciones de doce**: el catálogo vial, los sectores, la consulta de
fichas y las cuatro fichas. Las tres que faltan son las tablas de valuación, y no faltan por el
frontend: su contenido es D-02, y en esa pantalla una cifra sin verificar **parece normativa**.

Sus columnas salen de recursos que publican menos de lo que el prototipo dibuja, y el resto sale
con «—». Donde eso importa más es en las cifras: el arancel por m², el valor de los bienes comunes
y el autovalúo rural alimentan la valuación de un predio, y una cifra inventada ahí acaba en un
valor mal emitido. Que falte se ve; que esté mal, no.

### Ninguna cifra sin su fecha, y no solo en la banda de totales

No existe «la deuda»: existe `deudaActualizadaA(fecha)` (regla 9, RNF-075). Eso ya lo hacía cumplir
`Importe`, que no compila sin `fechaCalculo`, y una regla de ESLint con su muestra.

Faltaba lo obvio: **que el usuario la vea**. La fecha vivía dentro de la banda de totales, así que
las pantallas que enseñan cifras en una tabla y no tienen banda —**siete de las once de
Consultas**— mostraban importes sin decir de cuándo eran. En ventanilla eso es responder «debe
1,842.60» sin decir que esa cifra era la de anteayer.

Ahora es un bloque propio, debajo de la descripción, en las 134: la fecha es de la **respuesta**,
no de un bloque. Hay una prueba que recorre las once de Consultas y exige que cualquier pantalla
con cifras la enseñe; sin el bloque, se ponen rojas trece.

**Y la interfaz no suma.** El saldo del estado de cuenta sale vacío en vez de restado —el saldo
proyectado es del backend—, los cuatro totales también, y `@sgtm/dominio` **no exporta ninguna
función de sumar**. Esa ausencia es la medida, y hay una prueba que la fija: mientras no exista, no
hay forma cómoda de componer una cifra que el backend no pueda sustentar.

### La ficha enseña de cuándo es lo que muestra

El backend de la ficha catastral **nunca sobrescribe**: actualizar crea la versión siguiente y
cierra la anterior. Eso no sirve de nada si la pantalla no lo cuenta, así que las cuatro fichas
traen un bloque con la versión que rige, su vigencia, de dónde salió, y el histórico completo:

```
Versión 3  [VIGENTE]   Desde 12/03/2026   FISCALIZACION · Acta de inspección 0244-2026

  v3  Desde 12/03/2026        mrios · 12/03/2026
      Fiscalización de campo: se verificó ampliación en el segundo piso no declarada.
  v2  01/06/2021 — 11/03/2026 jcardenas · 01/06/2021
      Declaración jurada del contribuyente por ampliación del primer piso.
```

**La observación es la mitad útil.** El diff dice que el área pasó de 120 a 180; solo la
observación dice que fue una fiscalización de campo y no un error de tecleo, y es lo que se lee en
voz alta cuando el contribuyente pregunta por qué le subió el recibo. Va entera, sin recortar.

Y la ficha responde **a una fecha**: `?fecha=2022-01-01` devuelve la que regía entonces, que es
exactamente la pregunta de una reclamación.

**Las conexiones no crecen por delante del backend.** Hoy son doce operaciones, las mismas que
enumera `IMPLEMENTADAS` en el `ContratoDeApiTest`. Conectar una opción cuyo endpoint no existe
obligaría a inventarse su respuesta en el proxy, que es lo que [ADR-0010](../docs/30-arquitectura/adr/ADR-0010-catalogo-portado-y-proxy-de-datos.md)
decidió no hacer, y hay una prueba que lo comprueba enumerando las once de Catastro que siguen
sin conectar.

## El ejercicio de trabajo es de la sesión, y se ve siempre

Cambiarlo en «Cambiar el año de trabajo» cambia lo que muestran los otros once módulos, así que no
vive en esa pantalla: vive en `app/ejercicio.tsx`, por encima de las rutas, y se pinta en la
cabecera de las 134 —también en móvil, donde el resto de la cabecera derecha se oculta—. Una cifra
de 2025 mostrada como si fuera de 2026 no es un fallo de formato: es una respuesta equivocada a
quien vino a preguntar cuánto debe.

Y **vaciar la caché es parte de cambiarlo**, en el mismo turno. Es el mismo caso que cambiar de
municipalidad (FRO-01 §4) con otra cara: lo guardado se pidió con el año anterior, y si sobrevive
al cambio la primera pantalla que se dibuje enseña cifras del año viejo bajo el rótulo del nuevo.
El valor inicial sale del reloj del cliente, y es una carencia anotada: el backend guarda el
ejercicio en la sesión pero solo lo publica como respuesta del `PUT` que lo cambia —no hay
`GET /seguridad/sesion`—, así que al recargar la pestaña no hay a quién preguntárselo.

## La sesión: PKCE, token en memoria y renovación que no se lleva el formulario

Authorization Code con **PKCE** contra el proveedor OIDC (ADR-0005, FRO-01 §5). Sin secreto de
cliente: no hay dónde guardarlo en un navegador.

| Regla                         | Cómo                                                                                    |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| Token **en memoria**          | Nunca `localStorage`, `sessionStorage` ni la URL: la barra se limpia al canjear         |
| Renovación silenciosa         | Con refresh token en cookie `HttpOnly`; la petición no manda ningún secreto             |
| Expiración durante el trabajo | Se avisa y se renueva **sin desmontar nada**                                            |
| Cierre de sesión              | Vacía la caché de TanStack Query y el estado en memoria                                 |
| Cambio de municipalidad       | **Vacía la caché antes** de pedir el token nuevo                                        |
| `401` durante el trabajo      | Se renueva una vez y se repite la petición; si falla, a la puerta con la ruta de vuelta |

Lo único que se guarda en el navegador es el **verificador de PKCE**, mientras el navegador va y
vuelve del proveedor. No es el token: es de un solo uso, sin su código de autorización no abre
nada, y se borra al canjearlo. Guardarlo en memoria no es una opción —la redirección recarga la
página— y la alternativa sería no usar PKCE.

**Que la renovación no desmonte nada** no es un detalle de implementación: el manual describe
fichas y declaraciones que se llenan en varios minutos, y perder una por expiración es el defecto
que más duele de los que se pueden cometer aquí. Hay una prueba que escribe en un formulario,
caduca el token y comprueba que el texto sigue ahí.

Del token se lee el nombre del usuario, el nombre de la municipalidad y hasta cuándo dura. **No hay
identificador de municipalidad que mandar**, así que no se puede mandar (regla 2, FRO-01 §4).

```bash
# Con proveedor de identidad:
VITE_SGTM_OIDC_CLIENTE=sgtm-backoffice \
VITE_SGTM_OIDC_AUTORIZACION=https://identidad.gob.pe/oauth2/authorize \
VITE_SGTM_OIDC_TOKEN=https://identidad.gob.pe/oauth2/token \
VITE_SGTM_OIDC_FIN_DE_SESION=https://identidad.gob.pe/oauth2/logout yarn dev
```

Sin esas variables no hay proveedor y la aplicación arranca igual, que es como se trabaja contra el
proxy de datos. En producción, un despliegue sin ellas es un despliegue mal configurado.

## Visibilidad por rol

> **Que la interfaz oculte una opción es comodidad, no seguridad** (REQ-03 §5). La comprobación es
> del servidor, que responde `403` igual. Esto reduce el error y la superficie de exploración; no
> protege nada por sí solo.

**Las 134 opciones son 134 accesos**: el identificador de la opción del catálogo **es** la clave
del permiso, así que una opción nueva es permisible sin tocar una línea de permisos. Hay una prueba
que lo verifica contando.

| Qué se filtra                 | Dónde                                                                     |
| ----------------------------- | ------------------------------------------------------------------------- |
| La navegación de dos niveles  | Los módulos y sus opciones                                                |
| El hub de cada módulo         | Un módulo sin opciones visibles **no existe** para ese usuario            |
| La paleta de comandos         | Es la que se olvida: si encuentra lo que el menú esconde, no esconde nada |
| «Recientes» de `localStorage` | Se cruza con lo que se puede ver **ahora**: no resucita lo perdido        |
| Las acciones de escritura     | `registro` o `modificación`; ver sin poder tocar es un perfil normal      |

**Negación por omisión** (REQ-03 §1, regla 5): sin permiso explícito no hay acceso. Sin proveedor
de identidad no hay permisos que aplicar —se trabaja como contra el proxy—; con proveedor y sin
claim, no se ve nada, que dice la verdad mucho mejor que un menú completo que falla en cada
pulsación.

Los permisos efectivos —la unión de los del usuario y los de sus grupos, ya recortados por vigencia
y habilitación— los calcula **el servidor**. Aquí llega el resultado, y **el sitio donde se lee es
uno solo**: si #9 y #12 deciden que viajen por una operación del contrato en vez de por el token,
cambia esa función y nada más.

## La escritura: sin observación no se guarda

**Toda modificación de datos exige observación del usuario** (regla 10 de CLAUDE.md, RNF-052). No
es un `placeholder` amable: es la condición de guardado, y por eso vive en **un solo sitio**
—`pantallas/escritura.ts`— y no en cada pantalla. Una pantalla que se olvidara de pedirla no podría
guardar, porque no hay otra forma de guardar.

| Qué resuelve             | Cómo                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------ |
| Observación obligatoria  | Sin texto, la acción primaria no se habilita                                         |
| Idempotencia             | Una clave por intento, **estable mientras dure**; cambia al corregir lo que se manda |
| Sin reintento automático | `mutations: { retry: false }`, con la prueba que lo fija                             |
| Errores por campo        | `ProblemaDeApi.errores` pintado junto a su campo, sin reescribirlo                   |
| Un envío por pulsación   | Pulsar dos veces rápido manda una vez                                                |
| Lo irreversible          | Se confirma diciendo **qué** va a pasar, no «¿estás seguro?»                         |

La clave de idempotencia es la que más cuesta si se hace mal en las dos direcciones: regenerarla en
cada reintento convierte un reintento en un segundo cobro, y no regenerarla nunca hace que corregir
un dato devuelva el resultado del intento anterior. Cambia **cuando cambia lo que se manda**.

**Abrir una pantalla que escribe ya no escribe**: las 54 operaciones con verbo de escritura no se
piden al montar —abrir «Copias de seguridad» no puede lanzar un respaldo—, se piden cuando alguien
pulsa.

Lo hace cumplir una regla de ESLint: **`useMutation` fuera de `escritura.ts` no pasa el lint**, con
su muestra en `verificaciones/muestras/escritura-sin-observacion.tsx`. No se puede pedirle a ESLint
que compruebe que un formulario «tiene» un campo; lo que sí se puede es dejar un solo camino.

### La lista blanca: lo que no está declarado no viaja

El cuerpo lleva la observación y **nada más**, salvo los campos que la opción declare uno a uno en
`pantallas/escrituras.ts`. Mientras una opción no esté ahí, su formulario **no se puede escribir**:
negación por omisión, como la autorización del manual.

```ts
cambiar_anio: { campos: { cambiarAlAno: { campo: 'ejercicio', entero: true } }, … }
cambiar_clave: { campos: {}, … }   // ninguno, y esa ausencia es la función
```

Dos nombres por campo porque son dos vocabularios: la clave del catálogo sale del prototipo
—`cambiarAlAno`, de «Cambiar al año»— y el nombre del cuerpo lo declara el backend —`ejercicio`—.
Ninguno cede; la traducción vive en el registro.

**Cambiar contraseña es el caso que justifica el mecanismo.** El backend no acepta ninguna clave: su
cuerpo es solo la observación, y lo que devuelve es a dónde tiene que ir la interfaz —el proveedor
de identidad (ADR-0005)—. Con la lista blanca vacía, los tres campos de clave que el prototipo
dibuja no se pueden escribir, así que el valor **no llega al estado de React**, ni a la caché de
consultas, ni a la URL, ni a ningún almacenamiento: no existe. No se borra después; nunca entra.

## Los cuatro estados

El prototipo no los diseña: dibuja la pantalla con datos y ya. Contra el proxy eso se nota poco;
contra un backend real, una consulta que tarda, un filtro sin resultados o una red caída son el
estado normal de la pantalla varias veces al día.

| Estado          | Dónde       | Qué dice                                                                     |
| --------------- | ----------- | ---------------------------------------------------------------------------- |
| **Carga**       | Cada bloque | Esqueleto, no girador, y del tamaño de lo que sustituye                      |
| **Vacío**       | Cada bloque | Distingue «ningún resultado para esta búsqueda» de «todavía no hay»          |
| **Error**       | La pantalla | El mensaje del backend **sin reescribir** (RNF-080), su traza y «Reintentar» |
| **Sin permiso** | La pantalla | Que falta permiso, **sin revelar qué hay detrás**                            |

El error y el sin permiso son de la pantalla entera porque hay **una petición por pantalla**: no
puede fallar la tabla y no el formulario si las dos salen de la misma respuesta. Y ninguno de los
dos dibuja la estructura: entrar sin permiso no puede filtrar ni las columnas de lo que hay detrás.

**Sin red la pantalla lo dice**: `fetch` rechaza con un error del navegador que no significa nada
para quien atiende, así que `solicitar()` lo convierte en un `ProblemaDeApi` con el mismo formato
que los del backend. La **traza se copia de un gesto**, porque se dicta por teléfono.

Cinco de los diez bloques se dibujan del catálogo —descripción, portal, filtros, pestañas y barra
de acciones— y no esperan a nadie: no tienen carga ni vacío. El formulario vacío tampoco es un
error: es un formulario listo para llenarse.

## Lo que se descarga, y lo que cuesta

El catálogo de las 134 pantallas son 445 KB de fuente: **más que la aplicación**. Servido de una
vez, una municipalidad con red mala espera por las 134 para abrir una. Así que va **partido por
módulo** y se carga al entrar en él:

|                     | Antes       | Ahora           |
| ------------------- | ----------- | --------------- |
| Arranque            | 162,7 KB gz | **117,8 KB gz** |
| Entrar en Catastro  | —           | 7,4 KB gz       |
| Entrar en Tesorería | —           | 4,4 KB gz       |

Lo que viaja siempre es la **navegación** —el menú, los títulos y los resúmenes—, porque los
necesitan el hub, la cabecera y la paleta de comandos: si el título viviera en el archivo del
módulo, buscar «papeleta» obligaría a descargar los doce.

`yarn comprobar-compilaciones` mide el arranque y cada trozo contra un **presupuesto** y falla al
superarlo. Subir el umbral es una decisión, no un trámite: se cambia en el script y se dice en el
PR por qué vale la pena.

Las **tres familias tipográficas se sirven desde el propio proyecto** (`estilos/tipografias/`,
subconjuntos `latin` y `latin-ext`): una municipalidad con red mala no debería depender de un
tercero para que su sistema se vea legible. Se regeneran con `node scripts/traer-tipografias.mjs`.

## Los tres caminos completos

Las 134 pantallas se comprueban montadas, y eso vale para la estructura. Lo que no dice nada de un
camino de usuario —buscar, elegir, llenar, guardar, imprimir— es justo el que rompe una
integración. `yarn e2e` recorre en Chromium los tres que más cuestan si fallan (FRO-03 §6):

| Camino                      | Qué exige                                                                           |
| --------------------------- | ----------------------------------------------------------------------------------- |
| **Cobro en caja**           | Se completa **sin tocar el ratón** (RNF-082): la prueba solo escribe y pulsa teclas |
| **Consulta del portal**     | Cabe en un viewport de 360 px, sin desplazamiento horizontal                        |
| **Impresión de un reporte** | Una hoja A4 vertical, con sus dos líneas de firma y sin la interfaz (RNF-084)       |

La primera encontró un hueco real: **la paleta de comandos no se podía operar con el teclado** —se
escribía, y luego había que apuntar y hacer clic—. Ahora se elige con ↑ ↓ y se abre con Enter.

> **Las tres pantallas siguen sin validar con usuarios reales** (FRO-03 §6). Automatizar un camino
> no es validarlo: dice que se puede completar, no que sea el camino que quien atiende usaría.

## El proxy de datos

`@sgtm/api-mock` sustituye `fetch` e intercepta lo que cuelga de `/api/v1`. Responde las 134
operaciones del contrato con los datos de ejemplo del prototipo, con latencia simulada para que los
estados de carga se vean, y devuelve `ProblemDetails` con 404 a lo que no existe.

```bash
# Contra el backend real, el día que exista:
VITE_SGTM_PROXY_DE_DATOS=false SGTM_API=http://localhost:8080 yarn dev
```

Con la bandera apagada el empaquetador descarta la rama entera: el juego de datos **no se compila
en producción**. Se comprobó midiendo las dos compilaciones.

### Apagarlo operación por operación

El backend no va a existir de golpe: llega contexto por contexto, en seis ondas. Apagar el proxy
entero dejaría las 134 pantallas sin nadie que conteste, así que hay un modo intermedio —**backend
real donde exista, proxy donde todavía no**—: `packages/api-mock/src/servidas.ts` lista las rutas
que el backend ya sirve, y esas el proxy las deja pasar.

```ts
export const YA_SERVIDAS: readonly OperacionServida[] = []; // hoy, ninguna
```

**Una ruta declarada que el backend no sirve falla ruidosamente** —`502` con el nombre del archivo
que hay que corregir— en vez de caer al proxy en silencio: un respaldo callado esconde justo lo que
se quiere ver.

La lista **crece hasta cubrir las 134 y entonces desaparece**: con el backend sirviéndolo todo, se
apaga el proxy y se borra el archivo. El modo intermedio es transitorio y su final es parte del
trabajo.

### Los dos procesos, juntos

```bash
# Terminal 1 — el backend
cd backend && ./gradlew bootRun

# Terminal 2 — la interfaz, con el reenvío de Vite a Spring Boot
cd frontend && SGTM_API=http://localhost:8080 yarn dev
```

`yarn dev` sirve en `http://localhost:5173` y reenvía `/api` a `SGTM_API`; el proxy de datos sigue
instalado y contesta todo lo que no esté en `servidas.ts`. Para trabajar **solo** contra el backend:
`VITE_SGTM_PROXY_DE_DATOS=false`.

**Lo que el proxy no hace, a propósito:** no filtra, no ordena, no pagina, no valida y no persiste.
Fingir la semántica de `?uso=Comercio` sería inventar un comportamiento que el backend no ha
decidido, y la interfaz acabaría construida contra esa invención.

## Estructura

```
frontend/
├── apps/backoffice/src/
│   ├── app/             Shell, cabecera, barra lateral de dos niveles, paleta de comandos
│   ├── catalogo/        Las 134 pantallas como datos tipados (generado)
│   ├── pantallas/       El renderizador, sus diez bloques y las opciones conectadas
│   │   └── inicio/      Primera opción con operación tipada y adaptador propios
│   └── estilos/         Shell y bloques, con los tokens de Juris PE
├── packages/
│   ├── design-system/   Tokens y los componentes que usan las pantallas
│   ├── dominio/         Importe, Fecha, Estado y su formateo
│   ├── api-client/      Cliente HTTP tipado y el contrato de datos de una pantalla
│   └── api-mock/        El proxy de datos (generado + 130 líneas de encaminamiento)
├── scripts/             El portador del catálogo y el generador de operaciones
└── verificaciones/      Las reglas del proyecto, con una muestra que viola cada una
```

**Los directorios por módulo aparecen cuando una opción necesita código propio, y no antes**, que
es la diferencia deliberada con [FRO-01 §2](../docs/60-frontend/arquitectura-frontend.md): las 134
pantallas son un catálogo y un renderizador, así que `modulos/catastro/` vacío no sirve a nadie. El
primero en aparecer ha sido `pantallas/inicio/`, con la conexión del panel de recaudación.

## Las diez plantillas de contenido

Un renderizador compone, en el orden de [FRO-03 §5](../docs/60-frontend/mapa-de-pantallas.md), los
bloques que declare cada descriptor: descripción, panel de indicadores, portal ciudadano, filtros,
tabla, totales, pestañas, formulario por secciones, hoja de reporte y barra de acciones.

## Las reglas que este código hace cumplir

| Regla                                           | Muestra que la viola                                 |
| ----------------------------------------------- | ---------------------------------------------------- |
| La interfaz no hace aritmética con importes     | `verificaciones/muestras/aritmetica-con-importes.ts` |
| **Sin observación no se guarda**                | `escritura-sin-observacion.tsx`                      |
| Un importe es texto, nunca `number`             | `importe-como-number.ts`                             |
| El frontend jamás envía `municipalidadId`       | `municipalidad-en-el-cliente.ts`                     |
| El token vive en memoria                        | `token-en-almacenamiento.ts`                         |
| **Nada de `fetch` fuera de `@sgtm/api-client`** | `fetch-directo.ts`                                   |
| Sin tildes en identificadores                   | `identificador-con-tilde.ts`                         |
| `alicuota`, nunca `tasa`, para un porcentaje    | `tasa-en-vez-de-alicuota.ts`                         |
| Todo importe se muestra con su fecha de cálculo | `importe-sin-fecha.tsx`                              |
| `any` prohibido · sin `tabIndex` positivo       | `any-explicito.ts` · `tabindex-positivo.tsx`         |

`verificaciones/reglas-de-eslint.test.ts` linta cada muestra y **exige que la regla la señale**. Se
comprobó que la nueva puede fallar: al quitar la regla de `fetch`, su prueba se pone roja; al
devolverla, vuelve a verde.

La prohibición de `fetch` es la que sostiene el proxy: mientras todas las peticiones pasen por
`solicitar()`, cambiar el proxy por el backend es apagar una bandera.

La regla del almacenamiento **se estrechó** a lo que FRO-01 §5 prohíbe de verdad —guardar
credenciales— porque FRO-03 §3 pide persistir las cinco opciones recientes en `localStorage`, y lo
dice en la misma frase en que excluye el token.

## Qué se verificó, y cómo

| Verificación                            | Cómo                                                                    | Resultado                     |
| --------------------------------------- | ----------------------------------------------------------------------- | ----------------------------- |
| Las 134 pantallas se dibujan            | `todas-las-pantallas.test.tsx` monta cada una y comprueba su título     | 134 en verde                  |
| Las 134 en un navegador de verdad       | Chromium recorriendo las 134 rutas                                      | 0 errores de página, 0 de API |
| El proxy responde el contrato           | 10 pruebas: rutas, verbos, parámetros, 404, instalación                 | En verde                      |
| El catálogo está completo               | 17 pruebas: 12 módulos, 134 opciones, bloques, rutas y endpoints únicos | En verde                      |
| El juego de datos no llega a producción | Dos compilaciones, con y sin la bandera                                 | 145 KB menos, chunk ausente   |
| Las reglas de ESLint muerden            | Quitando la de `fetch`: su prueba se pone roja                          | Muerde                        |
| Los seis listados leen el recurso real  | Quitando la guarda de `leerPaginado`: pinta media pantalla en silencio  | Roja                          |
| La bitácora manda el ejercicio          | Quitándolo de la conexión                                               | Roja                          |
| Cambiar de ejercicio vacía la caché     | Quitando `clear()`: la petición nueva encuentra lo viejo                | Rojas, dos                    |
| La lista blanca filtra el cuerpo        | Mandando el borrador entero: viajan campos que el backend no acepta     | Rojas, dos                    |
| La contraseña no se puede teclear       | Quitando `bloqueado` de los campos no declarados                        | Roja                          |
| El catálogo vial no inventa columnas    | Rellenando sector, zona y arancel con lo del prototipo                  | Roja                          |
| Las conexiones no van por delante       | Conectando una tabla de valuación, que no tiene contenido               | Roja                          |
| La ficha enseña su versión              | Quitando el bloque de versionado                                        | Rojas, cinco                  |
| El histórico se pide                    | Quitando `historico=true` de la conexión                                | Roja                          |
| Sin código no se pide ninguna ficha     | Quitando la guarda de la ruta y el `enabled`                            | Roja                          |
| El arancel rural no se compone          | Poniéndole una cifra                                                    | Roja                          |
| El desplegable no esconde lo servido    | Volviendo a dibujar solo las opciones del prototipo                     | Roja                          |
| Ninguna cifra sin su fecha (las once)   | Quitando el bloque de fecha de cálculo                                  | Rojas, trece                  |
| El saldo no se compone                  | Restando en la interfaz en vez de dejarlo vacío                         | Rojas, dos                    |
| `@sgtm/dominio` no suma                 | Añadiéndole una función de sumar importes                               | Roja                          |

## Lo que todavía no está

- **Ninguna operación sale todavía al backend real**: las conexiones ya hablan su idioma —el
  recurso paginado de Seguridad, no la forma que comparten las 134— y quien lo contesta hoy es el
  proxy, que también lo habla. Encenderlo es mover esas rutas a `servidas.ts` con un Spring Boot
  levantado; sin él, una ruta ahí falla ruidosamente y por eso la lista sigue vacía.
- **De las once opciones de Seguridad quedan tres sin conectar**, y las tres por lo mismo:
  `permisos` no tiene `GET` con el que cargar la matriz —solo `PUT` para fijarla—, `miembros`
  necesita elegir un usuario y el prototipo no dibuja ese selector, y `respaldo` es un `POST` que
  consulta, así que abrir la pantalla no puede pedirlo (#64). Están detalladas en #70.
- **Los diez módulos restantes esperan a su backend.** De las 134 operaciones del contrato el
  servidor publica 22, y las 22 están conectadas. No es un pendiente del frontend y no tiene
  atajo — fingirlas en el proxy sería construir la interfaz contra una invención.
- **De Catastro quedan tres opciones sin conectar** —las tablas de valuación—, más la
  actualización de la ficha, que escribe una tabla de pisos y el camino de escritura de hoy solo
  lleva campos planos, y el reporte del contribuyente, que devuelve un PDF y no un recurso.
- Las tres pantallas que [FRO-03 §6](../docs/60-frontend/mapa-de-pantallas.md) marca —caja, portal
  y reportes— **no están validadas con usuarios reales**. Es un pendiente declarado.

## Documentación

[FRO-01 arquitectura](../docs/60-frontend/arquitectura-frontend.md) ·
[FRO-02 design system](../docs/60-frontend/design-system.md) ·
[FRO-03 mapa de pantallas](../docs/60-frontend/mapa-de-pantallas.md) ·
[FRO-04 estándares](../docs/60-frontend/estandares-de-codigo-frontend.md) ·
[ADR-0009](../docs/30-arquitectura/adr/ADR-0009-plataforma-frontend.md) ·
[ADR-0010](../docs/30-arquitectura/adr/ADR-0010-catalogo-portado-y-proxy-de-datos.md)
