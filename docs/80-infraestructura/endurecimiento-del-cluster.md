# INF-10 — Endurecimiento del clúster

| Campo | Valor |
|---|---|
| Versión | 0.1 |
| Fecha | 2026-08-22 |
| Estado | Borrador |
| Decisión de origen | issue #157 |
| Depende de | #152 — la aplicación desplegada. #153 — el ingreso con TLS |

*«Que un fallo en una pieza no se lleve el nodo entero por delante, y que un compromiso de la
aplicación no permita salir con el padrón.»*

## 1. Denegación por omisión en la red

[`infra/componentes/Red.ts`](../../infra/componentes/Red.ts) declara una política `denegar-todo`
que selecciona **todos** los pods del namespace, sin ninguna regla de entrada ni salida, seguida
de una política aditiva por cada flujo real y nombrado — Kubernetes une las reglas de todas las
políticas que seleccionan un pod, así que `denegar-todo` no compite con las que abren un puerto.
Lo que no existe en ningún sitio es «abrir por si acaso»: un pod que hoy no necesita hablar con
otro no tiene regla.

Dos excepciones de salida amplia, deliberadas y estrechas —un puerto, `:443`, nunca `0.0.0.0/0`
sin restricción de puerto—: PostgreSQL y el `CronJob` de respaldo hacia el almacenamiento de
objetos (el proveedor no está decidido, `D-04`), y Alertmanager hacia el `alertWebhookUrl` que
configura la municipalidad. Las dos siguen sin poder alcanzar el resto del rango privado del
clúster ni un puerto administrativo de un tercero.

**Verificado contra un CNI que de verdad aplica `NetworkPolicy`**, no contra `kind` con su CNI de
fábrica (`kindnet`, que no lo hace): [`infra/red/verificar-red.sh`](../../infra/red/verificar-red.sh)
instala Calico en un clúster efímero y comprueba los dos criterios de aceptación del issue —la
interfaz no llega a PostgreSQL, la aplicación no llega a un destino de internet fuera de la
lista— más la demostración que el propio issue pide: quitando `permitir-ingreso-postgres`, la
MISMA conexión que antes fallaba pasa a conectar. Sin esa demostración, una política mal
etiquetada —que no selecciona ningún pod— pasaría la comprobación en verde sin bloquear nada.

En el VPS real, k3s no usa Calico: usa flannel con el controlador de política de red de
kube-router, activo por omisión. Los dos implementan la misma API de `NetworkPolicy`; lo que
`verificar-red.sh` demuestra es que las reglas de `Red.ts` hacen lo que dicen contra cualquier
implementación conforme, no que kindnet en particular las aplicaría —no las aplica, y por eso
ningún otro `kind` de `infra/` prueba esto.

## 2. Contenedores sin root

`convenciones.seguridadBase`/`seguridadSinRoot` fijan `allowPrivilegeEscalation: false` y
`capabilities: { drop: ["ALL"] }` en todo contenedor sin excepción, y `runAsNonRoot: true` en
todos salvo el `entrypoint` del motor de PostgreSQL —necesita arrancar como root para tomar
posesión del volumen antes de bajar privilegios con `gosu`—. `auditoria.auditarSeguridad` lo hace
bloqueante para las dos primeras; la ausencia de `runAsNonRoot` es una decisión nombrada de un
puñado de contenedores, auditada por separado en `verificaciones/componentes.test.ts`.

`frontend/Dockerfile`: nginx corre como el usuario `nginx` de la propia imagen base, con su `pid`
movido a `/tmp` y permisos de grupo —no un `runAsUser` fijo— sobre `/var/cache/nginx` y
`/etc/nginx`, para seguir funcionando bajo cualquier UID que Kubernetes le asigne.

## 3. Límites, prioridades y sondas

Esto no lo introdujo el issue #157: `convenciones.RECURSOS` y `clasesDePrioridad` existen desde
que se desplegó el primer componente (#150–#153), y `auditoria.auditarRecursos` ya hacía
bloqueante que todo contenedor declare `requests` y `limits`. Lo que el issue confirma es que
sigue siendo así — `EspecificacionDePod.priorityClassName` es un campo **obligatorio** del tipo,
no opcional, así que un pod sin clase de prioridad no compila. `convenciones.ESPERA_DE_SONDA = 3`
fija el `timeoutSeconds` de toda sonda por encima del valor por omisión del kubelet (1 s, la causa
del incidente de `../iaac` documentado en `INF-01` §4).

## 4. La reserva del nodo, y su ventana de mantenimiento

[`infra/vps/reservar-recursos-del-nodo.sh`](../../infra/vps/reservar-recursos-del-nodo.sh) aplica
la reserva de `INF-01` §2: ~1 CPU y ~1 GB para kubelet, containerd y el sistema operativo, vía
`kubelet-arg: [system-reserved=..., kube-reserved=...]` en `/etc/rancher/k3s/config.yaml`.

**Aplicar esto reinicia k3s.** El API server queda inalcanzable unos segundos, y cualquier
`pulumi up`/`pulumi preview` en marcha en ese instante falla a mitad de camino — no por un error
del guion, sino porque el proveedor de Pulumi habla contra ese mismo servidor de API. El guion
lo repite antes de tocar nada y exige una confirmación explícita, precisamente porque es el tipo
de aviso que se ignora la segunda vez que se corre un guion, no la primera. **Va en su propia
ventana de mantenimiento, nunca junto a otro cambio.**

El guion espera a que el API server vuelva a responder, a que el nodo pase a `Ready`, y confirma
que ningún pod quedó fuera de `Running`/`Succeeded` — «el clúster vuelve solo» del criterio de
aceptación es literal: el guion lo comprueba, no lo fuerza.

⚠ **Sin verificar contra un nodo real.** No existe un VPS todavía (`D-04` sigue abierta), así que
este guion no se ha ejecutado contra un `k3s` en marcha — solo contra la lógica que describe.
Cuando exista el nodo piloto, la primera ejecución real de este guion es también la primera fila
de la tabla de abajo.

### Registro de ejecuciones

| Fecha | Quién | ¿Volvió solo? | Notas |
|---|---|---|---|
| — | — | — | Sin ejecutar todavía: no existe VPS (`D-04`) |

## 5. Escaneo de vulnerabilidades de imágenes

[`.github/workflows/escaneo-de-imagenes.yml`](../../.github/workflows/escaneo-de-imagenes.yml)
construye las tres imágenes (`sgtm-aplicacion`, `sgtm-migrador`, `sgtm-interfaz`) **en el PR**,
sin publicarlas a ningún registro, y las escanea con Trivy. El resultado —CRITICAL y HIGH— se
publica en el resumen del trabajo, visible desde el PR sin abrir un log.

Bloqueante solo en CRITICAL. HIGH se reporta pero no rompe el flujo: las imágenes base
(`postgres:16-alpine`, `nginx:1.27-alpine`, la base de `eclipse-temurin`) acumulan hallazgos HIGH
que este repositorio no puede corregir sin esperar a la propia base — un flujo bloqueante ahí es
un flujo que termina ignorado. CRITICAL sí bloquea: la respuesta casi siempre es actualizar la
etiqueta de la imagen base, la otra mitad del alcance del issue.

## 6. Lo que sigue sin verificarse, y por qué

| Sin verificar | Qué haría falta |
|---|---|
| La reserva del nodo, contra un `k3s` real | El VPS piloto (`D-04`) |
| Que Trivy encuentre algo real y el flujo lo bloquee de verdad | Una imagen base con un CVE `CRITICAL` conocido — hoy se confía en que Trivy funciona, no se ha demostrado que el bloqueo muerde |
| `readOnlyRootFilesystem` | El tipo lo admite (`SecurityContext.readOnlyRootFilesystem`); ningún componente lo usa todavía — auditar cuáles pueden y aplicarlo es trabajo aparte |

## 7. Documentos relacionados

[`INF-01`](arquitectura-de-infraestructura.md) §2 (dimensionamiento) y §4 (convenciones que ya
costaron un incidente) · [`INF-09`](observabilidad-y-alertas.md) (las mismas dos excepciones de
salida amplia que documenta `Red.ts`) · [`infra/README.md`](../../infra/README.md)
