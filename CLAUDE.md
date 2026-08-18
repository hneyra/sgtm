# SGTM — Contexto para agentes

Sistema de Gestión Tributaria Municipal. Reimplementación del sistema documentado en el **manual
de usuario del SGTM** de la Municipalidad Provincial de Sullana —231 figuras, 12 módulos, 134
opciones— como producto **multi-municipal**: una instalación atiende a muchas municipalidades.

> El manual **no está en este repositorio**: es la transcripción AsciiDoc que vive fuera, en
> `~/Documents/srtm/manual-SGTM/manual-sgtm-asciidoc/`. Lo que sí está aquí es lo derivado de él:
> el catálogo de sus 134 opciones ([`docs/10-negocio/catalogo-de-opciones.md`](docs/10-negocio/catalogo-de-opciones.md)),
> los requisitos ([`docs/20-requisitos/`](docs/20-requisitos/)) y las citas literales que
> justifican una decisión.

El sistema original es de escritorio: Visual Basic .NET sobre SQL Server 2008, arquitectura
de tres capas, cliente Windows XP. **El manual es la especificación funcional; no la técnica.**
La arquitectura la aporta [`../srtm`](../srtm/CLAUDE.md), del que este proyecto hereda
estrategia multi-tenant, estándares de código y forma de verificar.

**Estado:** documentación de arquitectura y datos escrita; del backend existen el esqueleto de
Gradle, el esquema como migraciones Flyway, el camino del contexto de tenant (token → `SET LOCAL`
→ RLS) y las verificaciones bloqueantes. **Ninguna funcionalidad de negocio todavía**, y es
deliberado: primero las barreras, después el negocio.

La **interfaz web** no está construida. Su diseño de referencia —12 módulos, 134 pantallas,
design system Juris PE— está en [`SGTM-design/`](SGTM-design/design_handoff_sgtm_web/README.md)
y se implementa en su propia iteración. El contrato que backend y frontend comparten está en
[`docs/50-api/openapi/sgtm-v1.yaml`](docs/50-api/openapi/sgtm-v1.yaml), derivado de los
`endpoint` que declara cada pantalla del prototipo.

**Stack:** Spring Boot 4 · Java 25 · Gradle Kotlin DSL · PostgreSQL · Flyway · Spring Modulith

## Lo primero que había que construir

**La prueba de aislamiento multi-tenant**, en [`backend/sgtm-esquema`](backend/sgtm-esquema/README.md).
Es bloqueante: `./gradlew verificarAislamiento`.

> **La prueba se conecta como el rol `sgtm_app`, creado en su arranque. No cambies eso.**
>
> La conexión que Testcontainers entrega por omisión es de **superusuario**, y un superusuario
> **omite Row Level Security incluso con `FORCE ROW LEVEL SECURITY`**. Una prueba escrita sobre
> esa conexión pasa en verde **sin verificar nada**. La prueba lo demuestra en vez de afirmarlo:
> con el mismo contexto fijado, verifica que el superusuario ve las dos municipalidades y
> `sgtm_app` una.

Los dos hallazgos de RLS que heredamos verificados del SRTM —el superusuario omite RLS, y el
acceso directo a una partición evade la política del padre— están en
[`docs/40-datos/modelo-logico-fisico.md`](docs/40-datos/modelo-logico-fisico.md) §0. No se
volvieron a descubrir: se trasladaron con su mitigación.

**Al agregar una tabla:** si lleva `municipalidad_id NOT NULL`, la prueba le exige RLS sola. Si
no, hay que clasificarla como catálogo o como exenta en el propio código de la prueba, y eso se
ve en el diff. Al agregar una **partición**, repetir el bloque de RLS explícita de `V2__rls.sql`
y **no concederle ningún privilegio**.

## Reglas que no se negocian

| # | Regla | Motivo |
|---|---|---|
| 1 | **Importes en `BigDecimal`/`NUMERIC`.** Prohibidos `double` y `float` | Precisión monetaria (RNF-055) |
| 2 | **Ningún método de dominio recibe `municipalidadId`.** Sale del token, se fija una vez con `SET LOCAL` | Si el desarrollador no lo maneja, no puede olvidarlo (ARQ-03 §3.1) |
| 3 | **`SET LOCAL`, jamás `SET SESSION`** | `SET SESSION` sobrevive al retorno de la conexión al pool y contamina la petición de otra municipalidad |
| 4 | **Sin `DELETE`** en deuda, pagos, recibos, valores, papeletas, asientos ni auditoría. Se anula, se da de baja o se reversa | RNF-051, y el manual §Auditoría |
| 5 | **Ningún literal numérico tributario en el código.** UIT, tramos, alícuotas, valores unitarios, aranceles y tablas de depreciación viven en datos versionados | Reproducibilidad y cambio sin despliegue (RNF-053) |
| 6 | **Las reglas tributarias son funciones puras.** Sin base de datos, sin reloj, sin configuración global; la fecha entra como argumento | Recalcular 2027 en 2037 debe dar el mismo céntimo |
| 7 | **Nada de Spring ni JPA en la capa `dominio`** | Las reglas deben probarse sin levantar el contexto |
| 8 | **`alicuota`, nunca `tasa`**, para un porcentaje | `tasa` es un tipo de tributo |
| 9 | **No existe «la deuda»:** es `deudaActualizadaA(fecha)`, y toda cifra mostrada indica su fecha | RNF-075 |
| 10 | **Toda modificación de datos exige observación del usuario.** Sin observación no se guarda | Manual §Auditoría; RNF-052 |

Las reglas 1, 2, 6, 7 y las fechas están escritas como pruebas de ArchUnit; `SET SESSION` y
`DELETE` sobre tabla protegida, como escáner del código fuente:
`backend/sgtm-aplicacion/src/test/java/pe/gob/sgtm/verificaciones/`. **Si agregas una regla,
agrega también la clase de muestra que la viola**, en `verificaciones/muestras/`: una regla que
no puede fallar no protege nada.

Lista completa con su justificación:
[`docs/30-arquitectura/estandares-de-codigo-backend.md`](docs/30-arquitectura/estandares-de-codigo-backend.md).

## Idioma

Español en el dominio, inglés en lo técnico (heredado de `ADR-0004` del SRTM). **Sin tildes en
identificadores**; Checkstyle lo revisa.

```java
public final class Papeleta { … }                  // dominio: español
public interface PapeletaRepository { … }          // patrón: inglés
autovaluo.calcularTotal();                         // comportamiento: español
repository.findById(id);                           // infraestructura: inglés
```

Tablas y columnas en español `snake_case`. Campos de la API JSON en español `camelCase`.
Comentarios, pruebas y mensajes de commit en español.

## Estructura

```
backend/      Spring Boot 4, multi-módulo. Monolito modular con Spring Modulith    ← existe
docs/         Documentación (fuente de verdad del diseño)                          ← existe
SGTM-design/  Prototipo navegable del que derivará la interfaz                     ← referencia
```

Módulos del backend hoy: `sgtm-dominio-compartido`, `sgtm-esquema` (migraciones y prueba de
aislamiento), `sgtm-plataforma` (filtro del token, `SET LOCAL`, guardia del pool), los **doce**
contextos acotados vacíos y `sgtm-aplicacion` (ensambla y aloja las verificaciones).
Límites de cada contexto: [`docs/30-arquitectura/contextos-acotados.md`](docs/30-arquitectura/contextos-acotados.md).

## Antes de escribir código, leer

| Si vas a tocar… | Lee |
|---|---|
| Cualquier cosa | [`docs/30-arquitectura/estrategia-multitenant.md`](docs/30-arquitectura/estrategia-multitenant.md) — es el riesgo número uno |
| Base de datos | [`docs/40-datos/modelo-logico-fisico.md`](docs/40-datos/modelo-logico-fisico.md) §0 primero |
| Backend | [`docs/30-arquitectura/estandares-de-codigo-backend.md`](docs/30-arquitectura/estandares-de-codigo-backend.md) |
| Requisitos | [`docs/20-requisitos/requisitos-funcionales.md`](docs/20-requisitos/requisitos-funcionales.md) |
| API | [`docs/50-api/openapi/sgtm-v1.yaml`](docs/50-api/openapi/sgtm-v1.yaml) |
| Interfaz | [`SGTM-design/design_handoff_sgtm_web/README.md`](SGTM-design/design_handoff_sgtm_web/README.md) |

Índice completo: [`docs/README.md`](docs/README.md). Decisiones: [`docs/30-arquitectura/adr/`](docs/30-arquitectura/adr/).

## No implementar todavía

**Ninguna regla de cálculo tributario.** El manual describe *qué* calcula el sistema —impuesto
predial, arbitrios, patrimonio vehicular, alcabala, espectáculos, multas— pero **no los valores
normativos**: tramos, alícuotas, UIT, deducciones, plazos, tablas de valores unitarios,
aranceles y depreciación. Están marcados `‹VERIFICAR›` en
[`docs/10-negocio/marco-normativo.md`](docs/10-negocio/marco-normativo.md).

Un tramo equivocado produce deuda mal calculada en todo un padrón, con devoluciones masivas y
nulidad de valores. **No implementar reglas de cálculo hasta cerrar D-02.**

## Decisiones abiertas que bloquean

Registro completo en [`docs/00-gobierno/decisiones-abiertas.md`](docs/00-gobierno/decisiones-abiertas.md).

| # | Decisión | Bloquea |
|---|---|---|
| D-01 | Municipalidad piloto y validador funcional | La primera iteración de negocio |
| D-02 | Valores normativos verificados (UIT, tramos, alícuotas, tablas) | Toda regla de cálculo |
| D-03 | Escala y modo de redondeo de importes | La primera regla de cálculo |
| D-04 | Migración desde la base SQL Server existente | Implantación |
| D-05 | Régimen de firma digital de valores y resoluciones | La capa de documentos |

## Comandos

```bash
cd backend
./gradlew build                   # todo, incluidas Spotless, Checkstyle y NullAway
./gradlew verificarAislamiento    # aislamiento multi-tenant. Bloqueante. Requiere Docker
./gradlew verificarArquitectura   # ArchUnit, escáner de fuentes y Spring Modulith. Bloqueante
./gradlew spotlessApply           # arregla el formato en vez de solo reprocharlo
```

**Si el build se queja del formato, no lo pelees: `spotlessApply`.** Checkstyle no revisa formato
a propósito, para no discutir con el formateador. Lo que sí revisa, y es fácil de incumplir con
el teclado en español, son los **identificadores con tilde**: `alicuota`, nunca `alícuota`.

Las pruebas de persistencia requieren Docker. Sin motor de base de datos **fallan**, no se
omiten: una prueba bloqueante que se salta a sí misma deja el build en verde.

## Verificar antes de afirmar

Precedente heredado del SRTM: el DDL se **ejecutó** contra PostgreSQL en lugar de revisarse, y
eso encontró tres defectos que la revisión no habría visto, incluidos los dos hallazgos de RLS
que anulaban el aislamiento entre municipalidades.

Aplica lo mismo aquí: **ejecutar la prueba vale más que razonar sobre ella.** Y no basta con que
la verificación esté escrita: **tiene que demostrarse que puede fallar.**

Lo verificado hasta hoy, ejecutando contra PostgreSQL 16:

| Verificación | Cómo se demostró que puede fallar | Resultado |
|---|---|---|
| Aislamiento del esquema (19 pruebas) | Quitando `WITH CHECK` de la política de tenant | Rojo en las 63 tablas |
| Privilegios sobre particiones | `GRANT SELECT ON determinacion_2026 TO sgtm_app` | Rojo en dos pruebas |
| Guardia del pool | Prueba gemela **sin** guardia | La fuga ocurre de verdad |
| Reglas de ArchUnit (7) | Clase de muestra que viola cada una | Las siete muerden |
| Escáner del código fuente | Muestras con `SET SESSION`, `DELETE` y `UPDATE` prohibidos | Las detecta |

**Sin Docker en la máquina, la prueba no se salta**: se apunta a un PostgreSQL existente con
`-Dsgtm.pruebas.postgres.url` ([`backend/README.md`](backend/README.md)).
