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

### La raíz de solo lectura, y por qué es una lista y no una regla

El alcance del issue pide sistema de archivos raíz de solo lectura **«donde se pueda»**, y ese
«donde se pueda» es literal: `readOnlyRootFilesystem: true` sobre un contenedor que sí escribe en
su raíz no lo endurece, lo rompe —y lo rompe contra un clúster real, no en `yarn verificar`, que
es exactamente cómo este PR descubrió lo de `capabilities.drop` sobre el `entrypoint` de
PostgreSQL y lo de `runAsNonRoot` sobre seis imágenes con `USER` no numérico—.

Cuatro contenedores la llevan hoy, y la lista está fijada en `componentes.test.ts`:

| Contenedor | Por qué se puede |
|---|---|
| `postgres-exporter`, `node-exporter`, `kube-state-metrics` | Leen una fuente y sirven `/metrics`. No escriben nada |
| `wal-g-instalar` | Escribe en exactamente dos sitios, los dos leíbles de sus propios `args`: `/tmp` —el `.tar.gz` que descarga y desempaqueta— y el `emptyDir` compartido con el motor. Con `/tmp` también montado como `emptyDir`, ninguno de los dos es la raíz |

Los tres primeros ya la llevaban desde el issue #156 **sin que ninguna prueba lo dijera**:
quitársela a cualquiera de ellos no ponía nada rojo, y la única constancia de que era una decisión
—y no un descuido al copiar y pegar un `securityContext`— era que estaba escrita. Ahora la lista
es exacta en las dos direcciones: se pone roja si uno de los cuatro la pierde, y también si un
quinto la gana sin pasar por aquí.

**`wal-g-instalar` se ejecutó, no se razonó.** Contra la imagen real
(`curlimages/curl:8.11.0`), con los `args` exactos del manifiesto, `--read-only`, UID 65534, todas
las capacidades caídas y `no-new-privileges`, y los dos `emptyDir` emulados como directorios
`1777`:

| Caso | Resultado |
|---|---|
| Con `/tmp` montado —lo que el manifiesto declara— | **exit 0.** Deja `/opt/wal-g/wal-g` de 64 402 920 bytes en modo 0755, `/tmp` vacío tras el `rm` final, y el binario arranca: «wal-g version v3.0.5 94bf839». De paso confirma que `WALG_SHA256` es el del release de verdad |
| Sellando la raíz **sin** montar `/tmp` | **exit 23**, «curl: (23) client returned ERROR on write of 16384 bytes». En Kubernetes: un init container que no termina, y detrás un motor que nunca llega a `Ready` |
| Sin sellar la raíz y sin `/tmp` —el estado anterior a este cambio— | exit 0. Por eso el par no se notaba: solo importa una vez sellada la raíz |

El montaje de `/tmp` y el `readOnlyRootFilesystem` son por eso **una sola decisión y no dos**, y
`componentes.test.ts` los exige juntos.

Los que **no** la llevan no es por olvido: Prometheus, Alertmanager, Grafana, Keycloak y los
cuatro contenedores de la JVM escriben fuera de sus volúmenes —o no está comprobado que no lo
hagan—, y sellarlos sin ejecutarlos contra un clúster sería cambiar un manifiesto que funciona
por uno que no. Queda en §6.

## 3. Límites, prioridades y sondas

`convenciones.RECURSOS` y `clasesDePrioridad` existen desde que se desplegó el primer componente
(#150–#153), y `auditoria.auditarRecursos` ya hacía bloqueante que todo contenedor declare
`requests` y `limits`. `EspecificacionDePod.priorityClassName` es además un campo **obligatorio**
del tipo, no opcional, así que un pod sin clase de prioridad no compila.
`convenciones.ESPERA_DE_SONDA = 3` fija el `timeoutSeconds` de toda sonda por encima del valor por
omisión del kubelet (1 s, la causa del incidente de `../iaac` documentado en `INF-01` §4).

**Lo que faltaba era el orden, que es de donde sale el sentido entero de tener clases.** Todo lo
anterior responde a «¿se acordó alguien de declararlo?». No responde a lo que el issue pone como
no-negociable: *«la base de datos se desaloja la última»*. Comprobado ejecutándolo —no razonándolo—:
intercambiando `PRIORIDADES.datos` y `PRIORIDADES.lote` en `convenciones.ts`, con PostgreSQL en la
prioridad **más baja** del clúster y las emisiones masivas en la más alta, las pruebas de
`yarn verificar` —170 entonces— seguían en verde. Cada pod seguía declarando su clase; solo que bajo presión de
memoria el kubelet desalojaba la base **primero**, sin ningún síntoma hasta el día que el nodo se
quede sin memoria —el peor día para descubrirlo, porque con un solo nodo no hay a dónde mover lo
desalojado—.

`auditoria.auditarPrioridades` cierra eso con dos reglas leídas del manifiesto: toda clase que un
pod nombre tiene que estar **definida en el mismo manifiesto** —Kubernetes rechaza un pod cuya
`PriorityClass` no existe: no es un despliegue con menos garantías, es un pod que no arranca—, y
ningún pod puede valer tanto o más que el del motor salvo que use su misma clase, lo que deja
sitio a una futura réplica del tramo de datos sin abrir la puerta a que la interfaz empate con la
base.

## 4. La reserva del nodo, y su ventana de mantenimiento

[`infra/vps/reservar-recursos-del-nodo.sh`](../../infra/vps/reservar-recursos-del-nodo.sh) aplica
la reserva de `INF-01` §2 para kubelet, containerd y el sistema operativo, vía
`kubelet-arg: [system-reserved=..., kube-reserved=...]` en `/etc/rancher/k3s/config.yaml`.

**El total se reparte entre las dos partidas; no se escribe entero en cada una.** `system-reserved`
y `kube-reserved` son dos descuentos distintos y kubelet los **suma**, así que `cpu=1` en las dos
no reserva 1 CPU: reserva 2. Hoy el guion escribe `cpu=500m,memory=1Gi` en cada una — **1 CPU y
2 Gi en total**—, y `infra/verificaciones/reserva-del-nodo.test.ts` ejecuta el guion sobre un
archivo de mentira y exige que las dos partidas sumen eso. La prueba se demuestra devolviendo la
duplicación: tres de sus seis casos se ponen rojos, uno diciendo «expected 2000 to be 3000».

**Aplicar esto reinicia k3s.** El API server queda inalcanzable unos segundos, y cualquier
`pulumi up`/`pulumi preview` en marcha en ese instante falla a mitad de camino — no por un error
del guion, sino porque el proveedor de Pulumi habla contra ese mismo servidor de API. El guion
lo repite antes de tocar nada y exige una confirmación explícita, precisamente porque es el tipo
de aviso que se ignora la segunda vez que se corre un guion, no la primera. **Va en su propia
ventana de mantenimiento, nunca junto a otro cambio.**

El guion espera a que el API server vuelva a responder, a que el nodo pase a `Ready`, y confirma
que ningún pod quedó fuera de `Running`/`Succeeded` — «el clúster vuelve solo» del criterio de
aceptación es literal: el guion lo comprueba, no lo fuerza.

**Los dos VPS —`stg` y `prod`— ya existen** (INF-03 §4, commit `1e564e8`): tienen IP y credenciales
propias en los *environments* de GitHub. La clave de despliegue de CI (`stg`/`SSH_PRIVATE_KEY`) está
restringida a **solo abrir el túnel** al API de k3s (`infra/README.md` §3): una sesión con ella
responde `solo tunel` y termina. No sirve para correr este guion, que necesita shell como root —y
está bien que no sirva: una clave de despliegue que además pudiera reiniciar k3s sería una clave de
despliegue con poder de operación—. Correrlo es trabajo manual, en su propia ventana de
mantenimiento, con una credencial que sí tenga esa capacidad.

**Ejecutado contra un nodo real.** Ya no es una descripción de lo que el guion haría:

| Lo que el guion afirmó | Lo que devolvió el nodo `vmd120205` |
|---|---|
| El API server vuelve | «El API server responde» |
| El nodo vuelve a `Ready` | `node/vmd120205 condition met` |
| **kubelet aplicó la reserva** —lo asignable baja, la capacidad no— | CPU 4 → asignable **2**; memoria 8 126 500 Ki → asignable **6 029 348 Ki**. La diferencia es **2 097 152 Ki = 2 Gi exactos**, y 2 CPU: justo `system-reserved` + `kube-reserved` (1 CPU y 1 Gi cada uno). La capacidad no se movió |
| …y lo que esa misma fila estaba diciendo sin que nadie lo leyera así | **2 CPU y 2 Gi es el doble de los «~1 CPU y ~1 GB» que `INF-01` §2 dimensiona.** La cifra estaba delante y se leyó como el coste esperado de la reserva. Es el defecto del issue #252, corregido el 2026-08-26 repartiendo el total entre las dos partidas |
| «El clúster vuelve solo» | Ningún pod fuera de `Running`/`Succeeded` tras el reinicio |

La reserva se lee en lo **asignable**, no en la capacidad, y esa es la comprobación que distingue
«k3s reinició» de «kubelet tomó los argumentos»: un `kubelet-arg` mal escrito reinicia el servicio
igual de bien y deja lo asignable intacto.

### Registro de ejecuciones

| Fecha | Quién | Nodo | ¿Volvió solo? | Notas |
|---|---|---|---|---|
| 2026-08-23 | hneyra | `vmd120205` (`prod`) | **Sí** | Primera ejecución. Reserva aplicada y confirmada en lo asignable (2 CPU y 2 Gi menos, capacidad intacta). Sin intervención manual: el API server volvió, el nodo pasó a `Ready` y ningún pod quedó fuera de `Running`/`Succeeded`. Lo que la corrida comprueba es que el nodo se recupera del reinicio; que la aplicación entera sobreviva a él se verá cuando `aplicar-prod` haya desplegado el sistema completo |

> ⚠ **Lo que esa fila no dijo, y costó cuatro despliegues colgados (issue #252).** La reserva
> dejó `vmd120205` en **2 CPU asignables**, y el stack de `prod` pide 2 040m solo en sus
> `Deployment`. Desde ese día `prod` no puede ubicar su propio stack — pero como el nodo tenía
> entonces poco desplegado, «ningún pod quedó fuera de `Running`» salió cierto y el problema no
> se vio. Apareció tres días después, al intentar el primer despliegue completo, con la forma
> que menos se parece a su causa: `pulumi up` esperando indefinidamente, sin error ni registro.
>
> **Y la reserva sí estaba mal, aunque durante tres días se concluyó lo contrario.** La primera
> lectura fue «la reserva protege lo que `INF-01` §2 explica y no se toca; lo que faltaba era
> cruzar lo asignable con lo que el stack pide». Lo segundo era cierto y lo hace ahora
> [`infra/capacidad.ts`](../../infra/capacidad.ts) en cada PR. Lo primero no: `INF-01` §2
> dimensiona **~1 CPU**, y el guion estaba reservando **2**, porque escribía la cifra entera en
> `system-reserved` y otra vez en `kube-reserved`. La medición de esta misma tabla lo decía —«2 Gi
> exactos, y 2 CPU»— pero se leyó como el precio esperado, no como el doble de él.
>
> Corregido el reparto, `vmd120205` vuelve a ofrecer **3 CPU**. La memoria se queda en 2 Gi a
> propósito: ahí el consumo sí es ese, y bajarla no devolvería memoria, solo dejaría de contar la
> que el sistema ya usa.
>
> La lección para la próxima fila de esta tabla: **después de aplicar la reserva, correr
> `yarn capacidad --ambiente <ambiente>`** — quitarle CPU a un nodo es cambiar lo que cabe en él —
> y **contrastar lo asignable con lo dimensionado**, no solo comprobar que bajó. Que baje solo
> dice que kubelet tomó los argumentos; cuánto bajó es lo que dice si son los argumentos correctos.

### Pendiente: aplicar la corrección en `vmd120205`

El repositorio ya lleva el guion corregido, pero **el nodo sigue reservando 2 CPU hasta que alguien
lo corra en él**.

⚠ **Esto ya no bloquea el despliegue, y conviene saber por qué.** El 2026-08-26 se declararon los
3 CPU resultantes en `Pulumi.prod.yaml` antes de aplicar la reserva, y `aplicar-prod` se detuvo en
su paso «Lo declarado cabe en el nodo real»: ese paso rechaza toda declaración MAYOR que lo real, y
adelantarse al nodo solo cambia el paso en el que falla. `prod` se redimensionó entonces para caber
en los 2 CPU que el nodo reparte hoy (INF-01 §2), así que **correr esto es ahora una mejora de
margen —~1 000m—, no un desbloqueo**.

En el VPS, como root, en su propia ventana de mantenimiento:

```bash
cd infra && ./vps/reservar-recursos-del-nodo.sh
```

Detecta que la reserva actual la escribió él mismo con otras cifras, guarda una copia con marca de
tiempo, sustituye **solo** esas dos líneas, muestra el `diff` y reinicia k3s. Volver a correrlo no
cambia nada ni reinicia (es idempotente), y si encuentra un `kubelet-arg` que no escribió él, se
niega y dice qué poner a mano. Después, comprobar y anotar la fila:

```bash
kubectl get node -o jsonpath='{.items[0].status.allocatable.cpu}{"/"}{.items[0].status.allocatable.memory}'
# se espera: 3/6029348Ki
yarn capacidad --ambiente prod
```

`Pulumi.prod.yaml` **no hay que tocarlo** después: sigue declarando "2", y declarar por debajo de
lo real está admitido —solo aprieta la comprobación—. Subirlo a "3" es opcional, y lo que gana es
margen.

## 5. Escaneo de vulnerabilidades de imágenes

[`.github/workflows/escaneo-de-imagenes.yml`](../../.github/workflows/escaneo-de-imagenes.yml)
construye las tres imágenes (`sgtm-aplicacion`, `sgtm-migrador`, `sgtm-interfaz`) **en el PR**,
sin publicarlas a ningún registro, y las escanea con Trivy. El resultado —CRITICAL y HIGH— se
publica en el resumen del trabajo, visible desde el PR sin abrir un log.

Bloqueante solo en CRITICAL. HIGH se reporta pero no rompe el flujo: las imágenes base
(`postgres:16-alpine`, `nginx:1.31.4-alpine`, la base de `eclipse-temurin`) acumulan hallazgos HIGH
que este repositorio no puede corregir sin esperar a la propia base — un flujo bloqueante ahí es
un flujo que termina ignorado. CRITICAL sí bloquea, y no es hipotético: la primera corrida real
encontró `CVE-2026-31789` (desbordamiento de buffer en OpenSSL, CRITICAL) en `libssl3`/`libcrypto3`
dentro de `nginx:1.27-alpine`, la etiqueta que este Dockerfile fijaba hasta ese momento. El flujo
se puso rojo, y la corrección fue la que el issue pide: subir la etiqueta a `nginx:1.31.4-alpine`.

## 6. Lo que sigue sin verificarse, y por qué

| Sin verificar | Qué haría falta |
|---|---|
| El reinicio del nodo **con el sistema desplegado encima** | §4 ya comprueba que el nodo se recupera solo; lo que falta es repetirlo con la aplicación, el motor y Keycloak corriendo, y es trabajo del día en que `aplicar-prod` los haya desplegado |
| `readOnlyRootFilesystem` en Prometheus, Alertmanager, Grafana, Keycloak y los cuatro contenedores de la JVM | Ejecutar cada imagen con la raíz sellada y ver qué ruta reclama. Los cuatro que sí la llevan están en §2; sellar el resto a ciegas es la clase de cambio que este PR ya vio fallar dos veces contra un clúster real y ninguna en `yarn verificar` |

## 6-bis. La raíz sellada, comprobada en cada PR

Que el manifiesto **diga** `readOnlyRootFilesystem: true` y que el contenedor **arranque** con eso
puesto son dos afirmaciones distintas, y la segunda es la que este PR vio fallar dos veces —
`capabilities.drop: ["ALL"]` dejando al `entrypoint` de PostgreSQL sin `CAP_CHOWN`, y `runAsNonRoot`
rompiendo seis imágenes con `USER` no numérico—. Las dos aparecieron contra un clúster real y
ninguna en `yarn verificar`.

Por eso la comprobación es un guion y no una prueba más:
[`infra/verificaciones/raiz-sellada/verificar-raiz-sellada.sh`](../../infra/verificaciones/raiz-sellada/verificar-raiz-sellada.sh),
con su trabajo propio en `infra.yml` (`raiz-sellada`). **Lee la imagen, los `args` y el
`securityContext` del manifiesto emitido**, nunca de una copia: un guion con la orden duplicada
comprueba lo que decía el manifiesto el día que se escribió, no lo que dice hoy. Solo necesita
Docker, así que es el más barato de los trabajos que ejercitan algo de verdad.

Los dos `emptyDir` se emulan con directorios `1777`, que es como el kubelet los crea —de ahí que un
`runAsUser: 65534` pueda escribir en ellos sin coincidir con el usuario de la imagen—. Un volumen
nombrado de Docker **no** sirve: nace `root:root 0755` y el `mv` falla por una razón que no tiene
nada que ver con lo que se quiere comprobar.

Y lleva dentro su propia demostración de que puede fallar: el guion también comprueba que el guion
mismo sigue teniendo sentido —si el manifiesto deja de declarar `readOnlyRootFilesystem` o deja de
montar `/tmp`, se pone rojo diciendo eso en vez de comprobar en silencio otra cosa—.

## 7. Documentos relacionados

[`INF-01`](arquitectura-de-infraestructura.md) §2 (dimensionamiento) y §4 (convenciones que ya
costaron un incidente) · [`INF-09`](observabilidad-y-alertas.md) (las mismas dos excepciones de
salida amplia que documenta `Red.ts`) · [`infra/README.md`](../../infra/README.md)
