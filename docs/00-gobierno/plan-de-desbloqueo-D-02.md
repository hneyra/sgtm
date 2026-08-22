# GOB-03 — Plan de desbloqueo de D-02

| Campo | Valor |
|---|---|
| Origen | [#116](https://github.com/hneyra/sgtm/issues/116) — refinamiento técnico y funcional |
| Estado | **En ejecución.** E-1, E-2 y E-5 hechos; E-7 con sus dos entregables de código hechos; E-3 **con su barrera puesta y la transcripción pendiente**; E-6 esperando la ordenanza; E-4 **aplazado**, ya reevaluado. Ver §0 |
| Decide | Dirección del proyecto (E-4 y E-6); el resto no requiere autorización |
| No hace | No cierra D-02, no carga ninguna cifra y no sustituye a [GOB-02](decisiones-abiertas.md) |

Este documento convierte las siete estrategias de #116 en siete paquetes ejecutables: cada uno con
su entregable concreto, dónde vive, qué criterio lo da por terminado y **cómo se demuestra que su
verificación puede fallar** —que es lo que aquí distingue una verificación de una afirmación—.

Lo aprobado entra en GOB-02, que sigue siendo el registro. Este plan es el camino, no el registro.

## 0. Estado de ejecución

Del §1 al §7 está el plan **tal como se escribió**. Esta sección dice qué se hizo de él, qué salió
distinto y qué queda; es lo primero que hay que leer y lo único que cambia con el tiempo.

### 0.1 Dos hallazgos más, del día de ejecutar

El plan se escribió el 19 de agosto y se ejecutó el 22. En esos tres días el repositorio se movió,
y hay que decirlo porque cambia el reparto:

| # | Hallazgo | Cómo se comprobó |
|---|---|---|
| **H-8** | **Tres de los quince issues ya están cerrados**: #17, #22 y #30, los tres «completado», los tres **conservando la etiqueta `bloqueado:D-02`**. #30 cerró con su estructura —detalle por predio, agregación por contribuyente, tramos como dato— y su mitad de cifras quedó sin issue que la siguiera: invisible | Consulta de issues por etiqueta, contra `git log` y `sgtm-rentas/dominio/predial/` |
| **H-9** | **Cuatro datos estaban en la parte equivocada, y siempre por el mismo motivo**: se habían clasificado por tributo y no por quién fija el valor. Espectáculos (TUO LTM art. 57), prescripción y plazos (Código Tributario) y la tabla de infracciones de tránsito (D.S. 016-2009-MTC) son **norma nacional** y estaban en `D-02c`; la TIM la fija una **ordenanza** (Código Tributario art. 33) y estaba en `D-02c`. Con el criterio escrito, la partición pasa a ser una función | Cruce fila por fila de NEG-02 §2 al construir el mapa |

H-8 es la razón de la única desviación de forma respecto del plan (§0.3), y H-9 es la razón de que
**cuatro datos más se puedan buscar hoy, sin municipalidad piloto**.

### 0.2 E-1 · Hecho

- El mapa vive en [NEG-02 §2](../10-negocio/marco-normativo.md): **29 filas** con norma, parte e
  issues que la esperan. Son 29 y no 27 porque dos datos bloqueaban un issue **sin tener fila**
  —el interés y el máximo de cuotas del fraccionamiento, y el derecho de trámite del TUPA—: un
  dato que nadie iba a buscar porque nadie lo había escrito.
- Dos filas quedan sin parte firme, y **se ve**: la valorización de obras complementarias
  (`‹POR CLASIFICAR›`, sin norma identificada) y el arancel de costas coactivas (`D-02c
  ‹confirmar›`, según quién lo apruebe). Son las dos que la decisión 5 de §4 pone en manos de
  Rentas y asesoría legal.
- Las tres etiquetas existen, con el color `ededed` de la anterior, y **`bloqueado:D-02` no la
  lleva ya ningún issue** —queda la etiqueta vacía en el repositorio, para borrarla a mano—.
- `docs/10-negocio/verificar-mapa-normativo.mjs` comprueba las dos direcciones contra la
  instantánea del tablero. **Se demostró que puede fallar** con tres roturas: quitar `#194` de la
  fila 9 dejándolo etiquetado, etiquetar un issue que ninguna fila nombra, y dudar de una parte sin
  decir por qué. Las tres lo ponen en rojo, nombrando la fila y el issue.

### 0.3 E-2 · Hecho, con una desviación de forma

**Doce issues partidos**, y el mapa apunta a las mitades de cifras:

| Padre | Mitad de cifras | Etiquetas |
|---|---|---|
| #30 determinación del predial ‹cerrado› | #188 | `D-02a` |
| #31 arbitrios | #189 | `D-02b` |
| #32 vehicular, alcabala y espectáculos | #190 | `D-02a` |
| #35 fraccionamiento | #191 | `D-02b` |
| #39 notificación y prescripción | #192 | `D-02a` |
| #42 costas coactivas | #193 | `D-02c` |
| #45 actas de fiscalización | #194 | `D-02a` |
| #46 papeleta de tránsito | #195 | `D-02a`, `D-02c` |
| #47 papeleta administrativa | #196 | `D-02a`, `D-02b`, `D-02c` |
| #48 FUE de edificación | #197 | `D-02a`, `D-02b` |
| #49 liquidación de fiscalización | #198 | `D-02a` |
| #51 anuncios y propaganda | #199 | `D-02b` |

**La desviación:** el plan pedía dos hijos por padre —«estructura» y «cifras»— y se creó **uno
solo**, el de cifras, dejando al padre como el issue de estructura, sin etiqueta de bloqueo y con
su sección «Bloqueos» corregida. El motivo es H-8: #30 se cerró como «completado» al terminar su
estructura, lo que demuestra que en este repositorio **el padre ya se comporta como el issue de
estructura**. Un hijo «estructura» habría sido una copia del padre, y doce issues más que mantener
en sincronía con él. Lo que sí se conserva del plan es lo que le daba sentido: el hijo de cifras
cuelga del padre como sub-issue, así que la mitad que falta **está a la vista** —que es
exactamente lo que no pasó con #30—.

#17 y #22, cerrados, solo perdieron la etiqueta. #43 la perdió también, y su sección «Bloqueos»
ahora explica por qué nunca debió llevarla.

### 0.4 Lo que queda, con su issue

| Paquete | Issue | Estado |
|---|---|---|
| **E-3** transcribir y firmar D-02a | #200 | Abierto, **con la barrera ya puesta**. `docs/10-negocio/valores-normativos/` existe con su plantilla y su comprobación: cabecera de ocho campos, **dos firmas distintas**, filas del mapa que cierra —en las dos direcciones— y ningún `INSERT` de valores en una migración. Hoy imprime **17 filas de `D-02a` sin archivo**; bajarlo es el paquete. Lo que falta no es código: es leer las normas y firmarlas, y eso lo hacen dos personas |
| **E-5** el corpus de casos | #201 | **Hecho.** 32 casos en `sgtm-rentas/src/test/resources/casos/`, uno por regla de NEG-05, con los 17 casos borde de §2 enumerados. Dos ejecutables, y los otros treinta con **quien los impide** en su fila. Al hacerlo salieron tres hallazgos: H-10, H-11 y H-12 (§0.6) |
| **E-6** la municipalidad de demostración | #202 | Abierto. **Los cuatro entregables de código existen**: la marca en migración, el marcado de todo documento en los tres formatos, sus 19 pruebas, y —desde #212— la regla que impide que nada siembre fuera del perfil `batch`, que era el tercer criterio y no lo comprobaba nadie. Falta **elegir la ordenanza**, y con ella su transcripción y las cifras que el tenant carga |
| **E-7** puntos de redondeo y campaña de D-03c | #203 | **Los tres entregables de código, hechos**: `PuntoDeRedondeo` con sus catorce puntos, `PoliticasDeRedondeo` que falla cuando falta uno, el formulario de la campaña en `docs/10-negocio/observaciones-srtm-mef/`, y `PoliticasDeRedondeoSelladas`, que las **lee del conjunto sellado** —una fila `REDONDEO:‹punto›` con la escala en `valor_numerico` y el modo en `valor_texto`—. `RegistrarDeterminacionPredial` ya no las recibe: las lee. Queda **solo la campaña**, que necesita acceso al SRTM del MEF |
| **E-4** el estado `PROVISIONAL` | — | **Reevaluado al cerrar #201, y sigue aplazado** —ahora con evidencia, ver §0.7—. No se abre issue para no fingir que hay trabajo aprobado |

### 0.5 Las cinco decisiones de §4

| # | Decisión | Estado |
|---|---|---|
| 1 | E-4 sí o no | **Resuelta: no todavía.** Reevaluada al cerrar #201 con el caso concreto delante, que es lo que el plan pedía. Ver §0.7 |
| 2 | E-6: qué ordenanza | **Abierta.** Decide Rentas; es lo único que le falta a #202 |
| 3 | D-13: ámbito de las tablas de valuación | **Registrada en [GOB-02](decisiones-abiertas.md) como D-13.** Decide Arquitectura. Bloquea la carga de E-3, no su transcripción |
| 4 | H-4: la dimensión que falta en `valor_unitario_edificacion` | **Abierta.** #17 está cerrado, así que ya no puede entrar «en su hijo estructura»: entra donde se cargue el cuadro, junto con D-13 |
| 5 | H-3: anuncios y costas coactivas | **Anuncios, resuelto**: pasa a `D-02b` (fila 18). **Costas, abierto**: la fila 23 queda `D-02c ‹confirmar›` hasta saber quién aprueba el arancel |

### 0.6 Tres hallazgos más, del día de construir el corpus

E-5 se escribió el 22 de agosto y encontró tres cosas que ningún documento decía. Las tres cambian
lo que se puede prometer del predial.

| # | Hallazgo | Cómo se comprobó |
|---|---|---|
| **H-10** | **El motor solo sabía expresar reglas cuyo parámetro tiene clave constante.** Una regla lee `numero(tipo, clave)` con la clave escrita en el código, y eso vale para la UIT o una alícuota —una por ejercicio—, pero el **arancel es por vía**, el **valor unitario por categoría y año** y la **depreciación por material, antigüedad y estado**: la clave sale del predio. Sin un sitio de donde sacarla, `RT-001`, `RT-003` y `RT-004` **no tenían forma** | Intentar escribir `RT-001` contra `InsumosDeLaRegla` |
| **H-11** | **Los números de NEG-05 no cuadran con NEG-05.** §6 pide «resolución de los **14** casos borde de §2» y en §2 hay **diecisiete**. Y «`RT-001`…`RT-016`» son **doce** reglas: §2 no define `RT-006` a `RT-009`, y esos identificadores no existen | Enumeración una por una al construir el corpus |
| **H-12** | **De las doce reglas, hoy se puede escribir una.** `RT-001` es la única rama del grafo sin ninguno de los cuatro factores de D-11. `RT-002`, `RT-005`, `RT-010` y `RT-012` los llevan —y CLAUDE.md prohíbe implementarlos «ni estructuralmente»—; `RT-003` espera a H-4; `RT-004` a D-02a; `RT-015` y `RT-016` no caben en el motor, porque producen un **conjunto de cuotas** y una regla devuelve un importe; `RT-013` y `RT-014` existen como funciones puras fuera del motor | Clasificación de las doce, fila por fila, en el corpus |

**H-12 corrige la premisa de E-5.** El plan decía «se deja en blanco la cifra, no las aristas del
grafo», y da por hecho que las aristas se conocen. **Cuatro de ellas no las bloquea D-02 sino
D-11**: no es que falte el valor del factor, es que no se sabe si el factor existe. Por eso el
corpus no es solo un juego de casos: es un **libro mayor** donde cada caso dice quién lo impide, y
la prueba comprueba que eso sea verdad en las dos direcciones —un caso declarado «sin regla» cuya
regla sí está registrada la pone en rojo—.

### 0.7 E-4, reevaluado con el caso delante

El plan aplazaba el tercer estado `PROVISIONAL` y se comprometía a **reevaluarlo al cerrar #201**,
con un caso concreto en vez de una hipótesis. Ya lo hay, y la recomendación **se mantiene**. Lo que
cambia es que ahora se puede argumentar en vez de recomendar:

| Lo que E-4 prometía | Dónde está hoy |
|---|---|
| Ejercitar el grafo entero con cifras que no son normativas | `CorpusDeCasosTest` y `MotorDeReglasTest`, **en memoria**, sin una sola fila en la base |
| Que una cifra sin valor normativo no produzca un importe que alguien tome por bueno | La comprobación *no se admite un `esperado` si los parámetros son ficticios*, del propio corpus |
| Cuatro piezas: migración con `CHECK` y dos disparadores, `ParametrosDeSimulacion` como tipo, regla de arquitectura con su muestra, y prueba gemela sin el disparador | Sigue sin escribirse, y su coste no ha bajado |

La barrera que justificaba el estado —lo segundo— **existe al coste de una comprobación**, no de
una migración irreversible. Y H-7 sigue en pie: un `parametro_tributario` no sabe si es provisional,
así que el estado por sí solo no impediría que una fila provisional acabara en un conjunto sellado.

**Se reevaluará otra vez si aparece un caso que exija el camino persistido** —una emisión de punta a
punta que no se pueda montar en memoria—. Hoy no aparece, y meter cifras inventadas en la base para
cubrir un camino que ya está cubierto es la antiestrategia de §5.

## 1. Lo que se verificó antes de planificar

Siete hallazgos. Los tres primeros corrigen el inventario de #116; los cuatro últimos cambian lo que
hay que construir.

| # | Hallazgo | Cómo se comprobó |
|---|---|---|
| **H-1** | **Son nueve los issues que esperan solo por norma nacional, no seis.** Sin componente de ordenanza local: #17, #22, #30, #32, #39, #42, #45, #46, #49. Con componente local: #31, #35, #47, #48, #51 —cinco, eso sí coincide— | Recuento sobre la columna «bloqueo real» de la tabla del propio #116 |
| **H-2** | **Son quince issues, no catorce, y las tres listas que existen discrepan.** #43 declara `D-02` en su cuerpo y **no lleva la etiqueta**; la tabla de la épica #58 lo lista y en cambio **omite #39**, que sí la lleva | Consulta de issues por etiqueta (14), contra la fila «D-02» de #58 (14, distinta) y contra el cuerpo de #43 |
| **H-3** | **La partición D-02a/b/c todavía no es una función sobre los 27 datos de NEG-02 §2.** Al menos cuatro no están en ninguna de las tres enumeraciones de GOB-02 —aranceles de terreno, alícuota y tramo inafecto de alcabala, interés y número máximo de cuotas del fraccionamiento— y uno está en la parte discutible: «anuncios» figura en D-02c cuando la tasa la fija una ordenanza ratificada, que es la definición de D-02b | Cruce línea por línea de NEG-02 §2 (27 filas) contra las tres enumeraciones de GOB-02 |
| **H-4** | **`valor_unitario_edificacion` no tiene la dimensión que M02 confirmó.** Su clave es `(municipalidad_id, ejercicio, partida, categoria)`; NEG-05 §RT-002 dice que el cuadro es una matriz **categoría × año de construcción**. Hoy no hay dónde guardar lo que E-3 va a transcribir | `V1__nucleo_y_catastro.sql:400` contra `../srtm` NEG-05 §RT-002 |
| **H-5** | **Tres tablas de dato nacional están claveadas por municipalidad.** `valor_unitario_edificacion`, `depreciacion` y `valor_referencial_vehiculo` llevan `municipalidad_id NOT NULL`, mientras ARQ-09 §2.1 dice que el parámetro nacional va con `municipalidad_id` nulo —como sí hace `parametro_tributario`, el único de los cuatro clasificado como catálogo en la prueba de aislamiento—. Cargar el cuadro del MEF una vez por municipalidad admite que dos tenants tengan copias distintas del mismo cuadro nacional | `V1`, `V2`, `V6__rls.sql:93` y `AislamientoMultiTenantTest:52` |
| **H-6** | **`PoliticaDeRedondeo` no puede expresar D-03c.** Es un par `(escala, modo)` único para todo el cálculo; D-03c trata de **en qué puntos** se redondea, y M02 ya mostró uno intermedio —el metrado redondeado—. Con el tipo de hoy, un punto no observado no falla: simplemente no redondea, y produce un importe plausible | `PoliticaDeRedondeo.java` contra GOB-02 §D-03c y NEG-05 §RT-005 |
| **H-7** | **El estado `PROVISIONAL` de E-4 no se sostiene solo en el conjunto.** Un `parametro_tributario` no sabe si es provisional: la fila vive fuera del conjunto y `conjunto_parametro_detalle` la referencia. Nada impediría que una fila cargada como provisional entrara después en un conjunto que sí se sella | `V1` (las tres tablas), `V9__conjuntos_sellados.sql` y `ParametrosRepository.agregarParametro` |

Lo que **se confirmó tal como #116 lo dice**: los cinco issues bloqueados por ordenanza local; que
cuatro issues declaran en su propio cuerpo que la parte bloqueada está fuera de su alcance (#17 y
#22 en «Fuera de alcance», #45 y #46 en «Bloqueos») —y hay un quinto, #30, que enumera al final lo
que sí se puede hacer—; y que las etiquetas `bloqueado:D-02a`, `bloqueado:D-02b` y `bloqueado:D-02c`
**no existen** en el repositorio: hay que crearlas.

## 2. Inventario corregido

«Alcance implementable hoy» es lo que se puede escribir **sin una sola cifra normativa**.

| Issue | Parte de D-02 que bloquea | Otros | Alcance implementable hoy | Paquete |
|---|---|---|---|---|
| #17 tablas de valuación | D-02a | D-11 | Todo el issue, **más la dimensión que falta** (H-4): estructura, versión nueva, sellado, consulta por ejercicio | E-2, E-3 |
| #22 `deudaActualizadaA(fecha)` | D-02c (TIM, reajuste) | D-03 | Toda la función: recorrido del libro, desglose, fecha como argumento, pureza | E-2, E-7 |
| #30 determinación predial | D-02a | D-03c, D-11, D-12, D-01 | Detalle por predio, imposibilidad de emitir por predio, esqueleto de reglas, corpus sin cifras | E-2, E-5 |
| #31 arbitrios | **D-02b** | D-03 | Cuotas del ejercicio, cambio de uso a mitad de año, exclusión por servicio, idempotencia | E-2, E-6 |
| #32 vehicular, alcabala, espectáculos | D-02a (vehicular, alcabala) + D-02c (espectáculos) | D-03 | Modo simulación que no escribe, plazo de afectación, elección de base con su fundamento | E-2 |
| #35 fraccionamiento | **D-02b** (interés y máximo de cuotas) | D-03 | Preconvenio, cuotas, anulación, quiebre y devolución de fase | E-2, E-6 |
| #39 notificación y prescripción | D-02c (plazos) | D-05 | Acuse, no hallado, reintento, pase a coactiva idempotente | E-2 |
| #42 costas y fraccionamiento coactivo | D-02c (arancel) ‹confirmar: si lo fija ordenanza pasa a D-02b› | — | La costa como cargo en el libro, el quiebre coactivo, las consultas con su fecha | E-1, E-2 |
| #43 catálogos de infracciones | D-02c (tránsito) + **D-02b** (CUIS) | — | **Todo el issue**: ninguno de sus cinco criterios de aceptación nombra una cifra. Es el ejemplo de la forma a la que E-2 lleva a los demás | E-1 |
| #45 actas de fiscalización | D-02a | D-03, D-11 | Casi todo: programación, acta, copia versionada, «no toca el padrón» | E-2 |
| #46 papeleta de tránsito | D-02c (tabla) + D-02a (UIT) | — | Casi todo: registro con los importes del acta física, desglose guardado, cambio de número, búsqueda | E-2 |
| #47 papeleta administrativa | **D-02b** (CUIS, plazo) + D-02a (UIT) | — | Notificación previa, subsanación, papeleta sin notificación, modelo compartido con tránsito | E-2, E-6 |
| #48 FUE de edificación | **D-02b** (TUPA) + D-02a (valores unitarios) | D-05 | Las secciones del FUE, ampliación, revalidación | E-2, E-6 |
| #49 liquidación de fiscalización | D-02a + D-02c (multa tributaria) | D-03, D-11 | Comparación hallado/declarado, reliquidación, omisos frente a extemporáneos | E-2 |
| #51 anuncios y propaganda | **D-02b** (H-3: hoy GOB-02 lo pone en D-02c) | — | Registro, idempotencia del cargo, cese sin borrar lo pasado | E-1, E-6 |

## 3. Los siete paquetes

Se conservan los identificadores `E-n` de #116 para no romper las referencias.

### E-1 · El mapa normativo, y el reetiquetado que sale de él

**El reetiquetado no es el trabajo: es la consecuencia.** Hoy no existe la tabla que dice qué norma
fija cada uno de los 27 datos de NEG-02 §2, y sin ella asignar `D-02a`/`b`/`c` a un issue es una
conjetura (H-3).

**Entregable**

1. En [`docs/10-negocio/marco-normativo.md`](../10-negocio/marco-normativo.md) §2, dos columnas
   nuevas en las 27 filas: **norma que lo fija** (rango, número y artículo) y **parte de D-02**. El
   dato que no se pueda asignar sin leer la norma queda `‹POR CLASIFICAR›`: es trabajo de E-3, no de
   E-1, y se ve.
2. Las cuatro filas que hoy no cubre ninguna parte (H-3) entran donde corresponda, y GOB-02 recoge
   la enumeración corregida.
3. Tres etiquetas nuevas —`bloqueado:D-02a`, `bloqueado:D-02b`, `bloqueado:D-02c`, color `ededed`,
   el de la actual— aplicadas **por partes**: un issue lleva todas las que lo bloquean (#32 lleva
   `a` y `c`). `bloqueado:D-02` se retira y se borra cuando ya no tenga issues.
   **Y la etiqueta solo se conserva si algo dentro del alcance declarado del issue necesita una
   cifra**: por eso #17 y #22 la pierden entera —su «Fuera de alcance» ya excluye las cifras— y #43
   nunca debió llevarla.
4. Las tres listas se reconcilian (H-2): #43 entra al inventario y la fila «D-02» de la épica #58 se
   reconstruye desde las etiquetas, no a mano.

**Criterios de aceptación**

- [ ] Ningún issue abierto lleva `bloqueado:D-02`.
- [ ] Todo issue etiquetado `bloqueado:D-02x` tiene al menos una fila del mapa que lo nombra, y toda
      fila del mapa nombra los issues que la esperan o dice «ninguno todavía». Se comprueba en las
      dos direcciones, como el contrato de la API.
- [ ] Las 27 filas tienen norma y parte, o `‹POR CLASIFICAR›` con motivo.
- [ ] La fila «D-02» de #58 coincide exactamente con las etiquetas.

**Cómo se demuestra que puede fallar:** quitar un issue de una fila del mapa dejándolo etiquetado —o
al revés— y la comprobación cruzada lo señala. Si se automatiza, va como
`docs/10-negocio/verificar-mapa-normativo.mjs`, junto a `generar-catalogo.mjs`, que es el precedente
de script de documentación en este repositorio.

**Tamaño:** S. **No requiere autorización.**

### E-2 · Partir cada issue en la frontera estructura/valor

La frontera ya existe en el código:
[ADR-0007](../30-arquitectura/adr/ADR-0007-parametros-versionados.md) separa el dato normativo de la
regla, y `ParametrosSellados` entra **como argumento**. Falta reflejarla en el tablero.

**La regla de corte, que es lo que hace el reparto decidible:** si el criterio de aceptación se
puede escribir **sin nombrar un importe**, es estructura. Si necesita una cifra esperada, es valor.
Aplicada a #43 da cero criterios de valor —por eso #43 nunca debió estar bloqueado— y aplicada a
#30 deja fuera solo la cifra de cada regla.

**Entregable**

Cada issue mixto pasa a padre con dos sub-issues (GitHub los soporta; la épica #58 es el precedente
de jerarquía):

| Hijo | Etiquetas | Contiene |
|---|---|---|
| «… — estructura» | las del padre, **sin** bloqueo | Modelo, migración, RLS, endpoints, idempotencia, auditoría, pruebas contra PostgreSQL y **las filas del corpus de E-5 de sus reglas, con la columna vacía** |
| «… — cifras» | `bloqueado:D-02x` | La regla que produce el importe, la columna «esperado» del corpus y la prueba de reproducibilidad al céntimo |

**Se parten doce**: #30, #31, #32, #35, #39, #42, #45, #46, #47, #48, #49 y #51 —veinticuatro hijos
bajo doce padres que quedan como contenedor—.

**Tres no se parten, y por motivos distintos:** #17 y #22 solo pierden la etiqueta, porque su propio
«Fuera de alcance» ya excluye las cifras y lo que queda del issue es entero; #43 nunca debió
llevarla, y lo que se corrige es su sección «Bloqueos».

**Criterios de aceptación**

- [ ] Ningún hijo «estructura» lleva etiqueta de bloqueo.
- [ ] Ningún hijo «estructura» tiene un criterio de aceptación que nombre un importe.
- [ ] Cada hijo «estructura» enumera las filas del corpus que entrega (contención del riesgo: sin
      eso, «estructura terminada» no se puede probar de punta a punta).
- [ ] El padre no se cierra hasta que cierran los dos hijos.

**Cómo se demuestra que puede fallar:** un hijo «estructura» con un criterio que exija una cifra
queda visible en la revisión del propio issue —y si se automatiza, la comprobación es un `grep` de
importes en los criterios de los issues sin etiqueta de bloqueo—.

**Tamaño:** M, casi todo trabajo de tablero. **Depende de E-1.** **No requiere autorización.**

### E-3 · Cerrar D-02a: buscar, transcribir y firmar

GOB-02 lo dice: D-02a **no se decide, se busca**. Son normas nacionales publicadas.

**Entregable:** `docs/10-negocio/valores-normativos/`, un archivo por norma, con esta cabecera
obligatoria —la doble verificación de ADR-0007 empieza en el documento, antes de existir como fila—:

```markdown
| Campo | Valor |
|---|---|
| Norma | D.S. 156-2004-EF, TUO de la Ley de Tributación Municipal |
| Artículo | 13 |
| Publicada | 2004-11-15, El Peruano |
| Ejercicios que rige | 2004 en adelante |
| Transcribió | ‹nombre›, ‹fecha› |
| Verificó | ‹nombre distinto›, ‹fecha› |
| Estado | TRANSCRITO · VERIFICADO |
```

Y tres secciones fijas: **la tabla tal como está en la norma** —sin reordenar, sin convertir
unidades, sin «arreglar» un encabezado—; **cómo entra al sistema**, nombrando el `tipo` y la `clave`
de `parametro_tributario` o la tabla específica que la recibe; y **qué no cabe hoy**, que es donde
se anota H-4: el cuadro de valores unitarios tiene una dimensión —año de construcción— que la tabla
actual no guarda.

Archivos previstos: `uit.md`, `predial-tramos-y-alicuotas.md`, `predial-deducciones.md`,
`predial-plazos-de-pago.md`, `predial-inafectaciones.md`, `valores-unitarios-‹ejercicio›.md`,
`depreciacion.md`, `aranceles-‹ejercicio›.md`, `vehicular-valores-referenciales-‹ejercicio›.md`,
`alcabala.md`.

**El arancel tiene una particularidad que conviene decir antes de empezar:** la norma es nacional
—resolución del sector Vivienda— pero sus valores están referidos a las vías de cada localidad. Su
transcripción es por municipalidad y necesita las vías cargadas (#16); no necesita D-01.

**Criterios de aceptación**

- [ ] Ningún archivo con transcriptor igual a verificador, ni sin fecha de publicación.
- [ ] Ninguna cifra sin norma y artículo al lado.
- [ ] Toda fila `‹VERIFICAR›` de NEG-02 §2 asignada a D-02a apunta al archivo que la cierra.
- [ ] **Ninguna fila cargada en la base.** Cargar es un paso posterior y depende de D-13 (§4).

**Cómo se demuestra que puede fallar:** poner el mismo nombre en «transcribió» y «verificó», o dejar
la fecha de publicación vacía, y la revisión —o el script, si se automatiza— rechaza el archivo.

**Tamaño:** L, y es transcripción legal, no programación. **No depende de D-01.** **Es la de mayor
rendimiento por unidad de esfuerzo, y la única que nadie está esperando para empezar.**

### E-4 · El tercer estado `PROVISIONAL` — con recomendación de **no hacerlo todavía**

**Recomendación: aplazarlo, y reevaluarlo cuando E-5 esté terminado.** El motivo es medible: la
cobertura de punta a punta que E-4 promete ya existe en el nivel donde importa. `MotorDeReglasTest`
arma sus propios `ParametrosSellados` en memoria —`parametrosFicticios()`, con claves llamadas
`FICTICIO` y conceptos `RAMA_UNO`/`RAMA_DOS` para que nadie los confunda con el predial— y ejercita
el grafo, la convergencia, la agregación por contribuyente y el fallo por parámetro ausente, sin
base de datos y sin una sola cifra normativa. Lo que E-4 añade sobre eso es el **camino
persistido**, a cambio de meter cifras sin valor normativo en la base de producción. El intercambio
no se justifica hasta que aparezca un camino de emisión que no se pueda cubrir en memoria; entonces
la decisión tendrá delante el caso concreto y no una hipótesis.

**Si aun así se aprueba, esta es la forma mínima, y H-7 dice por qué no basta con el estado del
conjunto:**

1. **Base.** `V15__conjunto_provisional.sql`: el `CHECK` de `conjunto_parametros.estado` admite
   `PROVISIONAL`; `parametro_tributario` gana `origen varchar(12) NOT NULL DEFAULT 'NORMATIVO' CHECK
   (origen IN ('NORMATIVO','PROVISIONAL'))`; un disparador rechaza la transición `PROVISIONAL →
   SELLADO` —**no existe**: para sellar hay que recargar con documento fuente—; y otro rechaza un
   parámetro `PROVISIONAL` en un conjunto que no lo es. Al revés sí se admite: un conjunto
   provisional lleva las cifras reales que ya haya y las inventadas que le falten —es el caso
   realista—, y por eso lo que se prohíbe no es su contenido sino su sellado.
2. **Tipo, no bandera.** `ParametrosDeSimulacion` es un **tipo distinto** de `ParametrosSellados`,
   no un `boolean` dentro de él. Una bandera se puede ignorar; un tipo no compila en el camino
   equivocado. `EntradaDeCalculo` pasa a recibir la interfaz común y **la emisión sigue exigiendo
   `ParametrosSellados`**.
3. **Regla de arquitectura con su muestra.** Ninguna clase que emita —determinación, valor, asiento—
   puede depender del paquete de simulación, con
   `muestras/MuestraDeEmisionConParametrosProvisionales` violándola, como exige ARQ-04.
4. **Demostración.** Contra PostgreSQL: sellar un conjunto provisional falla; agregar un parámetro
   provisional a un conjunto abierto falla; `LectorDeParametros.vigenteEn` no devuelve un
   provisional. Y la prueba gemela: **quitando el disparador, la emisión con cifras inventadas
   ocurre de verdad** —igual que la guardia del pool—.

Sin las cuatro, esto es la antiestrategia de §5 y no debe escribirse.

**Tamaño:** L. **Exige decisión explícita.**

### E-5 · El corpus de casos, ejecutable desde el primer día

#30 pide «casos de prueba con las cifras esperadas en blanco». Escrito así, un corpus sin cifras no
verifica nada. Hay una forma en que sí: **las cifras se dejan en blanco, pero las aristas del grafo
no.** Con parámetros ficticios se puede comprobar hoy, sin cerrar D-02, que cada caso aplica
exactamente las reglas que declara y produce exactamente los conceptos que declara.

**Entregable:** `backend/sgtm-parametros/src/test/resources/casos/RT-xxx.csv`, un archivo por regla,
con estas columnas:

| Columna | Contenido | ¿Bloqueada por D-02? |
|---|---|---|
| `caso` | `RT-013-c03` | No |
| `descripcion` | El caso borde de NEG-05 §2 que cubre | No |
| `ejercicio` | Del hecho imponible | No |
| `entradas` | Áreas, antigüedad, `% propiedad`: datos del predio, no cifras normativas | No |
| `parametros_requeridos` | Las claves que la regla pide, **sin sus valores** | No |
| `reglas_esperadas` | Qué `RT-xxx` deben haberse aplicado | No |
| `conceptos_esperados` | Qué conceptos deben existir al final | No |
| `esperado` | El importe | **Sí — vacío hasta D-02a** |
| `fuente_del_esperado` | SRTM del MEF, M02, liquidación real | **Sí** |

**Lo que la prueba exige ya, con la columna vacía:**

- [ ] Cada `RT-001`…`RT-016` tiene al menos un caso, y cada caso borde de NEG-05 §2 tiene su fila.
- [ ] Con parámetros ficticios, el motor aplica **exactamente** `reglas_esperadas` y produce
      **exactamente** `conceptos_esperados`. Ni una regla de más, ni un concepto de menos.
- [ ] `parametros_requeridos` coincide con lo que la regla pide de verdad: se corre con un
      `ParametrosSellados` vacío y se recogen las `ParametroAusente`; la lista tiene que coincidir
      exactamente. **Esto convierte la columna en verificada, y le dice a E-3 qué hay que
      transcribir**: el inventario de parámetros deja de ser una lista escrita a mano.
- [ ] Cuando `esperado` se llena, exige `fuente_del_esperado` y la comparación es al céntimo.
- [ ] El build imprime cuántos casos siguen `SIN_CIFRA`. Bajar ese número es el progreso de D-02a;
      subirlo sin querer se ve.

**Cómo se demuestra que puede fallar:** quitar una arista declarada de un caso, o registrar una
regla de más en el catálogo, y la comprobación de forma se pone roja; llenar un `esperado` con una
cifra equivocada y la comparación al céntimo se pone roja; declarar un parámetro que la regla no
pide y la comprobación de `parametros_requeridos` se pone roja.

**Es además el insumo de `CAL-02`.** **Tamaño:** M. **No requiere autorización.**

### E-6 · Municipalidad de demostración para lo que bloquea D-02b

Cinco issues esperan una ordenanza local **y su ratificación provincial**. Pero el sistema es
multi-municipal: una ordenanza **real, publicada y ratificada** de cualquier municipalidad se puede
cargar en un tenant de demostración con su documento fuente auténtico. El aislamiento ya está
verificado, así que los dos conjuntos conviven.

**Entregable**

1. La ordenanza elegida y su acuerdo de ratificación provincial, transcritos con la cabecera de E-3
   en `docs/10-negocio/valores-normativos/arbitrios-‹municipalidad›-‹ejercicio›.md`.
2. `municipalidad.es_demostracion boolean NOT NULL DEFAULT false`, en migración. El hecho vive en la
   base, no en configuración: una bandera de despliegue no viaja con el dato.
3. Todo documento emitido bajo un tenant de demostración sale marcado como tal.
4. La siembra del tenant **no está en el classpath del perfil por omisión**, con la comprobación que
   lo verifica —el precedente es `comprobar-compilaciones` del frontend, que demuestra que el juego
   de datos simulado no llega a producción—.

**Condiciones que no se negocian:** la ordenanza es real y está ratificada —inventar una es
exactamente lo que D-02 prohíbe— y el tenant de demostración no emite contra ningún contribuyente
real.

**Cómo se demuestra que puede fallar:** poner la siembra en el perfil por omisión y la comprobación
de compilaciones se pone roja; quitar la marca del documento y la prueba del documento emitido se
pone roja.

**Tamaño:** M. **Exige elegir la ordenanza.**

### E-7 · La campaña de observación de D-03c, y lo que se puede construir antes

No es D-02, es el bloqueo que comparten #22, #30, #45 y #49, y el más lento. Pero tiene una parte de
código que **no depende de la observación** y que hoy falta (H-6).

**Entregable 1 — el tipo que puede expresar la respuesta.** `PoliticaDeRedondeo` es hoy un par
`(escala, modo)` para todo el cálculo. D-03c trata de **puntos**. Se introduce `PuntoDeRedondeo`,
uno por cada punto candidato que las secuencias de NEG-05 revelan —valor unitario con el 5 %, valor
unitario depreciado, valor por nivel, metrado de obras complementarias, valor de obra, autovalúo del
predio, `% actualización`, `% propiedad`, base del contribuyente, tramo, impuesto anual, cuota,
reajuste, interés—, y la política se resuelve **por punto**. Un punto sin política es una excepción,
nunca «no redondear»: hoy el modo de falla es silencioso, porque no redondear también produce un
importe plausible.

**Entregable 2 — el formulario de la campaña.** `docs/10-negocio/observaciones-srtm-mef/`, una ficha
por determinación observada: predio y sus características, el desarrollo intermedio que la pantalla
muestra, y qué punto de la lista revela. GOB-02 §«Cómo se cierra D-03c» ya fija el procedimiento en
dos pasos para no usar el mismo contraste que descubre y que valida.

**Entregable 3 — el resultado como dato.** Cada punto observado entra como parámetro
(`REDONDEO:‹punto›` → escala y modo), no como código. Escribirlo a mano ya lo detecta el escáner de
fuentes.

**Cómo se demuestra que puede fallar:** quitar un punto de la política y el cálculo falla en vez de
seguir sin redondear; compilar una política a mano y el escáner la detecta —ya lo hace hoy—.

**Tamaño:** M el código, indeterminado la campaña. **Depende de acceso al SRTM del MEF, no de
D-01.**

## 4. Lo que hay que decidir antes de empezar

| # | Decisión | Quién | Recomendación |
|---|---|---|---|
| 1 | **E-4 `PROVISIONAL`: sí o no** | Dirección | **No todavía.** Reevaluar al terminar E-5, con el caso concreto delante (§E-4) |
| 2 | **E-6: qué ordenanza** | Rentas | Cualquiera real y ratificada; la elección es lo único que falta |
| 3 | **D-13 (nueva): ámbito de las tablas de valuación** | Arquitectura | H-5. Decide si el cuadro nacional se carga una vez con `municipalidad_id` nulo o una vez por municipalidad. **Bloquea la carga de E-3, no su transcripción** |
| 4 | **H-4: la dimensión que falta** | Arquitectura + Catastro | Entra en el hijo «estructura» de #17. Sin ella, E-3 transcribe a una tabla que no puede guardarlo |
| 5 | **H-3: anuncios y costas coactivas** | Rentas + asesoría legal | Se resuelve con la fuente en la mano, dentro de E-1 |

## 5. Lo que no se hace

- **Cifras inventadas «provisionales» sin un estado que impida emitir con ellas.** Es E-4 sin sus
  cuatro contenciones.
- **La alícuota detrás de una bandera de configuración.** Un archivo no tiene vigencia, ni documento
  fuente, ni doble verificación, ni se audita (ADR-0007, «Alternativas consideradas»).
- **Implementar y corregir después.** Una implementación de regla ya usada en una emisión no se
  modifica nunca; se crea otra con su rango de vigencia. «Después» cuesta un padrón.
- **Saltarse el documento fuente porque es de prueba.** Cargar sin documento fuente falla, y esa
  falla es una funcionalidad.

## 6. Orden

| Orden | Paquete | Desbloquea | Depende de |
|---|---|---|---|
| 1 | **E-7** (entregables 1 y 2) y **E-3**, en paralelo | el camino crítico de cuatro issues; #17, #45, #49 | nada; E-7 necesita acceso al SRTM del MEF para su campaña |
| 2 | **E-1** | #17 y #22 enteros, y #43 que nunca estuvo bloqueado; del resto, hace visible qué espera a qué | nada |
| 3 | **E-2** | los doce restantes, cada uno por su mitad de estructura | E-1 |
| 4 | **E-5** | hace terminables las mitades «estructura» de E-2 | E-2 |
| 5 | **E-6** | #31, #47, #51; parte de #35 y #48 | ordenanza elegida |
| 6 | **E-4**, si se decide | el extremo a extremo persistido de #30 y #31 | decisión explícita |

E-1, E-2, E-3, E-5 y los entregables de código de E-7 no requieren autorización de nadie y no pueden
hacer daño: no cargan una sola cifra.

## 7. Referencias

- [GOB-02 — Decisiones abiertas](decisiones-abiertas.md), §«Por qué D-02 bloquea de verdad» y
  §«Cómo se cierra D-03c».
- [NEG-02 — Marco normativo](../10-negocio/marco-normativo.md) §2: las 27 líneas `‹VERIFICAR›`.
- [ADR-0007 — Parámetros tributarios versionados y sellados](../30-arquitectura/adr/ADR-0007-parametros-versionados.md).
- [CAL-01 — Estrategia de pruebas](../A0-calidad/estrategia-de-pruebas.md).
- `../srtm` NEG-05 §0.1, §1, §5 y §6, y ARQ-09 §1.4, §2 y §3.
- Issues [#116](https://github.com/hneyra/sgtm/issues/116) y [#58](https://github.com/hneyra/sgtm/issues/58).
