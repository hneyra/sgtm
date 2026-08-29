# Rentas · Registro — tres superficies uniformes

Maquetas de alta fidelidad sobre el design system Juris PE, hechas **con los valores reales del
producto**: colores, tipografías, alturas de control, radios y espaciados salen de
`frontend/packages/design-system/src/estilos/tokens/` y de
`frontend/apps/backoffice/src/estilos/aplicacion.css`, no aproximados. La estructura medida
—filtros, pestañas, secciones, campos y acciones de cada pantalla— sale de
`frontend/apps/backoffice/src/catalogo/pantallas/rentas-registro.generado.ts`, y **las cifras de
ejemplo son las del propio prototipo** (`design/sgtm-data-1.js`): no se inventó ni un importe.

| Artboard | Qué propone |
|---|---|
| [`Main.dc.html`](Main.dc.html) | El diagnóstico: las quince medidas y tres defectos, no impresiones |
| [`PropuestaA.dc.html`](PropuestaA.dc.html) | **A — Simplificar.** La emisión del ejercicio (4 opciones → 1 superficie) |
| [`PropuestaB.dc.html`](PropuestaB.dc.html) | **B — Unificar.** El acto de transferencia, con su alcabala dentro (3 → 1) |
| [`PropuestaC.dc.html`](PropuestaC.dc.html) | **C — Reagrupar.** Los movimientos de deuda (2 → 1) |
| [`Anatomia.dc.html`](Anatomia.dc.html) | La espina: vocabulario de acción, un sujeto, y el menú que no se encoge |

Las tres son **solo frontend** e **independientes**: se pueden adoptar por separado, y el coste
crece C → B → A. Ninguna toca rutas, permisos ni etiquetas del catálogo: las 134 opciones siguen
siendo 134 y `rentas-registro.generado.ts` no se edita a mano.

Las tres son **pulsables** en el canvas: cambian de hoja.

## Qué NO es esto

[#393](https://github.com/hneyra/sgtm/issues/393) ya cerró, para este módulo, la reagrupación por
tarea, la anatomía común de las cinco determinaciones y el expediente predial en la ficha 360°. Su
registro visual está en [`../rentas-predial/`](../rentas-predial/README.md) y **nada de eso se
rehace aquí**.

Lo que #393 no tocó es la **superficie**: las quince siguen siendo quince pantallas, cada una con su
barra de filtros y su forma. Eso es lo que estas tres pliegan, con el mismo mecanismo que
[#391](https://github.com/hneyra/sgtm/issues/391) usa en catastro.

## El diagnóstico, medido sobre el catálogo

| Opción | Forma | Filtros | Pestañas | Campos | Acciones |
|---|---|---|---|---|---|
| `contribuyentes` | pestañas + tabla | 4 | **9** | 56 | 4 |
| `predios_rentas` | 2 secciones + tabla | 4 | — | 15 | 3 |
| `vehiculos` | pestañas + tabla | **5** | **6** | 54 | 5 |
| `declaracion_jurada` | 1 sección + tabla | 4 | — | 5 | 2 |
| `predial_individual` | 3 secciones + tabla | **5** | — | 19 | 3 |
| `predial_masivo` | 1 sección + tabla | 0 | — | 8 | 3 |
| `arbitrios` | tabla + totales | 4 | — | 0 | 2 |
| `vehicular_calculo` | tabla + totales | 3 | — | 0 | 3 |
| `transferencia_predio` | 2 secciones planas | 0 | — | 14 | 2 |
| `transferencia_vehiculo` | 2 secciones planas | 0 | — | 13 | 2 |
| `alcabala` | 1 sección + totales | 0 | — | 13 | 3 |
| `espectaculos` | 1 sección + tabla | 4 | — | 14 | 3 |
| `beneficios` | 1 sección + tabla | 3 | — | 11 | 3 |
| `alta_deuda` | 1 sección plana | 0 | — | 15 | 2 |
| `baja_deuda` | 1 sección + tabla | 3 | — | 6 | 2 |

Cinco formas para el mismo trabajo, treinta y nueve filtros en diez barras, y tres etiquetas para un
solo dato: el ejercicio se llama «Año» en cuatro pantallas, «Ejercicio» en dos y «Ejercicio a
calcular» en una. Y tres defectos concretos:

1. **Las dos transferencias son la misma pantalla dos veces**, y el prototipo lo delata solo:
   `transferencia_predio` y `alcabala` llevan **el mismo expediente `2026-0918` y la misma fecha
   `2026-07-18`**. El mismo dato tiene dos claves y dos rótulos —`nDeExpediente` frente a
   `nroDeExpediente`, «Fecha del acto» frente a «Fecha de transferencia», «Partes intervinientes»
   frente a «Partes»—, y el documento que sustenta el acto es **texto libre** en una (notaría y
   número de minuta) y un **desplegable de cuatro** en la otra. Una de las dos no valida nada. Y la
   de predio *valida* la deuda del transferente sin enseñarla; la de vehículo la dibuja en un campo.
2. **El sujeto se vuelve a fijar en diez barras, con tres nombres.** `codContribuyente` en ocho
   pantallas, `contribuyente` en beneficios —que usa **los dos a la vez**, uno en el filtro y otro en
   el campo—, `organizador` en espectáculos, y en arbitrios no existe: se pregunta por el código
   predial. Una atención de predial fija el mismo contribuyente
   `00000025673` en «Predios», en «Declaración jurada» y en «Cálculo individual», las tres con los
   mismos dos predios detrás.
3. **`predios_rentas` dibuja «Nuevo» y «Guardar» sobre una operación de lectura — y no lo
   dice.** Su primaria es «Ver ficha catastral», que cae en `DE_SALIDA`, así que
   `impedimentoDelActo` devuelve `undefined` y no se dibuja ninguna franja. Es el defecto que
   [#385](https://github.com/hneyra/sgtm/issues/385) acaba de cerrar en `alcabala` y `espectaculos`,
   vivo en otra pantalla del mismo módulo.

## A — La emisión del ejercicio

`predial_individual`, `predial_masivo`, `arbitrios` y `vehicular_calculo` en una superficie con
cuatro hojas y **un solo selector de ejercicio** arriba. #393 ya les dio la anatomía —sujeto, memoria
del cálculo, acto—; esto la convierte en el marco en vez de en cuatro copias del marco.

**Lo que gana hoy, sin backend nuevo:** el ejercicio se pregunta una vez y con un nombre; el
contribuyente viaja entre las dos hojas que lo comparten; y las cuatro franjas de «la determinación
la hace el servidor» pasan a ser una, que es lo que evita que se lean como cuatro averías distintas.

**Por qué va la última:** ninguna de las cuatro puede escribir hoy, y ninguna por el mismo motivo.
Individual, masivo y vehicular tienen la causa `sin-determinacion` —su primaria pide un cálculo que
ninguna declara escritura—; arbitrios es un `GET`, así que su «Emitir cuponera» no tiene a dónde
escribir. Desde #395 y #399 las tres primeras **simulan**, pero asentar la determinación sigue sin
poder pedirse: es lo que cierra [#445](https://github.com/hneyra/sgtm/issues/445). Hasta entonces la
superficie es un marco de lectura y de simulación.

**Lo que no se hace:** llevar el contribuyente a la hoja de arbitrios. Su contrato no tiene ese
filtro, y declararlo sería inventar contrato (ADR-0010 §4). Se dice en la cabecera —esa hoja se
pregunta por predio— en lugar de disimularlo.

## B — El acto de transferencia, con su alcabala dentro

Una anatomía constante —**Acto · Objeto · Partes · Liquidación**— y una modalidad que decide qué se
transfiere. «Datos del acto» y «Partes intervinientes» se dibujan **una vez**, así que no hay dos
sitios donde el mismo dato pueda llamarse de dos maneras: el vocabulario divergente muere por
construcción y no por revisión, que es el mismo mecanismo de la propuesta A de catastro.

La alcabala deja de ser una pantalla a la que hay que navegar y volver a teclear el expediente: es
la hoja que abre la casilla «Genera alcabala» del acto que se acaba de registrar.

**Lo que cierra sola:** `ACTOS_SIN_CAMPO` le declara hoy a `alcabala` dos datos que faltan,
`transferenciaId` y `autoavaluoAjustado`. El primero **es** la transferencia recién registrada: la
superficie lo tiene. El segundo sigue sin publicarse. La primaria de esa hoja **sigue apagada**, y la
franja pasa a nombrar un dato en vez de dos — media causa resuelta no es ninguna causa resuelta.

**Qué hay que decidir antes:** qué rótulo lleva el bloque compartido. Los rótulos no se reescriben
(RNF-080) y aquí hay dos para el mismo dato —«Nº de expediente» / «Nro. de expediente», «Fecha del
acto» / «Fecha de transferencia», «Transferente afecto hasta» / «Afecto hasta»—. Dibujar el bloque
una vez obliga a que gane una de las dos columnas. El artboard usa la del predio, y **eso no está
decidido**: es a esta propuesta lo que el identificador de apertura es a la A de catastro.

## C — Los movimientos de deuda

`alta_deuda` y `baja_deuda` tocan el mismo objeto —una obligación de la cuenta corriente— con dos
actos opuestos, y se dibujan al revés la una de la otra: la baja **elige** sus filas de una rejilla
(#332), el alta las **teclea** en quince campos. El prototipo lo enseña sin querer: el alta escribe
`02-014-D-14-01` en «Unidad», y ese código es una de las filas que la baja lista.

Una superficie, dos hojas, el sujeto fijado una vez arriba y la cuenta corriente leída una vez de
`consulta_deuda` —que es de donde la baja ya saca sus filas—. **En el alta la rejilla es contexto, no
selección:** enseña lo que ya se le debe, que es lo que impide dar de alta por segunda vez una
obligación que el libro ya tiene, y nada de lo que hay ahí viaja en el cuerpo.

**Por qué es la más barata:** de las tres, es la única en la que los dos actos escriben de verdad
hoy —`alta_deuda` y `baja_deuda` están las dos declaradas en `escrituras.ts`, con su lista blanca
por campo—. La superficie no hereda ningún impedimento: las dos primarias son navy porque las dos
guardan, y ninguna franja tiene nada que explicar.

**Dónde se implementa:** un componente propio en `pantallas/rentas/`, registrado en
`COMPONENTES_PROPIOS` de `Pantalla.tsx` para las dos opciones, con la hoja activa decidida por la
ruta. Es el patrón que estrenó `catastro/Territorio.tsx`: las pestañas son enlaces, así que el
permiso lo sigue decidiendo el guardia y el enlace sigue siendo compartible.

## La espina, transversal a las tres

**El vocabulario de acción ya está escrito en el código** —`accionesDeLaBarra` y
`VOCABULARIO_UNIFORME`, de #391 §2—. Lo que este canvas aporta es qué haría esa regla sobre las
quince de rentas, calculado con sus patrones reales:

**Las tres que sí son el mismo caso que las fichas de catastro** son las tres lecturas del padrón.
Las tres son `GET`, ninguna declara escritura, y la regla les quita **ocho botones**: tres «Guardar» que no
pueden guardar, tres «Nuevo» que no abren ningún alta y dos «Modificar», que son un modo.

| Opción | La barra del catálogo | Con la regla |
|---|---|---|
| `contribuyentes` | ~~Nuevo~~ · ~~Modificar~~ · Imprimir · ~~Guardar~~ | Imprimir — sin primaria |
| `predios_rentas` | ~~Nuevo~~ · ~~Guardar~~ · Ver ficha catastral | Ver ficha catastral — sin primaria |
| `vehiculos` | ~~Nuevo~~ · ~~Modificar~~ · Excel · Imprimir · ~~Guardar~~ | Excel · Imprimir — sin primaria |

Eso cierra de paso el **defecto 3**: `predios_rentas` deja de prometer un alta y un guardado sobre
un guardado que su `GET` no puede hacer. Lo que la regla **no** arregla es que «Excel» sobreviva sin descargar
nada: solo dos descargas están cableadas en todo el sistema (`ficha_contribuyente_reporte` y
`constancia`), que es el hallazgo A1 de #413 y no es de este módulo.

**Y las otras doce se quedan fuera, porque extender la lista a las quince borra nueve actos reales
del manual** y deja una pantalla sin barra:

| Opción | Lo que la regla se llevaría | Por qué |
|---|---|---|
| `beneficios` | Registrar · Denegar · Aprobar | las tres escriben y ninguna está declarada: **barra vacía** |
| `predial_masivo` | Ejecutar proceso | `DE_CALCULO` deja «ejecutar» fuera a propósito |
| `arbitrios` | Emitir cuponera de arbitrios | emitir no es cálculo ni salida, y la opción es `GET` |
| `vehicular_calculo` | Emitir cuponera | igual que arbitrios |
| `declaracion_jurada` | Vista previa | `DE_SALIDA` conoce «previsualizar», no «vista previa» |
| `alcabala` | Generar orden de pago | escribe y no está declarada |
| `espectaculos` | Registrar | escribe y no está declarada |

Es el mismo caso que #413 dejó anotado para «Inactivar» del catálogo vial: **que un acto real deje
de dibujarse es una decisión deliberada**, no una que se cuela dentro de una regla escrita para otra
cosa. La regla se hizo para cuatro fichas de consulta; rentas es un módulo que escribe. Y una de las
siete es de la regla misma y no del módulo: `DE_SALIDA` no reconoce «Vista previa», una de las siete
etiquetas que #393 ya había contado para el mismo gesto.

### El menú no se encoge, y conviene decirlo

**Rentas · Registro se queda en cuatro grupos y quince entradas.** No hay ningún grupo que plegar:
`centroDeReportesDe` (en `frontend/scripts/grupos-por-tarea.mjs`) pliega el grupo cuyas hojas **solo
se emiten**, y en rentas los cuatro grupos mezclan lecturas con actos; plegar cualquiera escondería
trabajo detrás de una entrada que dice «Reportes».

Por eso las tres propuestas se implementan **a nivel de pantalla, no de navegación**, igual que las
de catastro: las quince rutas siguen en el menú y todas caen en su superficie con la hoja activa que
les toca. Lo que cambia no es cuántas entradas hay, sino cuántas veces hay que volver a empezar al
pasar de una a otra.

## Estado

| Parte | Estado |
|---|---|
| **La espina** — las tres del padrón en `VOCABULARIO_UNIFORME` | **Implementada.** Ocho botones que no son actos fuera, y con `predios_rentas` el defecto 3 cerrado |
| **C · Los movimientos de deuda** | **Implementada** en lo navegacional: la tira, el permiso por hoja, la búsqueda a cuestas. La cabecera con el sujeto y el saldo, y la rejilla de contexto del alta, siguen siendo propuesta: las dos piden que `alta_deuda` lea `consulta_deuda` |
| **B · El acto de transferencia** | Propuesta. Con su decisión de rótulo por resolver |
| **A · La emisión del ejercicio** | Propuesta |

Lo implementado se coteja contra el navegador en `frontend/e2e/artboards-de-rentas.spec.ts`: `FRO-05`
remite a esta carpeta, así que estos artboards se leen como especificación, y #413 encontró en los de
catastro cinco divergencias por no comprobarlo. La prueba se pone roja en las dos direcciones — si
cambia el producto, y si cambia el artboard sin cambiar el producto.

**La decisión de implementación que más ahorra**, y que conviene tener escrita antes de hacer B y A:
la superficie **no** es un componente propio. `catastro/Territorio.tsx` tuvo que serlo porque su
contenido es un árbol y un árbol no cabe en el catálogo; al serlo, dejó de pasar por el renderizador
genérico y tuvo que rehacer a mano filtros, tabla, secciones y barra. Aquí las hojas **son** pantallas
del catálogo, así que basta con añadir la tira: cada hoja se sigue dibujando por el camino común, con
todos sus bloques. Lo comprueba el censo de capacidades (`censo-de-rentas.test.tsx`), que monta las
quince y compara contra lo que dibujaban.

## Orden

**C primero**: es la única cuyas dos primarias escriben hoy, así que se puede verificar de extremo a
extremo. **B después**, y con su decisión de rótulo resuelta antes de empezar. **A al final**: hasta
que #445 no cierre —asentar la determinación—, es un marco de lectura y de simulación.

La entrada de las tres opciones del padrón en `VOCABULARIO_UNIFORME` es **independiente de las tres**
y la más barata de todas: una línea y su prueba.

---

El registro visual navegable de las cinco páginas está publicado como Artifact, y el issue que las
recoge es [#442](https://github.com/hneyra/sgtm/issues/442). El tratamiento equivalente en Catastro
es [#391](https://github.com/hneyra/sgtm/issues/391), con sus artboards en
[`../catastro/`](../catastro/README.md).

Lo que a **#393** le queda por cerrar y que ninguna de estas tres propuestas cubre —asentar la
determinación, la banda que le falta a la quinta, los observados de la corrida masiva y las dos
secciones del expediente que siguen bloqueadas por contrato— está en
[#445](https://github.com/hneyra/sgtm/issues/445).
