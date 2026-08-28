# Tramos del autovalúo en UIT y alícuota de cada tramo

| Campo | Valor |
|---|---|
| Norma | TUO de la Ley de Tributación Municipal (D.S. 156-2004-EF) |
| Artículo | 13 |
| Publicada | 2004-11-15, El Peruano |
| Ejercicios que rige | 2004– |
| Filas de NEG-02 §2 | 2 |
| Transcribió | JNA, 2026-08-24 |
| Verificó | HNA, 2026-08-25 |
| Estado | VERIFICADO |

## 1. La tabla tal como está en la norma

**Sin reordenar, sin convertir unidades, sin corregir un encabezado.**

| Tramo de autoavalúo | Alícuota |
|---|---|
| Hasta 15 UIT | 0.2% |
| Más de 15 UIT y hasta 60 UIT | 0.6% |
| Más de 60 UIT | 1.0% |

> RNF-05 / NEG-05 exigen que la base sea **por contribuyente**, no por predio: los tramos se
> aplican al valor acumulado de todos sus predios. Ese comportamiento ya está resuelto en NEG-05
> §1 y no se repite aquí — este archivo solo transcribe los tramos y la alícuota de cada uno.

## 2. Cómo entra al sistema

| Qué | Dónde |
|---|---|
| Tipo | `parametro_tributario` (tipo `TRAMO_PREDIAL`, una fila por tramo) |
| Clave | El número de orden del tramo (1.ª, 2.ª, 3.ª escala) — el límite superior del tramo en UIT, `TRAMO_PREDIAL-1`, `TRAMO_PREDIAL-2`, `TRAMO_PREDIAL-3` |
| Ámbito | nacional |
| Vigencia | 2004–, sin modificación conocida a la fecha de esta transcripción |

**Se carga desde `publicacion/parametros-2026.csv`**, el derivado publicable de este
archivo, con `infra/carga-de-datos/publicar-parametros.sh` (#188, #247 §4). Las dos firmas
de la cabecera de arriba son las que llegan a `usuario_carga` y `usuario_aprueba`: la doble
verificación de ADR-0007 ocurrió aquí, y la herramienta la transporta.

## 3. Qué no cabe hoy

Nada.
