# SGTM — Sistema de Gestión Tributaria Municipal

Reimplementación del sistema tributario municipal documentado en el manual de usuario del SGTM
de la Municipalidad Provincial de Sullana (231 figuras, 12 módulos, 134 opciones), como producto
**multi-municipal**: una instalación atiende a muchas municipalidades.

El original es una aplicación de escritorio —Visual Basic .NET, SQL Server 2008, cliente
Windows— descrita en el manual. Aquí el manual es la **especificación funcional**; la
arquitectura se toma de [`../srtm`](../srtm), del que se heredan la estrategia multi-tenant,
los estándares de código y la forma de verificar.

## Qué hay hoy

| | Estado |
|---|---|
| `docs/` | Arquitectura, datos, requisitos y contrato de API |
| `backend/` | Esqueleto Gradle, esquema en migraciones Flyway, contexto de tenant y verificaciones bloqueantes. **Sin funcionalidad de negocio** |
| `frontend/` | Espacio de trabajo montado: workspaces, paquetes compartidos y reglas verificadas. **Sin interfaz todavía** |
| `design/` | Prototipo de la interfaz web (referencia de diseño; la implementación es la siguiente iteración) |
| `infra/` | Pulumi en TypeScript con yarn: configuración validada de los dos stacks. **Sin componentes todavía** |

Primero las barreras, después el negocio: el aislamiento entre municipalidades es el riesgo
número uno del proyecto y se construye antes que cualquier caso de uso.

## Arrancar

```bash
cd backend
./gradlew build                   # compila y pasa formato, estilo y nulidad
./gradlew verificarArquitectura   # ArchUnit, escáner de fuentes y Spring Modulith
./gradlew verificarAislamiento    # aislamiento multi-tenant — requiere Docker
```

Requisitos: JDK 25 y, para las pruebas de persistencia, Docker.
Sin motor de base de datos esas pruebas **fallan**, no se omiten.

```bash
cd frontend
yarn install
yarn verificar                    # lint, tipos y pruebas
yarn dev                          # http://localhost:5173
```

Requisitos: Node 22 o superior.

## Por dónde entrar

- [`docs/D0-desarrollo/`](docs/D0-desarrollo/README.md) — **montar el ambiente local, arrancarlo, depurarlo y probarlo**
- [`CLAUDE.md`](CLAUDE.md) — contexto del proyecto y reglas que no se negocian
- [`docs/README.md`](docs/README.md) — índice documental
- [`docs/30-arquitectura/estrategia-multitenant.md`](docs/30-arquitectura/estrategia-multitenant.md) — lo primero que hay que leer
- [`backend/README.md`](backend/README.md) — convenciones del build y qué falta
- [`frontend/README.md`](frontend/README.md) — espacio de trabajo de la interfaz y qué falta
- [`infra/README.md`](infra/README.md) — la infraestructura como código, y qué falta para desplegarla
