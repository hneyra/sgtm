# Lo publicable del corpus

`parametros-2026.csv` es el **derivado publicable** del corpus de valores normativos: la única
entrada desde la que `PublicarParametros` escribe en `parametro_tributario`. No es una fuente —lo
son los archivos del corpus, uno por norma— sino su proyección a las columnas que la tabla tiene.

**Ninguna cifra de este archivo se tecleó de memoria.** Cada una está letra por letra en el archivo
del corpus que su fila nombra, y [`verificar-publicacion.mjs`](../../verificar-publicacion.mjs) lo
comprueba fila a fila en cada PR: que el archivo exista, que su `Estado` sea `VERIFICADO`, que las
dos firmas sean las de su cabecera y sean distintas, que el documento fuente y el artículo estén
ahí, que cada fragmento del valor de texto aparezca verbatim y que la cifra numérica esté en ese
mismo texto. Que la comprobación puede fallar lo demuestran las nueve muestras de `_muestras/`, una
por prohibición, con [`verificar-las-muestras-de-publicacion.mjs`](../../verificar-las-muestras-de-publicacion.mjs).

## La doble firma ya ocurrió, y es la que se guarda

ADR-0007 exige dos firmas para una cifra normativa, y `parametro_doble_verificacion_ck` (V1) lo
sostiene en la base: `usuario_aprueba <> usuario_carga`. **Las dos firmas de este archivo son las
del corpus**, no las del proceso que carga: `transcribio` y `verifico` se copian de la cabecera del
archivo del corpus y viajan tal cual a `usuario_carga` y `usuario_aprueba`. Quien corre
`publicar-parametros.sh` no firma nada; transporta lo que ya se firmó al leer la norma.

> **Hay que decirlo: `uit.md` está verificado por «Agent».** Su cabecera dice `Transcribió | JNA` y
> `Verificó | Agent`, así que las cinco filas de la UIT llegan a la base con `usuario_aprueba =
> 'Agent'`. La restricción se cumple —son dos firmas distintas— y la comprobación pasa, pero la
> segunda lectura de la UIT la hizo un agente y no una persona. Los otros tres archivos
> (`predial-tramos-y-alicuotas.md`, `predial-deducciones.md`, `predial-minimo.md`) llevan `HNA`.
> Re-verificar la UIT con firma humana no cambia una línea de código: cambia una celda de `uit.md`
> y la columna `verifico` de cinco filas de este CSV.

## Un solo archivo para los dos pasos

Las tres primeras columnas son exactamente `tipo,clave,vigenciaDesde`, que es lo que
`ImportarParametrosDelConjunto` lee; las demás las ignora. Así el mismo archivo sirve para publicar
el valor y para componer el conjunto, y no hay dos listas que puedan separarse:

```bash
infra/carga-de-datos/publicar-parametros.sh      --ambiente stg --archivo parametros-2026.csv
infra/carga-de-datos/abrir-conjunto-parametros.sh --ambiente stg --municipalidad-id 4 \
    --conjunto-id N --archivo parametros-2026.csv
```

## Las once filas, y de dónde sale cada una

| Tipo | Clave | Filas | Archivo del corpus |
|---|---|---|---|
| `UIT` | — | 5 (2022–2026) | `uit.md` |
| `TRAMO_PREDIAL` | `1`, `2`, `3` | 3 | `predial-tramos-y-alicuotas.md` |
| `DEDUCCION_PENSIONISTA` | — | 1 | `predial-deducciones.md` |
| `DEDUCCION_ADULTO_MAYOR` | — | 1 | `predial-deducciones.md` |
| `PREDIAL_MINIMO` | — | 1 | `predial-minimo.md` |

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

El resto de archivos `VERIFICADO` —`alcabala.md`, `aranceles-2026.md`, `espectaculos.md`,
`multa-tributaria.md`, `prescripcion-y-plazos.md`, `transito-tabla-de-infracciones.md`,
`derecho-tramite-licencia-edificacion-catacaos-2023.md`— **sí** declaran `parametro_tributario` en
su sección 2 y son publicables con esta misma herramienta sin cambiarle una línea. No están aquí
porque este archivo empieza por lo que el conjunto de 2026 necesita para poder sellarse; añadirlos
es escribir filas y correr la comprobación, no construir nada. `verificar-publicacion.mjs` los
lista al final de su salida, en un libro mayor, para que la lista de pendientes no dependa de que
alguien se acuerde.
