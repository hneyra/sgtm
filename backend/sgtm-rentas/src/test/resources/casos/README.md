# El corpus de casos de NEG-05

Un archivo por regla `RT-xxx`, una fila por caso. Lo comprueba
`CorpusDeCasosTest`, y no es documentación: es una prueba que se pone roja.

**La idea que lo hace útil:** #30 pedía «casos de prueba con las cifras esperadas en blanco», y
escrito así un corpus sin cifras no verifica nada. Hay una forma en que sí: **se deja en blanco la
cifra, no las aristas del grafo.** Con parámetros ficticios se comprueba hoy que un caso aplica
exactamente las reglas que declara, produce exactamente los conceptos que declara y pide exactamente
los parámetros que declara —recogidos corriéndolo con un conjunto vacío, no escritos a mano—.

## Por qué vive aquí y no en `sgtm-parametros`

GOB-03 §E-5 lo situaba en `sgtm-parametros/src/test/resources/casos`. Está en `sgtm-rentas` porque
**las reglas del predial son de `rentas`**, y `parametros` no depende de ningún contexto acotado: es
de solo lectura para todos (ARQ-01). Un corpus que corre reglas tiene que vivir donde están las
reglas.

## Formato

Separador `;`, y `|` dentro de una celda para las listas. No es coma porque las celdas llevan llaves
como `ARANCEL:AV-GRAU` y descripciones con comas.

| Columna | Qué lleva |
|---|---|
| `caso` | `RT-xxx-cNN`. El prefijo tiene que ser el del archivo |
| `caso_borde` | El caso borde de NEG-05 §2 que cubre, si cubre alguno. Vacío si no |
| `descripcion` | Qué situación es |
| `ejercicio` | Del hecho imponible |
| `entradas` | `CONCEPTO=valor`, los datos declarados de la partida. **Nunca una cifra normativa** |
| `caracteristicas` | `nombre=valor`, lo que la partida **es**: la vía, la categoría, el material |
| `parametros_requeridos` | Las llaves que la regla pide, **sin sus valores** |
| `reglas_esperadas` | Los `RT-xxx` que deben haberse aplicado |
| `conceptos_esperados` | Los conceptos que el cálculo debe haber **producido** —los declarados no cuentan— |
| `estado` | Cómo se puede comprobar hoy. Ver abajo |
| `esperado` | El importe. **Vacío hasta D-02a** |
| `fuente_del_esperado` | De dónde sale ese importe. Obligatorio en cuanto haya importe |

## Los cinco estados

| Estado | Qué significa | Qué comprueba la prueba |
|---|---|---|
| `EJECUTABLE` | Sus reglas están registradas en el motor | Corre el caso: reglas, conceptos y parámetros, exactos |
| `FALLA_ESPERADA:‹excepción›` | Correrlo **debe** fallar | Que falle, y con esa excepción |
| `SIN_REGLA:‹bloqueo›` | La regla todavía no se puede escribir | Que **de verdad** no esté registrada. `D-11`, `D-02a`, `H-4`, `MOTOR`, `NEG-05` |
| `SIN_CRITERIO:‹fuente›` | La regla existe; lo que falta es la decisión de este caso borde | Que sea un caso borde del inventario de NEG-05 §2 |
| `FUERA_DEL_MOTOR:‹clase›` | La regla existe como función pura, con su propia prueba | Que la clase exista y que el motor no la registre |

**`SIN_CRITERIO` no estaba previsto: lo exigió la propia prueba.** Los tres casos borde de `RT-001`
se habían escrito como `SIN_REGLA`, y `RT-001` sí está registrada: la comprobación se puso roja y
tenía razón. Lo que falta ahí no es la regla, es la decisión.

## Qué hay que hacer al añadir una regla

Cuando una regla pasa a estar registrada, sus casos `SIN_REGLA` **ponen la prueba en roja**: eso es
lo que impide que el corpus se quede viejo sin que nadie lo note. Hay que pasarlos a `EJECUTABLE` y
completar `parametros_requeridos` —o dejar que la prueba diga cuáles son de verdad—.

## Qué hay que hacer al cerrar una cifra

Rellenar `esperado` **y** `fuente_del_esperado`. La prueba solo admite un importe en un caso que no
necesite parámetros ficticios: comparar contra un arancel inventado no probaría nada, y pasaría en
verde. La comparación al céntimo contra el conjunto sellado real es lo que cierra D-02a, y es el
insumo de `CAL-02`.
