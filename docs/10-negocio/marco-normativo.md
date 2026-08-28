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

## 2. Mapa normativo: qué falta, quién lo fija y quién lo espera

El manual describe qué calcula el sistema; no con qué cifras. Cada línea de este mapa es un dato
sin el cual una regla de cálculo no se puede escribir. **Todas siguen `‹VERIFICAR›` en su valor**:
lo que este mapa añade no es la cifra —eso es [E-3](../00-gobierno/plan-de-desbloqueo-D-02.md)—,
sino **de qué norma sale, qué parte de D-02 la bloquea y qué issue la está esperando**.

Sin esa tabla, asignar `D-02a`, `D-02b` o `D-02c` a un issue era una conjetura (hallazgo H-3 de
[GOB-03](../00-gobierno/plan-de-desbloqueo-D-02.md)). Con ella, el reetiquetado sale solo.

### 2.1 Cómo se decide la parte

La parte **no la fija el tributo: la fija quién produce el valor y qué hace falta para tenerlo**.

| Parte | Quién lo fija | Qué hace falta para tenerlo | Depende de D-01 |
|---|---|---|---|
| **D-02a** | Una **norma nacional publicada**: ley, decreto supremo o resolución ministerial | Buscarlo, transcribirlo y firmarlo. **No se decide** | **No** |
| **D-02b** | Una **ordenanza de la municipalidad en materia tributaria** | La ordenanza **y su acuerdo de ratificación provincial** cuando la emite una distrital (LOM art. 40). Sin ratificación no habilita emisión | Sí, o una municipalidad de demostración (E-6) |
| **D-02c** | Un acto de la propia municipalidad que **no** es ordenanza tributaria ratificada: ordenanza no tributaria, resolución del ejecutor, TUPA de servicio, calendario | Producirlo y firmarlo. Ni se busca en El Peruano ni se ratifica | Sí |

Reglas de lectura del mapa:

- La columna **Parte** admite `D-02a`, `D-02b` o `D-02c`, y puede llevar un `‹confirmar: …›` cuando
  la clasificación depende de una pregunta legal abierta. Lleva `‹POR CLASIFICAR: …›`, con su
  motivo, cuando ni eso se puede afirmar: es trabajo de E-3, y **se ve**.
- La columna **Issues** nombra los que esperan esa cifra, o dice `ninguno todavía`. Es la mitad de
  la comprobación cruzada; la otra mitad es §2.7.
- Un dato con **dos fuentes** se clasifica por la que bloquea la emisión, y la otra se anota en la
  columna de la norma. La partición sigue siendo una función: **una fila, una parte**.

### 2.2 Impuesto predial

| # | Dato | Norma que lo fija | Parte | Issues |
|---|---|---|---|---|
| 1 | UIT del ejercicio | Decreto supremo anual del MEF que fija la UIT | D-02a | #188, #190, #195, #196, #198 |
| 2 | Tramos del autovalúo en UIT y alícuota de cada tramo | TUO de la Ley de Tributación Municipal (D.S. 156-2004-EF) art. 13 | D-02a | #188 |
| 3 | Deducción del pensionista: monto en UIT y requisitos | TUO LTM art. 19 | D-02a | #188 |
| 4 | Deducción del adulto mayor no pensionista, si aplica | Ley 30490 y sus modificatorias, sobre el art. 19 del TUO LTM `‹confirmar artículo vigente›` | D-02a | #188 |
| 5 | Impuesto mínimo, si existe | TUO LTM art. 13, expresado como porcentaje de la UIT | D-02a | #188 |
| 6 | Vencimientos: pago al contado y cuatro cuotas trimestrales | TUO LTM art. 15. La prórroga que una ordenanza local pueda dar es otro dato, y es D-02c | D-02a | #188 |

### 2.3 Valuación del predio

| # | Dato | Norma que lo fija | Parte | Issues |
|---|---|---|---|---|
| 7 | Tabla de **valores unitarios** oficiales de edificación por categoría (**A–I**, nueve, leídas en el Anexo I.2), partida **y año de construcción** | Resolución anual del sector Vivienda, conforme al TUO LTM art. 11: para 2026, la R.M. 277-2025-VIVIENDA, art. 1 y Anexo I (I.1 a I.4, uno por región). **La tabla actual no tiene la dimensión «año de construcción»** (hallazgo H-4), y el anexo leído no la tiene tampoco: cruza categoría × **3 partidas** | D-02a | #188, #194, #197, #198 |
| 8 | **Aranceles** de terreno por vía y ejercicio | Planos arancelares aprobados por el sector Vivienda (TUO LTM art. 11). Norma nacional, pero **sus valores están referidos a las vías de cada localidad**: la transcripción es por municipalidad y necesita #16 | D-02a | #188 |
| 9 | Tabla de **depreciación** por material, antigüedad y estado de conservación | Anexa a la resolución anual del sector Vivienda `‹confirmar si la fija esa resolución o el Reglamento Nacional de Tasaciones›` | D-02a | #188, #194, #198 |
| 10 | Valorización de **otras instalaciones** y obras complementarias, y el **factor de oficialización** que multiplica el resultado | Resolución anual del sector Vivienda, conforme al TUO LTM art. 11: para 2026, la R.M. 277-2025-VIVIENDA, cuyo art. 2 aprueba el Instructivo (Anexo II, que fija `Fo = 0,68`) y cuyo art. 3 aprueba los valores unitarios a costo directo (Anexo III, de uso **opcional** según la propia resolución). La metodología es la del Reglamento Nacional de Tasaciones, R.M. 172-2016-VIVIENDA art. 31 | D-02a | #188 |

### 2.4 Arbitrios

| # | Dato | Norma que lo fija | Parte | Issues |
|---|---|---|---|---|
| 11 | Tasas de limpieza pública, relleno sanitario, parques y jardines y serenazgo, por sector y uso | Ordenanza municipal (TUO LTM arts. 68-69), ratificada por el concejo provincial cuando la emite una distrital (LOM art. 40) | D-02b | #189 |
| 12 | Criterios de distribución del costo del servicio | La misma ordenanza, con la justificación del costo que exige el TUO LTM art. 69 | D-02b | #189 |
| 13 | Descuento por pago anual adelantado que menciona el manual | Ordenanza municipal | D-02b | #189 |
| 14 | Inafectaciones: predios sin servicio de limpieza, parques o relleno | Ordenanza municipal, dentro del marco del TUO LTM | D-02b | #189 |

### 2.5 Otros tributos

| # | Dato | Norma que lo fija | Parte | Issues |
|---|---|---|---|---|
| 15 | Alcabala: alícuota, tramo inafecto en UIT, exoneraciones (primera venta de constructora, gobiernos, bomberos) | TUO LTM arts. 21 a 29 | D-02a | #190 |
| 16 | Patrimonio vehicular: alícuota, años afectos, tabla de valores referenciales del MEF | TUO LTM arts. 30 a 37; la tabla, por resolución ministerial anual del MEF | D-02a | #190 |
| 17 | Espectáculos públicos no deportivos: alícuotas por tipo | TUO LTM arts. 54 a 59 | D-02a | #190 |
| 18 | Anuncios y propaganda: tasas por tipo y dimensión | Ordenanza municipal `‹confirmar si su ordenanza es materia tributaria y por tanto se ratifica (LOM art. 40)›` | D-02b | #199 |

### 2.6 Recargos, plazos y sanciones

| # | Dato | Norma que lo fija | Parte | Issues |
|---|---|---|---|---|
| 19 | Interés moratorio: tasa vigente por periodo y forma de cálculo | TUO del Código Tributario art. 33: para los tributos de los gobiernos locales **la TIM la fija una ordenanza municipal**, con tope en la que establece la SUNAT | D-02b | ninguno todavía — lo consume la política de mora de #22, que cerró sin cifras |
| 20 | Reajuste: índice aplicable y momento de aplicación | TUO LTM art. 15, inc. b: variación acumulada del IPM que publica el INEI | D-02a | #188 |
| 21 | Plazo de prescripción y sus causales de interrupción y suspensión | TUO del Código Tributario arts. 43 a 46 | D-02a | #192 |
| 22 | Plazos de notificación y de inicio de la cobranza coactiva | TUO del Código Tributario arts. 104 y 106, y Ley 26979 | D-02a | #192 |
| 23 | Costas y gastos del procedimiento coactivo: aranceles vigentes | Ley 26979: las costas se liquidan conforme al arancel aprobado por la entidad | `D-02c ‹confirmar: falta saber quién aprueba ese arancel; si es una ordenanza tributaria ratificada, la fila pasa a D-02b›` | #193 |
| 24 | Tabla de infracciones de tránsito: código, porcentaje de la UIT, medida y puntos | Reglamento Nacional de Tránsito, D.S. 016-2009-MTC y su cuadro de infracciones `‹confirmar el anexo vigente›` | D-02a | #195 |
| 25 | Cuadro único de infracciones y sanciones administrativas (CUIS) de la municipalidad | Ordenanza municipal `‹confirmar si se ratifica: la sanción administrativa no es tributo, y LOM art. 40 alcanza a la materia tributaria›` | D-02b | #196 |
| 26 | Descuentos por pronto pago de papeletas | Ordenanza municipal de beneficios, sin ratificación | D-02c | #195, #196 |
| 27 | Multa tributaria por declarar fuera de plazo | TUO del Código Tributario art. 176 y sus tablas de infracciones y sanciones `‹confirmar la tabla que corresponde a un gobierno local›`. El régimen de gradualidad, si la municipalidad lo aprueba, es local (D-02c) | D-02a | #198 |

### 2.7 Las dos filas que faltaban

El hallazgo H-3 decía que la partición no era una función sobre los 27 datos. Dos de los cuatro
huecos eran de clasificación —aranceles y alcabala sí tenían fila, y ahora tienen parte— pero los
otros dos **bloqueaban un issue sin tener línea en este mapa**. Aquí están:

| # | Dato | Norma que lo fija | Parte | Issues |
|---|---|---|---|---|
| 28 | Interés del convenio de fraccionamiento y número máximo de cuotas | Ordenanza municipal que aprueba el reglamento de fraccionamiento, en el marco del TUO del Código Tributario art. 36 | D-02b | #191 |
| 29 | Derecho de trámite del TUPA para la licencia de edificación | Ordenanza que aprueba el TUPA, con su ratificación cuando corresponde | D-02b | #197 |
| 30 | Plazo de reclamación de los valores y exigibilidad coactiva municipal (RD, RM y OP) | TUO del Código Tributario arts. 78, 136 y 137, y TUO de la Ley 26979 art. 25 (con los arts. 29 y 31.2) | D-02a | #192 |
| 31 | Inicio del cómputo de la prescripción, como desfase por tributo | TUO del Código Tributario art. 44, y TUO LTM art. 34 (la DJ anual del vehicular) | D-02a | #192 |
| 32 | Porcentaje de la deducción del valor del predio en la Amazonía, y el ámbito territorial que da derecho a ella | Ley 27037 arts. 3 y 18, y su reglamento en esta materia, el D.S. 031-99-EF arts. 1 a 4. **El ámbito lo fija la Ley; el porcentaje, no**: el art. 3 del D.S. dice que «las Municipalidades de la Amazonía establecerán anualmente, el porcentaje de deducción» | `D-02b ‹confirmar: el D.S. 031-99-EF no nombra el instrumento con que la municipalidad fija ese porcentaje; si es ordenanza en materia tributaria se ratifica (LOM art. 40) y la fila es D-02b, y si no lo es, la fila pasa a D-02c›` | ninguno todavía — el factor lo esperaba D-11, y la deducción no aplica a la municipalidad piloto (Catacaos no está en el ámbito del art. 3) |

**Son 29 filas, no 27.** El número creció porque el mapa se construyó desde los issues hacia la
norma y no al revés: un issue bloqueado sin fila era un dato que nadie iba a buscar.

**Y son 31 desde el punto 2 de #192.** Las filas 30 y 31 son datos que las filas 21 y 22 daban por
englobados y que el sistema pide con clave propia —el plazo de reclamación que separa una RD/RM
notificada de una deuda exigible coactivamente, y el desfase por tributo con el que el art. 44
computa—; el verificador del corpus exige un archivo dueño por fila, y estos dos viven en
`valores-plazos-de-reclamacion.md` y `prescripcion-inicio-del-computo.md`, no en el archivo de
las filas 21 y 22.

**Y son 32 desde que D-11 se buscó en la fuente.** La fila 32 —la deducción del predio en la
Amazonía— es uno de los cuatro factores que NEG-05 §0.1 marcaba «sin fuente identificada» y que
**ninguna fila del mapa nombraba**: no se podía buscar lo que nadie había escrito que faltaba.
Ahora tiene norma —Ley 27037 art. 18 y D.S. 031-99-EF— y archivo dueño,
`predial-deduccion-amazonia.md`. Lo que la búsqueda encontró es que la cifra **no es de norma
nacional**: la Ley fija el ámbito y el reglamento la mecánica, pero el porcentaje lo pone cada
municipalidad de la Amazonía todos los años, así que la fila nace en D-02b y no en D-02a. Los otros
dos factores de D-11 que se buscaron a la vez —el incremento del 5 % por piso y el factor de
oficialización— **no piden fila nueva**: el 5 % es una nota al pie del propio Cuadro de Valores
Unitarios (fila 7) y el `Fo = 0,68` es el Anexo II de la resolución del sector Vivienda (fila 10),
que por eso deja de estar `‹POR CLASIFICAR›`.

### 2.8 Los issues que esperan, y por qué

La otra dirección de la comprobación. Cada issue etiquetado aparece aquí con las partes que lo
bloquean y **las filas del mapa que las justifican**; si una etiqueta no tiene fila que la nombre,
o una fila nombra un issue que no la lleva, `verificar-mapa-normativo.mjs` lo señala.

| Issue | Partes | Filas del mapa |
|---|---|---|
| #188 determinación del predial — las cifras | D-02a | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20 |
| #189 arbitrios — las cifras | D-02b | 11, 12, 13, 14 |
| #190 vehicular, alcabala y espectáculos — las cifras | D-02a | 1, 15, 16, 17 |
| #191 fraccionamiento — las cifras | D-02b | 28 |
| #192 prescripción y plazos — las cifras | D-02a | 21, 22, 30, 31 |
| #193 arancel de costas procesales — las cifras | D-02c | 23 |
| #194 impuesto fiscalizado — las cifras | D-02a | 7, 9 |
| #195 cálculo de la papeleta de tránsito — las cifras | D-02a, D-02c | 1, 24, 26 |
| #196 cálculo de la papeleta administrativa — las cifras | D-02a, D-02b, D-02c | 1, 25, 26 |
| #197 valorización de obra y derecho de trámite del FUE — las cifras | D-02a, D-02b | 7, 29 |
| #198 liquidación y multa tributaria — las cifras | D-02a | 1, 7, 9, 27 |
| #199 tasa de anuncios y propaganda — las cifras | D-02b | 18 |

**Ningún otro issue del repositorio lleva etiqueta de bloqueo por D-02.** Los doce de arriba son
las mitades «cifras» que salieron de partir sus padres en la frontera estructura/valor
([GOB-03 §E-2](../00-gobierno/plan-de-desbloqueo-D-02.md)); los padres quedaron sin bloqueo y se
pueden empezar hoy.

### 2.9 Lo que cambió de sitio al construir el mapa

Cuatro filas no estaban donde GOB-02 las tenía, y el motivo es siempre el mismo: **se habían
clasificado por tributo y no por quién fija el valor**.

| Dato | Estaba | Está | Por qué |
|---|---|---|---|
| Espectáculos públicos (17) | D-02c | **D-02a** | La alícuota la fija el TUO LTM, no una ordenanza |
| Prescripción y plazos de notificación (21, 22) | D-02c | **D-02a** | Los fija el Código Tributario. **#192 deja de esperar a D-01** |
| Tabla de infracciones de tránsito (24) | D-02c | **D-02a** | La fija un decreto supremo nacional |
| Anuncios y propaganda (18) | D-02c | **D-02b** | La tasa la fija una ordenanza. Era el hallazgo H-3 |
| Interés moratorio (19) | D-02c | **D-02b** | El Código Tributario manda que la TIM municipal la fije una ordenanza |

El saldo: **cuatro datos pasan a poder buscarse hoy**, sin municipalidad piloto, y uno pasa a
depender de una ordenanza que antes parecía no necesitar.

## 3. Cómo entra un dato normativo al sistema

**Nunca como literal en el código** (regla 5 de [ARQ-04](../30-arquitectura/estandares-de-codigo-backend.md)).

1. Se carga como fila de `parametro_tributario` (o de la tabla específica: `arancel`,
   `valor_unitario`, `depreciacion`, `valor_referencial_vehiculo`) con su **vigencia** y su
   **documento fuente** —la ordenanza, el decreto o la resolución que lo fija.
2. Un segundo usuario lo **aprueba**: la tabla impide que quien carga sea quien aprueba.
3. Al cerrar el ejercicio se **sella** el conjunto de parámetros. Un conjunto sellado no cambia;
   corregirlo obliga a una versión nueva, y eso queda en el diff de los datos, no del código.

Así, recalcular 2027 en 2037 usa los parámetros de 2027 y da el mismo resultado.

> **Antes del paso 1 hay uno más, que es E-3:** el dato se transcribe en
> `docs/10-negocio/valores-normativos/` con su norma, su artículo, su fecha de publicación y **dos
> firmas distintas** —quien transcribe y quien verifica—. La doble verificación de `ADR-0007`
> empieza en el documento, antes de existir como fila. Y **cargar** las tres tablas de dato
> nacional se carga con `municipalidad_id` nulo desde que **D-13** se cerró el 2026-08-28
> ([ADR-0017](../30-arquitectura/adr/ADR-0017-tablas-de-valuacion-nacionales.md); §2.3, H-5).

## 4. Verificación del mapa

```bash
node docs/10-negocio/verificar-mapa-normativo.mjs
```

Comprueba, **en las dos direcciones**, que este documento y el tablero dicen lo mismo:

- las 32 filas tienen norma y parte, y todo `‹POR CLASIFICAR›` y todo `‹confirmar›` lleva su motivo;
- todo issue nombrado en una fila aparece en §2.8 con esa parte, y al revés;
- §2.8 coincide **exactamente** con las etiquetas reales del tablero, que viven en
  [`etiquetas-de-bloqueo.json`](etiquetas-de-bloqueo.json).

Quitar un issue de una fila dejándolo etiquetado —o etiquetar uno que ninguna fila nombra— pone el
guion en rojo, con el número del issue y la fila. Es la misma comprobación en dos direcciones que
hace el contrato de la API.
