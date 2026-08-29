# Rentas · Registro (predial) — tres propuestas de interfaz

Maquetas de alta fidelidad sobre el design system Juris PE, hechas **con los valores reales del
producto**: colores, tipografías, alturas de control, radios y espaciados están tomados de
`frontend/packages/design-system/src/estilos/` y `frontend/apps/backoffice/src/estilos/aplicacion.css`,
no aproximados. Las cifras de ejemplo son las del prototipo (`design/design_handoff_sgtm_web/design/sgtm-data-1.js`):
no se inventó ni un importe.

| Artboard | Qué propone |
|---|---|
| [`Hoy.dc.html`](Hoy.dc.html) | El diagnóstico: lo que hoy cuesta recorrer el módulo |
| [`Main.dc.html`](Main.dc.html) | **A — Reagrupar.** Cuatro grupos por el hecho que dispara el trabajo |
| [`Determinacion.dc.html`](Determinacion.dc.html) | **B — Uniformar.** Una sola forma para las cinco determinaciones |
| [`Expediente.dc.html`](Expediente.dc.html) | **C — Unificar.** El expediente predial del contribuyente |

Las tres son **solo frontend** y **acumulables en ese orden**. Ninguna toca rutas, permisos ni
etiquetas del catálogo: las 134 opciones siguen siendo 134 y `rentas-registro.generado.ts` no se
edita a mano.

## El diagnóstico, medido sobre el catálogo

1. **Una atención de predial cruza los cuatro grupos.** Contribuyentes y Predios están en
   «Padrones»; Declaración jurada y Predial — individual en «Determinación»; Arbitrios y Alcabala
   en «Tributos y beneficios»; Transferencia de predio en «Movimientos». Siete opciones, cuatro
   grupos, y ninguno las reúne. «Transferencia de predio» dibuja una casilla «Genera alcabala» y
   «Alcabala» vive dos grupos más abajo.
2. **Ocho de las quince pantallas vuelven a pedir el código del contribuyente** —siete como filtro
   (`predios_rentas`, `predial_individual`, `declaracion_jurada`, `vehiculos`, `vehicular_calculo`,
   `beneficios`, `baja_deuda`) y una como campo (`alta_deuda`)—, y ninguna sabe que la anterior ya
   lo tenía.
3. **Siete etiquetas para el mismo gesto.** «Enséñame el resultado antes de escribir» se llama
   Simular, Recalcular, Liquidar, Previsualizar, Vista previa, Validar y «Validar deuda del
   transferente», según la pantalla.
4. **La primaria no significa lo mismo en dos pantallas seguidas.** Como el renderizador toma la
   última acción del catálogo como primaria (FRO-03 §5), el botón navy es «Calcular» en
   `predial_individual`, «Aprobar» en `beneficios` y «Imprimir liquidación» en `alcabala`: escribir,
   resolver un expediente y emitir un papel, en el mismo sitio y con el mismo color. #385 ya cerró
   el síntoma en `alcabala`/`espectaculos`; la causa sigue ahí.

«Tributos y beneficios» es, además, un cajón de sastre: un tributo de emisión masiva (arbitrios),
un impuesto de transferencia (alcabala), uno por evento (espectáculos) y un registro de
resoluciones que **baja la base antes de determinar** (beneficios).

## A — Reagrupar por el hecho que dispara el trabajo

ADR-0014 §4 pide grupos que nombren el objeto de trabajo, y Rentas · Registro es uno de los cuatro
módulos que la decisión dio por diseñados. La agrupación de hoy sigue siendo, en parte, la
taxonomía técnica: «Movimientos» mezcla transferencias del padrón con altas y bajas de la cuenta
corriente, que son dos trabajos distintos de dos personas distintas.

| Grupo | Opciones | Por qué |
|---|---|---|
| **Padrón** | Contribuyentes · Predios · Vehículos | Quién y qué está inscrito. Sin cambios |
| **Determinación** | Declaración jurada · Predial — individual · Predial — masivo · **Arbitrios** · Cálculo vehicular | La emisión anual sobre el padrón, en el orden en que se trabaja: el papel que la sustenta abre el grupo |
| **Actos y transferencias** | Transferencia de predio · **Alcabala** · Transferencia de vehículo · **Espectáculos públicos** | Lo que ocurre una vez y se liquida al momento. Alcabala queda bajo el acto que la genera |
| **Beneficios y ajustes** | **Beneficios** · Alta de deuda · Baja de deuda | Las tres formas de tocar lo que se debe fuera de la emisión |

Cuatro grupos, como hoy: 3 · 5 · 4 · 3.

**Dónde se implementa:** `frontend/scripts/grupos-por-tarea.mjs`, entrada `'rentas-registro'`, y
`yarn portar-catalogo`. Nada más — el mecanismo ya existe y sus guardas ya están probadas: la tabla
es exhaustiva, y una opción sin grupo, un id repetido o dos grupos homónimos rompen el build con
nombre y apellido.

**Qué hay que mover:** las pruebas de `catalogo/catalogo.test.ts` que fijan los bloques del módulo,
y el recuento por grupo si alguna prueba lo cuenta.

**Cómo se demuestra que la verificación muerde:** dejando una opción fuera de la tabla nueva
(`espectaculos`, por ejemplo) — la guarda de exhaustividad tiene que ponerse roja nombrándola—, y
declarando dos veces `arbitrios`.

**Lo que esta propuesta no arregla:** el código que se vuelve a teclear, y la primaria que
significa cosas distintas. Eso es B.

## B — Una sola forma para las cinco determinaciones

`predial_individual`, `predial_masivo`, `arbitrios`, `vehicular_calculo` y `alcabala` hacen todas lo
mismo —fijar un sujeto, enseñar cómo sale la cifra, y escribir— y hoy las cinco se dibujan
distinto. La propuesta es un marco de tres pasos, siempre en el mismo sitio:

1. **El sujeto, arriba y a la vista.** Contribuyente (o predio, placa, transferencia) resuelto,
   ejercicio, y a su derecha las dos cosas que hacen reproducible la cifra: el **conjunto de
   parámetros sellado** que se usó (`2026 v1`, ARQ-09 §3) y la **fecha de cálculo** (regla 9,
   RNF-075). Deja de ser una fila más de filtros.
2. **La memoria del cálculo, en el centro.** Cada línea con su operación al lado —`80,250.00 ×
   0.2 % → 160.50`—, no una rejilla de campos de solo lectura. Es lo que permite explicarle a
   alguien en ventanilla de dónde sale su recibo, y lo que hace evidente qué falta cuando falta.
   Ninguna cifra se recompone en la interfaz (RNF-083): la base es del contribuyente y el
   `% de propiedad` pondera cada predio.
3. **El acto, abajo a la derecha, y solo uno.** La acción que escribe es la única primaria y exige
   su observación (regla 10, RNF-052); las que no escriben —simular, buscar, imprimir— son
   secundarias y van a su izquierda, **en todas**.

**Ninguna etiqueta se reescribe (RNF-080).** «Recalcular» sigue diciendo «Recalcular»; lo que se
uniforma es *el sitio y el papel* de cada acción. El mecanismo ya existe y solo hay que extenderlo:
`DE_SALIDA` de `pantallas/actos.ts` ya reconoce las acciones que no escriben para apagar su primaria;
la propuesta añade su gemela —las de simulación— y hace que el renderizador ponga siempre la que
escribe al final, en vez de creerle al orden del catálogo.

**Dónde se implementa:** `pantallas/actos.ts` (clasificación), `pantallas/bloques/BarraDeAcciones.tsx`
(orden y papel), `pantallas/composicion.ts` (la banda de sujeto, como opt-in por opción, igual que
`resolutores` e `indiceConLaTabla`), y un bloque nuevo `MemoriaDeCalculo` en
`pantallas/bloques/`.

**Cómo se demuestra que la verificación muerde:** devolviendo el orden del catálogo (la primaria de
`alcabala` vuelve a ser «Imprimir liquidación»); quitando el conjunto sellado de la banda; quitando
la fecha de cálculo; y habilitando la primaria sin observación.

**Estado del backend, dicho sin adornos:** de las cinco, hoy solo `arbitrios` está conectada.
`predial_individual`, `predial_masivo`, `vehicular_calculo` y `alcabala` no tienen `Controller`
—#333b enumera lo que la capa web de la determinación tendrá que publicar—, así que el marco se
implementa con el estado honesto de cada sección: «—» donde el backend no publica, y la franja que
nombra el dato que falta. Diseñar ese estado vacío **es** parte del trabajo, porque es lo que se
verá primero.

## C — El expediente predial del contribuyente

Seis opciones que hoy se abren de una en una, cada una preguntando otra vez por el mismo
contribuyente, compuestas bajo una sola identidad: Predios · Declaración jurada · Determinación
predial · Arbitrios · Beneficios · Movimientos de deuda.

Es exactamente el patrón de la **ficha 360°** (ADR-0016 §2) y del **centro de reportes**
(ADR-0014 §5): **composición de navegación, no una pantalla que las absorba**. Cada sección
conserva su identificador de opción, su ruta, su operación del contrato y su permiso; la que el
perfil no puede ver **no se dibuja** —una sección vacía ya diría que ahí hay algo que mirar—, y un
enlace directo a cualquiera de las seis sigue cayendo en su pantalla completa. El índice lateral es
`IndiceDeSecciones`, que ya existe.

Depende de A (los grupos) y de B (la banda de sujeto y el marco). Y depende del backend en lo mismo
que B: las secciones cuyo `Controller` no existe muestran su estado, no una cifra inventada
(ADR-0010 §4).

**Cómo se demuestra que la verificación muerde:** dejando que una sección sin permiso se dibuje
—la misma rotura que #297 usó en la ficha 360°, y que allí puso 3 pruebas en rojo—; montando las
seis secciones a la vez en vez de solo la visible; y componiendo una cifra de determinación a
partir de la tabla de predios.

## Orden

**A hoy** (una tabla y una regeneración). **B a continuación**, empezando por `arbitrios`, que es
la única de las cinco con datos reales, y dejando el marco puesto para las otras cuatro. **C
cuando A y B estén**, y sabiendo que la mitad de sus secciones enseñarán su estado vacío hasta que
#333b exista.
