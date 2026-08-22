# Campaña de observación del SRTM del MEF — cómo se cierra D-03c

**Qué se responde aquí:** en qué puntos del cálculo redondea el SRTM del MEF. No es una decisión
—nadie puede decidir cómo redondea un sistema ajeno—: es **ingeniería inversa contra
determinaciones reales**, una ficha por cada una.

El tipo que guarda la respuesta ya existe: `PuntoDeRedondeo` y `PoliticasDeRedondeo`, en
`sgtm-dominio-compartido`. Tiene **catorce puntos candidatos**, uno por cada paso que las secuencias
de `../srtm` NEG-05 revelan, y **ninguno tiene política todavía**. Cada ficha de esta carpeta
convierte un candidato en un hecho observado.

## Por qué hay una campaña y no una reunión

`CAL-02` —el contraste del cálculo contra el SRTM sobre predios reales— es la validación de las
reglas. Si se usara **el mismo** contraste para descubrir los puntos de redondeo, toda diferencia de
céntimos sería indistinguible de un error de regla y el contraste no concluiría nada.
[GOB-02](../../00-gobierno/decisiones-abiertas.md) §«Cómo se cierra D-03c» lo parte en dos pasos:

1. **Observar** determinaciones con su **desarrollo intermedio visible** —el manual M02 muestra que
   la pantalla de determinación lo trae— y fijar los puntos contra ese desarrollo. Eso es esta
   carpeta.
2. **Validar** con `CAL-02`, **sobre un juego de predios distinto**.

## Cómo se llena una ficha

Se copia [`_plantilla.md`](_plantilla.md) a `‹ejercicio›-‹referencia del predio›.md` y se completa
con lo que **la pantalla muestra**, no con lo que se deduzca de ella. Reglas:

- **Se transcribe el desarrollo intermedio tal como aparece**, con todos sus decimales. Un valor
  «redondeado a dos» que en la pantalla trae cuatro es exactamente el dato que la ficha busca.
- **Un punto se declara observado cuando dos fichas independientes coinciden.** Una sola puede estar
  explicada por el azar de las cifras de ese predio: si el metrado era entero, no dice nada.
- **Lo que no se ve, no se rellena.** Una casilla en blanco es información; una casilla inventada
  contamina el paso 2.
- **Ningún dato personal del contribuyente.** El predio se identifica por su referencia catastral y
  su ejercicio; el nombre no aporta nada al redondeo.

## Del hecho observado al sistema

El resultado **no entra como código**: entra como parámetro `REDONDEO:‹punto›` con su escala y su
modo, igual que cualquier otro dato normativo (ADR-0007), y `PoliticasDeRedondeo` lo lee. Una
política escrita a mano en el Java ya la detecta el escáner de fuentes.

Mientras un punto no esté parametrizado, el cálculo que lo pida **falla**. Es deliberado: no
redondear también produce un importe, y ese importe es plausible y equivocado.

## Estado

| Punto | Fichas | Estado |
|---|---|---|
| `VALOR_UNITARIO_INCREMENTADO` | — | Sin observar |
| `VALOR_UNITARIO_DEPRECIADO` | — | Sin observar |
| `VALOR_POR_NIVEL` | — | Sin observar |
| `METRADO_DE_OBRA` | — | Sin observar. **M02 ya lo revela como punto de redondeo**; falta escala y modo |
| `VALOR_DE_OBRA` | — | Sin observar |
| `AUTOVALUO_DEL_PREDIO` | — | Sin observar |
| `AUTOVALUO_ACTUALIZADO` | — | Sin observar |
| `BASE_IMPONIBLE_DEL_PREDIO` | — | Sin observar |
| `BASE_DEL_CONTRIBUYENTE` | — | Sin observar |
| `IMPUESTO_POR_TRAMO` | — | Sin observar |
| `IMPUESTO_ANUAL` | — | Sin observar |
| `CUOTA` | — | Sin observar |
| `REAJUSTE` | — | Sin observar |
| `INTERES` | — | Sin observar |

Esta tabla es el progreso de D-03c. Bajar el número de «sin observar» es lo único que la cierra.

Issue: [#203](https://github.com/hneyra/sgtm/issues/203). Depende de **acceso al SRTM del MEF**, no
de D-01 ni de D-02.
