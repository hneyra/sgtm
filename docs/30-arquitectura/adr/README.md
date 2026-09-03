# Decisiones de arquitectura (ADR)

Un ADR registra una decisión con su contexto y sus consecuencias. **No se editan una vez
aceptados**: si una decisión cambia, se escribe otro ADR que declare obsoleto al anterior. El
historial de por qué se hizo algo vale más que la coherencia del documento.

> ## Los ADR se repartieron. Esta copia es el archivo historico.
>
> Los 32 viven ahora en el repositorio de **quien toma la decision** (GOB-05 §4). Los archivos
> de aqui **no se han tocado** —siguen siendo los originales, con su `git log`— pero **no son
> la copia viva**: editar uno de estos no cambia nada. La columna «Vive en» dice a donde ir.
>
> Dos se quedan aqui con contenido, y por el mismo motivo: **`docs/60-frontend/` no se ha
> portado todavia**, asi que la decision de la interfaz sigue viviendo donde vive su codigo.
> `ADR-0009` (React con Vite) y `ADR-0010` (el catalogo portado y el proxy) se mudaran con
> ella.
>
> **`ADR-0003` no esta marcado Obsoleto, y no es un olvido.** Los ADR 0024-0032 estan en
> **Propuesto**: mientras la direccion no los acepte, el monolito modular sigue siendo la
> arquitectura vigente, y es la de `rentas` en la primera etapa —los doce contextos dentro—.
> Cuando ADR-0029 y ADR-0030 pasen a Aceptado, ahi si.

| # | Decisión | Estado | Vive en |
|---|---|---|---|
| [0001](ADR-0001-plataforma-backend.md) | Plataforma del backend: Spring Boot 4 sobre Java 25 | Aceptado | [`infrastructure`](https://github.com/hneyra/infrastructure/blob/main/docs/30-arquitectura/adr/ADR-0001-plataforma-backend.md) |
| [0002](ADR-0002-estrategia-multi-tenant.md) | Esquema compartido con Row Level Security | Aceptado | [`infrastructure`](https://github.com/hneyra/infrastructure/blob/main/docs/30-arquitectura/adr/ADR-0002-estrategia-multi-tenant.md) |
| [0003](ADR-0003-monolito-modular.md) | Monolito modular con Spring Modulith | Aceptado | [`rentas`](https://github.com/hneyra/rentas/blob/main/docs/30-arquitectura/adr/ADR-0003-monolito-modular.md) |
| [0004](ADR-0004-almacenamiento-de-datos.md) | PostgreSQL, con particionado por ejercicio | Aceptado | [`infrastructure`](https://github.com/hneyra/infrastructure/blob/main/docs/30-arquitectura/adr/ADR-0004-almacenamiento-de-datos.md) |
| [0005](ADR-0005-identidad-y-acceso.md) | OIDC para autenticar; el modelo de permisos del manual para autorizar | Aceptado | [`infrastructure`](https://github.com/hneyra/infrastructure/blob/main/docs/30-arquitectura/adr/ADR-0005-identidad-y-acceso.md) |
| [0006](ADR-0006-cuenta-corriente-libro-de-asientos.md) | La cuenta corriente es un libro de asientos inmutable | Aceptado | [`rentas`](https://github.com/hneyra/rentas/blob/main/docs/30-arquitectura/adr/ADR-0006-cuenta-corriente-libro-de-asientos.md) |
| [0007](ADR-0007-parametros-versionados.md) | Parámetros tributarios versionados y sellados por ejercicio | Aceptado | [`normativa`](https://github.com/hneyra/normativa/blob/main/docs/30-arquitectura/adr/ADR-0007-parametros-versionados.md) |
| [0008](ADR-0008-auditoria-heredada-del-manual.md) | Auditoría con observación obligatoria, como en el sistema original | Aceptado | [`infrastructure`](https://github.com/hneyra/infrastructure/blob/main/docs/30-arquitectura/adr/ADR-0008-auditoria-heredada-del-manual.md) |
| [0009](ADR-0009-plataforma-frontend.md) | React con Vite y yarn workspaces, una sola aplicación por ahora | Aceptado | **se queda aqui** |
| [0010](ADR-0010-catalogo-portado-y-proxy-de-datos.md) | El catálogo se porta como estructura y los datos llegan por HTTP desde un proxy simulado | Aceptado | **se queda aqui** |
| [0011](ADR-0011-infraestructura-como-codigo.md) | Pulumi en TypeScript con yarn, sobre un k3s de un solo nodo | Aceptado | [`infrastructure`](https://github.com/hneyra/infrastructure/blob/main/docs/30-arquitectura/adr/ADR-0011-infraestructura-como-codigo.md) |
| [0012](ADR-0012-usuarios-y-grupos-declarativos.md) | Usuarios y grupos de Keycloak declarativos, sin clave en git | Aceptado | [`infrastructure`](https://github.com/hneyra/infrastructure/blob/main/docs/30-arquitectura/adr/ADR-0012-usuarios-y-grupos-declarativos.md) |
| [0013](ADR-0013-permisos-de-la-sesion.md) | La interfaz aprende sus permisos del backend, no del token | Aceptado | [`rentas`](https://github.com/hneyra/rentas/blob/main/docs/30-arquitectura/adr/ADR-0013-permisos-de-la-sesion.md) |
| [0014](ADR-0014-navegacion-centrada-en-la-atencion.md) | Navegación centrada en la atención: la persona como inicio, los módulos detrás de un lanzador | Aceptado | [`rentas`](https://github.com/hneyra/rentas/blob/main/docs/30-arquitectura/adr/ADR-0014-navegacion-centrada-en-la-atencion.md) |
| [0015](ADR-0015-conciliacion-catastro-rentas.md) | La conciliación catastro↔rentas: un derivado que publica rentas, no un estado que guarda catastro | Aceptado · 2026-08-28 | [`rentas`](https://github.com/hneyra/rentas/blob/main/docs/30-arquitectura/adr/ADR-0015-conciliacion-catastro-rentas.md) |
| [0016](ADR-0016-el-inicio-pregunta-la-ficha-compone.md) | El inicio pregunta y la ficha compone: las fases 3–5 de ADR-0014, sin el agregador que no hacía falta | Aceptado · 2026-08-28 | [`rentas`](https://github.com/hneyra/rentas/blob/main/docs/30-arquitectura/adr/ADR-0016-el-inicio-pregunta-la-ficha-compone.md) |
| [0017](ADR-0017-tablas-de-valuacion-nacionales.md) | Las tres tablas de valuación son nacionales | Aceptado | [`normativa`](https://github.com/hneyra/normativa/blob/main/docs/30-arquitectura/adr/ADR-0017-tablas-de-valuacion-nacionales.md) |
| [0018](ADR-0018-el-redondeo-decidido.md) | El redondeo, decidido: escala ratificada, `HALF_UP`, y ningún SRTM que imitar | Aceptado | [`normativa`](https://github.com/hneyra/normativa/blob/main/docs/30-arquitectura/adr/ADR-0018-el-redondeo-decidido.md) |
| [0019](ADR-0019-titularidad-parcial.md) | La porción sin titular identificado no se determina a nadie | Aceptado | [`rentas`](https://github.com/hneyra/rentas/blob/main/docs/30-arquitectura/adr/ADR-0019-titularidad-parcial.md) |
| [0020](ADR-0020-la-sesion-del-ciudadano.md) | El ciudadano tiene sesión propia, y su consulta recorre el registro de municipalidades | Aceptada | [`rentas`](https://github.com/hneyra/rentas/blob/main/docs/30-arquitectura/adr/ADR-0020-la-sesion-del-ciudadano.md) |
| [0021](ADR-0021-la-geometria-del-predio.md) | La base modela la geometría del predio | Aceptado | [`catastro`](https://github.com/hneyra/catastro/blob/main/docs/30-arquitectura/adr/ADR-0021-la-geometria-del-predio.md) |
| [0022](ADR-0022-el-visor-del-plano-catastral.md) | El visor del plano catastral | Aceptado | [`catastro`](https://github.com/hneyra/catastro/blob/main/docs/30-arquitectura/adr/ADR-0022-el-visor-del-plano-catastral.md) |
| [0023](ADR-0023-la-muestra-se-sortea.md) | La muestra de fiscalización se sortea; la detección aporta sus filtros | Aceptado | [`rentas`](https://github.com/hneyra/rentas/blob/main/docs/30-arquitectura/adr/ADR-0023-la-muestra-se-sortea.md) |
| [0024](ADR-0024-la-frontera-del-calculo.md) | La frontera del calculo: catastro valoriza el predio, rentas determina la obligación | Propuesto | [`rentas`](https://github.com/hneyra/rentas/blob/main/docs/30-arquitectura/adr/ADR-0024-la-frontera-del-calculo.md) |
| [0025](ADR-0025-normativa-servicio-y-libreria.md) | La normativa es un servicio de datos y una libreria de reglas, y no está en el camino caliente | Propuesto | [`normativa`](https://github.com/hneyra/normativa/blob/main/docs/30-arquitectura/adr/ADR-0025-normativa-servicio-y-libreria.md) |
| [0026](ADR-0026-el-camino-del-dinero.md) | El camino del dinero: dos transacciones, un outbox, y la imputación en rentas | Propuesto | [`rentas`](https://github.com/hneyra/rentas/blob/main/docs/30-arquitectura/adr/ADR-0026-el-camino-del-dinero.md) |
| [0027](ADR-0027-la-valuacion-es-un-hecho-sellado.md) | La valuación es un hecho sellado del ejercicio, no un estado del predio | Propuesto | [`catastro`](https://github.com/hneyra/catastro/blob/main/docs/30-arquitectura/adr/ADR-0027-la-valuacion-es-un-hecho-sellado.md) |
| [0028](ADR-0028-el-tenant-no-cruza-por-http.md) | El contexto de municipalidad no cruza por HTTP: token delegado, jamás una cabecera | Propuesto | [`infrastructure`](https://github.com/hneyra/infrastructure/blob/main/docs/30-arquitectura/adr/ADR-0028-el-tenant-no-cruza-por-http.md) |
| [0029](ADR-0029-cuatro-sistemas-separados.md) | Cuatro sistemas separados: `catastro`, `rentas`, `normativa` y `caja` | Propuesto | [`infrastructure`](https://github.com/hneyra/infrastructure/blob/main/docs/30-arquitectura/adr/ADR-0029-cuatro-sistemas-separados.md) |
| [0030](ADR-0030-cuatro-interfaces-una-sesion.md) | Cuatro interfaces, una sesión, y las librerias comunes que impiden que sean cuatro productos | Propuesto | [`infrastructure`](https://github.com/hneyra/infrastructure/blob/main/docs/30-arquitectura/adr/ADR-0030-cuatro-interfaces-una-sesion.md) |
| [0031](ADR-0031-infraestructura-comun-y-propia.md) | La infraestructura: un repositorio común y una carpeta por sistema | Propuesto | [`infrastructure`](https://github.com/hneyra/infrastructure/blob/main/docs/30-arquitectura/adr/ADR-0031-infraestructura-comun-y-propia.md) |
| [0032](ADR-0032-el-esquema-nace-en-baseline.md) | El esquema de cada sistema nace en un baseline; la historia se queda en `sgtm` | Propuesto | [`infrastructure`](https://github.com/hneyra/infrastructure/blob/main/docs/30-arquitectura/adr/ADR-0032-el-esquema-nace-en-baseline.md) |

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
