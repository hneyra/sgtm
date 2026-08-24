# Alcabala: alícuota, tramo inafecto y exoneraciones

| Campo | Valor |
|---|---|
| Norma | TUO de la Ley de Tributación Municipal (D.S. N.° 156-2004-EF) |
| Artículo | 21 a 29 |
| Publicada | 2004-11-15, El Peruano |
| Ejercicios que rige | 2004– |
| Filas de NEG-02 §2 | 15 |
| Transcribió | JNA, 2026-08-24 |
| Verificó | — |
| Estado | TRANSCRITO |

## 1. La tabla tal como está en la norma

**Sin reordenar, sin convertir unidades, sin corregir un encabezado.**

| Elemento | Artículo | Contenido |
|---|---|---|
| Hecho gravado | 21 | Grava las transferencias de propiedad de bienes inmuebles urbanos o rústicos a título oneroso o gratuito, cualquiera sea su forma o modalidad, inclusive las ventas con reserva de dominio |
| Inafectación de la primera venta de constructoras | 22 | La primera venta de inmuebles que realizan las empresas constructoras no está afecta al impuesto, salvo en la parte correspondiente al valor del terreno |
| Sujeto pasivo | 23 | El comprador o adquirente del inmueble, en calidad de contribuyente |
| Base imponible | 24 | El valor de transferencia, el cual no podrá ser menor al valor de autoavalúo del predio correspondiente al ejercicio en que se produce la transferencia, ajustado por el Índice de Precios al por Mayor (IPM) para Lima Metropolitana que determina el INEI |
| Tasa | 25 | 3%, de cargo exclusivo del comprador, sin admitir pacto en contrario |
| Tramo inafecto | 25 | No está afecto al impuesto el tramo comprendido por las primeras 10 UIT del valor del inmueble, calculado conforme al artículo 24 |
| Plazo de pago | 26 | Hasta el último día hábil del mes calendario siguiente a la fecha en que se produzca la transferencia |

> Texto del artículo 25 (tasa y tramo inafecto), como lo citan de forma consistente las fuentes
> consultadas: «La tasa del impuesto es de 3%, siendo de cargo exclusivo del comprador, sin admitir
> pacto en contrario. No está afecto al Impuesto de Alcabala, el tramo comprendido por las primeras
> 10 UIT del valor del inmueble, calculado conforme a lo dispuesto en el artículo precedente.» El
> tramo inafecto se calcula, por tanto, **sobre el valor de transferencia ya determinado según el
> artículo 24** (que no puede ser menor al autoavalúo ajustado por IPM), no sobre el autoavalúo
> directamente.

**Transferencias no afectas al impuesto (artículo 27).** Confirmado de forma consistente en varias
fuentes (texto de la norma vía El Peruano, y las páginas de orientación tributaria de SAT-Lima y
SAT-Trujillo):

| Transferencia no afecta |
|---|
| Los anticipos de legítima |
| Las que se produzcan por causa de muerte |
| La resolución del contrato de transferencia que se produzca antes de la cancelación del precio |
| Las transferencias de aeronaves y naves |
| Las de derechos sobre inmuebles que no conlleven la transmisión de propiedad |
| Las producidas por la división y partición de la masa hereditaria, de gananciales o de condóminos originarios |
| Las de alícuotas entre herederos o de condóminos originarios |

**Inafectaciones por tipo de adquirente (artículo 28).** Confirmado con las mismas fuentes: están
inafectas las adquisiciones de propiedad inmobiliaria que efectúen:

| Adquirente inafecto |
|---|
| El Gobierno Central, las Regiones y las Municipalidades |
| Los Gobiernos extranjeros y organismos internacionales |
| Entidades religiosas |
| El Cuerpo General de Bomberos Voluntarios del Perú |
| Universidades y centros educativos, conforme a la Constitución |

> **Sobre las ONG:** el encargo de esta ficha pedía confirmar si la lista del artículo 27/28 incluye
> a las ONG con inscripción vigente. Se buscó explícitamente ese literal en el texto consolidado
> (El Peruano) y en las páginas de orientación de SAT-Lima, SAT-Trujillo y un despacho tributario
> (Grupo Aurora); **ninguna de las cuatro fuentes lo menciona**. La lista de adquirentes inafectos
> del artículo 28 que confirman todas ellas tiene exactamente los cinco literales de la tabla de
> arriba. `‹NO CONFIRMADO EN FUENTE OFICIAL: una inafectación de alcabala a favor de ONG con
> inscripción vigente. Se intentó vía El Peruano (texto consolidado) y páginas de orientación de SAT
> municipales, sin encontrarla; si existe, puede estar en una norma distinta al TUO LTM (p. ej. un
> beneficio para donaciones bajo la Ley del Impuesto a la Renta, que es otro tributo) y no en el
> artículo 27/28 de este TUO — no se incluye aquí para no mezclar tributos.›`

## 2. Cómo entra al sistema

| Qué | Dónde |
|---|---|
| Tipo | `parametro_tributario` (tipo `ALCABALA_ALICUOTA`, `ALCABALA_TRAMO_INAFECTO_UIT`; `ALCABALA_INAFECTACION` para cada literal de los artículos 27 y 28) |
| Clave | `ALCABALA_ALICUOTA` y `ALCABALA_TRAMO_INAFECTO_UIT` llevan el ejercicio como parte de la clave compuesta; `ALCABALA_INAFECTACION` lleva además un código por literal (p. ej. `ALCABALA_INAFECTACION-ART27-1` ... `ALCABALA_INAFECTACION-ART28-5`) |
| Ámbito | nacional |
| Vigencia | 2004–, sin modificación conocida a la fecha de esta transcripción |

**No se carga con este archivo.** La carga depende de D-13.

## 3. Qué no cabe hoy

Dos cosas no caben en una fila plana de `parametro_tributario`:

- El **tramo inafecto** no es un monto fijo: son 10 UIT, y la UIT cambia cada ejercicio (fila 1 del
  mapa). Guardarlo como `ALCABALA_TRAMO_INAFECTO_UIT = 10` es correcto solo si quien lee el
  parámetro sabe que tiene que multiplicarlo por la UIT del ejercicio de la transferencia — esa
  regla de cálculo no vive en este archivo, ni en la tabla de parámetros: vive en el código que
  liquida el impuesto.
- Las inafectaciones de los artículos 27 y 28 no son todas del mismo tipo: unas son por **tipo de
  transacción** (anticipo de legítima, transferencia por causa de muerte, resolución de contrato,
  etc. — art. 27) y otras son por **tipo de adquirente** (gobierno, entidad religiosa, bomberos,
  universidad — art. 28). Si `parametro_tributario` no distingue esas dos dimensiones, cada literal
  puede cargarse como una fila de catálogo, pero la lógica de qué campo del hecho imponible hay que
  mirar para aplicar cada una (la naturaleza de la transferencia, o quién es el comprador) no está
  en el esquema — es lógica de negocio, no un parámetro.
