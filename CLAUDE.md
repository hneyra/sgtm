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

De la **interfaz web** existen **las 134 pantallas**, y ninguna conectada al backend real:
[`frontend/`](frontend/README.md) porta el catálogo del prototipo a datos tipados y lo compone con
**un** renderizador, sobre un shell con navegación de dos niveles y paleta de comandos. Los datos
llegan por HTTP desde un **proxy que simula la API** ([`ADR-0010`](docs/30-arquitectura/adr/ADR-0010-catalogo-portado-y-proxy-de-datos.md));
conectar el backend es apagarlo, no reescribir la interfaz. Su diseño de referencia —12 módulos,
134 pantallas, design system Juris PE— está en
[`design/`](design/design_handoff_sgtm_web/README.md). El contrato que backend y frontend comparten
está en [`docs/50-api/openapi/sgtm-v1.yaml`](docs/50-api/openapi/sgtm-v1.yaml), derivado de los
`endpoint` que declara cada pantalla del prototipo.

**Stack:** Spring Boot 4 · Java 25 · Gradle Kotlin DSL · PostgreSQL · Flyway · Spring Modulith
· React 19 · TypeScript · Vite · yarn workspaces

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

En el frontend, las que le tocan —1, 2, 8, 9 y el idioma— están como **reglas de ESLint**, con la
misma exigencia: `frontend/verificaciones/muestras/` tiene una muestra por prohibición y
`reglas-de-eslint.test.ts` exige que la regla la detecte. A ellas se suma una propia de la
interfaz: **ninguna petición sale por `fetch` suelto**, todas pasan por `solicitar()` de
`@sgtm/api-client`. Es lo que permite cambiar el proxy de datos por el backend con una bandera.

Lista completa con su justificación:
[`docs/30-arquitectura/estandares-de-codigo-backend.md`](docs/30-arquitectura/estandares-de-codigo-backend.md)
y [`docs/60-frontend/estandares-de-codigo-frontend.md`](docs/60-frontend/estandares-de-codigo-frontend.md).

## Idioma

Español en el dominio, inglés en lo técnico (heredado de `ADR-0004` del SRTM). **Sin tildes en
identificadores**: Checkstyle lo revisa en el backend, ESLint en el frontend.

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
frontend/     React sobre Vite, yarn workspaces. Espacio de trabajo sin pantallas  ← existe
docs/         Documentación (fuente de verdad del diseño)                          ← existe
design/       Prototipo navegable del que derivará la interfaz                     ← referencia
```

Módulos del backend hoy: `sgtm-dominio-compartido` (objetos de valor en `pe.gob.sgtm.dominio` y
`TenantContext` en `pe.gob.sgtm.compartido`), `sgtm-esquema` (migraciones y prueba de
aislamiento), `sgtm-plataforma` (filtro del token, `SET LOCAL`, guardia del pool), los **doce**
contextos acotados vacíos y `sgtm-aplicacion` (ensambla y aloja las verificaciones).
Límites de cada contexto: [`docs/30-arquitectura/contextos-acotados.md`](docs/30-arquitectura/contextos-acotados.md).

Workspaces del frontend hoy: `apps/backoffice` (shell, catálogo y renderizador) y los paquetes
`@sgtm/dominio`, `@sgtm/api-client`, `@sgtm/design-system` y `@sgtm/api-mock` (el proxy de datos).
**El catálogo se regenera con `yarn portar-catalogo` y los tipos de la API con
`yarn generar-operaciones`, desde el contrato; los archivos `.generado.ts` no se editan a mano.** Una sola aplicación: en el SGTM el
flujo público es **una** de las 134 opciones, no un producto aparte; el criterio para separar
`apps/portal` está en [`ADR-0009`](docs/30-arquitectura/adr/ADR-0009-plataforma-frontend.md).

## Antes de escribir código, leer

| Si vas a tocar… | Lee |
|---|---|
| Cualquier cosa | [`docs/30-arquitectura/estrategia-multitenant.md`](docs/30-arquitectura/estrategia-multitenant.md) — es el riesgo número uno |
| Base de datos | [`docs/40-datos/modelo-logico-fisico.md`](docs/40-datos/modelo-logico-fisico.md) §0 primero, y **`../srtm/docs/40-datos/ddl/esquema-verificado.sql`** para tipos y longitudes |
| Cálculo tributario | **`../srtm/docs/10-negocio/reglas-impuesto-predial.md`** (NEG-05) y **`../srtm/docs/30-arquitectura/motor-de-reglas-y-parametrizacion.md`** (ARQ-09) |
| Backend | [`docs/30-arquitectura/estandares-de-codigo-backend.md`](docs/30-arquitectura/estandares-de-codigo-backend.md) |
| Requisitos | [`docs/20-requisitos/requisitos-funcionales.md`](docs/20-requisitos/requisitos-funcionales.md) |
| API | [`docs/50-api/openapi/sgtm-v1.yaml`](docs/50-api/openapi/sgtm-v1.yaml) |
| Interfaz | [`docs/60-frontend/estandares-de-codigo-frontend.md`](docs/60-frontend/estandares-de-codigo-frontend.md), y el diseño en [`design/design_handoff_sgtm_web/README.md`](design/design_handoff_sgtm_web/README.md) |

Índice completo: [`docs/README.md`](docs/README.md). Decisiones: [`docs/30-arquitectura/adr/`](docs/30-arquitectura/adr/).

## El cálculo tributario lo define `../srtm`

**No se rediseña aquí.** La estructura del cálculo —qué reglas existen, en qué orden se aplican,
qué parámetros consume cada una, cómo se identifican (`RT-xxx`) y qué casos borde hay— está
resuelta y verificada contra los manuales del MEF en `../srtm`. Este proyecto la **implementa**,
no la reinventa:

| Qué | Dónde vive en `../srtm` |
|---|---|
| Reglas del predial: `RT-001`…`RT-016`, fórmulas, orden, casos borde | `docs/10-negocio/reglas-impuesto-predial.md` (NEG-05) |
| Motor de reglas: pureza, versión por ejercicio, redondeo, parámetros sellados | `docs/30-arquitectura/motor-de-reglas-y-parametrizacion.md` (ARQ-09) |
| Frontera estructura/valor y estrategia por ejercicio | `ADR-0006`, `ADR-0015` |
| Plantilla de una regla | `docs/_plantillas/regla-tributaria.md` |

Lo que de ahí no se negocia: la base del predial es **por contribuyente, no por predio** (los
tramos progresivos se aplican al conjunto de sus predios; calcular predio por predio produce un
error sistemático a la baja en todo el padrón); el `% propiedad` pondera la base de cada predio;
la secuencia de la construcción es *valor unitario → +5 % → − depreciación → × área*; y una
implementación que ya se usó en una emisión **no se modifica nunca** —se crea otra con su rango
de vigencia—.

**Las longitudes y tipos de las columnas también vienen de ahí.** Los dominios (`dinero
numeric(15,2)`, `monto_calc numeric(18,6)`, `alicuota`, `porcentaje`, `area_m2`, `ejercicio`) y
el largo de cada campo se toman de `../srtm/docs/40-datos/ddl/esquema-verificado.sql`. Una
columna que existe en ambos esquemas tiene el mismo tipo en los dos; si hay motivo para
apartarse, se anota en el diff. Nunca `numeric(15,2)` suelto donde hay dominio.

### No implementar todavía

**Ninguna regla de cálculo.** Lo que falta no es la estructura: son **los valores normativos**
—tramos, alícuotas, UIT, deducciones, plazos, tablas de valores unitarios, aranceles y
depreciación—, marcados `‹VERIFICAR›` en NEG-05 §6 y en
[`docs/10-negocio/marco-normativo.md`](docs/10-negocio/marco-normativo.md).

Un tramo equivocado produce deuda mal calculada en todo un padrón, con devoluciones masivas y
nulidad de valores. **No implementar reglas de cálculo hasta cerrar D-02.** Tampoco los cuatro
factores que NEG-05 §0.1 marca sin fuente identificada —deducción de Amazonía, `% actualización`,
incremento del 5 %, factor de oficialización—: multiplican importes, y un valor inventado escala
el error.

**Ningún componente del design system antes de la pantalla que lo use.** Los que hay salieron
todos del renderizador; el prototipo ya fija las medidas exactas, y un componente escrito antes de
su pantalla es un componente que nadie pidió.

**Ninguna acción de pantalla que escriba sin su campo de observación.** Toda modificación de datos
lo exige (regla 10, RNF-052). El camino de escritura vive en un solo sitio —`useEscritura`— y pide
la observación antes de habilitar la acción; **`useMutation` fuera de ahí no pasa el lint**, con su
muestra que lo viola. Una acción cuya operación es de lectura sigue deshabilitada: no hay a dónde
escribir.

## Decisiones abiertas que bloquean

Registro completo en [`docs/00-gobierno/decisiones-abiertas.md`](docs/00-gobierno/decisiones-abiertas.md).

| # | Decisión | Bloquea |
|---|---|---|
| D-01 | Municipalidad piloto y validador funcional | La primera iteración de negocio |
| D-02 | Valores normativos verificados (UIT, tramos, alícuotas, tablas) | Toda regla de cálculo |
| D-03 | Escala, modo y **puntos** de redondeo de importes —hay redondeo intermedio, no solo al cierre de cada regla— | La primera regla de cálculo |
| D-11 | Origen y valor de los cuatro factores que M02 revela sin fuente | `RT-002`, `RT-005`, `RT-011` |
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

```bash
cd frontend
yarn verificar                    # contrato, lint, tipos y pruebas. Lo que hay que pasar antes de un PR
yarn test                         # incluye la prueba de que cada regla de ESLint muerde
yarn generar-operaciones          # regenera los tipos de la API desde sgtm-v1.yaml
yarn format                       # Prettier; mismo trato que spotlessApply
```

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
| Patrón de repositorio (11 pruebas) | Conectando como superusuario en vez de `sgtm_app` | Rojo en 7 de las 11 |
| Reglas de ArchUnit (11) | Clase de muestra que viola cada una | Las once muerden, ya sobre dominio real |
| Observación obligatoria (regla 10) | Quitando la `Observacion` de `RegistrarVia` | Rojo en `verificarArquitectura` |
| Auditoría contra PostgreSQL (8 pruebas) | Observación en blanco por SQL directo | La operación completa se deshace |
| Contrato de la API vs. rutas publicadas | Publicando una ruta que el contrato no tiene | Rojo en las dos direcciones |
| Los errores no filtran esquema | Mensaje real de PostgreSQL con tabla y restricción | Ni tabla, ni restricción, ni SQL en la respuesta |
| Autorización contra PostgreSQL (7 pruebas) | Quitando `@RequiereAcceso` de `ViaController` | Rojo en `verificarArquitectura` |
| Administración de seguridad (9 pruebas) | Sembrando dos municipalidades y consultando cruzado | Desde B, el usuario de A no existe |
| Escáner del código fuente | Muestras con `SET SESSION`, `DELETE`, `UPDATE` prohibidos y con una política de redondeo escrita a mano | Las detecta |
| Reglas de ESLint del frontend (10) | Quitando la regla de tildes, y la de `fetch`: sus pruebas se ponen rojas | Las diez muerden |
| Las 134 pantallas se dibujan | Montando cada una contra el proxy, y recorriéndolas en Chromium | 134 en verde, 0 errores |
| El juego de datos simulado no llega a producción | Comparando las dos compilaciones, con y sin la bandera | El chunk desaparece |
| Un cambio del contrato rompe la compilación | Renombrando `codRefCatastral` en `sgtm-v1.yaml` y compilando con `tsc` | Rojo; al devolverlo, verde |
| Las guardas del generador de operaciones (6) | Un contrato de muestra que viola cada una | Las seis muerden |

**Sin Docker en la máquina, la prueba no se salta**: se apunta a un PostgreSQL existente con
`-Dsgtm.pruebas.postgres.url` ([`backend/README.md`](backend/README.md)).
