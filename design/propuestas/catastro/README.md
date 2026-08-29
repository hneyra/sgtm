# Catastro — tres propuestas de interfaz

Maquetas de alta fidelidad sobre el design system Juris PE, hechas **con los valores reales del
producto**: colores, tipografías, alturas de control, radios y espaciados están tomados de
`frontend/packages/design-system/src/estilos/` y `frontend/apps/backoffice/src/estilos/aplicacion.css`,
no aproximados. La estructura medida —pestañas, secciones, campos y acciones de cada pantalla— sale
de `frontend/apps/backoffice/src/catalogo/pantallas/catastro.generado.ts`, y las normas citadas en
la propuesta B son las de `docs/10-negocio/valores-normativos/`. **Las cantidades de las tablas son
de muestra**; las normas, no.

| Artboard | Qué propone |
|---|---|
| [`Main.dc.html`](Main.dc.html) | El diagnóstico: las doce medidas y tres defectos, no impresiones |
| [`PropuestaA.dc.html`](PropuestaA.dc.html) | **A — Unificar.** Una sola ficha del predio (5 opciones → 1 superficie) |
| [`PropuestaB.dc.html`](PropuestaB.dc.html) | **B — Simplificar.** El cuadro de valuación del ejercicio (3 → 1) |
| [`PropuestaC.dc.html`](PropuestaC.dc.html) | **C — Reagrupar.** Territorio: un árbol, no dos padrones (2 → 1) |
| [`Anatomia.dc.html`](Anatomia.dc.html) | La espina: una anatomía, un vocabulario de acción, tres grupos |

Las tres son **solo frontend** y **independientes**: se pueden adoptar por separado, y el coste
crece C → B → A. Ninguna toca rutas, permisos ni etiquetas del catálogo: las 134 opciones siguen
siendo 134 y `catastro.generado.ts` no se edita a mano.

A y B son **pulsables** en el canvas: A cambia de modalidad y de pestaña, B cambia de hoja y con
ella la banda de procedencia.

## El diagnóstico, medido sobre el catálogo

| Opción | Forma | Filtros | Pestañas | Campos | Acciones |
|---|---|---|---|---|---|
| `ficha_urbana` | pestañas + tabla | 4 | **11** | ~110 | 5 |
| `ficha_economica` | 1 sección plana | 3 | — | 10 | 3 |
| `ficha_bienes` | 1 sección + tabla + totales | 2 | — | 9 | 2 |
| `ficha_rural` | 2 secciones planas | 3 | — | 14 | 3 |
| `actualizacion_catastro` | pestañas + tabla | 4 | 2 | ~25 | 4 |
| `consulta_fichas` | tabla | **5** | — | — | 2 |
| `calles` | sección + tabla | 4 | — | 8 | 3 |
| `sectores` | tabla | 2 | — | — | 2 |
| `aranceles` | tabla | 3 | — | — | 2 |
| `valores_unitarios` | tabla | 2 | — | — | 2 |
| `depreciacion` | tabla | 2 | — | — | **0** |
| `ficha_contribuyente_reporte` | hoja | — | — | — | — |

Cuatro fichas del mismo objeto con cuatro formas, cinco barras de filtros para buscar el mismo
predio y ocho vocabularios de acción en doce pantallas. Y tres defectos concretos:

1. **Las cuatro fichas se abren por tres identificadores distintos** —`codRefCatastral`,
   `codEdificacion`, `codUnidad`—, que es exactamente lo que `catastro/composicion.ts` documenta
   como el motivo de que dos de las cuatro no puedan ofrecer «Actualizar catastro».
2. **`actualizacion_catastro` es una copia divergente** de dos pestañas de `ficha_urbana`: mismos
   campos, distinto vocabulario. `MEP 03` es `ADOBE` en una y `ADOBE / TAPIA` en la otra; `UCA 01`
   es `VIVIENDA` frente a `CASA HABITACIÓN`; y los acabados son un desplegable A–G en la ficha y
   **texto libre** en la actualización. El mismo dato se teclea de dos formas y una de las dos no
   valida nada.
3. **`aranceles` y `valores_unitarios` dibujan «Importar tabla del año» y «Guardar», y ninguno
   puede escribir nunca.** [`ADR-0017`](../../../docs/30-arquitectura/adr/ADR-0017-tablas-de-valuacion-nacionales.md)
   deja valores unitarios y depreciación como catálogos nacionales que sólo escribe
   `rol_carga_parametros` (V55, con `REVOKE INSERT/UPDATE` a `sgtm_app`), y el arancel municipal
   cuelga del conjunto de parámetros que V18 vuelve inmutable al sellarse. Es el patrón que #332
   cerró: ningún acto promete lo que no puede.

## A — Una sola ficha del predio

Las cuatro fichas y la actualización se componen en **una superficie** con cinco pestañas
constantes: Identificación · Ubicación · Titularidad · Valorización · Uso y servicios. Las doce
secciones del prototipo se conservan letra por letra: se reagrupan, no se reescriben (RNF-080). Lo
único que cambia con la modalidad es **Valorización** —pisos, áreas comunes o grupos de tierra— y
el bloque de actividad económica dentro de Uso y servicios.

«Actualización del catastro» deja de ser una pantalla gemela y pasa a ser el **modo de edición
versionada** de la pestaña Valorización, con lo que el vocabulario divergente muere por
construcción y no por revisión.

**Dónde se implementa:** un componente propio en `pantallas/catastro/`, registrado en
`COMPONENTES_PROPIOS` de `Pantalla.tsx` para las cinco opciones, con la hoja activa decidida por la
ruta —el patrón que estrenó la propuesta C—. Cada opción conserva su id, su ruta y su permiso.

**Qué hay que decidir antes:** que la superficie se abra por el código de referencia catastral y
resuelva desde ahí los otros dos identificadores. Es lo que hace posible el resto, y hoy no está
decidido: es la causa de que `ficha_bienes` y `ficha_rural` no ofrezcan «Actualizar».

**Cómo se demuestra que la verificación muerde:** quitando la guarda de permiso del conmutador de
modalidad —una modalidad que el perfil no ve aparece—; devolviéndole a la actualización su propio
vocabulario de MEP/UCA/acabados y comparándolo letra por letra contra el de la ficha; y montando
las cinco modalidades a la vez en vez de sólo la activa.

**Lo que no arregla:** las cifras que el backend no publica siguen sin publicarse. `FichaResource`
manda quince campos donde el prototipo dibuja noventa, y el resto sale «—»: que se vea el hueco
dice que falta y a quién le toca.

## B — El cuadro de valuación del ejercicio

Una pantalla, tres hojas y **un solo selector de ejercicio**. `depreciacion` gana así el año que
hoy no tiene: su pantalla se filtra por material y uso, sin ejercicio, y un cuadro de depreciación
sin año no se puede defender.

En lugar de los dos botones que no pueden guardar, una **banda de procedencia** con lo que el
sistema publica de verdad.

**Lo que el backend publica, comprobado antes de dibujar** (en
`backend/sgtm-catastro/src/main/java/pe/gob/sgtm/catastro/infraestructura/web/`):

| Recurso | Campos |
|---|---|
| `ArancelResource` | `id, viaId, tramo, valorM2, documentoFuente` |
| `ValorUnitarioResource` | `id, partida, categoria, anioConstruccionDesde, anioConstruccionHasta, valorM2, documentoFuente` |
| `DepreciacionResource` | `id, material, estadoConservacion, antiguedadHasta, porcentaje, documentoFuente` |

Y **los tres controladores aceptan un solo parámetro: `@RequestParam int anio`**. El contrato
declara además `ejercicio`, `region`, `materialMep`, `uso` y `pagina`, y los controladores los
ignoran — la misma brecha que #70 aceptó para `accesos`.

De ahí salen las tres decisiones de esta propuesta:

- **Un solo ejercicio arriba no es una preferencia: es lo único que viaja.**
- **Las columnas salen del cuadro, no de una lista fija.** Es lo que impedía conectar estas dos
  hojas —el prototipo dibuja siete partidas fijas y el sistema manda una fila por partida—: la
  cabecera se construye con los valores de `partida` y de `estadoConservacion` que vengan en la
  respuesta. Una partida que el cuadro no traiga no tiene columna, nunca una cifra bajo la
  cabecera de otra.
- **El año de construcción existe y es visible.** `anioConstruccionDesde`/`Hasta` son reales: esa
  segunda dimensión, que NEG-05 exige y el prototipo no dibuja, dejaría de colapsarse en silencio.

**La banda enseña sólo el `documentoFuente`.** No hay fecha de publicación, ni firmas de
[`ADR-0007`](../../../docs/30-arquitectura/adr/ADR-0007-parametros-versionados.md), ni estado de
sellado en ningún recurso ni en el contrato: salen «—» hasta que salgan, y **no se rellenan desde
el corpus**. El artboard se corrigió por esto después de dibujarse — la primera versión daba esos
cuatro datos por supuestos.

**Los filtros que no viajan:** `region` y `uso` no están en ninguna respuesta y se bloquean con
`filtrosBloqueados`, el mecanismo que ya usa `consulta_fichas` para `conciliadaConRentas`.
`materialMep` sí: `material` viene en cada fila, así que acotar la matriz por material en el
navegador es elegir entre lo recibido, no inventar.

**Cómo se demuestra que la verificación muerde:** construyendo la cabecera con las siete partidas
fijas del prototipo en vez de con las de la respuesta; pintando el primer `documentoFuente` cuando
hay varios distintos; inventando una fecha o un estado de sellado que la API no publica; dejando
que `region` viaje; devolviendo «Importar tabla del año» y «Guardar»; y resolviendo el ejercicio
con el reloj en vez de con el de la sesión.

## C — Territorio: un árbol, no dos padrones

`sectores` y `calles` son la misma estructura: la que compone el código de referencia catastral. Un
árbol sector → manzana a la izquierda, el detalle y las dos hojas a la derecha. El hueco real —el
sistema no enumera las manzanas de un sector, sólo permite darlas de alta— se dice **una vez, donde
está**, con el botón que sí funciona al lado, en vez de repetirse en cada fila desplegada. Y los
dos tramos que identifican de verdad —sector y manzana— se toman de lo señalado en el árbol.

**Estado: implementada**, en la rama `catastro/superficies-uniformes`.
`pantallas/catastro/Territorio.tsx` sirve las dos rutas desde `COMPONENTES_PROPIOS`; las pestañas
son enlaces, así que el permiso lo sigue decidiendo el guardia y el enlace sigue siendo
compartible. Siete mutaciones medidas; la que enseñó algo fue que «Abrir la ficha» se habilitaba
con el ubigeo tecleado —6 dígitos de 23—, y ninguna prueba lo veía: un prefijo abría la ficha de
ningún predio.

Se quitó el «Guardar» de `sectores`, que era una promesa muerta sobre una operación de lectura. El
panel de detalle es todo de sólo lectura y sus rótulos se leen del catálogo, así que no hay nada
que guardar ni nada que lo parezca; el censo de `actos-honestos.test.tsx` lo exige ahora más fuerte
que antes: no es que la franja esté vacía, es que no hay franja que leer.

## La espina, transversal a las tres

- **Una anatomía.** El renderizador ya impone el orden de FRO-03 §5. Lo que falta es que las doce
  declaren los mismos bloques: cabecera-resumen, banda de versionado e índice de secciones existen
  y funcionan, pero **sólo en 4 de las 12**.
- **Un vocabulario de acción.** Una primaria por pantalla, siempre la última, siempre un verbo de
  guardado. «Nuevo» no es una acción de la barra sino un alta —y ya tiene su formulario—;
  «Modificar» y «Deshacer» son modos, no actos; «Imprimir ficha rural» dice dos veces dónde estás.
- **Un buscador.** Se busca en un sitio; una ficha se **abre** por su ruta. Es lo que el
  renderizador ya hace cuando se busca por el identificador del registro.
- **Tres grupos por tarea** en lugar de cinco: **Predio · 7**, **Territorio · 2**, **Valuación · 3**
  (`frontend/scripts/grupos-por-tarea.mjs` y `yarn portar-catalogo`, como #302).

### El «12 entradas → 5» del artboard necesita un cambio de mecanismo

`Anatomia.dc.html` dibuja el menú plegado a cinco entradas. Eso **no sale gratis**, y conviene que
esté escrito antes de que alguien lo intente:

`centroDeReportesDe` (en `frontend/scripts/grupos-por-tarea.mjs`) **rechaza en el build que un
módulo pliegue más de un grupo**, y el propio portador documenta que Catastro no pliega ninguno a
propósito —«un módulo pliega en centro el grupo cuyas hojas sólo se emiten»—. Plegar los tres
grupos exige generalizar el mecanismo: que `centroDeReportes` pase de ser un nombre a ser una
lista, y que el carril se titule con el nombre del grupo en vez de «Reportes de X». El motivo que
la guarda declara —«dos entradas homónimas “Reportes” y “Reportes”»— ya no describe lo que se
dibuja: `BarraLateral.tsx` y `HubDeModulo.tsx` pintan `bloque.label`, así que las entradas dirían
«Territorio» y «Valuación», que no son homónimas. Pero es un cambio en navegación compartida que
toca Tránsito, Infracciones administrativas y Autorizaciones y licencias, y merece su propio diff.

**Por eso las tres propuestas se implementan a nivel de pantalla, no de navegación:** las rutas y
las entradas del menú se quedan como están y todas caen en la misma superficie con su hoja activa.
Se gana la uniformidad —que es lo que se pedía— sin tocar el plegado de otros tres módulos.

## Orden

**C ya está** (implementada y verificada). **B a continuación**: es la más barata de las dos que
quedan y la única que además desbloquea dos pantallas que hoy no se pueden conectar. **A al final**,
y sólo después de decidir por qué identificador se abre la superficie.

El registro visual navegable de las cinco páginas está publicado como Artifact, y el issue que las
recoge es [#391](https://github.com/hneyra/sgtm/issues/391).
