# D0 — Desarrollo

Cómo montar el ambiente local del SGTM, arrancarlo, depurarlo y probarlo. Escrito para quien
acaba de clonar el repositorio y quiere ver algo funcionando **hoy**, no para quien ya sabe dónde
está todo.

> La numeración sigue la del SRTM (`A0-calidad`, `B0-operacion`, `C0-implantacion`), y esta carpeta
> continúa esa serie: `D0-desarrollo`.

| Documento | Para qué |
|---|---|
| [DEV-01 — Entorno local](entorno-local.md) | Qué instalar, cómo levantar el sistema y las **tres formas** de trabajar |
| [DEV-02 — Ejecutar y depurar](ejecutar-y-depurar.md) | Arrancar backend e interfaz, puntos de ruptura, mirar la base, conseguir un token |
| [DEV-03 — Pruebas](pruebas.md) | Qué prueba qué, cómo correr una sola, y cómo probar sin Docker |
| [DEV-04 — Tareas frecuentes](tareas-frecuentes.md) | Recetario: migración nueva, tipos del contrato, catálogo, regla nueva, PR |
| [DEV-05 — Cuando algo no arranca](solucion-de-problemas.md) | Los errores que ya nos costaron una tarde, con su causa |

## Lo mínimo para empezar

```bash
# 1 · Prerrequisitos: JDK 25, Node 22+, yarn y (para las pruebas de persistencia) Docker
java -version && node --version && yarn --version

# 2 · La interfaz, sola, con su proxy de datos. No necesita ni backend ni base
cd frontend && yarn install && yarn dev        # http://localhost:5173

# 3 · El backend, sin Docker, sin base: las verificaciones que no la necesitan
cd backend && ./gradlew verificarArquitectura
```

Con eso ya se ven las 134 pantallas y el sistema de reglas del backend. Lo demás —base de datos,
identidad, token— está en [DEV-01](entorno-local.md).

## Qué comando para qué tarea

| Quiero… | Comando | Dónde |
|---|---|---|
| Ver la interfaz | `yarn dev` | `frontend/` |
| Compilar el backend entero | `./gradlew build` | `backend/` |
| Levantar el sistema completo | `docker compose up --build --wait aplicacion interfaz` | `despliegue/` |
| Arrancar solo el backend | `./gradlew :sgtm-aplicacion:bootRun` | `backend/` |
| Correr **todas** las pruebas de la interfaz | `yarn test` | `frontend/` |
| Correr **una** prueba del backend | `./gradlew :sgtm-catastro:test --tests '*ViaRepository*'` | `backend/` |
| Los seis caminos en un navegador | `yarn e2e` | `frontend/` |
| Arreglar el formato | `./gradlew spotlessApply` · `yarn format` | cada uno |
| Lo que hay que pasar antes de un PR | `./gradlew build verificarAislamiento verificarArquitectura` · `yarn verificar` | ambos |

## Las dos frases que gobiernan todo lo demás

**Ejecutar la prueba vale más que razonar sobre ella**, y **una verificación tiene que demostrarse
capaz de fallar** ([CAL-01 §1](../A0-calidad/estrategia-de-pruebas.md)). Por eso aquí no hay
ningún comando que «debería funcionar»: los de estos documentos se ejecutaron, y donde algo falla
en una máquina concreta se dice en [DEV-05](solucion-de-problemas.md) en vez de omitirlo.

**Una prueba bloqueante no se omite a sí misma.** Sin motor de base de datos las pruebas de
persistencia **fallan**; no se saltan. Si alguna vez encuentras una forma de ponerlas en verde sin
PostgreSQL, has encontrado un defecto, no un atajo.
