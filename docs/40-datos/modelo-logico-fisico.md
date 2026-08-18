# DAT-01 — Modelo lógico-físico

**El esquema vive como migraciones de Flyway**, en
[`backend/sgtm-esquema/src/main/resources/db/migration/`](../../backend/sgtm-esquema/src/main/resources/db/migration/).
Este documento las explica. **Si divergen, mandan las migraciones.**

---

## §0 — Lo primero que hay que saber

Dos hallazgos sobre Row Level Security, **verificados ejecutando el DDL** contra PostgreSQL en el
proyecto SRTM, del que se hereda la estrategia. No se volvieron a descubrir aquí: se trasladaron
con su mitigación, y la prueba de aislamiento los vigila.

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

---

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

Los roles se crean **antes**, con `db/roles/crear-roles.sql`, que no es una migración: las
políticas de `V6` los nombran, y un rol no puede crearse a sí mismo.

## 2. Dominios

Las restricciones viajan con la columna, para que no dependan de que alguien las repita.

| Dominio | Tipo | Restricción |
|---|---|---|
| `dinero` | `numeric(15,2)` | Escala y redondeo **provisionales**: D-03 |
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
- Anular un recibo exige `fecha_anulacion`, `usuario_anulacion` y `motivo_anulacion`, por `CHECK`.
- Anular, reformular o quebrar un convenio exige `fecha_estado` y `motivo_estado`, por `CHECK`.

Y el libro de asientos, la auditoría y la traza de cambio de número de papeleta tampoco admiten
`UPDATE`.

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
