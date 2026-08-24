# Valores unitarios oficiales de edificación, ejercicio 2026

| Campo | Valor |
|---|---|
| Norma | ‹confirmar: resolución del sector Vivienda del ejercicio 2026 que fija los valores unitarios de edificación›, conforme al TUO LTM art. 11 |
| Artículo | 11 (TUO LTM); ‹confirmar el anexo de la resolución› |
| Publicada | ‹AAAA-MM-DD›, El Peruano |
| Ejercicios que rige | 2026 |
| Filas de NEG-02 §2 | 7 |
| Transcribió | ‹Nombre›, ‹AAAA-MM-DD› |
| Verificó | — |
| Estado | TRANSCRITO |

## 1. La tabla tal como está en la norma

**Sin reordenar, sin convertir unidades, sin corregir un encabezado.** La resolución publica una
matriz por **categoría de edificación (A–G)** y **partida** (estructuras, acabados, instalaciones);
si además distingue por año de construcción, ver §3.

| Categoría | Partida | Valor unitario (S/ / m²) |
|---|---|---|
| ‹A› | ‹Muros y columnas› | ‹por confirmar› |
| … | … | … |

## 2. Cómo entra al sistema

| Qué | Dónde |
|---|---|
| Tipo | `valor_unitario_edificacion` |
| Clave | ‹cómo se forma la clave (categoría + partida + ejercicio)› |
| Ámbito | nacional |
| Vigencia | 2026 |

**No se carga con este archivo.** La carga depende de D-13.

## 3. Qué no cabe hoy

**Hallazgo H-4:** la tabla actual (`valor_unitario_edificacion`) no tiene la dimensión «año de
construcción». Si la resolución 2026 publica la matriz cruzada por categoría **y** año de
construcción —como hacen las resoluciones del sector Vivienda en general—, esa segunda dimensión
no tiene dónde guardarse hoy. Confirmar contra la resolución real si esta transcripción la necesita
antes de dar por cerrada la fila 7.
