# Documentación del SGTM

Fuente de verdad del diseño. Si el código y un documento discrepan, **manda el código y el
documento se corrige en el mismo PR**; salvo en el modelo de datos, donde mandan las migraciones
de Flyway y el documento es la explicación.

La numeración de carpetas es la del SRTM, para que quien conozca ese repositorio encuentre las
cosas donde espera. **La numeración de documentos, en cambio, es propia de cada repositorio y
colisiona a propósito de no leerse con cuidado**: un identificador citado sin más se lee local, y
los del repo hermano se citan con su repo — «NEG-05 de `../srtm`». Los que este repositorio cita
del SRTM y aquí no existen (o nombran otro documento) son: **NEG-05** (reglas del predial),
**ARQ-08** (multi-tenant detallado), **ARQ-09** (motor de reglas), **DAT-02** (allí, el modelo
lógico-físico; aquí, auditoría), **CAL-02** (la etapa de contraste numérico contra el SRTM del
MEF, aún planeada allí) y los **RNF** menores de 030 (p. ej. RNF-020, latencia de consulta).

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
| [`B0-operacion/`](B0-operacion/) | Runbooks: qué hacer cuando algo del VPS falla |
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
- [Observaciones del SRTM del MEF](10-negocio/observaciones-srtm-mef/README.md) — dónde redondea el sistema del MEF: la campaña que exigirá la primera migración (ADR-0018)
- [Valores normativos transcritos](10-negocio/valores-normativos/README.md) — lo que cierra D-02a, norma a norma, con dos firmas y sin cargar nada
- Los verificadores del corpus — `10-negocio/verificar-*.mjs` y `generar-catalogo.mjs`: no son documentación sino comprobaciones que corren en CI y se ponen rojas

### 20 — Requisitos
- [Requisitos funcionales](20-requisitos/requisitos-funcionales.md) — RF por módulo
- [Requisitos no funcionales](20-requisitos/requisitos-no-funcionales.md) — RNF, incluidos los que el manual promete
- [Actores y permisos](20-requisitos/actores-y-permisos.md) — el modelo de seguridad del manual

### 30 — Arquitectura
- [Contextos acotados](30-arquitectura/contextos-acotados.md) — doce contextos y sus límites
- [Estrategia multi-tenant](30-arquitectura/estrategia-multitenant.md) — token → `SET LOCAL` → RLS
- [Estándares de código del backend](30-arquitectura/estandares-de-codigo-backend.md) — reglas y su verificación
- [Decisiones de arquitectura (ADR)](30-arquitectura/adr/) — el índice de decisiones, con su estado

### 40 — Datos
- [Modelo lógico-físico](40-datos/modelo-logico-fisico.md) — el esquema, tabla por tabla
- [Auditoría e histórico](40-datos/auditoria-e-historico.md) — lo que el manual exige y cómo se cumple

### 50 — API
- [`openapi/sgtm-v1.yaml`](50-api/openapi/sgtm-v1.yaml) — contrato derivado del prototipo de interfaz
- [`generar-openapi.mjs`](50-api/generar-openapi.mjs) — lo deriva, y `--comprobar` exige en CI que
  el archivo comprometido siga siendo lo que produce (#312)

### 60 — Frontend
- [Arquitectura frontend](60-frontend/arquitectura-frontend.md) — monorepo, paquetes y qué existe hoy
- [Design system](60-frontend/design-system.md) — tokens de Juris PE y componentes por construir
- [Mapa de pantallas](60-frontend/mapa-de-pantallas.md) — las 134 opciones y las diez plantillas
- [Estándares de código del frontend](60-frontend/estandares-de-codigo-frontend.md) — prohibiciones y su verificación
- [FRO-05 — Superficies unificadas](60-frontend/superficies-unificadas.md) — cómo se unifica un módulo cuyas opciones hablan del mismo objeto, y cómo se demuestra que no se perdió nada
- [FRO-06 — Las hojas sin superficie](60-frontend/hojas-sin-superficie.md) — qué se hace con la opción que el manual capturó como el papel que sale y cuyo endpoint dicta el acto

### 80 — Infraestructura
- [INF-01 — Arquitectura de infraestructura](80-infraestructura/arquitectura-de-infraestructura.md) — un VPS, qué cuesta y qué pasa cuando se cae
- [INF-03 — Ambientes](80-infraestructura/ambientes.md) — local, `stg` y `prod`, y dónde se ensaya la restauración
- [INF-06 — Gestión de secretos](80-infraestructura/gestion-de-secretos.md) — de dónde sale cada clave, dónde no está y cómo se rota
- [INF-08 — Respaldo y recuperación](80-infraestructura/respaldo-y-recuperacion.md) — archivado de WAL, PITR y el simulacro que lo demuestra
- [INF-09 — Observabilidad y alertas](80-infraestructura/observabilidad-y-alertas.md) — métricas, tableros y una alerta que le llegue a alguien
- [INF-10 — Endurecimiento del clúster](80-infraestructura/endurecimiento-del-cluster.md) — denegación por omisión en la red, sin root, y la reserva del nodo
- [INF-11 — Entorno local de desarrollo](80-infraestructura/entorno-local-de-desarrollo.md) — por qué local sigue siendo el compose y no Pulumi
- [`infra/README.md`](../infra/README.md) — el árbol de Pulumi, sus invariantes y cómo se demuestra que muerden

### A0 — Calidad
- [Estrategia de pruebas](A0-calidad/estrategia-de-pruebas.md) — qué es bloqueante y por qué

### B0 — Operación
- [Runbooks](B0-operacion/runbooks/) — los diez procedimientos (los escenarios de falla, en INF-01 §5), con la misma estructura

### Fuera de `docs/`
- [`../despliegue/README.md`](../despliegue/README.md) — el entorno local canónico: compose, identidad e inicialización del motor (INF-11)

### D0 — Desarrollo
- [Guía del desarrollador](D0-desarrollo/README.md) — índice, y qué comando para qué tarea
- [DEV-01 — Entorno local](D0-desarrollo/entorno-local.md) — qué instalar y las tres formas de trabajar
- [DEV-02 — Ejecutar y depurar](D0-desarrollo/ejecutar-y-depurar.md) — puntos de ruptura, la base, un token
- [DEV-03 — Pruebas](D0-desarrollo/pruebas.md) — cómo correr una sola, y sin Docker
- [DEV-04 — Tareas frecuentes](D0-desarrollo/tareas-frecuentes.md) — migración, contrato, catálogo, PR
- [DEV-05 — Cuando algo no arranca](D0-desarrollo/solucion-de-problemas.md) — los rojos que ya costaron una tarde
