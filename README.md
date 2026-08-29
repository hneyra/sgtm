# SGTM — Sistema de Gestión Tributaria Municipal

Implementación del Sistema Tributario Municipal, como producto
**multi-municipal**: una instalación atiende a muchas municipalidades.

Implementación Cloud-native e IA-native. Aquí el manual es la **especificación funcional**; la
arquitectura se toma de [`../srtm`](../srtm), del que se heredan la estrategia multi-tenant,
los estándares de código y la forma de verificar.

## Qué hay hoy

| | Estado |
|---|---|
| `docs/` | Arquitectura, datos, requisitos y contrato de API |
| `backend/` | Esquema en migraciones Flyway, contexto de tenant, verificaciones bloqueantes **y el negocio de los doce contextos acotados**: caja, cuenta corriente, coactiva, licencias, fiscalización, catastro… |
| `frontend/` | **Las 134 pantallas** del catálogo sobre un renderizador, contra un proxy que simula la API; lo que el backend publica, ya conectado |
| `design/` | Prototipo de la interfaz web (la referencia de diseño de la que se derivó `frontend/`) |
| `infra/` | Pulumi en TypeScript con yarn: los componentes de los dos stacks, verificaciones sin clúster y guiones contra el clúster real |
| `despliegue/` | Entorno local canónico: compose, identidad (Keycloak) e inicialización del motor |
| `scripts/` | Guiones del corpus de valores normativos (archivar fuentes y derivados, importar aranceles) |

Primero las barreras, después el negocio: el aislamiento entre municipalidades es el riesgo
número uno del proyecto, se construyó antes que cualquier caso de uso y sigue bloqueando cada
build (`verificarAislamiento`).

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
yarn verificar                    # contrato, lint, tipos y pruebas
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
