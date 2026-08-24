# Aranceles de terreno por vía, ejercicio 2026

| Campo | Valor |
|---|---|
| Norma | Resolución Ministerial N.º 514-2025-EF/15 — «Aprueban los Valores Arancelarios de Terrenos para fines tributarios, expresados en soles por metro cuadrado (urbanos) y por hectárea (rústicos), a nivel nacional, vigentes para el Ejercicio Fiscal 2026». **Corrige un dato del mapa**: no la emite el sector Vivienda (como dice hoy NEG-02 §2 fila 8) sino el **Ministerio de Economía y Finanzas** — ver §3 |
| Artículo | 1 (RM 514-2025-EF/15, aprueba los Anexos 1 y 2); 11 (TUO LTM, D.S. 156-2004-EF) |
| Publicada | 2025-10-30, El Peruano |
| Ejercicios que rige | 2026 |
| Filas de NEG-02 §2 | 8 |
| Transcribió | JNA, 2026-08-24 |
| Verificó | — |
| Estado | TRANSCRITO |

## 1. La tabla tal como está en la norma

**Sin reordenar, sin convertir unidades, sin corregir un encabezado.** El artículo 1 de la RM
514-2025-EF/15 dice, literalmente: «Aprobar los Valores Arancelarios de Terrenos Urbanos expresados
en soles por metro cuadrado a nivel nacional y los Valores Arancelarios de Terrenos Rústicos
expresados en soles por hectárea a nivel nacional para fines del impuesto predial, vigentes para el
Ejercicio Fiscal 2026, incluidos en los Anexos 1 y 2». Los anexos cubren **todo el país**, vía por
vía (urbano) o zona por zona (rústico) — no hay una fila por municipalidad que se pueda elegir sin
antes saber qué vías tiene la municipalidad piloto y con qué código.

| Vía (código de referencia catastral) | Arancel (S/ / m²) |
|---|---|
| `‹bloqueado: depende de #16 y de qué municipalidad transcriba este archivo — ver §3, no se transcribe ninguna fila todavía›` | — |

## 2. Cómo entra al sistema

| Qué | Dónde |
|---|---|
| Tipo | `parametro_tributario` (tipo `ARANCEL_VIA`) |
| Clave | `(municipalidad_id, ejercicio, código de referencia catastral de la vía)` |
| Ámbito | nacional, transcrito por municipalidad —los valores están referidos a las vías de cada localidad— |
| Vigencia | 2026 |

**No se carga con este archivo.** La carga depende de D-13.

## 3. Qué no cabe hoy

**Este archivo queda legítimamente bloqueado.** La norma (Norma, Artículo, Publicada, Ejercicios
que rige, arriba) sí se pudo confirmar y firmar: eso no dependía de ninguna decisión abierta. Lo
que no cabe es la tabla de la §1 — los valores en sí — por dos motivos distintos, y ninguno de los
dos lo resuelve este archivo:

- **Depende de que el catálogo de vías de una municipalidad esté cargado con datos reales.** El
  arancel se transcribe por vía, y sin un catálogo de vías cargado no hay a qué código atar cada
  valor. La capacidad ya existe en este repositorio — **#16** (catálogo de vías, sectores y
  manzanas) y **#121** (su carga inicial desde archivo) están **cerrados** —; lo que falta no es
  la funcionalidad, es que alguien cargue las vías de una municipalidad concreta.
- **D-01 ya se decidió** — Municipalidad Distrital de Chala, 2026-08-23 (D-01,
  `decisiones-abiertas.md`) —, así que la municipalidad de la que depende esta transcripción **ya
  no es ambigua**: es Chala. Lo que queda no es decidir cuál, sino cargar el catálogo de vías de
  Chala (#121) y transcribir después esta tabla con esos códigos de referencia catastral.

**Corrección al mapa normativo (NEG-02 §2, fila 8):** el mapa dice «Planos arancelares aprobados
por el sector Vivienda». La búsqueda para este archivo encontró que la RM vigente para el ejercicio
2026 —514-2025-EF/15— la emite el **Ministerio de Economía y Finanzas**, no el Ministerio de
Vivienda, Construcción y Saneamiento. No se editó `marco-normativo.md` porque no es parte del
encargo de este archivo, pero queda anotado aquí para que quien mantenga esa fila lo reconcilie.
`‹NO CONFIRMADO EN FUENTE OFICIAL: si el texto vigente del TUO LTM art. 11 nombra hoy al MEF o
sigue nombrando a Vivienda para los aranceles de terreno específicamente —a diferencia de los
valores unitarios de edificación, que sí siguen en Vivienda (ver valores-unitarios-2026.md)—; no
se pudo leer el texto actualizado del art. 11 con las modificatorias que hayan trasladado esta
función›`.
