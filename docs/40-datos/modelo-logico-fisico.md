# DAT-01 — Modelo lógico-físico

**El esquema vive como migraciones de Flyway**, en
[`backend/sgtm-esquema/src/main/resources/db/migration/`](../../backend/sgtm-esquema/src/main/resources/db/migration/).
Este documento las explica. **Si divergen, mandan las migraciones.**

---

## §0 — Lo primero que hay que saber

**Tres hallazgos sobre Row Level Security**, verificados ejecutando contra PostgreSQL. Los dos
primeros vienen del proyecto SRTM, del que se hereda la estrategia: no se volvieron a descubrir
aquí, se trasladaron con su mitigación y la prueba de aislamiento los vigila. El tercero salió aquí,
midiendo planes de ejecución.

### Hallazgo 1 — Un superusuario omite RLS

`FORCE ROW LEVEL SECURITY` protege del **propietario** de la tabla, no del **superusuario**. Un
rol superusuario ve todas las filas de todas las municipalidades aunque las políticas estén
puestas.

**Consecuencias, todas obligatorias:**

- El rol de aplicación se crea `NOSUPERUSER NOBYPASSRLS`.
- La aplicación no se conecta como propietario de las tablas.
- **Una prueba de aislamiento escrita sobre la conexión por omisión de Testcontainers —que es de
  superusuario— pasa en verde sin verificar nada.** Por eso `AislamientoMultiTenantTest` crea el
  rol `sgtm_app` en su arranque y lo usa para todo, y lo demuestra: con el mismo contexto fijado,
  el superusuario ve las dos municipalidades y `sgtm_app` una.

### Hallazgo 2 — Una partición no hereda la política del padre

Una partición **no hereda** `relrowsecurity`, y consultarla directamente evade la política de la
tabla padre.

**Dos mitigaciones, y la segunda es la que cierra el hueco:**

1. RLS explícita en cada partición (`V6__rls.sql`, segundo bloque).
2. **La aplicación no tiene ningún privilegio sobre ninguna partición.** Los `GRANT` se conceden
   solo sobre las tablas padre. Por eso `V7__privilegios.sql` **no** usa
   `GRANT … ON ALL TABLES IN SCHEMA`: una partición nueva no recibe privilegios salvo que alguien
   se los conceda expresamente, y eso se ve en el diff.

### Hallazgo 3 — Bajo RLS, un `LIKE` no llega nunca al índice

Una búsqueda por prefijo escrita como `columna LIKE 'prefijo%'` **se ejecuta como recorrido
secuencial** para el rol de aplicación, exista o no un índice adecuado. Da igual la clase de
operadores del índice: no se usa.

El motivo es que `textlike` **no es *leakproof*** (`pg_proc.proleakproof = false`), y PostgreSQL se
niega a evaluar una condición que no lo sea *antes* de la política de seguridad — podría revelar,
por un mensaje de error, filas de otra municipalidad. Así que el `LIKE` se queda como `Filter`
después del recorrido, y el índice sobra.

Medido contra PostgreSQL 16 con 30 000 filas, misma tabla, mismo índice, mismos datos y el rol
`sgtm_app` sujeto a la política:

| Cómo se escribe el prefijo | Plan | Coste |
|---|---|---|
| `cod LIKE 'prefijo%'` | `Seq Scan` | 925 |
| `cod ~>=~ 'prefijo' AND cod ~<~ 'prefijp'` | `Bitmap Index Scan` | 308 |

**Mitigación.** Toda búsqueda por prefijo se escribe como un **rango** con los operadores de
`text_pattern_ops` —`~>=~` y `~<~`, los dos *leakproof*—, sobre un índice declarado con esa clase
de operadores. Expresa exactamente el mismo prefijo y sí llega al índice.

No es una peculiaridad de una consulta: le pasa a **toda** búsqueda por prefijo del sistema, y
como el plan no cambia el resultado, nada se pone rojo cuando alguien lo devuelve a `LIKE`. Por eso
hay dos pruebas gemelas en `ConsultaDeFichasTest$Volumen`: una exige que el rango use índice, y la
otra fija que el `LIKE` no lo usa y explica por qué.

El mismo razonamiento vale para cualquier operador no *leakproof* sobre una tabla con RLS. La
búsqueda por aproximación de nombres (`V11`) no está afectada: `similarity` va sobre un índice GIN
que se evalúa como filtro de todos modos.

---


### Hallazgo 4 — Una clave foránea nueva sobre una tabla con RLS no se puede validar

`ALTER TABLE … ADD CONSTRAINT … FOREIGN KEY` lanza, para validar, **una consulta** sobre la tabla.
Esa consulta queda sujeta a la política, la política lee `app.municipalidad_id`, y el migrador corre
como `sgtm_owner` **sin contexto de tenant** —correctamente: migrar no es atender la petición de
ninguna municipalidad—. El resultado es que la migración entera se cae con

```
ERROR: unrecognized configuration parameter "app.municipalidad_id"
```

No sale en la revisión: el `ALTER TABLE` se lee impecable. Sale al ejecutarlo, y apareció al añadir
`valor_referencial_vehiculo.conjunto_id` en `V17`.

Las tablas de `V1` a `V5` no lo sufren porque sus claves foráneas nacieron **antes** que las
políticas de `V6`. Le pasa a toda clave foránea que se agregue de aquí en adelante sobre una tabla
de tenant.

**Mitigación.** `NOT VALID`, y no es un atajo: es la única forma. Salta el escaneo de las filas
existentes y **no debilita nada hacia adelante** — la restricción se comprueba en cada `INSERT` y
en cada `UPDATE` desde ese momento. Lo único que queda sin verificar son las filas anteriores, y en
una tabla vacía no hay ninguna. `VALIDATE CONSTRAINT` después chocaría con lo mismo.

## 1. Las migraciones

| Migración | Contenido |
|---|---|
| `V1__nucleo_y_catastro.sql` | Dominios, `municipalidad`, parámetros, contribuyentes y todo el catastro |
| `V2__rentas_y_cuenta_corriente.sql` | Vehículos, declaraciones, beneficios, transferencias, determinación y el libro de asientos |
| `V3__cobranza_valores_y_coactiva.sql` | Caja, recibos, tasas, convenios, valores, notificaciones y coactiva |
| `V4__sanciones_y_licencias.sql` | Infracciones, papeletas, fiscalización, licencias y anuncios |
| `V5__seguridad_y_auditoria.sql` | Módulos, accesos, grupos, usuarios, permisos, sesiones y auditoría |
| `V6__rls.sql` | Row Level Security en todas las tablas |
| `V7__privilegios.sql` | `GRANT` solo sobre tablas padre; sin `DELETE`; sin `UPDATE` en lo inmutable |
| `V8__respaldo.sql` | Registro de respaldos |
| `V9__conjuntos_sellados.sql` | Conjuntos de parámetros por ejercicio, con su sellado |
| `V10__varias_versiones_selladas.sql` | Varias versiones selladas del mismo ejercicio (ARQ-09 §3) |
| `V11__busqueda_por_aproximacion.sql` | `nombre_normalizado(…)` inmutable e índice GIN de trigramas |
| `V12__responsables_solidarios.sql` | Quién responde por la deuda además del contribuyente |
| `V13__fichas_economica_bienes_y_rural.sql` | Detalle de los otros tres tipos de ficha |
| `V14__indices_de_la_consulta_de_fichas.sql` | Los tres índices de la consulta transversal (ver §0, hallazgo 3) |
| `V15__documentos_emitidos.sql` | Documentos emitidos con los datos que los generaron, para reimprimirlos idénticos |
| `V16__instalacion_de_demostracion.sql` | `municipalidad.es_demostracion`: todo documento que emita el tenant sale marcado |
| `V17__placa_normalizada_y_valores_por_conjunto.sql` | La placa es única sin su guion, y el valor referencial cuelga del conjunto sellado (ver §0, hallazgo 4) |
| `V26__valores_correlativo.sql` | Numeración correlativa de OP/RD/RM, por municipalidad, tipo y ejercicio (#37) |
| `V27__valores_masivo.sql` | Criterio e items de una corrida de generación masiva de valores (#38) |
| `V28__notificacion_prescripcion_y_pase_a_coactiva.sql` | Acuse de notificación, pase a coactiva (`valor_movimiento`) y declaración de prescripción con su cómputo por ejercicio y sus hechos interruptivos/suspensivos (#39). Le revoca el `UPDATE` que `V7` le daba a `notificacion` |
| `V37__licencia_de_funcionamiento.sql` | La licencia de funcionamiento (#44): retira de `licencia_funcionamiento` las columnas de estado que decían `VIGENTE` para siempre y el `resolucion` de texto libre; exige el recibo y el documento emitido; agrega `licencia_movimiento` —de donde se deriva el estado— y `licencia_correlativo`; le pone al catálogo `ciiu` su sección, su riesgo de ITSE y su traza; y revoca el `UPDATE` sobre la licencia y sus duplicados |
| `V47__valores_masivos_de_papeletas_y_constancias.sql` | Los valores masivos de papeletas y los reportes de sanciones (#53): `papeleta_masivo` —el criterio congelado de una corrida, con la `fecha_criterio` a la que se evalúa la deuda de cada candidato— y `papeleta_masivo_item`, con `papeleta_valor_unico_uq`, el índice único **parcial** que garantiza un valor por papeleta en toda la vida del padrón; `constancia_libre`, con la fecha a la que se verificó que el vehículo no debía nada; y los índices de los padrones y resúmenes, incluido `papeleta_placa_prefijo_ix` con `text_pattern_ops`, porque el resumen por iniciales busca por rango y no con `LIKE`. **No hay ninguna tabla de correlativos**: el número de cada resolución de multa sale de `valor_correlativo` (`V26`) |

Los roles se crean **antes**, con `db/roles/crear-roles.sql`, que no es una migración: las
políticas de `V6` los nombran, y un rol no puede crearse a sí mismo.

## 2. Dominios

Las restricciones viajan con la columna, para que no dependan de que alguien las repita.

| Dominio | Tipo | Restricción |
|---|---|---|
| `dinero` | `numeric(15,2)` | Escala ratificada y redondeo `HALF_UP` ([ADR-0018](../30-arquitectura/adr/ADR-0018-el-redondeo-decidido.md)); el del cierre de caja sigue abierto (D-03d) |
| `monto_calc` | `numeric(18,6)` | Cálculos intermedios, antes de redondear |
| `alicuota` | `numeric(7,4)` | 0 ≤ v ≤ 100 |
| `porcentaje` | `numeric(7,4)` | 0 < v ≤ 100 |
| `area_m2` | `numeric(12,2)` | v ≥ 0 |
| `ejercicio` | `smallint` | 1990 ≤ v ≤ 2100 |
| `cod_catastral` | `varchar(25)` | Solo dígitos, 18–25 posiciones. La longitud exacta es **D-10** |

**Ningún importe es de coma flotante**, ni en la base ni en el código (RNF-055).

## 3. Clasificación de tablas

Toda tabla es exactamente una de tres cosas, y la prueba de aislamiento falla si aparece una sin
clasificar:

| Clase | Cuáles | RLS |
|---|---|---|
| **De tenant** | Todas las de negocio (63): llevan `municipalidad_id NOT NULL` | Política con `USING` y `WITH CHECK` |
| **De catálogo** | `municipalidad`, `parametro_tributario` | Política propia, enumerada en el código de la prueba |
| **Exenta** | `flyway_schema_history` | Sin RLS; solo la usa `sgtm_owner` |

## 4. Las piezas centrales

### 4.1 Contribuyente y su código único

`contribuyente` lleva `codigo_contribuyente` único por municipalidad: es el «código único» del
manual, con el que se enlazan predios, vehículos, papeletas y licencias. El documento de identidad
también es único por municipalidad.

`domicilio` lleva vigencias, con un índice parcial que garantiza **un solo domicilio fiscal
vigente** por contribuyente. `contacto` unifica teléfonos, correos, gestores y contactos.

### 4.2 Catastro: la ficha se versiona, no se sobrescribe

Es la exigencia del manual (cap. 2 §Actualización del Catastro), y aquí es el modelo:

- `ficha_catastral` lleva `version`, `vigencia_desde/hasta`, `origen`, `documento_origen`,
  `usuario_registro` y **`observacion NOT NULL`**.
- Un índice parcial garantiza **una sola ficha vigente** por predio y tipo.
- `construccion` guarda las categorías A–I por partida (muros, techos, pisos, puertas,
  revestimientos, baños, instalaciones); **el valor de cada letra no está aquí**, sino en
  `valor_unitario_edificacion`, versionado por ejercicio.

`titularidad` tiene un **trigger diferido** que exige que los porcentajes vigentes de un predio
**no excedan** 100 —no que sumen exactamente 100—. Diferido porque una transferencia cierra una
titularidad y abre otra en la misma transacción, y en el intermedio la suma no cuadra.

> **Por qué «no excede» y no «suma 100».** Es la regla que el SRTM del MEF valida, heredada
> verificada de [`../srtm` DAT-02 §4.2](../../../srtm/docs/40-datos/modelo-logico-fisico.md)
> (allí es D-36). Un padrón real tiene predios con titularidad parcialmente identificada;
> exigir que sume 100 obligaría al operador a **inventar un titular para cuadrar**, que es peor
> que registrar el 60 % que efectivamente se conoce. Queda abierto si el resto del autovalúo se
> determina a alguien o no se cobra.

Complemento: un `CHECK` exige que el `PROPIETARIO_UNICO` tenga porcentaje 100 —lo es por el
total, su porcentaje no se declara—.

### 4.3 Determinación: reproducible o no sirve

`determinacion` guarda `conjunto_id` —con qué conjunto de parámetros se calculó— y
`reglas_aplicadas`. Sin eso, recalcular un ejercicio pasado no da el mismo resultado y el sistema
no sirve como prueba de nada (ADR-0007). Está **particionada por ejercicio**.

> ⚠ **Falta el detalle por predio, y la tabla sola invita al error.** El predial se determina
> **por contribuyente, no por predio**: los tramos progresivos se aplican al conjunto de sus
> predios, y un contribuyente con tres predios pequeños puede caer en un tramo superior
> (`../srtm` NEG-05 §1, confirmado contra el manual M02 del MEF). Hoy `determinacion` admite
> `predio_id`, así que nada impide emitir una fila por predio —que es exactamente el error
> sistemático **a la baja en todo el padrón**—.
>
> Lo que falta es la grilla de «detalle de los predios» dentro de una determinación, con el
> aporte de cada uno a la base: `autovalúo → × % actualización → × % propiedad →
> base_imponible_predio`, y `base_contribuyente = Σ base_imponible_predio`. Se modela junto con
> la primera regla de cálculo, no antes: `% actualización` es uno de los cuatro factores que
> NEG-05 §0.1 marca **sin fuente identificada**.

### 4.4 Cuenta corriente: solo se agrega

`cuenta_corriente_asiento` es el libro de ADR-0006. `CARGO` o `ABONO`, con `concepto`
—insoluto, reajuste, interés, gasto, pago, compensación, anulación, condonación, ajuste,
fraccionamiento— y `fase` —ordinaria, valor, coactiva, convenio—.

- La aplicación tiene `SELECT` e `INSERT`. **Nada más.**
- `asiento_reversado_id` enlaza la corrección con lo corregido.
- Los conceptos que alteran deuda sin cobro (`ANULACION`, `CONDONACION`, `AJUSTE`) exigen
  `motivo`, por `CHECK`.
- `referencia_externa` es cómo entran papeletas y licencias **sin** que el libro dependa de esos
  contextos: no hay clave foránea a propósito (ARQ-01 §4 regla 2).
- `saldo_proyectado` es caché reconstruible. Si diverge, manda el libro.

### 4.5 Sanciones: el desglose se guarda, no se recalcula

`papeleta` guarda los seis importes del manual: base imponible, porcentaje de la infracción,
importe de la infracción, porcentaje realmente a cobrar, importe a pagar e importe con beneficio.
Se guardan **todos** porque explicarle el cobro al contribuyente es parte del requisito, y
recalcularlos meses después con otros parámetros daría otra cifra.

Lo que `V4` **no** guardaba, y `V41` (#50) agrega, es **a quién se le cobra**: `papeleta.obligado_id`.
`RegistrarPapeleta` (#46, #47) recibía el obligado por la firma, asentaba el cargo contra él y no lo
guardaba en ninguna parte. La consecuencia no se ve hasta que un descargo se declara fundado: hay que
dar de baja **esa misma** obligación del libro, y no hay forma de saber contra cuál se asentó —
`infractor_id`, `propietario_id` y `contribuyente_id` son tres candidatos y ninguno es la respuesta,
porque el manual permite cobrarle al propietario aunque condujera otro—. Es también el «Obligado» que
la resolución de gerencia imprime.

Y el escalado del manual, también con `V41`: `descargo` pierde `resultado`, `resolucion` y
`fecha_resolucion` —el fallo escrito dentro del escrito que otro presentó—, que pasan a
`resolucion_gerencia`; e `internamiento` pierde `fecha_salida`, porque liberar un vehículo es un acto
con su acta, su recibo de custodia y quien lo retira, no una fecha rellenada encima del ingreso. Los
dos estados —el del recurso y el del vehículo— se **derivan**, como el del recibo y el del turno.

La **tarifa** de la custodia no está en `internamiento`: solo el **código** del concepto del TUPA. La
tarifa vive en `tasa` con su vigencia (regla 5, ADR-0007), y copiarla la pondría en dos sitios.

### 4.6 Seguridad y auditoría

El modelo del manual, completo: `modulo_sistema`, `acceso` (opción de menú o política), `grupo`,
`usuario`, `miembro`, `permiso` con los siete privilegios, `sesion`.

`auditoria` lleva usuario, equipo, IP, fecha, tabla, clave, operación y **`observacion NOT NULL`
con al menos cinco caracteres no vacíos**: sin observación la inserción falla y la operación
completa se deshace (ADR-0008). Está particionada por ejercicio y la aplicación solo puede
`SELECT` e `INSERT`.

## 5. Particionado

Tres tablas, por lista sobre `ejercicio`: `determinacion`, `cuenta_corriente_asiento` y
`auditoria`. Hoy con particiones 2026 y 2027.

**Al crear una partición nueva:**

1. Repetir el bloque de RLS explícita de `V6__rls.sql`.
2. **No concederle ningún privilegio.**

La prueba de aislamiento falla si aparece una partición sin RLS o con privilegios.

## 6. Sin `DELETE`, y en dos tablas sin `UPDATE`

La aplicación **no tiene `DELETE` en ninguna tabla** (RNF-051). Las consecuencias de diseño están
en el esquema, no en una convención:

- Sacar a un usuario de un grupo es `miembro.activo = false`, con `fecha_baja` y `usuario_baja`.
- Quitar un giro de una licencia es `licencia_giro.activo = false`.
- Cancelar una licencia de funcionamiento es **agregar** una fila a `licencia_movimiento` con su motivo y la resolución que la sustenta (`V37`, #44). Las columnas `estado`, `fecha_cancelacion` y `motivo_cancelacion` que `V4` había puesto en `licencia_funcionamiento` se **retiraron**, por lo mismo que las de `recibo` y las de `cierre_caja`: dirían `VIGENTE` para siempre. El estado se deriva de sus movimientos **y de la fecha a la que se pregunta** —una licencia temporal vence, y un padrón con fecha de corte de junio tiene que seguir diciendo lo que decía en junio—.
- Anular un recibo es **agregar** una fila a `recibo_movimiento` con su motivo, su importe y su
  turno, por `CHECK` (`V30`, #34). Las columnas `estado`, `fecha_anulacion`, `usuario_anulacion` y
  `motivo_anulacion` que `V3` había puesto en `recibo` se **retiraron** ahí mismo: desde que `V29`
  revocó el `UPDATE` sobre la tabla, `estado` decía `EMITIDO` para siempre —también en un recibo
  anulado—, y una columna que miente es peor que una columna que falta. El estado de un recibo se
  deriva de sus movimientos.
- Anular, reformular o quebrar un convenio exige `fecha_estado` y `motivo_estado`, por `CHECK`.
- Corregir el cierre de una caja es **agregar** una reversión a `cierre_turno`, que lo deja sin
  efecto y **reabre** el turno (`V32`, #36). Las columnas `estado`, `total_efectivo`, `total_otros`,
  `cantidad_recibos`, `fecha_cierre` y `usuario_cierre` que `V3` había puesto en `cierre_caja` se
  **retiraron**, por lo mismo que las de `recibo`: dirían `ABIERTO` para siempre. El estado del
  turno se deriva de sus movimientos, y su arqueo se congela medio de pago por medio de pago en
  `cierre_turno_detalle` —en dos cajones no se puede conciliar con el banco—.

Y el libro de asientos, la auditoría y la traza de cambio de número de papeleta tampoco admiten
`UPDATE`. Desde `V28` (#39), tampoco `notificacion`, `valor_movimiento` ni `prescripcion`: una
diligencia de notificación, un pase a coactiva y una declaración de prescripción son actos
administrativos, no el estado de un proceso interno —a diferencia de `valor_correlativo` (`V26`) y
`valor_masivo_item` (`V27`), que sí se actualizan en el sitio por ser infraestructura de un proceso—.
Un intento no hallado no se corrige: se vuelve a diligenciar, con otra fila.

Desde `V29` (#33), tampoco `recibo` ni `recibo_detalle` —el contribuyente se lleva el papel—, y desde
`V30` (#34) tampoco `recibo_movimiento`: si el recibo ya no se puede tocar, la salida con rodeo es
corregir la fila que dice si está anulado, y es la misma pérdida por otra puerta.

Desde `V32` (#36), tampoco `cierre_turno` ni `cierre_turno_detalle`: un arqueo es un acto firmado
contra el que se concilia el depósito, y si la cifra declarada se puede reescribir, el descuadre
desaparece justo cuando alguien lo está buscando.

Desde `V37` (#44), tampoco `licencia_funcionamiento` ni `licencia_duplicado`: la licencia es un acto
administrativo que el titular **cuelga en la pared de su establecimiento**, y corregirla en la base
deja al papel y al sistema diciendo cosas distintas. Aquí el `REVOKE` **sí se pudo**, al revés que
con `cierre_caja`, y no por casualidad: el ordinal del siguiente duplicado se serializa con
`licencia_duplicado_uq` y no con un `SELECT … FOR UPDATE` sobre la licencia, precisamente para que el
privilegio se pudiera retirar. `ciiu` y `licencia_giro` **conservan** el `UPDATE`: el catálogo se
corrige, y quitar un giro de una licencia es ponerle `activo = false`.

Desde `V41` (#50), tampoco `descargo`, `resolucion_gerencia`, `internamiento` ni
`internamiento_movimiento`. La resolución es el caso claro y ya conocido: **se notifica**, y el
administrado se lleva el papel; corregirla en la base deja al papel notificado y al sistema diciendo
cosas distintas, y quien tenga el papel gana la discusión. Una resolución equivocada se deja sin
efecto con otra, y las dos quedan. El descargo es el escrito que otro firmó y presentó. Y el
internamiento, la constancia de que un vehículo estuvo retenido y devengó custodia.

Desde `V47` (#53), tampoco `constancia_libre` ni `papeleta_masivo`. La constancia es otra vez el caso conocido: **se entrega al administrado**, y como lo que acredita es «al día tal no debía nada», cambiarle la fecha cambia lo que acredita. El criterio de la corrida tiene su propio motivo: `fecha_criterio` congela a qué día se evaluó la deuda y el plazo de cada candidato, y moverla después de generar dejaría la corrida diciendo que emitió con un criterio que no es el que usó. `papeleta_masivo_item` **sí** conserva el `UPDATE`, por lo mismo que `valor_masivo_item` desde `V27`: su estado es la marca de progreso de un proceso interno, no un acto administrativo.

Desde `V49` (#52), tampoco `resolucion_determinacion` —la transferencia a rentas de un resultado de
fiscalización y la resolución que la materializa—. Es la décima vez por el mismo camino y la única
con **tres** efectos colgando de la misma fila: el papel notificado, la versión de ficha catastral
que quedó inscrita y el cargo que se asentó en el libro. Editarla deja a los cuatro diciendo cosas
distintas, y la que se cobra en ventanilla es la del libro. Borrarla es peor de lo que parece: no
devuelve el sistema a como estaba —la ficha nueva sigue inscrita, la anterior sigue cerrada y el
cargo sigue en el libro—, solo desaparece el acto que los explica.

### La frontera delicada: cómo un dato de fiscalización llega al padrón (`V49`, #52)

`ARQ-01` §3.5 lo llama la frontera delicada del sistema, y `V49` es donde vive. Hasta la
transferencia, todo lo que `fiscalizacion` registra son **copias**: el acta guarda el área medida en
campo y la versión de ficha que regía el día de la visita (`V4`/`V24`), y la liquidación guarda el
contraste hallado/declarado (`V39`). Nada de eso es el dato oficial.

`resolucion_determinacion` es **una sola tabla para el acto y su papel**, y no dos. La resolución de
determinación es el acto administrativo que determina de oficio; transferir es su efecto sobre el
padrón. Separarlas habría producido dos filas 1:1 que nadie puede desincronizar sin que la otra
mienta, y una pregunta sin respuesta: cuál de las dos se notifica.

**No es un `valor` de tipo `RD`, y se comprobó antes de crear la tabla.** Un valor *formaliza* deuda
ya asentada —`RegistrarValor` (#37) la lee del libro y le mueve la fase de `ORDINARIA` a `VALOR`— y
esta resolución es el acto que la *asienta*: emitirla como valor exigiría que la deuda existiera
antes del acto que la determina. Y mientras la liquidación siga saliendo sin importes (#198) ningún
valor se podría emitir, y con él se caería también la mitad de la transferencia que **no** depende
de las cifras: inscribir en catastro la estructura hallada. `D-02a` se cerró el 2026-08-25, pero lo
que #198 sigue esperando son las dos tablas de valuación que todavía no se pueden cargar —el cuadro
de valores unitarios y la depreciación, H-14 y H-15 de
[GOB-03](../00-gobierno/plan-de-desbloqueo-D-02.md)— y el `% actualización` de `D-11`. Las dos
cosas conviven: una vez asentado el cargo, `valores` lo formaliza como RD por el camino ordinario.

`ficha_catastral` **no necesitó ni una columna**: `V1` ya la nació con `origen` —que admite
`FISCALIZACION`—, `documento_origen`, `usuario_registro` y `observacion`. Se miró antes de escribir
un `ALTER`.

Y `resolucion_determinacion_liquidacion_uq` es lo que impide transferir dos veces el mismo resultado.
Va en la base y no en un `if` porque dos peticiones simultáneas pasan las dos por cualquier
comprobación de Java. Medirlo, en cambio, exige cuidado: el número del papel sale de
`documento_emitido`, cuyo correlativo es un `count(*) + 1`, así que diez transferencias simultáneas
chocan antes en `documento_numero_uq` —el resultado es correcto, pero por un motivo que no es el que
se quiere medir, el mismo hueco que #44 destapó con `licencia_duplicado_uq`—. Por eso el AC se
comprueba en dos pruebas: una de extremo a extremo que mide el resultado, y otra del repositorio que
inserta diez filas que solo comparten `liquidacion_id`.

### El `REVOKE` que no se puede hacer: `cierre_caja`

`V32` iba a revocarle también el `UPDATE` a `cierre_caja` —el turno se abre una vez y no se edita—.
**No se puede, y se descubrió ejecutándolo:** en PostgreSQL, `SELECT … FOR UPDATE` exige el
privilegio de `UPDATE` sobre la tabla (también `FOR NO KEY UPDATE` y `FOR SHARE`; no hay forma de
bloquear una fila con solo `SELECT`). Y esa fila es **el punto de serialización de la ventanilla**
desde `V29` §2: bloquear el turno es lo que ordena dos cobranzas simultáneas de la misma caja.
Revocarlo no habría hecho el turno inmutable —habría dejado la caja sin poder cobrar—, y el síntoma
no se parece a su causa: `BadSqlGrammarException` en la primera cobranza, porque el `SQLSTATE`
`42501` cae en la clase 42.

`cierre_caja` es por eso la **primera tabla del esquema cuya inmutabilidad no puede apoyarse en el
privilegio**. La sostienen dos cosas: que las columnas que se actualizarían ya no existen, y que la
tabla está en `TABLAS_INMUTABLES` del revisor de código fuente con su muestra que lo viola, de modo
que un `UPDATE cierre_caja SET` en `src/main` rompe el build.

## 7. Índices

Todo índice selectivo empieza por `municipalidad_id`: la política RLS añade esa condición a cada
consulta, y un índice que no la lleve primero no se usa (RNF-064).

## 8. Al agregar una tabla

1. ¿Lleva `municipalidad_id NOT NULL`? Entonces `V6` le pone RLS **sola** —descubre las tablas por
   esa columna— y hay que agregarle su `GRANT` en `V7`.
2. Hay que **sembrarla en `DatosDePrueba`**. Si no, la prueba falla diciendo que la municipalidad A
   no ve filas suyas: una tabla vacía haría que «no se ve nada de B» fuera cierto sin probar nada.
3. Si es catálogo, hay que declararla en `TABLAS_DE_CATALOGO` **en el código de la prueba**, lo que
   obliga a justificarlo en el PR.
4. Si guarda constancia de un acto administrativo, agregarla a `TABLAS_PROTEGIDAS` del revisor de
   código fuente.
