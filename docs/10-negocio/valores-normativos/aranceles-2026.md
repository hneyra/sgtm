# Aranceles de terreno por vía, ejercicio 2026

| Campo | Valor |
|---|---|
| Norma | ‹confirmar: plano arancelario del sector Vivienda del ejercicio 2026, para las vías de la municipalidad piloto›, conforme al TUO LTM art. 11 |
| Artículo | 11 (TUO LTM); ‹confirmar resolución específica del plano arancelario› |
| Publicada | ‹AAAA-MM-DD›, El Peruano |
| Ejercicios que rige | 2026 |
| Filas de NEG-02 §2 | 8 |
| Transcribió | ‹Nombre›, ‹AAAA-MM-DD› |
| Verificó | — |
| Estado | TRANSCRITO |

## 1. La tabla tal como está en la norma

**Sin reordenar, sin convertir unidades, sin corregir un encabezado.**

| Vía (código de referencia catastral) | Arancel (S/ / m²) |
|---|---|
| ‹por confirmar› | ‹por confirmar› |

## 2. Cómo entra al sistema

| Qué | Dónde |
|---|---|
| Tipo | `parametro_tributario` (tipo `ARANCEL_VIA`) |
| Clave | ‹cómo se forma la clave (código de referencia catastral de la vía + ejercicio)› |
| Ámbito | nacional, transcrito por municipalidad —los valores están referidos a las vías de cada localidad— |
| Vigencia | 2026 |

**No se carga con este archivo.** La carga depende de D-13.

## 3. Qué no cabe hoy

**Depende de #16** (código de referencia catastral): el arancel se transcribe por vía, y sin un
catálogo de vías cargado no hay a qué código de referencia catastral atar cada valor. La norma es
nacional, pero **esta transcripción es por municipalidad** — a diferencia de los demás archivos de
este directorio. Eso sí: **no depende de D-01** (municipalidad piloto) — #16 puede cargar el
catálogo de vías de cualquier municipalidad, y esta transcripción con él.
