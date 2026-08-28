# Lo publicable del corpus

`parametros-2026.csv` es el **derivado publicable** del corpus de valores normativos: la única
entrada desde la que `PublicarParametros` escribe en `parametro_tributario`. No es una fuente —lo
son los archivos del corpus, uno por norma— sino su proyección a las columnas que la tabla tiene.

**Ninguna cifra de este archivo se tecleó de memoria.** Cada una está letra por letra en el archivo
del corpus que su fila nombra, y [`verificar-publicacion.mjs`](../../verificar-publicacion.mjs) lo
comprueba fila a fila en cada PR: que el archivo exista, que su `Estado` sea `VERIFICADO`, que las
dos firmas sean las de su cabecera y sean distintas, que el documento fuente y el artículo estén
ahí, que cada fragmento del valor de texto aparezca verbatim y que la cifra numérica esté en ese
mismo texto. Que la comprobación puede fallar lo demuestran las doce muestras de `_muestras/`, una
por prohibición, con [`verificar-las-muestras-de-publicacion.mjs`](../../verificar-las-muestras-de-publicacion.mjs).

## La doble firma ya ocurrió, y es la que se guarda

ADR-0007 exige dos firmas para una cifra normativa, y `parametro_doble_verificacion_ck` (V1) lo
sostiene en la base: `usuario_aprueba <> usuario_carga`. **Las dos firmas de este archivo son las
del corpus**, no las del proceso que carga: `transcribio` y `verifico` se copian de la cabecera del
archivo del corpus y viajan tal cual a `usuario_carga` y `usuario_aprueba`. Quien corre
`publicar-parametros.sh` no firma nada; transporta lo que ya se firmó al leer la norma.

> La UIT estuvo verificada por «Agent» hasta el 2026-08-28 —una segunda lectura hecha por un
> agente y no por una persona, y quedó dicho aquí como deuda—. Ese día se re-verificó con firma
> humana: `uit.md` dice `Verificó | HNA` y las cinco filas de la UIT viajan con
> `usuario_aprueba = 'HNA'`, como los demás archivos del corpus. Cambiarlo costó lo que este
> párrafo anunciaba: una celda de `uit.md` y la columna `verifico` de cinco filas de este CSV,
> ni una línea de código.

## Un solo archivo para los dos pasos

Las tres primeras columnas son exactamente `tipo,clave,vigenciaDesde`, que es lo que
`ImportarParametrosDelConjunto` lee; las demás las ignora. Así el mismo archivo sirve para publicar
el valor y para componer el conjunto, y no hay dos listas que puedan separarse:

```bash
infra/carga-de-datos/publicar-parametros.sh      --ambiente stg --archivo parametros-2026.csv
infra/carga-de-datos/abrir-conjunto-parametros.sh --ambiente stg --municipalidad-id 4 \
    --conjunto-id N --archivo parametros-2026.csv
```

## Las quince filas, y de dónde sale cada una

| Tipo | Clave | Filas | Archivo del corpus |
|---|---|---|---|
| `UIT` | — | 5 (2022–2026) | `uit.md` |
| `TRAMO_PREDIAL` | `1`, `2`, `3` | 3 | `predial-tramos-y-alicuotas.md` |
| `DEDUCCION_PENSIONISTA` | — | 1 | `predial-deducciones.md` |
| `DEDUCCION_ADULTO_MAYOR` | — | 1 | `predial-deducciones.md` |
| `PREDIAL_MINIMO` | — | 1 | `predial-minimo.md` |
| `PLAZO` | `PRESCRIPCION-DECLARACION_PRESENTADA`, `PRESCRIPCION-SIN_DECLARACION`, `PRESCRIPCION-AGENTE_RETENCION` | 3 | `prescripcion-y-plazos.md` |
| `PLAZO` | `REC1_CUMPLIMIENTO` | 1 | `prescripcion-y-plazos.md` |

La **UIT no lleva clave**: es la forma del tipo con un solo valor, y las cinco filas se distinguen
por `vigencia_desde`, como describe `LlaveDeParametro`. Cada una vale sólo su ejercicio
(`vigencia_hasta` en el 31 de diciembre), que es lo que dice `uit.md`: «la UIT de un año no deroga
la del anterior».

Las filas del TUO y de la Ley 30490 toman como `vigencia_desde` la **fecha de publicación** que su
cabecera declara —2004-11-15 y 2016-07-21—, y no un 1 de enero. Es la única fecha que el corpus
afirma: `predial-deducciones.md` lo dice expresamente al no resolver «si es el ejercicio 2016 o el
2017».

### Lo que el tramo del predial no resuelve

`TRAMO_PREDIAL` publica una fila por tramo, con la alícuota en `valor_numerico` y el tramo y su
alícuota **tal como los escribe la norma** en `valor_texto` (`Hasta 15 UIT; 0.2%`). Lo que ese
`0.2` significa —fracción o porcentaje— **no lo decide este archivo**: lo decide la regla que lo
consuma, y esa regla espera D-02a. Se publica el número que la norma imprime, sin convertirlo,
porque convertir unidades es exactamente lo que la transcripción prohíbe; el texto que lo acompaña
lleva el `%` para que la fila no se pueda leer mal en la base.

### La columna `valor_maquina`, y por qué hay dos formas del mismo valor

Las cuatro filas de `PLAZO` traen una columna más, la última: `valor_maquina`. Es lo que va a
`parametro_tributario.valor_texto` —`4 ANIOS`, `7 DIAS_HABILES`—, mientras que `valor_texto` del CSV
sigue siendo la **transcripción verbatim** de la norma —«prescribe a los cuatro (4) años», «dentro
del plazo de siete (7) días hábiles de notificado»—, que es lo que se compara letra por letra contra
el corpus.

Hacen falta las dos porque no caben en una. `Plazo.de` sólo acepta «cantidad UNIDAD» y **rechaza a
propósito toda lectura tolerante**: un plazo interpretado «lo mejor posible» sale plausible y
equivocado, que es el modo de falla que nadie detecta. La norma, en cambio, escribe «cuatro (4)
años». Reescribir el `valor_texto` para que el código lo lea sería exactamente lo que la regla del
verbatim prohíbe; publicar la letra de la norma sería publicar algo que revienta en el primer uso,
en producción, contando el plazo de una REC-1.

Tres comprobaciones nuevas lo sostienen, con su muestra cada una:

| Qué exige | Muestra que lo demuestra |
|---|---|
| El entero de `valor_maquina` es el `valor_numerico` que la regla 5 ya buscó en la norma | `cifra-que-el-plazo-no-dice.csv` (`5 ANIOS` con `valor_numerico` 4) |
| Su unidad corresponde a las palabras del texto verbatim | `unidad-que-no-es-la-de-la-norma.csv` (`7 DIAS_CALENDARIO` sobre «días hábiles») |
| Una fila `PLAZO` la trae, y con la forma que `Plazo.de` acepta | `plazo-sin-forma-de-maquina.csv` |

La segunda es la que importa: veinte días hábiles y veinte calendario no son lo mismo, y de esa
diferencia depende si un expediente coactivo nació antes de tiempo. **Las unidades no están escritas
en la comprobación**: se leen de `UnidadDePlazo`, y una unidad del enumerado sin palabras declaradas
pone el verificador en rojo antes de que nadie pueda publicarla.

Lo que la comprobación **no** puede saber es si la clave con la que se publica es la que el código
lee: `PLAZO:PRESCRIPCION-DECLARACION` en vez de `PLAZO:PRESCRIPCION-DECLARACION_PRESENTADA` pasa en
verde —la cifra está en la norma, las firmas son las del corpus— y deja el parámetro cargado bajo un
nombre que nadie pide. Eso lo cierran dos pruebas que leen **este** archivo desde el módulo que lo
consume: `PlazosDelDerivadoTest` (`sgtm-valores`) y `PlazoDeLaRec1DelDerivadoTest`
(`sgtm-coactiva`).

### Las fechas de vigencia de los plazos

Mismo criterio que las filas del TUO de Tributación Municipal —la única fecha que el corpus
afirma—, aplicado a dos normas distintas:

- **2013-06-22** para los tres plazos del art. 43. Es la fecha de publicación en El Peruano del
  D.S. N.º 133-2013-EF, que aprobó el TUO del Código Tributario, y es la que la cabecera del
  archivo del corpus declara.
- **2004-01-10** para `REC1_CUMPLIMIENTO`. La cabecera de `prescripcion-y-plazos.md` da tres fechas
  para la Ley 26979 (1998-09-21 el texto original, 2008-12-06 el TUO del D.S. 018-2008-JUS), pero
  **el texto que §1 transcribe no es el original**: es el que le dio el art. 1 de la Ley N.º 28165,
  publicada el 2004-01-10, como el propio §1 dice. La vigencia que se publica es la del texto que
  se transcribió, no la de la ley que lo contiene.

## Lo que hoy no se publica, y por qué

`predial-plazos-y-reajuste.md` está `VERIFICADO` y **no tiene ninguna fila aquí**. No es un olvido:
su propia sección «3. Qué no cabe hoy» dice que la norma no da una fecha sino una regla —«último
día hábil de febrero»— y deja sin decidir dónde vive el cálculo de ese día. Publicar una fecha
resuelta sería inventarla, y una fecha de vencimiento inventada es un plazo mal contado en todo un
padrón.

Los tres cuadros de valuación —`valores-unitarios-2026.md`, `depreciacion.md`,
`vehicular-valores-referenciales-2026.md`— no entran por otra razón: no van a
`parametro_tributario` sino a `valor_unitario_edificacion`, `depreciacion` y
`valor_referencial_vehiculo`, y el ámbito de esas tres tablas es **D-13**, abierta. Esta herramienta
no las toca.

`prescripcion-y-plazos.md` está **publicado en parte**, y conviene decir qué parte no. Sus cuatro
filas son las del art. 43 (tres causales) y la del art. 14 de la Ley 26979. Quedan fuera tres cosas,
cada una por su motivo:

- el **plazo para reclamar un valor** (arts. 137 y 78 del TUO del Código Tributario), que
  `PlazosParametrizados` pide como `NOTIFICACION_VALOR-<tipo>`: **§1 no transcribe esos artículos**.
  Este archivo transcribió los arts. 43 a 46, 104 y 106;
- el **inicio del cómputo** de la prescripción (art. 44), que se pide como
  `PRESCRIPCION_INICIO-<tributo>`: está citado en la cabecera y **no tiene tabla en §1**;
- el **cuarto plazo del art. 43** —el de solicitar o efectuar la compensación y la devolución—:
  está transcrito y verificado, y **ningún código lo consume**. `CausalDePrescripcion`
  no tiene esa causal porque el sistema no tramita solicitudes de devolución. Publicarlo sería una
  fila que nadie lee, y una fila que nadie lee no se puede comprobar contra su uso: no aparecería en
  ninguna de las dos pruebas que cruzan este archivo con las claves del código.

Los dos primeros se cierran transcribiendo esos artículos y firmándolos; el tercero, el día que
exista la operación que lo pida.

El resto de archivos `VERIFICADO` —`alcabala.md`, `aranceles-2026.md`, `espectaculos.md`,
`multa-tributaria.md`, `transito-tabla-de-infracciones.md` y
`derecho-tramite-licencia-edificacion-catacaos-2023.md`— **sí** declaran `parametro_tributario` en
su sección 2 y son publicables con esta misma herramienta sin cambiarle una línea. No están aquí
porque este archivo empieza por lo que el conjunto de 2026 necesita para poder sellarse; añadirlos
es escribir filas y correr la comprobación, no construir nada. `verificar-publicacion.mjs` los
lista al final de su salida, en un libro mayor, para que la lista de pendientes no dependa de que
alguien se acuerde.
