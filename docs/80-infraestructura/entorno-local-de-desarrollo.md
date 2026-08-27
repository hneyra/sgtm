# INF-11 — Entorno local de desarrollo

| Campo | Valor |
|---|---|
| Versión | 0.1 |
| Fecha | 2026-08-22 |
| Estado | Borrador |
| Decisión de origen | [`ADR-0011`](../30-arquitectura/adr/ADR-0011-infraestructura-como-codigo.md) §4, issue #158 |

Este documento existe para dejar escrita una frase que ya aparece, dispersa, en cuatro
sitios distintos —`INF-01` §6, `INF-03` §1, `ADR-0011` §4 y `infra/README.md`—, porque el
riesgo concreto es que alguien, al ver `infra/` con Pulumi y dos stacks, asuma que «local»
es un tercer stack o que se está por retirar. **No lo es, y no se retira.**

## 1. Lo local sigue siendo el compose, no Pulumi

| | `local` | `stg` / `prod` |
|---|---|---|
| Descrito por | [`despliegue/compose.yaml`](../../despliegue/compose.yaml) | `infra/index.ts`, Pulumi |
| Orquestador | Docker Compose | k3s |
| Estado que sobrevive a un reinicio | No — `docker compose up` no vuelve solo tras un corte | Sí — es el punto de tener un orquestador |
| Quién lo levanta | Un desarrollador, a mano | `pulumi up`, automático en `stg` y con aprobación en `prod` |
| Costo | Cero | El VPS |

`ADR-0011` §4 lo decide así, y la razón es concreta y no una preferencia: un tercer stack
de Pulumi sobre `k3d` sería **una tercera forma de levantar el sistema que no reemplaza a
ninguna de las dos que ya hay**. El compose sigue siendo lo que un desarrollador levanta
en su máquina, y Pulumi sigue siendo lo único con lo que se puede reconstruir un VPS
perdido — mezclarlos no simplifica ninguno de los dos problemas, complica los dos.

## 2. El comando

El comando completo, con cada pieza explicada, vive en un solo sitio y este documento no
lo repite: [`despliegue/README.md`](../../despliegue/README.md). Resumido:

```bash
cd despliegue
cp .env.ejemplo .env          # y poner claves generadas, una distinta por rol
docker compose up --build --wait aplicacion interfaz
./identidad/crear-usuario.sh jperez 'una-clave' 1     # usuario de la municipalidad 1
```

Para trabajar sin levantar Keycloak ni backend —solo la interfaz contra el proxy de
datos—, o para levantar la interfaz junto a un backend real sin la instalación completa,
las otras dos formas y el detalle de puertos y variables están en
[`DEV-01 — Entorno local`](../D0-desarrollo/entorno-local.md), que es la guía para quien
va a escribir código. **Este documento es la afirmación arquitectónica de que ese camino
existe y sigue vigente**; DEV-01 es el cómo, día a día.

## 3. Que el comando funciona tal como está escrito, no es una afirmación sin comprobar

Es el criterio de aceptación del issue #158, y la forma de cumplirlo no es correrlo una
vez a mano y confiar en que siga funcionando: `.github/workflows/despliegue.yml` **lo
ejecuta en cada PR**, con nueve comprobaciones contra el sistema que ese comando levanta
—no contra el archivo `compose.yaml` revisado a ojo, contra el sistema en marcha—:

| # | Qué pregunta |
|---|---|
| 1 | ¿Se aplicaron todas las migraciones del repositorio? |
| 2 | ¿Responde la sonda de vida, sin publicar detalles? |
| 3–4 | La escalera de identidad completa, peldaño a peldaño (§4 abajo) |
| 5 | ¿Se atiende alguna ruta que no debería? |
| 6 | ¿Se sirve la interfaz, con el emisor de identidad ya incrustado? |
| 7 | ¿Puede la aplicación ejecutar DDL? (Tiene que fallar: `sgtm_app` no tiene DDL) |
| 8 | Sin `SGTM_OIDC_EMISOR`, ¿arranca? (Tiene que negarse) |
| 9 | ¿Se levanta marcada como instalación de demostración? |

Un compose que se ve correcto en el diff y falla el día que alguien lo necesita es
exactamente el defecto que este flujo existe para no dejar pasar
(`despliegue.yml`, comentario de cabecera). Las nueve tienen su propia forma de
demostrarse en rojo, documentada en [`despliegue/README.md`](../../despliegue/README.md)
§«Cómo se verifica».

**Lo que esto no cubre:** que el comando funcione en la máquina de un desarrollador
concreto, con su versión de Docker y su sistema operativo. Eso es lo que
[`DEV-01`](../D0-desarrollo/entorno-local.md) declara verificado —hoy, en macOS con
Docker— y lo que cada quien confirma la primera vez que lo corre. CI verifica que el
**comando** es correcto; no puede verificar cada entorno donde alguien lo va a ejecutar.

## 4. Qué no es local

Ni Keycloak en modo `start` (usa `start-dev`, adrede — un realm de desarrollo no necesita
la base propia que `prod` exige), ni TLS, ni respaldo programado, ni políticas de red:
`despliegue/README.md` lo dice sin adornarlo, en su propia sección «Lo que todavía no
hay»: **esto no es una instalación de producción**. Confundir «el compose arranca» con
«el sistema está listo para una municipalidad real» es la misma confusión que `ADR-0011`
ya nombra al descartar «dejar el compose y ponerle un proxy con TLS delante» como
alternativa a construir `infra/`.

## 5. Documentos relacionados

[`ADR-0011`](../30-arquitectura/adr/ADR-0011-infraestructura-como-codigo.md) §4 ·
[`INF-01`](arquitectura-de-infraestructura.md) §6 ·
[`INF-03`](ambientes.md) §1 ·
[`DEV-01 — Entorno local`](../D0-desarrollo/entorno-local.md) ·
[`despliegue/README.md`](../../despliegue/README.md) ·
[`.github/workflows/despliegue.yml`](../../.github/workflows/despliegue.yml)
