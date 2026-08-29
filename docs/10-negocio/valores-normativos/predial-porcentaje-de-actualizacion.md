# El `% actualización` del predial: qué se buscó, qué se descartó y qué queda

| Campo | Valor |
|---|---|
| Norma | **Ninguna identificada todavía.** Se transcriben aquí los dos artículos del TUO de la Ley de Tributación Municipal (D.S. N.° 156-2004-EF) que podrían darle origen —el que actualiza la base imponible del año anterior por Decreto Supremo cuando no se publican los valores, y el art. 14, que es la actualización de valores de la emisión mecanizada— y se dice cuál de los dos quedó descartado y por qué |
| Artículo | Del TUO LTM: el párrafo de actualización por Decreto Supremo (§1.1, con su número **sin confirmar**, ver §1.3) y el art. 14 (§1.2) |
| Publicada | 2004-11-15, fecha del D.S. N.° 156-2004-EF que aprueba el TUO |
| Ejercicios que rige | No aplica: este archivo **no publica ninguna cifra** |
| Filas de NEG-02 §2 | 33 |
| Transcribió | Agent, 2026-08-30 |
| Verificó | — |
| Estado | TRANSCRITO |

> **Este archivo no trae ninguna cifra, y eso es exactamente el punto.** Existe porque el
> `% actualización` llevaba desde M02 sin fila en el mapa normativo, y **un dato sin fila es un dato
> que nadie va a buscar** — es la misma lección que H-17 dejó con la deducción de Amazonía. Lo que
> trae es el estado de la búsqueda: qué se descartó, con qué evidencia, y qué queda por mirar.
>
> **Mientras no haya fuente, no hay valor por omisión.** Ni aquí ni en el código: la regla 5 vigila
> desde #437 los nombres `ACTUALIZACION` y `FACTOR`, y hay una muestra que lo demuestra
> (`MuestraDeFactorDeActualizacionCompilado`). El valor «obvio» —100 %, o sea 1, o sea ninguno— es
> el más peligroso de todos, porque escribirlo **no se siente** como inventar un dato.

## 1. La tabla tal como está en la norma

**No hay tabla, y el encabezado de esta sección es el que el corpus exige a todos sus archivos.** Lo
que hay son los dos artículos candidatos, transcritos **sin reordenar, sin parafrasear y sin
corregir un encabezado**, igual que si fueran una tabla de cifras.

### 1.1 La actualización por Decreto Supremo cuando no se publican los valores

> «Cuando en determinado ejercicio no se publique los aranceles de terrenos o los precios unitarios
> oficiales de construcción, por Decreto Supremo se actualizará el valor de la base imponible del
> año anterior como máximo en el mismo porcentaje en que se incremente la Unidad Impositiva
> Tributaria (UIT).»

Es **el único porcentaje que el TUO LTM aplica para actualizar la base imponible del predial**, y
por eso es hoy el candidato vivo. Encaja además con la posición que la columna ocupa en M02
—autovalúo × `% actualización` × `% propiedad` → base imponible— y explicaría por qué su valor
habitual sería neutro: en un ejercicio en que **sí** se publican los aranceles y los valores
unitarios, este mecanismo no se activa.

`‹NO CONFIRMADO EN FUENTE OFICIAL: que este párrafo sea el que M02 llama «% actualización». Lo que
está confirmado es su texto y que es el único porcentaje de actualización de la base imponible del
predial en el TUO LTM; que sea el mismo campo de la pantalla de M02 es una hipótesis, no una
lectura›`.

### 1.2 El art. 14, y por qué se descarta

> «La actualización de los valores de predios por las Municipalidades, sustituye la obligación
> contemplada por el inciso a) del presente artículo, y se entiende como válida en caso que el
> contribuyente no la objete dentro del plazo establecido para el pago al contado del impuesto.»

Era la hipótesis fuerte y **se descartó leyendo los manuales del SRTM del MEF**, que es donde se
confirma un campo del proceso. El acto del art. 14 está documentado ahí de punta a punta —el Proceso
Masivo (v3.1.0), el Proceso Individual (v4.0.0 §4.3), la migración de declaraciones (v6.1.0 §4.4) y
la emisión mecanizada de la *Guía para el Registro y Determinación del Impuesto Predial*— y **en
todos es una redeterminación**: se refrescan las tablas normativas del ejercicio nuevo —aranceles,
valores unitarios, depreciación, UIT— y se regeneran las declaraciones. En ninguno hay un porcentaje
que se teclee, se calcule o se parametrice.

La Guía del MEF lo dice con sus tres insumos, y ninguno es un porcentaje sobre el autovalúo:

> «A. Actualización de valores. Durante esta etapa se desarrolla la actualización de valores en las
> tablas maestras con los siguientes parámetros: 1. La Tabla de Valores Unitarios Oficiales de
> Edificaciones y de Valores Arancelarios (Ministerio de Vivienda, Construcción y Saneamiento) y la
> Tabla de Porcentajes de Depreciación. 2. La valorización de instalaciones fijas y permanentes
> (metodología publicada por el Ministerio de Vivienda, Construcción y Saneamiento). 3. Valor de la
> UIT.»

**Y la ausencia no es un punto ciego.** En las mismas pantallas del SRTM donde los otros dos factores
de D-11 sí aparecen con nombre —el incremento del 5 % y el factor de oficialización, este último con
su `0.68` visible en la declaración jurada mecanizada—, el `% actualización` no está. La
determinación que el SRTM imprime va: `VALOR UNIT. M2 · INCREMENTO 5% · DEPRECIACIÓN · VALOR
UNITARIO DEPRECIADO · ÁREA CONSTRUIDA · ÁREA COMÚN · AUTOAVALUO · CONDOMINIO-COPROPIEDAD % ·
DEDUCCIÓN · AUTOAVALUO AFECTO`. Sin ninguna columna de actualización.

### 1.3 Lo que no se pudo comprobar de este PDF, y por qué

**El número de artículo del párrafo de §1.1 no está confirmado.** El PDF del TUO LTM tiene capa de
texto, pero **sus rótulos de artículo aparecen intercalados** con el cuerpo y con los bloques de
concordancias: en la extracción, el párrafo de §1.1 sale **antes** del rótulo «Artículo 12.-», y la
línea siguiente mezcla el cuerpo del 13 con su propio rótulo. Atribuirlo por posición sería
adivinar.

Y **no se pudo cotejar leyendo la página renderizada**, que es lo que el método de este corpus exige
para casos así: las fuentes del PDF no se resuelven con el visor disponible en esta máquina y la
página sale en blanco. Se deja dicho en vez de firmar una atribución que no se comprobó.

`‹NO CONFIRMADO EN FUENTE OFICIAL: el número del artículo que contiene el párrafo de §1.1. Su texto
sí está comprobado, extraído del PDF oficial del TUO LTM›`.

## 2. Cómo entra al sistema

**No entra.** No hay cifra que publicar, y esa es la situación correcta mientras no haya fuente.

Lo que sí está decidido es **cómo se comporta el sistema mientras tanto**, y no es «aplicar 1»:

| Qué | Cómo |
|---|---|
| Si una regla lo necesita | Falla nombrando su llave, como `TASA_ANUNCIO:‹CLASE›` (#51), `BENEFICIO:‹CAMPAÑA›` (#72) y `VEHICULAR_MINIMO` (#399): **422 nombrando la llave**, nunca un importe plausible |
| Si alguien lo compila | La regla 5 lo rechaza: `ACTUALIZACION` y `FACTOR` entraron a la lista de nombres vigilados en #437, con su muestra |
| `RT-002`, `RT-005` y `RT-011` | No se implementan **ni estructuralmente** (`CLAUDE.md` §«No implementar todavía») |

## 3. Qué no cabe hoy

- **La fuente.** Es lo que falta, y este archivo existe para que la próxima búsqueda no repita las
  anteriores. Dos caminos, en orden de valor:
  1. **Leer el manual donde la columna se vio**: `M02-1-020 «Determinación de Deuda» v1.4`
     (12-12-2025), del SRTM moderno. **No está en el corpus de PDF disponible** —los trece que hay
     son del linaje 2007–2016— y sin él no se puede ver el contexto de la columna, sus valores en
     los ejemplos, ni si el propio manual la define.
  2. **Perseguir el párrafo de §1.1**: si esa es la fuente, la pregunta deja de ser «¿qué norma crea
     el porcentaje?» y pasa a ser «¿qué Decretos Supremos se han dictado al amparo de ese párrafo, y
     en qué ejercicios?». Y el factor no sería un valor anual sino **excepcional**: neutro cuando
     hay valores publicados, el del D.S. cuando no los hay. Lo fija el Gobierno nacional, así que
     sería `D-02a` y no ordenanza local.
- **Dos cosas que NO son este factor**, y conviene dejarlas deslindadas porque se le parecen y están
  por todo el corpus:
  - el **ajuste por IPM de la alcabala** (TUO LTM art. 24), que es el campo «IPM aplicado» de la
    pantalla de alcabala y opera sobre el valor de transferencia, no sobre el autovalúo;
  - el **reajuste de cuotas y moras** por IPM (art. 15.b), que está del lado de la deuda.

  Confundir cualquiera de los dos con el `% actualización` arrastraría una lectura equivocada a
  alcabala, que es una pantalla que ya existe.

## 4. Documentos relacionados

[`decisiones-abiertas.md`](../../00-gobierno/decisiones-abiertas.md) (D-11) ·
[`plan-de-desbloqueo-D-02.md`](../../00-gobierno/plan-de-desbloqueo-D-02.md) (H-17) ·
[`marco-normativo.md`](../marco-normativo.md) §2 fila 33 ·
[`valores-unitarios-2026.md`](valores-unitarios-2026.md) §1.6 —el incremento del 5 %, el factor de
D-11 que sí quedó resuelto— ·
[`obras-complementarias-y-oficializacion-2026.md`](obras-complementarias-y-oficializacion-2026.md)
—el factor de oficialización— ·
[`predial-deduccion-amazonia.md`](predial-deduccion-amazonia.md) —el precedente de «la norma da el
mecanismo, no la cifra»—
