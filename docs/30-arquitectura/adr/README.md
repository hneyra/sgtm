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
