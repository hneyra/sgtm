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

De la **interfaz web** existen **las 134 pantallas**, con las operaciones que el backend
publica ya conectadas y el resto todavía en la forma común:
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

Los **cuatro** hallazgos de RLS están en
[`docs/40-datos/modelo-logico-fisico.md`](docs/40-datos/modelo-logico-fisico.md) §0. Dos se
heredaron verificados del SRTM —el superusuario omite RLS, y el acceso directo a una partición
evade la política del padre—: no se volvieron a descubrir, se trasladaron con su mitigación. Los
otros dos salieron aquí: **bajo RLS un `LIKE 'prefijo%'` no llega nunca al índice**, porque
`textlike` no es *leakproof* y PostgreSQL no lo evalúa antes de la política —toda búsqueda por
prefijo se escribe como rango con `~>=~` / `~<~`—; y **una clave foránea nueva sobre una tabla con
RLS no se puede validar**, porque validar es una consulta y el migrador no tiene contexto de
tenant: va `NOT VALID`, que sigue comprobando cada `INSERT`.

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
infra/        Pulumi en TypeScript con yarn. Dos stacks, el sistema y su respaldo  ← existe
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

> **Si `../srtm` no está en el disco, se clona: `git clone https://github.com/hneyra/srtm`.**
> No es opcional. El motor de reglas se escribió una vez sin poder leer NEG-05 ni ARQ-09, a partir
> de lo que este archivo resume, y salieron dos defectos estructurales: una cadena lineal donde
> NEG-05 §1 describe un grafo, y la lectura de parámetros por ejercicio que ARQ-09 §3 nombra
> como el modelo que falla en silencio. Los dos estaban en verde y ninguno lo habría encontrado
> una revisión. Leer el documento cuesta menos que corregir lo que se construyó sin leerlo.

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
nulidad de valores. **No implementar reglas de cálculo hasta cerrar D-02a.** Tampoco los cuatro
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

**Ningún campo del formulario que la opción no haya declarado.** El cuerpo de una escritura lleva la
observación y solo los campos que la opción lista en `pantallas/escrituras.ts`; mientras no esté
ahí, su formulario no se puede escribir. Es lo que impide que una contraseña acabe en el estado de
React —y de ahí en cualquier sitio— cuando el backend no la pide.

## Decisiones abiertas que bloquean

Registro completo en [`docs/00-gobierno/decisiones-abiertas.md`](docs/00-gobierno/decisiones-abiertas.md).

| # | Decisión | Bloquea |
|---|---|---|
| D-01 | Municipalidad piloto y validador funcional | La primera iteración de negocio |
| D-02a | Valores normativos **de norma nacional** (UIT, tramos, alícuotas, valores unitarios, depreciación). Se buscan y se firman; **no dependen de D-01** | El predial, el vehicular y la alcabala |
| D-02b | Valores **de ordenanza local** con su ratificación provincial | Arbitrios y sanciones |
| D-03c | **Los puntos donde se redondea.** No es una decisión: es ingeniería inversa contra el SRTM del MEF, que redondea en pasos intermedios | La primera regla de cálculo |
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
cd infra
yarn verificar                    # lint, tipos y pruebas. Sin Pulumi, sin token y sin cluster
yarn manifiestos --ambiente stg   # lo que se desplegaria, en JSON. Tampoco necesita Pulumi
yarn capacidad --ambiente prod    # ¿cabe el stack en el nodo? Sin desplegar (#252)
yarn secretos --ambiente stg      # el inventario de INF-06: nombre, clave, rotacion. Nunca un valor
verificaciones/motor/verificar-el-motor.sh --con-aislamiento   # el motor, levantado de verdad
secretos/bootstrap-secretos.sh --ambiente stg      # genera lo que falte, nunca via Pulumi
secretos/rotar-clave.sh --ambiente stg --rol sgtm-app   # rota contra la base en marcha
respaldo/simulacro-de-restauracion.sh --ambiente stg   # el respaldo, restaurado de verdad
observabilidad/verificar-alertas.sh                    # apaga la base, comprueba que la alerta llega
observabilidad/verificar-tableros.sh                   # cada panel del tablero, contra Prometheus
```

**El aislamiento se verifica contra el motor que levanta ese guion, nunca contra uno en
servicio:** la prueba provisiona, y `ALTER ROLE` sobre `sgtm_owner` y `sgtm_app` vale para
todas las bases del clúster de PostgreSQL, no solo para la suya. Apuntarla a `prod` deja fuera
a la aplicación (INF-01 §4.1).

**Ningún secreto de la aplicación vive en el estado de Pulumi** (`ADR-0011` §3,
[`INF-06`](docs/80-infraestructura/gestion-de-secretos.md)): `bootstrap-secretos.sh` los
genera hablando con el API de Kubernetes por `kubectl`, nunca con `pulumi up`.

**El respaldo lo toma `sgtm_respaldo`, no el superusuario ni `sgtm_owner`**
([`INF-08`](docs/80-infraestructura/respaldo-y-recuperacion.md), issue #155). Sus
privilegios son los tres que wal-g necesita —`pg_read_all_settings` y `EXECUTE` sobre
`pg_backup_start`/`pg_backup_stop`—, y ese conjunto se determinó **ejecutando** hasta dar
con el mínimo que no falla: `REPLICATION` resultó no hacer falta, y `pg_read_all_settings`
sí, aunque no aparezca en ninguna guía. Si un respaldo falla, la salida cómoda es darle
superusuario al rol; entonces el respaldo deja de ser un lector y pasa a ser una credencial
con poder total sobre el padrón, sin que ningún síntoma lo delate.

**La clave de cifrado del respaldo no se rota de rutina.** Cambiarla deja ilegibles todos
los respaldos escritos con la anterior; no hay `ALTER ROLE` que los vuelva a cifrar
(`INF-08` §4).

```bash
cd frontend
yarn verificar                    # contrato, lint, tipos y pruebas. Lo que hay que pasar antes de un PR
yarn comprobar-compilaciones      # el juego de datos no llega a produccion, y el presupuesto de paquete
yarn e2e                          # los tres caminos completos en un navegador (Playwright)
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
| Reglas de ArchUnit (12) | Clase de muestra que viola cada una | Las doce muerden, ya sobre dominio real |
| Observación obligatoria (regla 10) | Quitando la `Observacion` de `RegistrarVia` | Rojo en `verificarArquitectura` |
| Auditoría contra PostgreSQL (8 pruebas) | Observación en blanco por SQL directo | La operación completa se deshace |
| Contrato de la API vs. rutas publicadas | Publicando una ruta que el contrato no tiene | Rojo en las dos direcciones |
| Los errores no filtran esquema | Mensaje real de PostgreSQL con tabla y restricción | Ni tabla, ni restricción, ni SQL en la respuesta |
| Autorización contra PostgreSQL (7 pruebas) | Quitando `@RequiereAcceso` de `ViaController` | Rojo en `verificarArquitectura` |
| Administración de seguridad (9 pruebas) | Sembrando dos municipalidades y consultando cruzado | Desde B, el usuario de A no existe |
| Permisos y precedencia (9 pruebas) | Quitando la guarda del último administrador | Rojo: el sistema se queda sin quien administre |
| Sesión y auditoría (15 pruebas) | Consultando `auditoria_2026` en vez de la tabla padre | La aplicación no tiene privilegio sobre la partición |
| Sellado de parámetros (9 pruebas) | Quitando el disparador de inmutabilidad de `V9` | Rojo: un conjunto sellado se deja editar |
| Lectura sellada (6 pruebas) | Quitando `AND estado = 'SELLADO'` de la consulta, y resolviendo por ejercicio en vez de por conjunto | Rojo: se deja leer un conjunto abierto; rojo: el recálculo devuelve la v2 donde la determinación usó la v1 |
| Motor de reglas como grafo (15 pruebas, sin base ni reloj) | Volviendo a la cadena lineal: aplicar en orden de registro sin mirar las dependencias | Rojo en 8 de las 15: la convergencia de dos ramas no se puede expresar encadenando |
| El corpus de casos de NEG-05 (13 pruebas, sin base ni reloj) | Cuatro roturas: quitar una arista declarada de un caso; declarar un parametro que la regla no pide; llenar un `esperado` que solo se podria comparar contra parametros ficticios; y registrar en el motor una regla que ningun caso declara | Rojo las cuatro. Y una quinta la encontro la propia prueba: declarar «sin regla» un caso borde de `RT-001` —que si esta registrada— la pone roja, y tiene razon: lo que falta ahi no es la regla, es la decision |
| La transcripcion de valores normativos (9 prohibiciones + una muestra en regla) | Tres roturas: quitar la regla de las dos firmas distintas; neutralizar el escaneo de `INSERT` en migraciones; y anadir un rechazo incondicional | Rojo, rojo, y la tercera la caza solo `en-regla` —las nueve prohibiciones seguian en verde y la comprobacion parecia mas estricta que nunca— |
| Los puntos de redondeo (7 pruebas, D-03c) | Devolviendo la politica unica: que un punto sin parametrizar resuelva a la primera que haya, en vez de fallar | Rojo en 3: sin la guarda, el importe sale **sin redondear** y nadie lo distingue del correcto |
| Nada siembra en el perfil por omision (#202) | Quitandole el `@Profile("batch")` a `ImplantarMunicipalidad`, y poniendoselo `web` | Rojo las dos, nombrando la clase. Sin la regla, las dos compilaban y sus pruebas seguian verdes —la instancian a mano—: el unico sintoma habria sido que el proceso web pide la clave de `sgtm_owner` |
| El redondeo entra como dato, no como codigo (13 pruebas, E-7 §3) | Tres roturas: ignorar media politica —escala sin modo— en vez de rechazarla; quitar la guarda del conjunto sin ningun punto; y devolver la politica al codigo del servicio | 2, 1 y 2 en rojo. La tercera la caza ademas el escaner de fuentes, que es lo que #203 pedia: ninguna politica compilada |
| Escáner del código fuente | Muestras con `SET SESSION`, `DELETE`, `UPDATE` prohibidos, con una política de redondeo escrita a mano y con la UIT, un tramo y una alícuota compilados (regla 5) | Las detecta; neutralizando el patrón de la regla 5, rojo |
| Reglas de ESLint del frontend (10) | Quitando la regla de tildes, y la de `fetch`: sus pruebas se ponen rojas | Las diez muerden |
| Las 134 pantallas se dibujan | Montando cada una contra el proxy, y recorriéndolas en Chromium | 134 en verde, 0 errores |
| Los caminos de FRO-03 §6 | Playwright: caja solo con teclado, portal en 360 px, y la misma hoja A4 en dos módulos | Pasan; el primero encontró que la paleta no se operaba con teclado |
| El presupuesto de paquete muerde | Bajándolo por debajo de lo que mide el arranque | Rojo, con el número y qué hacer |
| El juego de datos simulado no llega a producción | Comparando las dos compilaciones, con y sin la bandera | El chunk desaparece |
| Un cambio del contrato rompe la compilación | Renombrando `codRefCatastral` en `sgtm-v1.yaml` y compilando con `tsc` | Rojo; al devolverlo, verde |
| El módulo de seguridad conectado (11 pruebas) | Quitando la guarda de `leerPaginado`, el ejercicio de la bitácora, el vaciado de la caché, la lista blanca del cuerpo y el bloqueo de los campos de clave | Las cinco lo ponen rojo |
| El panel y el portal (12 pruebas) | Retocando un indicador, deduciendo el avance, y quitando la fecha de corte | Dos, dos y una en rojo |
| La copia se ve como copia (7 pruebas) | Quitando el aviso permanente, poniéndoselo también a omisos, y recomponiendo una cifra de determinación | Cuatro, una y tres en rojo |
| Licencias y el acto inalcanzable (8 pruebas) | Abriendo lo opcional, impidiendo que viaje el filtro de descripción, y cambiando el patrón de lo irreversible | Las tres lo ponen rojo |
| Infracciones administrativas (8 pruebas) | Quitando las firmas del bloque, recomponiendo una cifra, habilitando sin observación, y mandando la página aunque sea la primera | Dos, una, tres y una en rojo |
| Trece reportes, una hoja (14 pruebas) | Quitando las firmas del bloque, quitando la marca de no imprimible, y alterando una celda numérica al dibujarla | Seis, seis y una en rojo |
| El expediente coactivo (26 pruebas) | Habilitando las acciones secundarias, dejando la insignia sin texto, y haciendo que `puedeVer` devuelva cierto siempre | Cuatro, una y una en rojo |
| Lo irreversible se confirma (11 pruebas) | Quitando generar, notificar y coactiva de la lista, volviendo a «¿estás seguro?», y enviando sin confirmar | Cuatro, dos y tres en rojo |
| La caja (6 pruebas) | Quitando el `focus()` tras guardar, enfocando en cada render en vez de en el flanco, y regenerando la clave de idempotencia en cada envío | Dos, una y una en rojo |
| El módulo que más escribe (12 pruebas) | Habilitando la acción primaria sin observación, y rellenando la deuda del padrón con lo del prototipo | Nueve y una en rojo |
| Ninguna cifra sin su fecha (17 pruebas) | Quitando el bloque de fecha de cálculo, restando el saldo en la interfaz y añadiendo una función de sumar a `@sgtm/dominio` | Trece, dos y una en rojo |
| Catastro conectado (13 pruebas) | Quitando el bloque de versionado, el `historico=true`, la guarda de la ruta, poniéndole cifra al arancel rural y devolviendo el desplegable a las opciones del prototipo | Las cinco lo ponen rojo |
| Padron de contribuyentes (15 pruebas) | Sustituyendo la aproximación por igualdad exacta, y bajando el umbral de parecido a cero | Rojo: el nombre mal escrito no encuentra a nadie; rojo: devuelve el padrón entero |
| Ficha del contribuyente (12 pruebas) | No cerrando el domicilio anterior al mudar, y resolviendo «la última» en vez de la vigente a la fecha | Rojo: dos domicilios abiertos; rojo: una notificación de marzo usaría la dirección de setiembre |
| Predio, catálogos y titularidad (17 pruebas) | Cambiando el disparador de la titularidad de diferido a inmediato, contra PostgreSQL | Rojo: una transferencia legítima —cerrar una titularidad y abrir otra— se vuelve imposible |
| Ficha catastral versionada (11 pruebas) | Sobrescribiendo el `uso` de la versión anterior al cerrarla, y no copiando sus construcciones al versionar | Rojo: el historial miente; rojo: la versión nueva nace vacía |
| Las otras tres fichas (14 pruebas) | Cinco roturas: `siguienteVersion` sin copiar el detalle; sin la comprobación de que el detalle es del tipo de la ficha; sin el disparador diferido del reparto; `vigenteA` resolviendo «la última»; y `TierraRural` admitiendo metros | Rojo las cinco. La segunda deja construir una ficha económica con grupos de tierra; la última admite 15 000 m² leídos como hectáreas |
| Consulta de fichas e histórico (24 pruebas) | Escribiendo el prefijo con `LIKE` en vez de por rango, y devolviendo el padrón entero cuando el filtro por titular no encuentra a nadie | Rojo: el plan pasa a `Seq Scan` sobre 30 000 predios; rojo: buscar un nombre inexistente devolvía todo |
| La fecha de auditoría sale del reloj inyectado | Devolviéndola al `DEFAULT now()` de la base | Rojo: la fila cae en un día que no es el del ejercicio con que se particionó |
| Documentos en tres formatos (26 pruebas) | Cinco roturas: el PDF con fecha de creación dentro; el RTF sin escapar lo no-ASCII; sin la comprobación de que la reimpresión sale igual; sin el disparador de inmutabilidad; y el duplicado sin marcar | Rojo las cinco. La primera es lo que haría cualquier biblioteca de PDF; la segunda escribe «PE?A GARC?A» en un documento oficial |
| Del token firmado a las filas que RLS deja ver (11 pruebas, con un emisor OIDC propio) | Cuatro roturas: sin `oauth2ResourceServer`; con `/api/v1/**` en `permitAll()`; con solo `jwk-set-uri`, sin `issuer-uri`; y el filtro leyendo `X-Municipalidad-Id` «por comodidad» | 5, 1, 1 y 1 en rojo |
| Padron vehicular (13 pruebas) | Cinco roturas: la unicidad de la placa sobre el texto tal cual; el cambio de placa sincronizando `papeleta.placa`; la auditoria llaveada por la placa; los valores referenciales resueltos por ejercicio; y la consulta sin `@Transactional` | 1, 1, 2, 2 y 4 en rojo |
| Las guardas del generador de operaciones (6) | Un contrato de muestra que viola cada una | Las seis muerden |
| La marca de la instalación de demostración (19 pruebas) | Quitando el bloque de la marca de **cada renderizador por separado**; marcando solo al dibujar en vez de al emitir; y cambiando la caché del régimen por una global de un solo valor | Cada renderizador roto pone en rojo su formato y solo el suyo; 2 en rojo; 2 en rojo —la caché global hace que la primera municipalidad que emita decida por todas, y en el orden malo la marcha blanca emite **sin** marca— |
| Los manifiestos del clúster (49 pruebas, sin Pulumi ni nodo) | Poniendo `RollingUpdate` sobre el volumen de la base, `timeoutSeconds: 1` en una sonda, `sgtm_owner` como usuario del Deployment, un puerto en el perfil `batch`, `start-dev` en Keycloak y `/keycloak/admin` publicado | Las seis lo ponen rojo |
| El motor del manifiesto, levantado de verdad | Quitando el `GRANT CONNECT` que devuelve a los cuatro roles lo que el guion de Keycloak revoca de PUBLIC | Rojo: `sgtm_owner` deja de poder conectarse, y con él la aplicación entera |
| El inventario de secretos y su generación (14 pruebas, sin cluster) | Un generador que repite un valor; `keycloakAdminPassword` reintroducida en la lista de arranque de Pulumi | Rojo: `completarSecreto` lanza en vez de crear dos claves iguales; `verificaciones/secretos.test.ts` detecta la clave compartida entre las dos listas |
| La rotación de `sgtm_app`, contra un motor real | Quitando el `ALTER ROLE` de `verificar-rotacion.sh` | Rojo: una conexión nueva con la clave vieja sigue funcionando después de "rotar" |
| Los secretos, generados y comprobados contra un cluster real (CI) | Corriendo `bootstrap-secretos.sh` dos veces y comparando huellas; y forzando la misma clave para `sgtm_owner` y `sgtm_app` con `kubectl patch` | La huella no cambia en la segunda corrida; `verificar-claves-distintas.sh` detecta las dos claves iguales |
| El respaldo, restaurado de verdad (RNF-079) | Cinco roturas del simulacro: sin `recovery_target_time`; con `archive_mode=off`; con `sgtm_respaldo` como `SUPERUSER`; con el sha256 de wal-g corrompido; y sin el `GRANT pg_read_all_settings` | Las cinco lo ponen rojo. La primera restaura **4 filas donde había 3** —la escritura posterior al instante marcado sobrevive—, que es exactamente el defecto que un PITR mal apuntado produce en silencio |
| El rol del respaldo no puede más de lo que necesita | Dándole `CONNECT` sobre la base del padrón, contra un motor real | Rojo: `pg_backup_start`/`stop` son operaciones del clúster, no de una base, y una credencial de más apuntando al padrón es una credencial de más |
| El escaneo de secretos del repositorio entero | Apuntando gitleaks a la muestra de clave de mentira sin la exclusión del repositorio | La encuentra; sin la muestra, el escaneo del repositorio no demostraría nada |
| Una alerta que le llegue a alguien, contra un clúster real | Apagando PostgreSQL sin receptor configurado, y con receptor configurado | Sin receptor: la regla llega a `firing` y el receptor de prueba recibe 0 peticiones; con receptor: la misma alerta activa se entrega |
| Los tableros muestran datos de verdad | Consultando cada panel de `resumen-operativo.json` contra un Prometheus real, con exportadores reales y uno sintético para la JVM | Ninguno vuelve «No data»; quitar un objetivo del scrape lo pone rojo, nombrando el panel |
| kube-state-metrics no tiene privilegio de más | Pidiendo `secrets`/`configmaps` o un verbo de escritura en su `ClusterRole` | `yarn test` lo rechaza: solo `list`/`watch` sobre lo que las reglas y el tablero usan |
| Carga inicial de vías, sectores y manzanas (20 pruebas) | Anotando `@Transactional` sobre el método que orquesta el archivo entero —o, equivalente, envolviendo el bucle en un solo `TransactionTemplate`— en vez de dejar que cada fila abra la suya al llamar a un caso de uso `@Service` distinto | Rojo: la fila que revienta la unicidad se lleva consigo a la fila válida que la seguía, igual que ya demostraba `ViaRepositoryJdbcTest` para dos escrituras en una transacción |
| El orden de las clases de prioridad (5 pruebas) | Intercambiando `PRIORIDADES.datos` y `PRIORIDADES.lote` —PostgreSQL en la prioridad más baja del clúster, las emisiones masivas en la más alta— | **Antes: verde en las 170.** La auditoría exigía que todo pod DECLARASE su clase, nunca que el orden fuera el correcto, así que la inversión exacta del no-negociable del issue #157 pasaba sin ruido. Ahora, rojo en 5 |
| El init container de wal-g con la raíz sellada (`raiz-sellada`, en cada PR) | Ejecutando la imagen real con `--read-only` y **sin** montar `/tmp` —el propio guion lo hace como caso B— | Rojo: `exit 23`, «curl: (23) client returned ERROR on write». Con `/tmp` montado, exit 0 y el binario arranca —«wal-g version v3.0.5»—, que de paso confirma que el `WALG_SHA256` fijado es el del release |
| La reserva del nodo, contra el VPS de `prod` de verdad (`reservar-recursos-del-nodo.sh`, issue #157) | Corriéndolo como root sobre `vmd120205`, con k3s en marcha y reiniciándolo de verdad | Lo asignable bajó exactamente 2 CPU y 2 Gi —`system-reserved` + `kube-reserved`, 1+1 de cada uno—, la capacidad no se movió, el API server volvió solo y ningún pod quedó fuera de `Running`/`Succeeded` |
| El tope de tiempo de `observabilidad-alertas` | Ya pasó, sin necesidad de provocarlo: sin `timeout-minutes`, el trabajo corrió más de 40 minutos el 2026-08-23 —muy por encima del peor caso de sus `--timeout` internos (~25 min)— hasta que se canceló a mano | `timeout-minutes: 15` puesto: un colgado real deja de poder consumir cuota sin límite |
| Que el stack quepa en su nodo (13 pruebas, sin Pulumi ni clúster) | **También pasó antes de escribirse.** `aplicar-prod` se colgó cuatro veces entre el 25 y el 26 de agosto de 2026, una casi seis horas: la reserva de #157 dejó `vmd120205` en 2 CPU asignables y el stack pide 2 040m solo en `Deployment`. Un pod que no se puede ubicar no falla —se queda `Pending`— y el `ConfigGroup` lo espera sin error ni registro. Se demuestra con el nodo real de prod, con los 4 GB que #158 ya probó insuficientes, y subiendo `webReplicas` contra un nodo holgado | Rojo en los tres, diciendo cuántos milicores faltan. Y un cuarto caso al revés —un nodo de 8 CPU/16 GB— en verde: sin él, la comprobación podría estar diciendo que no a todo |
| Que esa aritmética describa a Kubernetes (`capacidad`, en cada PR) | Aplicando el stack entero contra un `kind` real y mirando si el planificador ubica cada pod. Lleva dentro su demostración: un pod que pide 1 CPU más de la que el nodo tiene se queda `Pending` por «Insufficient cpu» | La dirección peligrosa es la optimista —decir «cabe» cuando no—, porque devuelve el colgado con la guarda en verde. Es la que se comprueba con el stack completo |
| Lo que el stack dice del nodo, contra el nodo real (`aplicar-*`, antes de `pulumi up`) | Declarar más CPU o memoria asignable de la que el nodo tiene | Rojo, nombrando las dos cifras. Declarar de menos se admite —solo aprieta la comprobación— y avisa |

**Sin Docker en la máquina, la prueba no se salta**: se apunta a un PostgreSQL existente con
`-Dsgtm.pruebas.postgres.url` ([`backend/README.md`](backend/README.md)).
