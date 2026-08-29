# FRO-06 — Las hojas sin superficie

**Decisión de origen:** issue [#427](https://github.com/hneyra/sgtm/issues/427), aplicada también en
[#428](https://github.com/hneyra/sgtm/issues/428) y [#429](https://github.com/hneyra/sgtm/issues/429)
**Relacionado:** [`ADR-0010`](../30-arquitectura/adr/ADR-0010-catalogo-portado-y-proxy-de-datos.md) §4,
[`ADR-0014`](../30-arquitectura/adr/ADR-0014-navegacion-centrada-en-la-atencion.md) §5,
[FRO-03](mapa-de-pantallas.md) §5, [FRO-05](superficies-unificadas.md)
**RNF:** RNF-080, RNF-082

Qué se hace con una opción que el manual capturó como **el papel que sale**, y cuyo endpoint
**dicta el acto** que ese papel documenta. Son siete de las 134, repartidas en tres módulos, y hasta
este documento cada módulo estaba a punto de contestarlo por su cuenta.

## 0. El síntoma, medido sobre el catálogo portado

No se intuye: se cuenta. Una hoja sin superficie es una opción cuyo `endpoint` **escribe**
(`POST`), cuyo catálogo declara `kind: "report"` y que **no declara ni una sección ni una acción**.
Hoy hay siete, y no hay ninguna más:

| Opción | Endpoint | Lo que el controlador exige, además de la observación | Grupo del menú |
|---|---|---|---|
| `licencia_resolucion_cancelacion` | `POST /licencias/funcionamiento/{id}/cancelacion` | `{id}`, `fecha`, **`motivo`** | Reportes (centro) |
| `licencia_resolucion_duplicado` | `POST /licencias/funcionamiento/{id}/duplicado` | `{id}`, `fecha`, **`motivo`**, **`nDeRecibo`** | Reportes (centro) |
| `adm_resolucion_gerencia` | `POST /infracciones/administrativas/resoluciones` | `papeleta`, `fecha`, `sustento` | Cobranza |
| `adm_notificacion_resolucion` | `POST …/resoluciones/{id}/notificacion` | `{id}`, `fechaDeNotificacion`, `modalidad`, `resultado`, `notificador` | Notificaciones |
| `transito_rg_ordinaria` | `POST /transito/resoluciones/ordinaria` | `papeleta`, `fecha`, `sustento` | Reportes (centro) |
| `transito_rg_sancionadora` | `POST /transito/resoluciones/sancionadora` | `papeleta`, `fecha`, `sustento` | Reportes (centro) |
| `transito_constancia_libre` | `POST /transito/constancias-libres` | `placa` | Reportes (centro) |

Las siete dibujan lo mismo: un bloque `reporte` con dos o tres columnas —«Concepto»/«Detalle»,
«Concepto»/«Base legal»/«Importe S/»— y nada más. Es la resolución **impresa**, no el formulario
que la dicta.

**Y las siete son mudas, que es la parte que no se veía.** `Pantalla.tsx` dibuja la barra sólo
cuando el catálogo trae acciones:

```tsx
{estructura.acciones && <BarraDeAcciones … />}
```

Sin barra no hay caja de observación (regla 10, RNF-052), no hay primaria, y **no hay franja donde
contar el impedimento**: la causa que `impedimentoDelActo` calcula para ellas —`sin-declaracion` en
cuatro, `sin-campo` en tres— se calcula, entra en el censo de `actos-honestos.test.tsx`, y **no la
lee nadie**. Es el defecto de RNF-082 un escalón más arriba de donde lo cerró #385: allí el motivo
se quedaba en un `title` que un botón apagado no puede leer en voz alta; aquí no hay ni botón.

Una nota que el cotejo destapó de paso: el docblock de `verificaciones/actos-inalcanzables.test.ts`
decía «cuatro de ellas … no declaran ninguna acción». Son **siete**, y llevaban serlo desde que la
lista existe.

## 1. La decisión

> **Una hoja sin superficie se queda hoja.** No se le inventan secciones ni acciones, y su acto no
> se cuela en la barra de otra opción. El acto va donde el manual ya dibujó su formulario —y eso se
> comprueba campo a campo contra el controlador, no se supone—; mientras no haya dónde, **la hoja lo
> dice**, nombrando el dato que falta.

Cuatro reglas, y ninguna es negociable:

1. **No se inventa la pantalla.** «Ningún componente del design system antes de la pantalla que lo
   use» (CLAUDE.md) y RNF-080: los rótulos vienen del manual y no se reescriben. El catálogo es
   **generado** (`yarn portar-catalogo` desde `design/sgtm-data-{1..5}.js`), así que una sección
   inventada tendría que escribirse fuera de él, con etiquetas que nadie redactó y que la siguiente
   regeneración no puede reproducir.
2. **El acto va donde el manual ya dibujó su formulario**, si lo dibujó. Se comprueba campo a campo
   contra el controlador, y se escribe el cotejo. Es lo que #74 hizo con `anulacion_recibo` —que
   funcionó **porque el prototipo sí capturó** sus dos secciones y sus dos acciones— y lo que #73
   hizo con las transferencias —que funcionó porque había un control existente al que **añadirle**
   el campo que faltaba—.
3. **Mientras no haya dónde, la hoja lo dice.** Un aviso permanente por opción (`AVISOS` de
   `pantallas/prosa-textos.ts`, el mecanismo que estrenó fiscalización en #80) que nombra las tres
   cosas: **qué es** la hoja, **qué dato** exige el acto y ninguna pantalla del manual dibuja, y
   **por dónde se sale** —el procedimiento en papel, y avisar a sistemas—. Es la misma redacción en
   dos mitades que `impedimentoDelActo` reparte entre quien atiende y quien mantiene, dicha en el
   único sitio de la pantalla que sí se dibuja.
4. **Y la clasificación dice la verdad.** Una hoja sin superficie entra en `ACTOS_SIN_CAMPO`: lo que
   le falta no es la lista blanca de `escrituras.ts` —`sin-declaracion` invita a declarar campos que
   no existen— sino el campo, y de hecho la pantalla entera del formulario. Cuatro de las siete
   estaban en la casilla equivocada.

**Lo que la decisión no es:** un «no» permanente. Es la constatación de que el trabajo que falta es
**de diseño** —un artboard con el formulario del acto, o la superficie unificada que lo absorba
(FRO-05)— y no de interfaz. Escribirlo aquí es lo que impide que se resuelva tres veces de tres
maneras distintas, que es exactamente lo que #429 pidió evitar.

## 2. El cotejo: dónde podría vivir cada acto, y por qué hoy no vive ahí

La regla 2 obliga a mirar. Se miró, opción por opción, contra el catálogo portado y contra el
controlador que sirve el endpoint. **Ninguna de las siete tiene hoy, en otra opción, el formulario
entero de su acto.** Lo que hay:

| Acto | La pantalla que conoce el sujeto | Lo que ahí falta |
|---|---|---|
| Cancelar una licencia | `licencia_funcionamiento` conoce el `{id}` —lo filtra y lo lista— y su barra trae «Activar» | **no dibuja ningún «motivo»**. El `Observaciones` de su pestaña «Procesos» es la trazabilidad del trámite, y `nDeResolucion`/`fechaDeResolucion` son los de la resolución **que otorgó** la licencia |
| Duplicar una licencia | ídem, y su barra trae literalmente **«Duplicar»** | falta el `motivo`, y su `nDeRecibo` es el del derecho de la **licencia**, no el del duplicado (el javadoc de `PeticionDeDuplicado` lo dice: «el recibo del derecho de trámite del duplicado») |
| Dictar la resolución de gerencia (las tres familias) | `transito_descargos` sí trae una sección «Evaluación y resolución» con `sentidoDelFallo`, `efectoSobreLaMulta` y `sustentoDeLaResolucion`, y una acción «Resolver» | pero eso es **la resolución de un descargo**, y `expedienteDelDescargo` es opcional en el controlador: la ordinaria de cobranza se dicta sin ningún recurso que resolver («Resolución que emite la municipalidad para la cobranza de la papeleta»). Montarla ahí estrecharía el acto en silencio a «resoluciones que resuelven un recurso» |
| Notificar la resolución de gerencia | `adm_notificacion` | es la notificación **del acta preventiva**, otro objeto: su cuerpo es serie/año/número, infractor, predio, infracción y fiscalizador. No hay dónde escribir el número de la resolución que se notifica |
| Emitir la constancia de no adeudar papeletas | `transito_busqueda` filtra por placa | un filtro de búsqueda no es el campo de un acto: mandar lo tecleado en la barra de búsqueda como el dato que se acredita es la confusión que `filtrosBloqueados` existe para no repetir |

Y un dato que conviene tener delante: **cinco de las siete están archivadas en el grupo «Reportes»**
del menú, plegado en el centro de reportes (ADR-0014 §5). El catálogo ya las clasificó como papel.
Las dos que no —`adm_resolucion_gerencia` en «Cobranza» y `adm_notificacion_resolucion` en
«Notificaciones»— son las mismas dos cuyo módulo aún no había mirado el problema.

**El backend, en cambio, dio por hecho lo contrario**, y lo dejó escrito: `PeticionDeCancelacion`
documenta «lo que la opción `licencia_resolucion_cancelacion` manda», y
`ResolverConResolucionDeGerencia` habla de «las tres pantallas que las dictan
(`transito_rg_ordinaria`, `transito_rg_sancionadora`, `adm_resolucion_gerencia`)». Ese desacuerdo
entre el contrato y el catálogo **es** el hallazgo: el endpoint se derivó del `endpoint` que la
pantalla declara (#312), y esa pantalla es la hoja, no el formulario.

## 3. Las alternativas, y por qué se descartaron

### A. Declarar que el prototipo no capturó la pantalla y diseñarla

Es la segunda salida que #427 nombra, y **no se descarta para siempre: se descarta para hoy**, y por
lo mismo que se descartó en #73 puentear `alcabala`. Diseñar el formulario de un acto administrativo
es decidir sus rótulos, y los rótulos de este sistema salen del manual (RNF-080). Un formulario
escrito en el diff de un issue de conexión es un formulario que nadie revisó como diseño, que el
catálogo generado no puede reproducir y que la siguiente pasada de artboards contradiría —el defecto
exacto que #413 acababa de cerrar en `design/`—.

Lo que la desbloquea está dicho en §4: un artboard con el formulario, o la superficie unificada que
lo absorba.

### B. Colar el acto en la barra de la pantalla que conoce el sujeto

Es la primera salida que #427 nombra. Se descarta por tres cosas medidas, no por gusto:

1. **El dato sigue faltando.** §2 lo enseña caso por caso: `licencia_funcionamiento` no dibuja
   ningún motivo, y su `nDeRecibo` es de otro recibo. Reutilizarlo sería mentir sobre lo que la
   pantalla enseña, que es la razón por la que `alcabala` y `espectaculos` siguen en
   `ACTOS_SIN_CAMPO` y no se resolvieron con un resolutor.
2. **Una barra tiene una primaria y una sola escritura.** `useEscritura` se ata a la operación de la
   opción que se está mirando (`Pantalla.tsx`: `operacion !== undefined && escribe(operacion) &&
   puedeActuarAqui && declarada !== undefined ? operacion : undefined`). Hacer que una acción
   secundaria dispare **otra** operación es mecanismo del renderizador, no de un módulo —y #421,
   que es el issue del mecanismo, acota deliberadamente su alcance a *cuál* de las acciones es la
   primaria, no a cuántas escriben—.
3. **El permiso es del acto, no de la pantalla.** `LicenciaController.cancelacion` declara
   `@RequiereAcceso(acceso = "licencia_resolucion_cancelacion")`, y la interfaz aprende sus permisos
   por opción (ADR-0013). Dictada desde `licencia_funcionamiento`, la pantalla preguntaría por el
   permiso equivocado: quien no puede cancelar vería el botón encendido hasta recibir el 403. La
   lectura ajena ya necesitó un mecanismo propio para decirlo bien (`Conexion.sinPermiso`); la
   escritura ajena no tiene ninguno.

### C. Dejarlas como están

Es lo que había, y es lo que este documento cierra. Una hoja muda no es neutral: la causa que el
censo cuenta para ella no la lee nadie, así que el sistema **cree** que está advirtiendo algo que no
advierte. Y en cuatro de las siete la causa era además la equivocada —`sin-declaracion`, «la
pantalla aún no manda estos campos», dicho de una pantalla que no tiene campos—.

## 4. Qué desbloquea cada una

Se escribe aquí para que el día que llegue no haya que volver a razonarlo:

- **Las dos de licencias** necesitan un formulario con **`motivo`** —y `nDeRecibo` en el duplicado—
  junto al número de la licencia. Es la superficie que FRO-05 llamaría «la licencia y sus actos»: la
  ficha que `licencia_funcionamiento` ya abre por `nroLicencia`, con la cancelación y el duplicado
  como actos suyos, cada uno con su permiso. Mientras no exista, la hoja avisa.
- **`adm_resolucion_gerencia`** y **las dos de tránsito** son el **mismo acto** en el backend
  (`ResolverConResolucionDeGerencia`), y el manual dibujó su formulario **una sola vez**, en
  `transito_descargos`. La salida honesta es completar esa sección con el caso sin recurso —la
  ordinaria de cobranza—, no repartir tres formularios inventados por tres módulos.
- **`adm_notificacion_resolucion`** necesita el número de la resolución que se notifica; la
  diligencia (fecha, modalidad, resultado, notificador) ya está dibujada en `adm_notificacion`, sólo
  que colgando de otro objeto.
- **`transito_constancia_libre`** es la más barata: un solo dato, `placa`, y es exactamente la
  forma 1 de #422 —«el dato lo teclea quien atiende y sólo falta el control»—. Sigue necesitando la
  sección donde ponerlo.

## 5. Cómo se verifica

`verificaciones/hojas-sin-superficie.test.ts` computa la lista **desde el catálogo generado** —`POST`,
sin acciones, sin campos— y exige de cada una:

- que esté clasificada en `ACTOS_SIN_CAMPO`, con el dato que le falta nombrado;
- que tenga su aviso permanente, o que esté en la lista de las que **todavía** no lo tienen, con el
  issue que las cubre escrito al lado.

La segunda mitad es la que hace que la lista no crezca en silencio: es el mismo mecanismo que
`actos-inalcanzables.test.ts` usa con `CONOCIDAS` —bajar de ahí es una buena noticia, subir hay que
mirarlo— y no admite entradas rancias: una opción que ya tiene aviso no puede seguir en la lista de
pendientes.

Las mutaciones que este patrón pide:

| Mutación | Qué defiende | Medido en #427 |
|---|---|---|
| Quitar el aviso de una hoja cubierta | §1.3: la hoja vuelve a ser muda | **2 rojas**: la guarda, y la pantalla montada |
| Sacar una hoja de `ACTOS_SIN_CAMPO` | §1.4: la causa vuelve a `sin-declaracion`, que pide declarar campos inexistentes | **2 rojas**: la guarda, y el censo de `actos-honestos.test.tsx` |
| Dejar en «pendientes» una hoja que ya está cubierta | §5: la lista se pudre y deja de decir qué falta | **1 roja**, nombrando la opción |
| Declarar la escritura de una hoja en `escrituras.ts` | §1.1: habilitaría un acto que no tiene botón que pulsar ni observación que pedir | **1 roja**: el censo pasa a `declarada: 16`, y **la pantalla no cambia** —sin acciones no hay barra—, así que es lo único que lo dice |

---

[`arquitectura-frontend.md`](arquitectura-frontend.md) (FRO-01) ·
[`design-system.md`](design-system.md) (FRO-02) ·
[`mapa-de-pantallas.md`](mapa-de-pantallas.md) (FRO-03) ·
[`estandares-de-codigo-frontend.md`](estandares-de-codigo-frontend.md) (FRO-04) ·
[`superficies-unificadas.md`](superficies-unificadas.md) (FRO-05)
