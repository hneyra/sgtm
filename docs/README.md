# Documentación del SGTM

Fuente de verdad del diseño. Si el código y un documento discrepan, **manda el código y el
documento se corrige en el mismo PR**; salvo en el modelo de datos, donde mandan las migraciones
de Flyway y el documento es la explicación.

La numeración de carpetas es la del SRTM, para que quien conozca ese repositorio encuentre las
cosas donde espera.

| Carpeta | Contenido |
|---|---|
| [`00-gobierno/`](00-gobierno/) | Visión, alcance, decisiones abiertas y glosario |
| [`10-negocio/`](10-negocio/) | Macroprocesos del manual, marco normativo y catálogo de opciones |
| [`20-requisitos/`](20-requisitos/) | Requisitos funcionales y no funcionales, actores y permisos |
| [`30-arquitectura/`](30-arquitectura/) | Contextos acotados, multi-tenancy, estándares y ADR |
| [`40-datos/`](40-datos/) | Modelo lógico-físico y auditoría |
| [`50-api/`](50-api/) | Contrato OpenAPI |
| [`A0-calidad/`](A0-calidad/) | Estrategia de pruebas |

## Lectura mínima antes de escribir código

1. [`30-arquitectura/estrategia-multitenant.md`](30-arquitectura/estrategia-multitenant.md) — el riesgo número uno
2. [`40-datos/modelo-logico-fisico.md`](40-datos/modelo-logico-fisico.md) §0 — los dos hallazgos de RLS
3. [`30-arquitectura/estandares-de-codigo-backend.md`](30-arquitectura/estandares-de-codigo-backend.md) — las reglas y cómo se verifican

## Índice

### 00 — Gobierno
- [Visión y alcance](00-gobierno/vision-y-alcance.md) — qué se reimplementa del manual y qué no
- [Decisiones abiertas](00-gobierno/decisiones-abiertas.md) — lo que bloquea, con quién decide
- [Glosario tributario](00-gobierno/glosario-tributario.md) — vocabulario del manual y del dominio

### 10 — Negocio
- [Mapa de macroprocesos](10-negocio/mapa-de-macroprocesos.md) — los siete procesos del sistema
- [Marco normativo](10-negocio/marco-normativo.md) — normas citadas y datos por verificar
- [Catálogo de opciones](10-negocio/catalogo-de-opciones.md) — las 134 opciones ↔ figuras del manual

### 20 — Requisitos
- [Requisitos funcionales](20-requisitos/requisitos-funcionales.md) — RF por módulo
- [Requisitos no funcionales](20-requisitos/requisitos-no-funcionales.md) — RNF, incluidos los que el manual promete
- [Actores y permisos](20-requisitos/actores-y-permisos.md) — el modelo de seguridad del manual

### 30 — Arquitectura
- [Contextos acotados](30-arquitectura/contextos-acotados.md) — nueve contextos y sus límites
- [Estrategia multi-tenant](30-arquitectura/estrategia-multitenant.md) — token → `SET LOCAL` → RLS
- [Estándares de código del backend](30-arquitectura/estandares-de-codigo-backend.md) — reglas y su verificación
- [Decisiones de arquitectura (ADR)](30-arquitectura/adr/) — 8 aceptadas

### 40 — Datos
- [Modelo lógico-físico](40-datos/modelo-logico-fisico.md) — el esquema, tabla por tabla
- [Auditoría e histórico](40-datos/auditoria-e-historico.md) — lo que el manual exige y cómo se cumple

### 50 — API
- [`openapi/sgtm-v1.yaml`](50-api/openapi/sgtm-v1.yaml) — contrato derivado del prototipo de interfaz

### A0 — Calidad
- [Estrategia de pruebas](A0-calidad/estrategia-de-pruebas.md) — qué es bloqueante y por qué
