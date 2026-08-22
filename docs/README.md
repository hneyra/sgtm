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
| [`60-frontend/`](60-frontend/) | Arquitectura, design system, mapa de pantallas y estándares de la interfaz |
| [`80-infraestructura/`](80-infraestructura/) | Topología del despliegue, ambientes y objetivos de recuperación |
| [`A0-calidad/`](A0-calidad/) | Estrategia de pruebas |
| [`D0-desarrollo/`](D0-desarrollo/) | Ambiente local, ejecución, depuración, pruebas y recetario |

## Lectura mínima antes de escribir código

1. [`30-arquitectura/estrategia-multitenant.md`](30-arquitectura/estrategia-multitenant.md) — el riesgo número uno
2. [`40-datos/modelo-logico-fisico.md`](40-datos/modelo-logico-fisico.md) §0 — los dos hallazgos de RLS
3. [`30-arquitectura/estandares-de-codigo-backend.md`](30-arquitectura/estandares-de-codigo-backend.md) — las reglas y cómo se verifican

## Índice

### 00 — Gobierno
- [Visión y alcance](00-gobierno/vision-y-alcance.md) — qué se reimplementa del manual y qué no
- [Decisiones abiertas](00-gobierno/decisiones-abiertas.md) — lo que bloquea, con quién decide
- [Glosario tributario](00-gobierno/glosario-tributario.md) — vocabulario del manual y del dominio
- [Plan de marcha blanca](00-gobierno/plan-de-marcha-blanca.md) — el recorte del predial que se despliega, y en qué orden
- [Plan de desbloqueo de D-02](00-gobierno/plan-de-desbloqueo-D-02.md) — los siete paquetes, y qué se hizo de ellos

### 10 — Negocio
- [Mapa de macroprocesos](10-negocio/mapa-de-macroprocesos.md) — los siete procesos del sistema
- [Marco normativo](10-negocio/marco-normativo.md) — normas citadas, y el mapa de qué dato falta, qué norma lo fija y quién lo espera
- [Catálogo de opciones](10-negocio/catalogo-de-opciones.md) — las 134 opciones ↔ figuras del manual
- [Observaciones del SRTM del MEF](10-negocio/observaciones-srtm-mef/README.md) — la campaña que cierra D-03c: dónde redondea el sistema del MEF
- [Valores normativos transcritos](10-negocio/valores-normativos/README.md) — lo que cierra D-02a, norma a norma, con dos firmas y sin cargar nada

### 20 — Requisitos
- [Requisitos funcionales](20-requisitos/requisitos-funcionales.md) — RF por módulo
- [Requisitos no funcionales](20-requisitos/requisitos-no-funcionales.md) — RNF, incluidos los que el manual promete
- [Actores y permisos](20-requisitos/actores-y-permisos.md) — el modelo de seguridad del manual

### 30 — Arquitectura
- [Contextos acotados](30-arquitectura/contextos-acotados.md) — nueve contextos y sus límites
- [Estrategia multi-tenant](30-arquitectura/estrategia-multitenant.md) — token → `SET LOCAL` → RLS
- [Estándares de código del backend](30-arquitectura/estandares-de-codigo-backend.md) — reglas y su verificación
- [Decisiones de arquitectura (ADR)](30-arquitectura/adr/) — 11 aceptadas

### 40 — Datos
- [Modelo lógico-físico](40-datos/modelo-logico-fisico.md) — el esquema, tabla por tabla
- [Auditoría e histórico](40-datos/auditoria-e-historico.md) — lo que el manual exige y cómo se cumple

### 50 — API
- [`openapi/sgtm-v1.yaml`](50-api/openapi/sgtm-v1.yaml) — contrato derivado del prototipo de interfaz

### 60 — Frontend
- [Arquitectura frontend](60-frontend/arquitectura-frontend.md) — monorepo, paquetes y qué existe hoy
- [Design system](60-frontend/design-system.md) — tokens de Juris PE y componentes por construir
- [Mapa de pantallas](60-frontend/mapa-de-pantallas.md) — las 134 opciones y las diez plantillas
- [Estándares de código del frontend](60-frontend/estandares-de-codigo-frontend.md) — prohibiciones y su verificación

### 80 — Infraestructura
- [INF-01 — Arquitectura de infraestructura](80-infraestructura/arquitectura-de-infraestructura.md) — un VPS, qué cuesta y qué pasa cuando se cae
- [INF-03 — Ambientes](80-infraestructura/ambientes.md) — local, `stg` y `prod`, y dónde se ensaya la restauración
- [INF-06 — Gestión de secretos](80-infraestructura/gestion-de-secretos.md) — de dónde sale cada clave, dónde no está y cómo se rota
- [INF-08 — Respaldo y recuperación](80-infraestructura/respaldo-y-recuperacion.md) — archivado de WAL, PITR y el simulacro que lo demuestra
- [INF-09 — Observabilidad y alertas](80-infraestructura/observabilidad-y-alertas.md) — métricas, tableros y una alerta que le llegue a alguien
- [`infra/README.md`](../infra/README.md) — el árbol de Pulumi, sus invariantes y cómo se demuestra que muerden

### A0 — Calidad
- [Estrategia de pruebas](A0-calidad/estrategia-de-pruebas.md) — qué es bloqueante y por qué

### D0 — Desarrollo
- [Guía del desarrollador](D0-desarrollo/README.md) — índice, y qué comando para qué tarea
- [DEV-01 — Entorno local](D0-desarrollo/entorno-local.md) — qué instalar y las tres formas de trabajar
- [DEV-02 — Ejecutar y depurar](D0-desarrollo/ejecutar-y-depurar.md) — puntos de ruptura, la base, un token
- [DEV-03 — Pruebas](D0-desarrollo/pruebas.md) — cómo correr una sola, y sin Docker
- [DEV-04 — Tareas frecuentes](D0-desarrollo/tareas-frecuentes.md) — migración, contrato, catálogo, PR
- [DEV-05 — Cuando algo no arranca](D0-desarrollo/solucion-de-problemas.md) — los rojos que ya costaron una tarde
