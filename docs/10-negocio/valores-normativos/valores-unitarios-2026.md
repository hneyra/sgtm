# Valores unitarios oficiales de edificación, ejercicio 2026

| Campo | Valor |
|---|---|
| Norma | Resolución Ministerial N.º 277-2025-VIVIENDA — «Aprueban Valores Unitarios Oficiales de Edificación, Valores Unitarios a costo directo de Obras Complementarias e Instalaciones Fijas y Permanentes, y dictan otras disposiciones», conforme al TUO LTM (D.S. 156-2004-EF) art. 11 |
| Artículo | 1 (RM 277-2025-VIVIENDA, aprueba el Anexo I con los Valores Unitarios Oficiales de Edificación); 11 (TUO LTM) |
| Publicada | 2025-10-30, El Peruano |
| Ejercicios que rige | 2026 |
| Filas de NEG-02 §2 | 7 |
| Transcribió | JNA, 2026-08-24 |
| Verificó | — |
| Estado | TRANSCRITO |

## 1. La tabla tal como está en la norma

**Sin reordenar, sin convertir unidades, sin corregir un encabezado.** El artículo 1 de la RM
277-2025-VIVIENDA dice, literalmente: «Aprobar los Valores Unitarios Oficiales de Edificación para
Lima Metropolitana y la Provincia Constitucional del Callao, la Costa, la Sierra y la Selva,
vigentes para el Ejercicio Fiscal 2026», contenidos en su Anexo I (I.1 a I.4, uno por región). La
matriz de cada región cruza **categoría de edificación** (columnas, de letra) con **partida**
(filas) — **no** con año de construcción; ver la aclaración de H-4 en §3.

Se transcribe aquí la región **Costa** (Anexo I.2), por ser la más común en el manual del sistema.
Lima Metropolitana/Callao, Sierra y Selva existen en la misma resolución y no están transcritas en
este archivo — ver §3.

| Partida | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| Muros y columnas | ‹NC› | ‹NC› | ‹NC› | ‹NC› | ‹NC› | ‹NC› | ‹NC› | ‹NC› |
| Techos | ‹NC› | ‹NC› | ‹NC› | ‹NC› | ‹NC› | ‹NC› | ‹NC› | ‹NC› |
| Pisos | ‹NC› | ‹NC› | ‹NC› | ‹NC› | ‹NC› | ‹NC› | ‹NC› | ‹NC› |
| Puertas y ventanas | ‹NC› | ‹NC› | ‹NC› | ‹NC› | ‹NC› | ‹NC› | ‹NC› | ‹NC› |
| Revestimientos | ‹NC› | ‹NC› | ‹NC› | ‹NC› | ‹NC› | ‹NC› | ‹NC› | ‹NC› |
| Baños | ‹NC› | ‹NC› | ‹NC› | ‹NC› | ‹NC› | ‹NC› | ‹NC› | ‹NC› |
| Instalaciones eléctricas y sanitarias | ‹NC› | ‹NC› | ‹NC› | ‹NC› | ‹NC› | ‹NC› | ‹NC› | ‹NC› |

> Valores en soles por m² de área techada. `‹NC›` = **‹NO CONFIRMADO EN FUENTE OFICIAL: el número
> exacto de cada celda no pudo verificarse contra el Anexo I.2 de la RM 277-2025-VIVIENDA›**. Se
> intentó: (1) `busquedas.elperuano.pe`, que publica el cuerpo de la resolución pero remite sus
> anexos a `gob.pe/vivienda` (art. 5); (2) `gob.pe/vivienda`, que devolvió error 418 (bloqueo de
> bot) en cada intento; (3) reproducciones de terceros (Colegio de Arquitectos del Perú,
> vLex) — la primera está bloqueada por robots/red para las herramientas disponibles, la segunda
> tras muro de pago, y las reproducciones que sí se pudieron leer (Studocu, vía búsqueda) citan como
> fuente una **Resolución Directoral mensual de VMVU-DGPRVU** (ajuste por IPC del INEI, con fecha y
> número propios) y no la RM 277-2025-VIVIENDA misma — son un instrumento distinto, de ajuste
> mensual para tasación, no la tabla anual que fija el impuesto predial (TUO LTM art. 11 toma el
> valor vigente al 31 de octubre del año anterior, sin reajuste mensual). Cargar esos números aquí
> como si fueran el Anexo I.2 habría sido transcribir la norma equivocada. **Categorías A–H y las
> siete partidas de la tabla sí están confirmadas** por coincidir, con esa misma estructura, en
> todas las reproducciones consultadas (Studocu, Colegio de Arquitectos del Perú) y con el propio
> texto de la resolución.

## 2. Cómo entra al sistema

| Qué | Dónde |
|---|---|
| Tipo | `valor_unitario_edificacion` |
| Clave | `(municipalidad_id, ejercicio, región, categoría, partida)` — sin dimensión de año de construcción; ver H-4 en §3 |
| Ámbito | nacional |
| Vigencia | 2026 |

**No se carga con este archivo.** La carga depende de D-13.

## 3. Qué no cabe hoy

**Hallazgo H-4, revisado contra la resolución real:** el mapa (NEG-02 §2, fila 7) y el plan de
desbloqueo (GOB-03 H-4) dicen que «NEG-05 §RT-002 [del manual del MEF, `../srtm`] dice que el
cuadro es una matriz **categoría × año de construcción**», y que `valor_unitario_edificacion` no
tiene dónde guardar esa segunda dimensión. **La RM 277-2025-VIVIENDA no lo confirma así**: su
artículo 1 aprueba una matriz **categoría × partida** — la de arriba —, y su **artículo 4** precisa
aparte que «las Tablas de Depreciación por antigüedad y estado de conservación... se encuentran
contenidas en el Anexo I del Reglamento Nacional de Tasaciones, aprobado por la Resolución
Ministerial N.° 172-2016-VIVIENDA» (ver `depreciacion.md`). Es decir: **el año de construcción no
es una dimensión del cuadro de valores unitarios; es la entrada de la tabla de depreciación**, que
es una tabla distinta con su propia clave (material × antigüedad × estado de conservación).

No se pudo leer `../srtm` NEG-05 §RT-002 desde este repositorio (el submódulo no está clonado aquí)
para comprobar si esa sección describe literalmente una matriz categoría-año, o si describe una
vista **calculada** por el SRTM del MEF que combina el valor unitario (esta tabla) con la
depreciación por antigüedad (la otra tabla) en una sola pantalla — lo que, visto desde la pantalla,
parece una sola matriz aunque provenga de dos tablas normativas distintas. Recomiendo que quien
tenga acceso a `../srtm` confirme cuál de las dos lecturas es la correcta antes de dar H-4 por
cerrado en un sentido u otro: si es la segunda, `valor_unitario_edificacion` **no necesita** la
dimensión «año de construcción» (la clave de arriba, sin ella, ya basta) y el ajuste real está en
cómo el motor de reglas combina esta tabla con `depreciacion`, no en el esquema de esta tabla.

Aparte de H-4:

- **Solo se transcribe la región Costa (Anexo I.2).** Lima Metropolitana y la Provincia
  Constitucional del Callao (I.1), Sierra (I.3) y Selva (I.4) están en la misma resolución y no
  están transcritas en este archivo — haría falta un archivo por región, o extender este, si el
  sistema necesita calcular predios fuera de la Costa.
- **Los valores de la matriz de Costa quedan `‹NC›`** (§1): no se pudo confirmar la cifra exacta de
  ninguna celda contra el Anexo I.2 real. Antes de cargar esta tabla (cuando D-13 lo permita) hace
  falta acceder al PDF oficial del Anexo I —vía `gob.pe/vivienda` sin el bloqueo de bot que
  encontraron estas herramientas, o una copia impresa de El Peruano del 30 de octubre de 2025— y
  completar la matriz con las cifras reales.
- **Valores Unitarios a costo directo de Obras Complementarias e Instalaciones Fijas y
  Permanentes**: la misma RM 277-2025-VIVIENDA también aprueba esta segunda tabla (fila 10 de
  NEG-02 §2, hoy `‹POR CLASIFICAR›`). No se transcribe aquí porque cierra una fila distinta del
  mapa; queda anotado para quien tome esa fila.
