# Decisiones de arquitectura (ADR)

Un ADR registra una decisión con su contexto y sus consecuencias. **No se editan una vez
aceptados**: si una decisión cambia, se escribe otro ADR que declare obsoleto al anterior. El
historial de por qué se hizo algo vale más que la coherencia del documento.

| # | Decisión | Estado |
|---|---|---|
| [0001](ADR-0001-plataforma-backend.md) | Plataforma del backend: Spring Boot 4 sobre Java 25 | Aceptado |
| [0002](ADR-0002-estrategia-multi-tenant.md) | Esquema compartido con Row Level Security | Aceptado |
| [0003](ADR-0003-monolito-modular.md) | Monolito modular con Spring Modulith | Aceptado |
| [0004](ADR-0004-almacenamiento-de-datos.md) | PostgreSQL, con particionado por ejercicio | Aceptado |
| [0005](ADR-0005-identidad-y-acceso.md) | OIDC para autenticar; el modelo de permisos del manual para autorizar | Aceptado |
| [0006](ADR-0006-cuenta-corriente-libro-de-asientos.md) | La cuenta corriente es un libro de asientos inmutable | Aceptado |
| [0007](ADR-0007-parametros-versionados.md) | Parámetros tributarios versionados y sellados por ejercicio | Aceptado |
| [0008](ADR-0008-auditoria-heredada-del-manual.md) | Auditoría con observación obligatoria, como en el sistema original | Aceptado |
| [0009](ADR-0009-plataforma-frontend.md) | React con Vite y yarn workspaces, una sola aplicación por ahora | Aceptado |
| [0010](ADR-0010-catalogo-portado-y-proxy-de-datos.md) | El catálogo se porta como estructura; los datos llegan por HTTP desde un proxy simulado | Aceptado |
| [0011](ADR-0011-infraestructura-como-codigo.md) | Pulumi en TypeScript con yarn, sobre un k3s de un solo nodo en un VPS propio | Aceptado |
| [0012](ADR-0012-usuarios-y-grupos-declarativos.md) | Usuarios y grupos de Keycloak declarativos, sin clave en git; la fija el usuario por correo en su primer acceso | Aceptado |
| [0013](ADR-0013-permisos-de-la-sesion.md) | La interfaz pide sus permisos efectivos a `GET /seguridad/sesion/permisos`, no a un claim del token | Aceptado |
| [0014](ADR-0014-navegacion-centrada-en-la-atencion.md) | La atención al contribuyente como inicio; los módulos detrás de un lanzador, reagrupados por tarea | Aceptado |
| [0015](ADR-0015-conciliacion-catastro-rentas.md) | La conciliación catastro↔rentas: un derivado que publica rentas, no un estado que guarda catastro | Aceptado |
| [0016](ADR-0016-el-inicio-pregunta-la-ficha-compone.md) | El inicio busca con un abanico de lecturas por permiso; la ficha 360° compone opciones publicadas; el portal se separa | Aceptado |
| [0017](ADR-0017-tablas-de-valuacion-nacionales.md) | Las tres tablas de valuación son catálogos nacionales: `municipalidad_id` nulo, cargadas una vez para todas; el arancel sigue siendo municipal | Aceptado |
| [0018](ADR-0018-el-redondeo-decidido.md) | El redondeo, decidido: escala de cálculo ratificada y `HALF_UP` cuando la norma no ordene otra cosa; cierra D-03a/b/c | Aceptado |
| [0019](ADR-0019-titularidad-parcial.md) | La porción de un predio sin titular identificado no se determina a nadie: no se le inventa un deudor | Aceptado |
| [0020](ADR-0020-la-sesion-del-ciudadano.md) | El ciudadano tiene sesión propia —realm y emisor distintos— y su consulta recorre el registro de municipalidades, una a la vez | Aceptado |
| [0021](ADR-0021-la-geometria-del-predio.md) | La base modela la geometría del predio, en `geography(MultiPolygon, 4326)` porque una instalación atiende zonas UTM distintas — y esa geometría **no** valoriza | Aceptado |
| [0022](ADR-0022-el-visor-del-plano-catastral.md) | El visor del plano: el polígono entero en 4326, acotado por marco y **negándose** antes que recortarse; los predios sin geometría se cuentan, y de las cinco capas del diseño sólo los lotes tienen con qué dibujarse | Aceptado |
| [0023](ADR-0023-la-muestra-se-sortea.md) | La muestra de fiscalización se **sortea** a partir de los parámetros del programa; «Omisos y subvaluadores» aporta sus **filtros**, no una lista de predios — y la esquela no existe | Aceptado |
| [0024](ADR-0024-la-frontera-del-calculo.md) | La frontera del cálculo: catastro valoriza el predio, rentas determina la obligación; cada regla declara su ámbito | Propuesto |
| [0025](ADR-0025-normativa-servicio-y-libreria.md) | La normativa es un servicio de datos y una librería de reglas, y **no** está en el camino caliente del cálculo | Propuesto |
| [0026](ADR-0026-el-camino-del-dinero.md) | El camino del dinero: dos transacciones, un outbox, y la imputación en rentas — con conciliación diaria a cero | Propuesto |
| [0027](ADR-0027-la-valuacion-es-un-hecho-sellado.md) | La valuación es un hecho sellado del ejercicio, con la identidad de todos sus insumos, no un estado del predio | Propuesto |
| [0028](ADR-0028-el-tenant-no-cruza-por-http.md) | El contexto de municipalidad no cruza por HTTP: token delegado, jamás una cabecera | Propuesto |
| [0029](ADR-0029-cuatro-sistemas-separados.md) | Cuatro sistemas separados: `catastro`, `rentas`, `normativa` y `caja`. **Reemplazaría a ADR-0003** | Propuesto |
| [0030](ADR-0030-cuatro-interfaces-una-sesion.md) | Cuatro interfaces, una sesión, y las librerías comunes. **Reemplazaría a ADR-0009** en «una sola aplicación por ahora» | Propuesto |
| [0031](ADR-0031-infraestructura-comun-y-propia.md) | La infraestructura: un repositorio `infrastructure` con la plataforma y las convenciones, y una carpeta `infrastructure/` por sistema. **Extiende ADR-0011**, que no se reemplaza | Propuesto |
| [0032](ADR-0032-el-esquema-nace-en-baseline.md) | El esquema de cada sistema nace en un `V1__baseline.sql`; la historia `V1..V78` se queda en `sgtm`. **Flyway se conserva**, y el motivo no es la migración de datos | Propuesto |

> **Los nueve `Propuesto` (0024–0032) son un bloque**: describen la separación del SGTM en cuatro
> sistemas y se aceptan o se rechazan juntos. Mientras estén en `Propuesto`, **ADR-0003 y ADR-0009
> siguen vigentes** y el sistema sigue siendo un monolito modular con una sola interfaz y su `infra/` dentro. El
> documento que los compone y explica el orden de extracción está fuera del repositorio.

Decisiones **pendientes**: [GOB-02](../../00-gobierno/decisiones-abiertas.md).

## Plantilla

```markdown
# ADR-000X — Título

**Estado:** Propuesto | Aceptado | Obsoleto (reemplazado por ADR-000Y)
**Fecha:** AAAA-MM-DD

## Contexto
## Decisión
## Consecuencias
## Alternativas consideradas
```

El estado también puede ir como fila de una tabla de metadatos (`| Estado | Aceptado |`), que es
la forma de ADR-0017 en adelante; lo que no cambia es el vocabulario: **Propuesto**, **Aceptado**
u **Obsoleto**, siempre con esa letra.
