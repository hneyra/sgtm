# NEG-02 — Marco normativo

## 1. Normas que el manual cita

El manual (cap. 3, apertura) declara que el sistema está elaborado sobre:

| Norma | Materia |
|---|---|
| **D. Leg. N.º 776** — Ley de Tributación Municipal, y modificatorias | Impuestos municipales: predial, alcabala, patrimonio vehicular, espectáculos, juegos, apuestas. Tasas y arbitrios |
| **TUO del Código Tributario**, D.S. N.º 135-99-EF | Obligación tributaria, determinación, valores, notificación, prescripción, cobranza coactiva, sanciones |
| **Ley N.º 27616** — Ley que restituye recursos a los gobiernos locales | Modifica artículos de la Ley de Tributación Municipal |
| **Ley Orgánica de Municipalidades** | Atribución para crear tasas y derechos |

El manual también nombra, sin citarlas: el **Consejo Nacional de Catastro** (fichas oficiales de
las que parte el registro catastral), los códigos **CIIU** para giros de negocio, el
**Formulario Único de Edificaciones (FUE)** y el **Reglamento Nacional de Tránsito** (códigos de
infracción).

> Las referencias son las del manual, que documenta un sistema en operación desde 2010. **Antes
> de implementar cualquier cálculo hay que verificar la vigencia y el texto actual de cada norma
> citada**, incluidas las que la hayan sustituido.

## 2. Datos normativos que faltan — `‹VERIFICAR›`

El manual describe qué calcula el sistema; no con qué cifras. Cada línea de esta tabla es un
dato sin el cual una regla de cálculo no se puede escribir. Todas dependen de **D-02**.

### Impuesto predial

| # | Dato | Estado |
|---|---|---|
| 1 | UIT del ejercicio | `‹VERIFICAR›` |
| 2 | Tramos del autovalúo en UIT y alícuota de cada tramo | `‹VERIFICAR›` |
| 3 | Deducción del pensionista: monto en UIT y requisitos | `‹VERIFICAR›` |
| 4 | Deducción del adulto mayor no pensionista, si aplica | `‹VERIFICAR›` |
| 5 | Impuesto mínimo, si existe | `‹VERIFICAR›` |
| 6 | Vencimientos: pago al contado y cuatro cuotas trimestrales | `‹VERIFICAR›` |

### Valuación del predio

| # | Dato | Estado |
|---|---|---|
| 7 | Tabla de **valores unitarios** oficiales de edificación por categoría (A–G) y partida | `‹VERIFICAR›` |
| 8 | **Aranceles** de terreno por vía y ejercicio | `‹VERIFICAR›` |
| 9 | Tabla de **depreciación** por material, antigüedad y estado de conservación | `‹VERIFICAR›` |
| 10 | Valorización de **otras instalaciones** | `‹VERIFICAR›` |

### Arbitrios

| # | Dato | Estado |
|---|---|---|
| 11 | Tasas de limpieza pública, relleno sanitario, parques y jardines y serenazgo, por sector y uso | `‹VERIFICAR›` |
| 12 | Criterios de distribución del costo del servicio (ordenanza y su ratificación) | `‹VERIFICAR›` |
| 13 | Descuento por pago anual adelantado que menciona el manual | `‹VERIFICAR›` |
| 14 | Inafectaciones: predios sin servicio de limpieza, parques o relleno | `‹VERIFICAR›` |

### Otros tributos

| # | Dato | Estado |
|---|---|---|
| 15 | Alcabala: alícuota, tramo inafecto en UIT, exoneraciones (primera venta de constructora, gobiernos, bomberos) | `‹VERIFICAR›` |
| 16 | Patrimonio vehicular: alícuota, años afectos, tabla de valores referenciales del MEF | `‹VERIFICAR›` |
| 17 | Espectáculos públicos no deportivos: alícuotas por tipo | `‹VERIFICAR›` |
| 18 | Anuncios y propaganda: tasas por tipo y dimensión | `‹VERIFICAR›` |

### Recargos y plazos

| # | Dato | Estado |
|---|---|---|
| 19 | Interés moratorio: tasa vigente por periodo y forma de cálculo | `‹VERIFICAR›` |
| 20 | Reajuste: índice aplicable y momento de aplicación | `‹VERIFICAR›` |
| 21 | Plazo de prescripción y sus causales de interrupción y suspensión | `‹VERIFICAR›` |
| 22 | Plazos de notificación y de inicio de la cobranza coactiva | `‹VERIFICAR›` |
| 23 | Costas y gastos del procedimiento coactivo: aranceles vigentes | `‹VERIFICAR›` |

### Sanciones

| # | Dato | Estado |
|---|---|---|
| 24 | Tabla de infracciones de tránsito: código, porcentaje de la UIT, medida y puntos | `‹VERIFICAR›` |
| 25 | Cuadro de infracciones y sanciones administrativas (CUIS) de la municipalidad | `‹VERIFICAR›` |
| 26 | Descuentos por pronto pago de papeletas | `‹VERIFICAR›` |
| 27 | Multa tributaria por declarar fuera de plazo | `‹VERIFICAR›` |

## 3. Cómo entra un dato normativo al sistema

**Nunca como literal en el código** (regla 5 de [ARQ-04](../30-arquitectura/estandares-de-codigo-backend.md)).

1. Se carga como fila de `parametro_tributario` (o de la tabla específica: `arancel`,
   `valor_unitario`, `depreciacion`, `valor_referencial_vehiculo`) con su **vigencia** y su
   **documento fuente** —la ordenanza, el decreto o la resolución que lo fija.
2. Un segundo usuario lo **aprueba**: la tabla impide que quien carga sea quien aprueba.
3. Al cerrar el ejercicio se **sella** el conjunto de parámetros. Un conjunto sellado no cambia;
   corregirlo obliga a una versión nueva, y eso queda en el diff de los datos, no del código.

Así, recalcular 2027 en 2037 usa los parámetros de 2027 y da el mismo resultado.
