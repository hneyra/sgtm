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

Workspaces del frontend hoy: `apps/backoffice` (shell, catálogo y renderizador), `apps/portal`
(el portal del contribuyente: **una** pantalla, sin shell ni catálogo) y los paquetes
`@sgtm/dominio`, `@sgtm/api-client`, `@sgtm/design-system`, `@sgtm/api-mock` (el proxy de datos),
`@sgtm/lectura` (los adaptadores del contribuyente que las dos aplicaciones comparten) y
`@sgtm/sesion` (la puerta de sesión).
**El catálogo se regenera con `yarn portar-catalogo` y los tipos de la API con
`yarn generar-operaciones`, desde el contrato; los archivos `.generado.ts` no se editan a mano.**

**Dos aplicaciones, un solo origen, y las 134 siguen siendo 134.** `apps/portal` se separó por la
**tercera** condición de [`ADR-0009`](docs/30-arquitectura/adr/ADR-0009-plataforma-frontend.md)
—el paquete arrastra código que solo usa el back-office— y no por la primera
([`ADR-0016`](docs/30-arquitectura/adr/ADR-0016-el-inicio-pregunta-la-ficha-compone.md) §3): **no
hay realm ciudadano, no hay sesión propia del contribuyente y ninguna lectura se abre al público**.
Se sirve en `/portal/` del mismo origen, tras la misma puerta de sesión del funcionario, y la
opción `portal` del catálogo sigue donde estaba —es la vista del funcionario—. Las dos enseñan las
mismas cifras a la misma fecha porque leen con los mismos adaptadores; lo que cambia es el ancho.

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
| El administrador inicial administra toda la municipalidad, y un grupo `Seguridad` delegado (14 pruebas) | Devolviendo el filtro por módulo a `permisosDeSeguridad`; ampliando el alcance del grupo `Seguridad` a todo el catálogo | Rojo: el admin deja de llegar al padrón; rojo: un miembro de `Seguridad` entra donde no debe. Y **la marcha blanca destapó de paso** que `GET /catastro/vias` corría sin transacción —sin `SET LOCAL`, RLS falla— porque nadie con permiso había llegado nunca a él: se arregló con `ConsultaDeVias` |
| La interfaz aprende sus permisos del backend, no del token (ADR-0013): matriz efectiva (5 pruebas), centinela `SESION_PROPIA` en el guardia (1), y `permisos.test.tsx` contra el endpoint | Poniendo la excepción de usuario a competir por columna con el grupo en vez de sustituirlo; dejando pasar `SESION_PROPIA` sin token; haciendo que el endpoint de permisos responda 500 | Rojo: la matriz mezcla lo que la excepción niega; rojo: el guardia deja entrar sin autenticar; rojo el front deja de mostrar el menú vacío —muestra todo— cuando no puede leer los permisos |
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
| El camino de escritura (`escritura.test.tsx`) y los actos honestos (`actos-honestos.test.tsx`) | Quitando el `focus()` tras guardar, enfocando en cada render en vez de en el flanco, regenerando la clave de idempotencia en cada envío, y dejando que una opción sin declarar «guarde» mandando solo su observación | Dos, una, una y la batería de actos honestos en rojo |
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
| Que `prod` quepa en el nodo REAL, no en el que tendra (16 pruebas) | Devolviendo los 250m de `RECURSOS.arranque`, que es lo que pedian los dos Jobs de arranque | Rojo en 2, diciendo «Faltan 260m». **Y el intento anterior fallo por adelantarse**: se declararon los 3 CPU que dara la reserva corregida antes de aplicarla, y `aplicar-prod` se paro en «Lo declarado cabe en el nodo real» —ese paso rechaza declarar de MAS, asi que adelantarse solo cambia el paso en el que falla—. Lo permanente (1 540m) siempre cupo en 1 800m; sobraba el pico |
| La reserva del nodo suma lo dimensionado, no el doble (6 pruebas) | Devolviendo la duplicacion: `cpu=1` en `system-reserved` **y** en `kube-reserved`, que es lo que el guion escribia | Rojo en 3, una diciendo «expected 2000 to be 3000». **Y el defecto llevaba tres dias en verde**: la medicion de `INF-02` §4 ya decia «2 Gi exactos, y 2 CPU» —el doble de lo que `INF-01` §2 dimensiona— y se leyo como el coste esperado de la reserva. `vmd120205` repartia 2 de sus 4 CPU, y por eso `prod` no podia desplegarse |
| Que el stack quepa en su nodo (13 pruebas, sin Pulumi ni clúster) | **También pasó antes de escribirse.** `aplicar-prod` se colgó cuatro veces entre el 25 y el 26 de agosto de 2026, una casi seis horas: la reserva de #157 dejó `vmd120205` en 2 CPU asignables y el stack pide 2 040m solo en `Deployment`. Un pod que no se puede ubicar no falla —se queda `Pending`— y el `ConfigGroup` lo espera sin error ni registro. Se demuestra con el nodo real de prod, con los 4 GB que #158 ya probó insuficientes, y subiendo `webReplicas` contra un nodo holgado | Rojo en los tres, diciendo cuántos milicores faltan. Y un cuarto caso al revés —un nodo de 8 CPU/16 GB— en verde: sin él, la comprobación podría estar diciendo que no a todo |
| Que esa aritmética describa a Kubernetes (`capacidad`, en cada PR) | Aplicando el stack entero contra un `kind` real. Lleva dentro su demostración, con el **mismo detector** que el caso principal: un pod que pide 1 CPU más de la que el nodo tiene tiene que salir rechazado por «Insufficient cpu» | Los dos casos pasan contra un planificador real. **Y la primera versión medía la señal equivocada**: contaba «pods sin ubicar» y daba 3 de 14 en falso —`postgres`, `prometheus` y `grafana` estaban `Pending` esperando su volumen (`WaitForFirstConsumer`), no CPU—. La señal correcta es `PodScheduled=False` con «Insufficient» en el mensaje; lo demás es un rojo por un motivo que no es el que se mide |
| Lo que el stack dice del nodo, contra el nodo real (`aplicar-*`, antes de `pulumi up`) | Declarar más CPU o memoria asignable de la que el nodo tiene | Rojo, nombrando las dos cifras. Declarar de menos se admite —solo aprieta la comprobación— y avisa |
| El alta declarativa de usuarios de Keycloak (ADR-0012): TSV derivado en `componentes.test.ts`, y el peldaño «3b» de `despliegue.yml` con el buzón Mailpit levantado | En el test: dos `administrador: true` en un archivo, un `municipalidadId` que no es entero, y el administrador del archivo distinto del que implanta el stack. En `despliegue.yml`: quitar el `execute-actions-email` del guion, y falsear el `municipalidadId` del archivo | Rojo los tres en el test, nombrando el archivo. En CI: sin el envío, el buzón queda vacío y el peldaño 3b se pone rojo; con el número falseado, el cruce a tres bandas —archivo ↔ `SELECT id FROM municipalidad` ↔ atributo en Keycloak— no cuadra |
| Notificación con acuse, prescripción y pase a coactiva (#39, 68 pruebas, 13 contra PostgreSQL real) | Quitar `PLAZO`/`PRESCRIPCION` de la lista de la regla 5; quitar el índice único parcial de `valor_movimiento`; devolver el `UPDATE` que V7 le daba a `notificacion`; quitar `notificacion_exigibilidad_ck`; y lanzar diez pases a coactiva del mismo valor con hilos de verdad | Rojo el escáner de fuentes, nombrando la muestra; rojo: diez pases producen diez movimientos, no uno; rojo: `sgtm_app` puede corregir una diligencia en el sitio; rojo: una diligencia no hallada admite fecha de exigibilidad, escrita por SQL directo |
| Las dos puertas de la cabecera (ADR-0014: lanzador y menú de la persona, 21 pruebas) | Listando `MODULOS` sin filtrar en el lanzador; devolviendo Enter al índice de las flechas en vez de a la entrada enfocada; quitando el oyente de Esc en `document`; y quitando `--accent-ink` del bloque oscuro | Rojo: Coactiva aparece en el menú del cajero; 3 en rojo de teclado; 3 en rojo de Esc; rojo el contraste, «1.15:1» |
| La caja: cobranza atómica, doble cobro y numeración (#33, 56 pruebas, 15 contra PostgreSQL real) | Cinco roturas: quitar el `@Transactional` de `CobrarDeuda`; quitar el `FOR UPDATE` sobre las filas de `saldo_proyectado`; quitar `recibo`/`recibo_detalle` de `TABLAS_INMUTABLES`; y quitar de V29 el `REVOKE UPDATE` y el índice único de idempotencia | 14 en rojo la primera —sin transacción no hay `SET LOCAL`, así que la cobranza ni siquiera escribe—, y la de atomicidad además deja el recibo insertado. 1 en rojo la segunda, **pero solo a la tercera versión de la prueba**: con una caja y un cajero la serializa el turno, y con una caja y diez cajeros la serializa el contador de la serie; las dos pasaban en verde con el candado quitado. Con diez cajas y diez series salen **2 cobros donde debe haber 1**. 1, 2 y 1 en rojo las tres últimas —y las dos del privilegio pasan de `42501` a `23514`: sin el `REVOKE`, lo único que frena el `UPDATE` es un `CHECK` que no estaba puesto para eso— |
| Duplicado y anulación de recibo (#34, 43 pruebas, 17 contra PostgreSQL real) | Seis roturas: quitar la guarda del mismo día; escribir un `UPDATE recibo_movimiento SET` en `src/main`; saltarse la reversión y solo marcar; resolver la fecha del papel con `LocalDate.now()` en vez de la congelada; quitar el índice único parcial de V30; y darle `UPDATE`/`DELETE` sobre `recibo_movimiento` a `sgtm_app` | 2, 1, 6, 2, 1 y 2 en rojo. La quinta produce **4 anulaciones donde debe haber 1** con diez hilos, y con ellas cuatro reversiones: el contribuyente acabaría debiendo cuatro veces lo que pagó. **Y la cuarta pasó en verde a la primera**: la prueba buscaba la fecha del cobro como subcadena, y el instante de emisión —`2026-03-16T00:00:00Z`— ya la contenía, así que un `aLaFecha` resuelto con el reloj de la reimpresión no se distinguía. Ahora se comparan las dos líneas de fecha enteras |
| La ficha del contribuyente y la del vehículo (#330, 11 pruebas) | Devolviendo el índice a `true` —la barra de pestañas vuelve—, quitando la línea de deuda del resumen y poniéndole un cero, y quitando el aviso de dominio | 4, 1 y 1 en rojo. La primera es la que importa: con `true` el índice indexa **la pestaña activa**, así que las 56 claves siguen repartidas en nueve clics y el cambio no se nota en ninguna otra pantalla con pestañas |
| La baja de deuda elige sus filas (#332, 8 pruebas) | Quitando el límite de una obligación por acto de `exigir`, haciendo que la tabla `plana` viaje como lista, quitando la conexión que le da filas y quitando la selección declarada | 1, 1, 8 y 8 en rojo. **Y la tabla estaba vacía desde siempre**: la operación de la pantalla es un `POST`, y una operación que escribe no se pide al abrirla —la columna de selección que el prototipo dibuja no tenía sobre qué actuar hasta que se leyó `consulta_deuda`, que es quien publica esa deuda— |
| Ningún acto promete lo que no puede (#332, 6 pruebas, transversal) | Devolviendo `undefined` a `impedimentoDelActo`; dando el mismo texto a las dos causas; devolviendo a `useEscritura` la operación de una opción sin declarar; y quitando el `aria-describedby` de la primaria | 17, 2, 12 y 13 en rojo, en cinco módulos. La tercera es el defecto que cerró: una opción no declarada «mandaba solo su observación», y con ella la primaria se habilitaba —lo que cinco pruebas de cinco módulos daban por bueno— |
| Un entero es entero entero (5 pruebas) | Devolviendo `Number.parseInt`, que se queda con el prefijo | 2 en rojo: «1 - 4» viajaba como la cuota 1, y las otras tres se perdían sin que nada lo dijera |
| Grupos por tarea y el centro de reportes de Tránsito (ADR-0014, 5 guardas + 49 pruebas de catálogo y centro) | Cinco tablas que violan cada guarda del portador —incluida la de dos grupos homónimos—; desmarcando `{ centro: true }` y regenerando; moviendo una hoja de grupo; y leyendo `MODULOS` en vez del catálogo visible en el carril | Las cinco guardas muerden; 12 en rojo: la barra vuelve a 23 entradas; 19 en rojo: «cada opción exactamente una vez» delata el cambio; rojo: con 2 hojas permitidas el carril lista 13 |
| El campo que resuelve la unidad del alta de deuda y la memoria del predial, tras la triple revisión (#331, #333; 45 pruebas nuevas) | Dieciocho roturas, y las que más dicen son tres: devolver `MULTA_ADMINISTRATIVA` a «sin unidad» —que es lo que `RegistrarPapeleta:164-170` desmiente, porque asienta el cargo **con** el `predioId` de la papeleta—; quitar la opción vacía del desplegable de concepto; y darle al resolutor el `fijarCampo` de la pantalla entera en vez del acotado a los campos que declara, con una **muestra que lo viola** —un resolutor que además escribe `codContribuyente` y un importe— | 2, 1 y 1 en rojo. Las tres estaban en verde: la primera **rechazaba** resolver el predio de una multa que sí cuelga de uno; la segunda dibujaba «IMPUESTO PREDIAL» sin que nadie lo tocara y mandaba el `POST` **sin `tributo`**; la tercera dejaba a un control propio escribir campos que el operador no tecleó. Y las quince restantes muerden una a una: el `outline-offset` de la lista —sin él, del foco solo queda una raya **sobre la fila anterior**, y Enter asienta sobre otro predio—, el cruce del titular, la rama de la placa —que no la verificaba nada: se podía romper entera y las 798 seguían verdes—, el privilegio del acto sobre el control, el 403 que no es «vuelve a intentarlo», el rótulo recordado —que sobrevive al plegado y **no viaja**—, la limpieza tras guardar, el foco al elegir y al cambiar, el recuento recortado, los motivos que ya no mandan a una lista que no está en pantalla, la entrada de la tabla en el índice de `predial_individual` y el `title` de RNF-052 en los secundarios de una pantalla con impedimento |
| El convenio de fraccionamiento, del preconvenio al quiebre (#35, 56 pruebas, 26 contra PostgreSQL real) | Cinco roturas: devolver la deuda escribiendo la fase en `saldo_proyectado` en vez de con asientos; quitar de V31 el `CHECK` que exige el recibo al formalizar; quitar `convenio_deuda_uq`; compilar el interés y el máximo de cuotas en `Cronograma`; y devolver siempre a `ORDINARIA` en vez de a la fase de origen | 3, 1, 1, 2 y 3 en rojo. **La cuarta enseña lo suyo**: con la lista de la regla 5 anterior a #35 —`INTERES_MORATORIO`, sin `CUOTAS`— el archivo de **producción** con las dos cifras compiladas pasa en VERDE y solo se pone roja la prueba de que la muestra muerde; por eso el patrón se ensancha a `INTERES` y gana `CUOTAS`. Y la quinta la caza la comparación **asiento por asiento**: deja `ARBITRIOS/COACTIVA` en −200 y `ARBITRIOS/ORDINARIA` en +200, o sea la deuda coactiva movida en silencio a cobranza ordinaria, que es justo lo que `convenio_deuda.fase_origen` existe para impedir |
| La consulta unificada, la última de `Consultas` (#25, 23 pruebas, 14 contra PostgreSQL real) | Cuatro roturas: que el puerto de convenios de tesorería escriba su propio criterio y se deje el contribuyente; publicar el total del resumen sin su fecha; sumar el resumen sobre la página devuelta en vez de sobre todas las obligaciones; y quitarle el `@Transactional` a la ficha | 3, 1 y 1 en rojo, y 12 la cuarta. **La primera enseña lo suyo**: la ficha de un contribuyente **sin ningún convenio** pasa a mostrarle los de otras siete personas, y la prueba que lo caza no es la del contribuyente completo sino la del contribuyente vacío. La tercera deja el resumen en **300,00 donde debe decir 1 220,00** —la cuarta parte de la deuda, en la cifra que se lee en ventanilla—. La cuarta falla nombrando `declaracion_jurada`: los cinco puertos ajenos traen su propia transacción y disimulan, así que el único síntoma es la sección que se lee del repositorio del anfitrión |
| El expediente coactivo, de la importación al historial (#40, 74 pruebas, 24 contra PostgreSQL real) | Cinco roturas: admitir el valor notificado sin esperar al plazo ni al pase; degradar `expediente_valor_unico_uq` a índice normal; devolverle a `sgtm_app` el `UPDATE` sobre el historial; escribir un `UPDATE expediente_movimiento SET` en `src/main`; y declarar un `Dinero` sin su fecha en el DTO de la capa web | 7, 1, 2, 1 y 1 en rojo. **La segunda enseña lo suyo**: sin el índice único, reintentar la importación *una vez* sigue en verde —la comprobación previa en Java la caza—, y solo con **diez hilos** salen **2 expedientes donde debe haber 1**, o sea dos procedimientos coactivos por la misma deuda. Y una sexta la encontró la propia prueba: analizar el número suponiendo «el ejercicio es el grupo 1» funciona con la plantilla de omisión y lee `0042-2026-EC` como *el ejercicio 42*; probar la numeración con **dos** plantillas —que es lo que D-09 abierta exige— lo destapó antes de que D-09 se cerrara con el error dentro |
| Actos coactivos, REC-1/REC-2 y notificaciones (#41, 56 pruebas, 23 contra PostgreSQL real) | Cinco roturas: que una diligencia no hallada cuente como notificación —quitando `AND exigible_desde IS NOT NULL`—; quitar la guarda del plazo de la REC-1 **y** la del propio `ActoCoactivo`; quitar la guarda de deuda viva; escribir un `UPDATE acto_coactivo SET` en `src/main`; y quitar de V34 el `REVOKE UPDATE` | 1, 3, 2, 1 y 1 en rojo. **La segunda enseña lo suyo**: con las dos guardas de Java fuera, la prueba web devuelve **201** —una REC-2 dictada con el plazo corriendo entra sin ruido— y la única que la para es `acto_rec2_plazo_ck`, que la rechaza con `23514`. Es el mismo mecanismo que `valor_movimiento_exigible_ck` (V28): la fila **copia** la diligencia que la sustenta y el día desde el que la ley la permite, y un `CHECK` compara las dos fechas. Y el hallazgo del diseño fue que **`notificacion` sirve tal cual**: V3 la nació polimórfica y V28 le puso, para #39, el intento, el acuse, la exigibilidad y `notificacion_intento_uq`; nada de eso era del valor, así que la REC se notifica con `objeto = 'ACTO_COACTIVO'` y V34 no le toca una columna |
| Costas procesales, fraccionamiento coactivo y las dos consultas (#42, 32 pruebas, 21 contra PostgreSQL real) | Cinco roturas: dejar la liquidación sin asentar su cargo —la costa como fila del expediente y no como apunte del libro—; quitar `COSTA` de la lista de nombres de la regla 5; hacer que el quiebre devolviera siempre a `ORDINARIA`; quitar de V35 el `REVOKE UPDATE ON costa_procesal`; y quitar la comprobación de quién es dueño de la obligación de costas | 11, 1, 1, 1 y 1 en rojo. **La primera enseña lo suyo**: con el cargo fuera, `DeudaDelExpediente.costas` vuelve a cero y la REC-2 imprime «TOTAL EXIGIBLE 500,00» donde debe decir 535,00 —el papel notificado se lleva la cifra—. La segunda solo la caza la muestra: `ARANCEL_COSTA_REC1` ya la veía `ARANCEL`, pero `COSTA_DE_LA_REC2` no empieza por ninguna palabra vigilada y pasaba sin ruido, el mismo hueco exacto que #35 destapó con `INTERES_DE_FRACCIONAMIENTO`. Y **la quinta es la que no se veía venir**: el libro no distingue expedientes en la clave de una obligación, así que sin `costa_obligacion` el primer expediente muestra **70,00 donde debe decir 35,00** y el segundo **0,00** —su costa está cargada en el libro y ningún expediente la enseña— |
| Cierre y arqueo de caja, avance y distribución (#36, 54 pruebas, 14 contra PostgreSQL real) | Cuatro roturas: contar la anulación como cobro (`neto = cobrado`); olvidar que el recibo de tasas y el de cuota inicial NO abonan en el libro y meterlos en el cuadre; conceder `UPDATE` sobre `cierre_turno`; y redondear la suma de las partes del arqueo con una política escrita a mano | 3, 2 y 1 en rojo, y la cuarta la caza el escáner de fuentes. **Y una quinta la encontró la propia base**: el `REVOKE UPDATE ON cierre_caja` que V32 iba a hacer —el mismo que V29 le hizo al recibo— **deja la caja sin poder cobrar**, porque `SELECT … FOR UPDATE` exige el privilegio de UPDATE y esa fila es donde se serializa la ventanilla desde #33. El síntoma no se parece a su causa: `BadSqlGrammarException` en la primera cobranza, porque el SQLSTATE `42501` cae en la clase 42. `cierre_caja` es la primera tabla cuya inmutabilidad la sostiene solo el escáner |
| La licencia de funcionamiento, con su recibo, su cancelación y su duplicado (#44, 60 pruebas, 13 contra PostgreSQL real) | Cinco roturas: quitar `licencia_funcionamiento` de `TABLAS_INMUTABLES`; quitar de V37 el `REVOKE UPDATE`; degradar `licencia_duplicado_uq` a índice normal; quitar la comprobación de que el recibo no esté anulado; y quitar la guarda del filtro por titular que no encuentra a nadie | 1, 1, 1, 2 y 1 en rojo. **Y la tercera enseña lo suyo**: con el caso de uso entero en los diez hilos, la carrera pasaba en verde con el índice degradado, porque quien la serializaba era otra cosa —`siguienteCorrelativo` de los documentos es un `count(*) + 1`, y `documento_numero_uq` rechaza a los nueve que calculan el mismo número de resolución antes de que nadie llegue al ordinal—. Midiendo lo que dice medir —el ordinal, con los papeles emitidos por adelantado— salen **10 duplicados con 4 ordinales distintos**, o sea seis papeles que dicen «DUPLICADO N.° 1» y no se pueden distinguir. Y una sexta la encontró la propia migración: el `DROP INDEX licencia_contribuyente_ix` que parecía prudente falla con «index does not exist», porque `DROP COLUMN estado` ya se lo había llevado por delante |
| Descargos, internamiento vehicular y resoluciones de gerencia (#50, 46 pruebas, 23 contra PostgreSQL real) | Seis roturas: quitar `resolucion_gerencia` e `internamiento` de `TABLAS_INMUTABLES`; quitar de V41 `resolucion_gerencia_plazo_ck`; quitar `internamiento_liberacion_ck`; creerle a la petición lo de «custodia cancelada» en vez de preguntárselo a `tesoreria`; no asentar la baja cuando la resolución deja la multa sin efecto; y degradar `resolucion_gerencia_ordinaria_uq` a índice normal | 1, 1, 1, 4, 1 y 1 en rojo. **La sexta enseña lo suyo**: con diez hilos dictando la ordinaria de la misma papeleta salen **5 resoluciones donde debe haber 1**. **Y el hallazgo del diseño fue que `papeleta` no sabía a quién se le cobra**: #46 recibía `contribuyenteObligadoId`, asentaba el cargo contra él y no lo guardaba —así que nada podía encontrar después la obligación que un descargo fundado tiene que dar de baja, y `infractor_id`/`propietario_id`/`contribuyente_id` son tres candidatos y ninguno es la respuesta—. Otro salió ejecutando: `notificacion.numero` es `varchar(20)` desde V3 y la diligencia se numera «número del acto/intento», así que `RG_ORDINARIA-2026-000001/1` no entra; el tipo de documento pasa a `RGO`/`RGS`/`RGA` |
| Liquidación, reliquidación, omisos y subvaluadores (#49, 94 pruebas, 12 contra PostgreSQL real) | Cinco roturas: leer los parámetros con `vigenteEn(ejercicio)` en vez de `porConjunto(...)`; hacer que declarar fuera de plazo cuente como omiso; sacar las tres tablas de la liquidación de `TABLAS_INMUTABLES`; quitarle la `Observacion` a `LiquidarFiscalizacion.liquidar`; y que la reliquidación deje de referenciar a la anterior. Y una sexta contra la base: conceder `UPDATE` sobre `liquidacion_detalle` en V39 | 1, 9, 1 —la muestra—, rojo en `verificarArquitectura` nombrando el método, 10, y 2. **La segunda enseña lo suyo**: el AC 3 no es un caso borde sino el eje —quien declaró tarde declaró—, y al confundirlo se cae hasta `FilaDeOmisos`, que rechaza en su constructor la fila «OMISO y además fuera de plazo». Y el diseño lo decidió la base: `conjunto_sellado_uq` (V9) admite **un solo** conjunto sellado por ejercicio, así que «sellar la versión 2 de 2024» no se puede sembrar; lo que PostgreSQL garantiza del AC 1 es que la columna está **copiada** y `sgtm_app` no la puede mover |
| El FUE de edificación completo: por partes, valorizado, ampliado y revalidado (#48, 68 pruebas, 24 contra PostgreSQL real) | Cinco roturas: quitar las ocho tablas del FUE de `TABLAS_INMUTABLES`; quitar de V43 el `REVOKE UPDATE ON licencia_edificacion`; degradar `edificacion_movimiento_emision_uq` a índice normal; hacer que el tramo de la revalidación empiece el día del acto en vez del siguiente al anterior; y que una celda que falta en el cuadro de valores unitarios **valga cero** en vez de fallar | 1, 1, 1, 1 y 3 en rojo. La tercera deja **8 licencias donde debe haber 1** con diez hilos de verdad: dos papeles que dicen otro número para la misma obra. **Y la quinta es la que este issue existe para impedir**: con el cero, la licencia sale con «valor de obra 0,00» y esa cifra es indistinguible de una correcta cuando llega al papel que se exhibe en la obra —y es la base sobre la que se liquidó el derecho de trámite—; por eso V43 **retira la columna `valor_obra`** y la valorización se calcula contra el cuadro de #17, o dice «—» nombrando la llave que falta. Y un defecto lo encontró la propia prueba: el papel **sí** llevaba la raya, y la aserción la leía como ISO-8859-1 cuando el PDF va en CP-1252 —el byte 0x97 se veía como un carácter de control invisible, y la prueba decía que la raya faltaba— |
| La conciliación catastro↔rentas, dicha sin inventarla (ADR-0015, #322: 7 pruebas y un testigo en la franja) | Cuatro roturas: quitar el aviso de la consulta de fichas; devolver a «—» la columna «Cod. Predial Rentas»; quitar la línea de conciliación de la cabecera de la ficha; y clasificar «Conciliar» como acción de salida | 1, 2, 4 y 3 en rojo. **La segunda enseña lo suyo**: el «—» no era una falta de dato sino un comentario equivocado —decía que el código predial de rentas «lo tiene contribuyentes», y no existe tal código: es el mismo de referencia catastral (ADR-0015), así que las dos columnas coinciden y que coincidan **es** el dato—. Lo que sigue con «—» es «Conciliada», que es un derivado que ninguna lectura publica todavía, y ahí el guion es la verdad |
| Anuncios y propaganda, con la deuda generada al autorizar (#51, 82 pruebas, 27 contra PostgreSQL real) | Once roturas, y las que más dicen son tres: degradar `anuncio_movimiento_cargo_uq` a índice normal; darle a la tasa que falta un valor por omisión; y hacer que `licencias` toque un tipo interno de `cuentacorriente` | 2, 4 y 1 en rojo. **La primera enseña lo suyo**: con diez hilos renovando el mismo anuncio salen **10 cargos donde debe haber 1**, o sea diez veces la tasa del mismo año al mismo administrado, y la versión secuencial de la misma prueba pasa en verde —el `if` no existe: dos renovaciones son peticiones legítimamente distintas, con otra fecha y otra clave de idempotencia—. La segunda deja la autorización emitida con **50,00 inventados** que ninguna ordenanza respalda y el borde responde **201 donde debe responder 422**: por eso D-02b se resuelve fallando y nombrando la llave, `TASA_ANUNCIO:<CLASE>`. La tercera la caza Spring Modulith nombrando el tipo —«depends on non-exposed type `cuentacorriente.dominio.Concepto`»—, que es el AC 2 entero: la deuda se le **pide** al libro por `GeneradorDeCargos`, no se asienta por cuenta propia. Y las ocho restantes muerden una a una: degradar `anuncio_idempotencia_uq` (10 anuncios donde debe haber 1), quitar la RLS de `anuncio_movimiento` (4 en rojo, una diciendo «fuga de filas de la municipalidad B»), quitar el `REVOKE UPDATE ON anuncio`, conceder `UPDATE`/`DELETE` sobre `anuncio_movimiento`, quitar la guarda del cese en `RenovarAnuncio` —**201 donde debe ser 409**: un anuncio cesado vuelve a devengar—, estrechar el patrón de la regla 5 quitándole `TASA` y `TARIFA` —de las 4 constantes de la muestra solo caza 1, el mismo hueco que #35 destapó con `INTERES_DE_FRACCIONAMIENTO` y #42 con `COSTA_DE_LA_REC2`—, sacar `anuncio`/`anuncio_movimiento` de `TABLAS_INMUTABLES` (de 4 sentencias detecta 0) y quitar el `generarCargo` (11 en rojo) |
| La ficha 360° del contribuyente (ADR-0016 §2, #297: 31 pruebas nuevas y un camino de Playwright) | Siete roturas: reescribir un rótulo del catálogo —«Código predial» → «Cod. predial»—; darle banda de fecha a «Pagos Realizados», cuyas filas ya traen cada una la suya; componer las papeletas por el código del padrón en vez de por el documento; dejar que una pestaña sin permiso se dibuje; montar los siete paneles a la vez en vez de solo el activo; que la flecha active la pestaña sin llevarse el foco; y dibujar el enlace de una acción cuyo destino el perfil no puede ver | 1, 1, 1, 3, 1, 2 y 1 en rojo. **La cuarta enseña lo suyo**: sin la guarda de permiso, quien solo tiene `papeletas` deja de ver «falta «Contribuyentes»» y pasa a ver una pestaña de papeletas **vacía**, que es exactamente la lectura que ADR-0016 §2 prohíbe —una pestaña vacía ya dice que ahí hay algo que mirar—. **Y la primera es la que sostiene una decisión de coste**: la ficha declara sus columnas en vez de leerlas del catálogo en tiempo de ejecución, porque leerlas costaría descargar los cuatro módulos de sus fuentes al abrir una ficha; lo que esa decisión podría costar —un rótulo reescrito sin que nadie se entere (RNF-080)— lo cierra la prueba que compara letra a letra contra el catálogo portado. La tercera cambia `documentoDelInfractor=03593174` por el código municipal y el listado vuelve vacío: `GET /transito/papeletas` no tiene filtro por contribuyente, y la papeleta de la persona dejaría de aparecer sin que nada lo dijera |
| La misma ficha, tras la triple revisión y la adversaria final de #297 (25 pruebas nuevas: 23 de la ficha, 1 del catálogo y 1 de contraste) | Dieciocho roturas, y las que más dicen son cuatro: quitar el efecto que lleva el foco al nombre —y, aparte, quitarle su guarda—; leer el `totalElementos` de una sección como `contenido.length`; devolver `opcion.ruta` pelada cuando un filtro declarado se queda sin valor; y devolver la activación automática a las flechas de la barra | 1, 1, 1 y 1 en rojo. **La tercera es la que no se veía**: con el documento vacío, «Estado de cuenta de infracciones» abría el estado de cuenta de **todos** presentado bajo la ficha de esta persona —lo que ya hacía bien el registro vacío tres líneas más arriba—. La cuarta cuesta **cinco lecturas por recorrer la barra**, que es lo que ADR-0016 §2 evita al no consultarlas al abrir, deshecho por un gesto de teclado. **Y la de los permisos hizo falta doble**: la prueba que decía «sin el padrón no sale la petición» no llamaba a `espiar()`, así que `pedidas` quedaba vacío y no podía fallar; con el espía puesto y la guarda quitada sale la petición, y solo quitando **además** la del dibujo aparecen el nombre y el DNI **al lado del aviso de que no se pueden ver** — y la adversaria final exigió la tercera vuelta: una identidad **ya sembrada en la caché** tampoco se pinta, demostrado quitando otra vez las dos guardas del dibujo. Las catorce restantes muerden una a una: el 404 dicho como red caída, la ficha compuesta bajo «ese código no está en el padrón» (2 en rojo), el importe del resumen leído sin exigir su `actualizadoA`, la parada de tabulador del panel, los anuncios de estado de cada panel (4), el `aria-controls` en las cinco pestañas cuyo panel no existe, la nota que falta cuando no se puede dar el total consolidado, el rótulo del menú en vez del título del catálogo —«Papeletas» y «Estado de cuenta de papeleta» juntas en una barra (21 en rojo)—, una pestaña cuya opción es un `POST`, el subrayado del enlace que solo se distinguía por color, la condición especial del contribuyente y la atención que no se anotaba al entrar por enlace directo |
| Padrones, resumen anual y certificados de numeración y zonificación (#54, 57 pruebas, 27 contra PostgreSQL real) | Seis roturas: resolver el padrón con `current_date` en vez de con `:aLaFecha`; resolver el ejercicio del papel con el reloj al reimprimir; conceder `UPDATE`/`DELETE` sobre `certificado` en V51; estrechar el patrón de la regla 5 quitándole `VIGENCIA`; sacar `certificado` de `TABLAS_PROTEGIDAS` y `TABLAS_INMUTABLES`; y devolverle a `ResumenAnualDeLicencias` su `@Transactional` | 2, 2, 1 —y una más en `verificarAislamiento`, «sgtm_app no tiene DELETE en ninguna tabla»—, 1, 1 y 1 en rojo. **La primera es el AC 1 entero**: con `current_date` el padrón con corte en marzo cuenta las canceladas de agosto, así que la misma hoja reimpresa dice otra cosa cada vez. **La cuarta enseña lo de siempre**: de las 4 constantes de la muestra el patrón anterior solo caza 2 —`VIGENCIA_DEL_CERTIFICADO = 36` no empieza por ninguna de las quince palabras, ni por `PLAZO`—, el mismo hueco que #35 destapó con `INTERES_DE_FRACCIONAMIENTO`, #42 con `COSTA_DE_LA_REC2` y #51 con `TASA_PANEL`; y su consecuencia es propia: una vigencia inventada no cobra de más, **autoriza de más**. **Y la sexta la encontró la propia prueba**: envolver los tres colaboradores del resumen en una transacción del anfitrión hace que el `EjercicioSinSellar` de **un** año la marque *rollback-only*, y el reporte entero falla al confirmarla aunque la excepción se capture —los cinco años que sí se podían calcular se pierden por culpa del sexto—. Es el reparto de #25 leído al revés: aquí el anfitrión no debe abrir ninguna |

| La transferencia a rentas: la frontera delicada (#52, 40 pruebas, 8 contra PostgreSQL real) | Ocho roturas: quitar `resolucion_determinacion` de `TABLAS_INMUTABLES`; quitar `MULTA` de la lista de nombres de la regla 5; quitar de la lista de tipos ajenos declarados un puerto que `fiscalizacion` sí usa; quitarle el `@Transactional` a `TransferirARentas`; degradar `resolucion_determinacion_liquidacion_uq` a índice normal; anular la guarda del estado de la liquidación; conceder `UPDATE` sobre la resolución en V49; y darle al puerto del padrón su propia transacción con `REQUIRES_NEW` | 1, 1, 1, **7**, 1, 2, 1 y 1 en rojo. **La cuarta enseña lo de siempre y conviene repetirlo**: sin transacción no hay `SET LOCAL`, así que RLS tumba siete de las ocho pruebas de base —la transferencia ni siquiera llega a escribir—. **La quinta es la que más dice**: con el índice degradado, la prueba de extremo a extremo con diez hilos sigue en **VERDE**, porque quien serializa es `documento_numero_uq` —`siguienteCorrelativo` de los documentos es un `count(*) + 1`, el hueco exacto de #44—; solo la prueba que inserta diez filas que **únicamente comparten `liquidacion_id`** lo mide, y ahí salen **10 transferencias donde debe haber 1**, cada una con su papel y su cargo. **Y la octava es el defecto que este issue existe para impedir**: con `REQUIRES_NEW`, la versión nueva de la ficha **sobrevive** al fallo del último paso —12 fichas donde debe haber 11—, o sea el padrón cambiado sin resolución que lo justifique y sin cargo que cobrar. La segunda solo la caza su muestra: las demás prohibiciones siguen en verde, tercera vez que el mismo hueco se abre por el mismo sitio tras `INTERES_DE_FRACCIONAMIENTO` (#35) y `COSTA_DE_LA_REC2` (#42). Y dos hallazgos salieron ejecutando: `resolucion_determinacion` **no puede ser un `valor` de tipo RD** —`RegistrarValor` exige que la deuda ya esté asentada y rechaza con `ObligacionSinDeuda`, así que con D-02a abierta no se emitiría ninguna y se caería con ella la mitad de la transferencia que no depende de D-02—; y el libro está **particionado por ejercicio** con solo 2026 y 2027 declaradas, de modo que transferir una fiscalización de 2024 falla con «no partition of relation found» hasta que alguien cree esa partición |
| Valores masivos de papeletas, constancias, padrones y resúmenes (#53, 43 pruebas, 25 contra PostgreSQL real) | Cinco roturas: quitar `papeleta_valor_unico_uq` y lanzar diez corridas simultáneas sobre la misma papeleta; devolver el `concepto = 'PAGO'` a la consulta de recaudación; recomponer lo recaudado sumando las papeletas en estado `PAGADA`; resolver «pendiente» con el reloj en vez de con la fecha del parámetro; y quitar de `TABLAS_INMUTABLES` `constancia_libre` y `papeleta_masivo` | 1, 1, 2, 2 y 1 en rojo. **Y la marcha blanca destapó tres defectos que ninguna prueba anterior podía ver, los tres porque hasta ahora todo lo que movía deuda a fase VALOR usaba un doble**: `MovimientoDeFaseCuentaCorriente.moverAValor` **nunca funcionó** —`Asiento.nuevo` valida `exigeMotivo` y `AJUSTE` lo exige, así que emitir un valor sobre una obligación con deuda lanzaba `IllegalArgumentException` desde #37—; el bucle de la corrida **no podía ni leer su propia corrida** —sin `@Transactional` no hay `SET LOCAL` y RLS falla con «unrecognized configuration parameter», el mismo defecto que `ConsultaDeVias` cerró—; y `RegistrarValor.emitir` **emite una resolución de multa de 0,00** por una obligación ya pagada, porque la encuentra entre las disponibles y no mueve una fase que no tiene nada que mover |
| El inicio pregunta a quién atiendes (ADR-0016 §1, #296: 25 pruebas y 2 caminos en Chromium) | Seis roturas: quitar la guarda de permiso de las tres franjas; un patrón propio de placa —«tres letras y tres dígitos»—; persistir las atenciones en `localStorage` como hacen los recientes; que Intro abra el primero de varios; contar el 403 como una respuesta más; y devolver `/` al desvío al panel de recaudación | 2, 1, 1, 1, 1 y 2 en rojo (la primera sube a 5 quitando además los tres `enabled`). **La primera enseña lo suyo, y a la primera pasó en VERDE**: la región viva se contaba sobre lo tecleado y no sobre lo preguntado, así que a media pulsación decía «tu perfil no tiene ninguna de las consultas del padrón» —una frase falsa que aparecía sola durante los 300 ms del rebote— y la prueba del permiso la encontraba y se daba por satisfecha sin que la guarda existiera. Con el anuncio atado al valor aposentado, la misma rotura pone 3 en rojo |
| El conjunto de parámetros, abierto contra un clúster real (#247 §2, 12 pruebas, 9 contra PostgreSQL real) | Tres roturas: anotar con `@Transactional` el bucle que compone el archivo; resolver la llave del parámetro con `clave = :clave` en vez de `IS NOT DISTINCT FROM`; y quitar la guarda que rechaza dos parámetros homónimos | 3, 1 y 1 en rojo. **La primera es peor de lo que #328 documenta**: con la transacción envolvente no se pierde solo la fila válida que seguía a la rechazada —la corrida entera revienta con `UnexpectedRollbackException`, porque la fila que se rechaza marca la transacción como *rollback-only* y el informe que la explicaba no llega a devolverse—. La segunda deja al parámetro **sin clave** —el tipo con un solo valor, que es la forma de la UIT— fuera del conjunto, y el informe lo reporta como «no publicado», que es exactamente lo que no es. La tercera mete `FICTICIO:HOMONIMA` en un conjunto que se va a sellar sin que nadie eligiera cuál de los dos |
| El panel de recaudación, la pantalla de inicio (#56, 53 pruebas, 11 contra PostgreSQL real) | Siete roturas: contar la condonación como cobranza; quitar de «lo cargado» el filtro que descarta el cargo nacido de reversar un abono; conectar el pool como superusuario en vez de `sgtm_app`; declarar un `Dinero` sin `actualizadoA` en el DTO de la capa web; hacer que el panel toque `cuentacorriente.dominio.Fase`; inyectarle `ConsultaDeDeudaPublica`, que devuelve una fila por obligación; y que un avance sin base valga 0 en vez de «—» | 4, 4, **10 de 11**, 1, 2, 2 y 4 en rojo. **La tercera es la que enseña lo suyo**: con las dos municipalidades sembradas idénticas, cada cifra del panel sale exactamente **al doble** —800 donde debe decir 400, 1 400 donde debe decir 700— y ninguna de esas cifras parece mal; solo la prueba que cuenta `DISTINCT municipalidad_id` dice por qué. **Y dos defectos los encontró la propia ejecución**: `Asiento#reversionDe` produce el asiento contrario **con el mismo concepto**, así que anular un recibo de 120 dejaba un `CARGO INSOLUTO` de 120 y «lo cargado» salía 520 donde debe decir 400 —la emisión del ejercicio inflada por cada anulación, y con ella el denominador de todas las barras—; y calcular la barra como «(cargado − pendiente) / cargado» dibujaba **100 %** en un tributo con cargos y sin un solo pago, porque `saldo_proyectado` no tiene fila ni cuando la obligación está cancelada ni cuando nadie la ha proyectado todavía |
| El índice que le faltaba a `construccion` (#313, V53: 2 pruebas de plan contra PostgreSQL real, como `sgtm_app` y con RLS activa) | Quitando V53 y volviendo a medir con `EXPLAIN` las dos consultas que filtran por ficha: la suma del área construida de una página y el detalle de `construccionesDe` | Rojo las dos, y el plan es literalmente el que #313 describe: `Seq Scan on construccion` con `ficha_id` del lado del `Filter` —coste 2 000,05 y **59 960 filas descartadas para devolver 40**—; con V53, `Index Scan using construccion_ficha_ix`, 153,11 y 10,09. **Lo que la prueba exige no es la palabra «Index»** sino que `ficha_id` sea **condición** del índice: un plan que use el índice solo por `municipalidad_id` vuelve a leer la tabla entera y seguiría diciendo «Index». Es el reverso exacto del hallazgo del `LIKE`: `int8eq` **sí** es *leakproof*, así que bajo RLS PostgreSQL lo evalúa antes de la política y lo empuja al índice —las dos condiciones, la del filtro y la de la **política**, salen juntas en el `Index Cond`—. Y el `INCLUDE (area_construida)` se midió antes de descartarlo: da un `Index Only Scan` (89,11) pero dobla el índice (1 464 → 2 400 kB) en la tabla que más crece del catastro —la ficha nunca se sobrescribe, cada versión copia sus construcciones— y su ventaja se encoge sola con la tabla viva: recién insertadas 30 000 filas ya declara `Heap Fetches: 20` de 60 |
| La lectura compuesta de la conciliación catastro↔rentas (#344, ADR-0015: 31 pruebas, 18 contra PostgreSQL real) | Once roturas, y las que más dicen son tres: derivar el predicado de `ficha_catastral_id` en vez de `predio_id`; conectar el pool como superusuario en vez de `sgtm_app`; y quitarle a `conciliadaConRentas=No` la guarda del permiso de fiscalización | 3, 3 y 2 en rojo. **La primera es la que este issue existe para no repetir**: la DJ con `ficha_catastral_id` **nulo** —la que produce ventanilla antes de que el predio tenga ficha, y **toda** fila anterior a V19— pasa a «no conciliada», que es acusar de omiso a quien declaró. **La segunda enseña lo de siempre**: con el superusuario, la grilla de la municipalidad B muestra las fichas de A, y dos predios con el **mismo** código de referencia catastral en municipalidades distintas devuelven dos filas donde debe haber una. Y las ocho restantes muerden una a una: quitar el cruce con la DJ (8 en rojo: todo sale conciliado), cambiar los estados que cuentan —fuera `OBSERVADA`, dentro `SUSTITUIDA`— (3, y una de ellas es la rectificatoria que **cambió de predio**, que sin el estado correcto deja conciliado el predio que se declaró por error), publicar el número de la DJ y su fecha en la fila (1: la frontera de ADR-0015 §2.2), quitar la fila de `ACCESO` de la bitácora (1 en la web y 2 contra la base), sacar la ruta de `IMPLEMENTADAS` (1) y del contrato (2, las dos direcciones), quitar la excepción nombrada de la regla 10 —que demuestra que la regla **sí** ve ese método— y hacer que `ConsultaController` **ignore** el filtro en vez de redirigir (2): eso último devuelve el listado sin filtrar, que es exactamente el resultado plausible y equivocado por el que existía el 422 |
| El portal del contribuyente, fuera del shell (ADR-0016 §3, #298: 32 pruebas —21 de la pantalla y 11 del escáner— y 2 caminos en Chromium) | Nueve roturas: bajar el presupuesto del portal por debajo de lo medido; importarle el catálogo del back-office, y una dependencia que no es de sus paquetes; un `useMutation`; declararle como lectura una operación `POST` del contrato; quitar del padrón la comprobación de que la fila es la que se pidió; quitar la banda de fecha del resumen; darle banda a «Pagos Realizados»; quitar los avisos de que aquí no se paga; y borrar la opción `portal` del catálogo generado | 1, 1+1, 1, 1, **11**, 1, **2**, 2 y **10** en rojo. **La séptima enseña lo suyo**: la banda de más en los pagos pone en rojo **una prueba en cada aplicación** desde una sola línea de `@sgtm/lectura`, que es exactamente lo que el paquete existe para que pase —dos copias del adaptador habrían dejado al portal fechando hoy un pago de marzo mientras la ficha seguía verde—. **Y la quinta es el defecto que la separación podía introducir**: el proxy no filtra (ADR-0010), así que sin comprobar la fila el portal le enseña a quien teclea su DNI la deuda de la primera persona del padrón. **Lo que no se veía venir lo destapó una mutación del e2e**: `portal-en-movil.spec.ts` comparaba `scrollWidth` con `window.innerWidth`, y bajo emulación móvil Chromium **aleja la página** cuando el contenido desborda —las dos cifras se igualan—; con `min-width: 900px` en la columna la prueba seguía en VERDE, y la sonda devolvió `{sw: 900, iw: 900}`. Ahora se compara con el ancho del **dispositivo** y muerde. El paquete del ciudadano baja de **147,4 KB medidos a 85,1** —los 152 eran el presupuesto, no la medida— y a **80,9** tras la pasada de abajo, presupuestado en 84 |
| El mismo portal, tras la triple validación de #298 (28 pruebas nuevas: 6 de la pantalla, 4 del escáner, 10 de `@sgtm/lectura` y 8 de la caché) | Trece roturas, y las que más dicen son cuatro: dibujar `{anonima}{children}` en la puerta de sesión; devolver `pedirOperacion` al portal; devolver a `nginx.conf` el prefijo `location /assets/` y la exacta `location = /index.html`; y dibujarle al ciudadano la nota del back-office —la que termina en «se ven en «Consulta de deuda»»— | 1, 1, 2 y 2 en rojo. **La primera es la que este repaso existía para encontrar**: la rama anónima de la puerta —la que el portal pasa porque su `redirect_uri` volvería al back-office— **no la probaba nadie**, y con el aviso y la pantalla dibujados a la vez las quince pruebas del archivo seguían en VERDE; la prueba permanente monta con las tres `VITE_SGTM_OIDC_*` puestas y el canje rechazado, y exige el aviso, ningún h1, ningún campo, ningún botón y cero peticiones a `/api/`. **La segunda se mide en el paquete**: `pedirOperacion` resuelve la ruta leyendo el mapa de las 169 operaciones del contrato —84 de escritura—, así que el portal, que es la aplicación destinada a ser pública, llevaba dentro el inventario completo de la API; con la mutación puesta el arranque vuelve de **80,9 KB a 84,9** y `grep` encuentra `/coactiva/prescripcion` en lo que descarga el ciudadano. Ahora declara sus dos rutas y pide con `solicitar()`, y el contrato lo comprueba una prueba —que no viaja al navegador—. **La tercera enseña por qué la comprobación simula nginx en vez de buscar un texto**: con la configuración anterior el archivo ya contenía «immutable» y «no-cache», y lo que le faltaba era alcanzar `/portal/assets/` y `/portal/index.html` —el prefijo no los cubre y la exacta tampoco—, de modo que el paquete del ciudadano se servía **sin ninguna política de caché**; la prueba resuelve la precedencia (exacta, prefijo, regex en orden) y dice qué regla gana en cada ruta. Y las nueve restantes muerden una a una: quitar el `<main>`, comparar el código del padrón con la cadena vacía en vez de con `SIN_DATO` —que era `?contribuyente=—`, una consulta por alguien que no existe—, una entrada de `LECTURAS` con la ruta cambiada (nombrando la ruta) y otra que es un `POST` del contrato (**nombrando el método**, que es lo que arregla poner la aserción del verbo por delante de la lista), un `solicitar('/coactiva/prescripcion')` escrito a mano, un `import` del catálogo metido por `packages/lectura` —que hasta hoy solo cazaba el presupuesto, y por 11 KB de suerte—, un segundo `texto` exportado fuera de `@sgtm/lectura`, renombrar `rUC` en el contrato generado (4 errores de `tsc`, uno de ellos la guarda de vuelta: «'true' no es asignable a 'never'») y bajar el presupuesto por debajo de lo medido |

**Sin Docker en la máquina, la prueba no se salta**: se apunta a un PostgreSQL existente con
`-Dsgtm.pruebas.postgres.url` ([`backend/README.md`](backend/README.md)).
