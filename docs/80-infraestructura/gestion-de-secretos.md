# INF-06 — Gestión de secretos

| Campo | Valor |
|---|---|
| Versión | 0.1 |
| Fecha | 2026-08-21 |
| Estado | Borrador |
| Decisión de origen | [`ADR-0011`](../30-arquitectura/adr/ADR-0011-infraestructura-como-codigo.md) §3, issue #154 |

Hoy las claves salen de un `.env` que no se versiona, y alguien las escribió a mano una
vez. En el clúster esa decisión no puede seguir siendo implícita: este documento dice
**de dónde sale cada secreto, dónde no está, y cómo se rota** — y el código que lo
sostiene está en `infra/componentes/secretos.ts`, `infra/secretos/` y
`infra/herramientas/`, no solo aquí.

## 1. El inventario

La fuente de verdad es `infra/componentes/secretos.ts` —
[`inventarioDeSecretos()`](../../infra/componentes/secretos.ts)—, y este documento
transcribe lo que ahí dice para que se pueda leer sin abrir TypeScript. Si algún día
difieren, el código manda: `yarn secretos --ambiente <stg|prod>` lo vuelca a JSON.

| Rol | `Secret` · clave | Consumidor | Rotación |
|---|---|---|---|
| Superusuario de PostgreSQL | `sgtm-<amb>-postgres-superusuario` · `clave-superusuario` | Inicialización del motor (el propio contenedor) | **Nunca desde el nodo** — ver §4.4 |
| `sgtm_owner` | `sgtm-<amb>-postgres-owner` · `clave-owner` | Los dos Jobs: migración e implantación. **Nunca** el `Deployment` de la aplicación | Trimestral |
| `sgtm_app` | `sgtm-<amb>-postgres-app` · `clave-app` | El `Deployment` de la aplicación, perfiles `web` y `batch` | Semestral |
| `rol_carga_parametros` | `sgtm-<amb>-postgres-carga` · `clave-carga` | Solo los Jobs de carga de parámetros (`publicar-parametros.sh`, `publicar-cuadros.sh`). **Nunca** el `Deployment` de la aplicación (issue #387) | Trimestral |
| Administrador de Keycloak | `sgtm-<amb>-keycloak` · `clave-administrador` | El propio Keycloak (arranque), y el Job que reconcilia el realm | Anual |
| Rol de Keycloak en PostgreSQL | `sgtm-<amb>-keycloak` · `clave-base` | Keycloak, para conectarse a su propia base | Semestral |
| `sgtm_respaldo` | `sgtm-<amb>-postgres-respaldo` · `clave-respaldo` | El CronJob de respaldo base (issue #155): solo `pg_backup_start`/`pg_backup_stop` | Semestral |
| Cifrado de respaldo | `sgtm-<amb>-postgres-respaldo` · `clave-cifrado` | El contenedor de PostgreSQL (`archive_command`/`restore_command`) y el CronJob de respaldo | Tras incidente — ver §3.4 |
| `sgtm_monitor` | `sgtm-<amb>-postgres-monitoreo` · `clave-monitoreo` | `postgres-exporter`, el sidecar del motor (issue #156): solo `pg_monitor` | Semestral |
| Administrador de Grafana | `sgtm-<amb>-grafana` · `clave-admin` | Grafana (issue #156). Nunca está en una `IngressRoute`: se administra por el túnel SSH | Anual |

Diez entradas, ocho `Secret` de Kubernetes —`sgtm-<amb>-keycloak` y
`sgtm-<amb>-postgres-respaldo` guardan dos claves cada uno—, **diez valores y ninguno
repetido**. Es el criterio de aceptación del issue dicho con precisión: no «roles
distintos», sino «claves distintas, comprobado» — `infra/verificaciones/secretos.test.ts`
lo exige sobre los metadatos y `infra/secretos/verificar-claves-distintas.sh` lo
comprueba contra valores reales de un clúster (CI, trabajo `secretos`).

**El cliente OIDC no tiene fila, y no es un olvido.** Los dos clientes del realm
—`sgtm-backoffice` y `sgtm-verificacion`— son `publicClient: true` con PKCE: no existe
ningún secreto de cliente que gestionar.

### 1.1 Los secretos de arranque, que SÍ viven en Pulumi

`ADR-0011` §3 separa dos familias, y la línea entre ellas es la que este documento
existe para no dejar que se difumine:

| Secreto | Dónde | Rotación |
|---|---|---|
| `kubeconfig` | `pulumi config` (cifrado, por stack) | Semestral |
| `backupAccessKeyId` / `backupSecretAccessKey` | `pulumi config` (cifrado, por stack) | Semestral |
| `registryPullToken` (PAT de GHCR, `read:packages`) | `pulumi config` (cifrado, por stack) | Semestral |
| `PULUMI_ACCESS_TOKEN` | Secreto de GitHub Actions | Semestral |
| `SSH_PRIVATE_KEY` (clave de despliegue) | Secreto de GitHub Actions | Semestral |

Ninguno de estos cinco abre el padrón de una municipalidad por sí solo: son lo que
Pulumi necesita para **crear** el mecanismo —el clúster, el `Namespace`, el destino de
respaldo, el acceso al registro de imágenes—, no un dato del sistema. Es la distinción
de `ADR-0011` §3, y `infra/componentes/secretos.ts` la hace estructural:
`SECRETOS_DE_ARRANQUE` y `inventarioDeSecretos()` son dos listas, y una prueba
(`verificaciones/secretos.test.ts`) exige que ninguna clave aparezca en las dos.

**`registryPullToken` es el más nuevo de los cinco (issue #257).** `sgtm-aplicacion`,
`sgtm-migrador` y `sgtm-interfaz` son paquetes **privados** en `ghcr.io/hneyra`:
`publicar-imagenes.yml` los sube con el `GITHUB_TOKEN` efímero de cada corrida, sin
ningún paso que los marque públicos. Un nodo nuevo —o uno reconstruido desde cero,
exactamente el escenario que describe `sgtm:applicationBootstrapVersion`— no tiene de
dónde sacar una credencial para esas tres imágenes, y hasta este issue **ningún**
archivo del repositorio lo resolvía: ni `bootstrap-secretos.sh`, ni un
`imagePullSecrets` en los manifiestos, ni un `registries.yaml` documentado. `index.ts`
crea un `Secret` de `kubernetes.io/dockerconfigjson` a partir de
`registryUsername`/`registryPullToken` y lo cuelga del `ServiceAccount` `default` del
namespace con un `ServiceAccountPatch` (Server-Side Apply, no reclama la cuenta
entera). `registryUsername` no es secreto — vive en claro en
`Pulumi.<ambiente>.yaml`, igual que `applicationImageRepository`.

**La clave del administrador de Keycloak estuvo aquí, y ya no.** El andamio original de
`infra/` (issue #146, antes de que este documento existiera) la leía como secreto de
arranque de Pulumi. Es un error de clasificación: `ADR-0011` §3 la nombra explícitamente
como secreto de la *aplicación*, de la misma familia que `sgtm_owner` y `sgtm_app`. Se
corrigió con este issue — `config.ts` ya no la pide, y vive solo en el `Secret` de
Kubernetes que genera `bootstrap-secretos.sh`.

### 1.2 El secreto SMTP, que no se genera: lo emite el relay (ADR-0012)

El alta declarativa de usuarios ([`ADR-0012`](../30-arquitectura/adr/ADR-0012-usuarios-y-grupos-declarativos.md))
envía por correo el enlace de un solo uso con que un usuario nuevo fija su clave. **Solo hace
falta este `Secret` si el ambiente declara un relay** (`keycloakSmtpHost`) **y ese relay pide
autenticación** (`keycloakSmtpAuth`). Sin relay —Opción B, el estado de la marcha blanca de
`prod`— no hay `Secret`, no hay correo, y el operador fija la primera clave a mano.

Cuando sí hace falta, su credencial es la única entrada del inventario que
`bootstrap-secretos.sh` **no** genera, por el mismo motivo que el superusuario de PostgreSQL no
se rota desde el nodo: no es un valor que se pueda fabricar aquí, lo emite otro sistema.

| Secreto · claves | Consumidor | De dónde sale | Rotación |
|---|---|---|---|
| `sgtm-<amb>-smtp` · `usuario`, `clave` | El Job que reconcilia identidades, que las pone en el realm con `kcadm` | La consola del proveedor del relay. Se ponen con `kubectl create secret generic sgtm-<amb>-smtp --from-literal=usuario=… --from-literal=clave=…` | Según el proveedor |

- **El servidor y el remitente no son secretos.** `keycloakSmtpHost`, `keycloakSmtpPort` y
  `keycloakSmtpFrom` viven en claro en `Pulumi.<stack>.yaml`, igual que `domain`. Solo
  `usuario`/`clave` son secreto, y solo cuando `keycloakSmtpAuth` es true.
- **`stg` no tiene este `Secret`.** Su relay es un buzón Mailpit del propio clúster
  (`sgtm-stg-correo`), sin autenticación: la escalera comprueba que Keycloak *envía* el
  enlace, no que llegue a un correo real. `config.ts` prohíbe un buzón así en `prod`
  (`INF-03` §4).
- **`prod` tampoco lo tiene hoy** (Opción B): no declara `keycloakSmtpHost`, así que el Job de
  reconciliación no monta este `Secret` y el alta se completa sin correo. Cuando se decida un
  relay, se añaden las tres variables en claro a `Pulumi.prod.yaml` y —si pide auth— se crea
  el `Secret` con el `kubectl create secret` de la tabla, antes del siguiente `pulumi up`.

## 2. Cómo se generan: `bootstrap-secretos.sh`, nunca Pulumi

Un despliegue desde cero necesita las cinco claves de §1 antes de que `pulumi up` cree
el primer `Deployment` que las referencia. `infra/secretos/bootstrap-secretos.sh` las
genera **sin que nadie teclee una clave**:

```bash
infra/secretos/bootstrap-secretos.sh --ambiente stg
```

- Por cada `Secret` del inventario: lee lo que el clúster ya tiene, y genera **solo**
  las claves que faltan — 32 bytes de `crypto.randomBytes`, nunca el mismo valor dos
  veces en la misma corrida (`infra/herramientas/completar-secreto.ts`, con su prueba).
- **Idempotente por construcción.** Correrlo dos veces seguidas la segunda vez no
  cambia nada: todo lo que faltaba en la primera ya existe. Es lo que hace seguro
  ejecutarlo en cada `pulumi up` — CI lo hace, antes del `up`.
- **No pasa por Pulumi.** Habla con el API de Kubernetes por `kubectl`, con el mismo
  kubeconfig que usa `pulumi up` — el del túnel SSH (`INF-01` §1.4). El estado de Pulumi
  nunca ve el valor de ninguna clave: lo único que Pulumi conoce de estos `Secret` es su
  **nombre**, porque los manifiestos lo referencian con `secretKeyRef`.
- **Nunca imprime un valor.** Lo que sale por la salida estándar son huellas —`sha256`
  cortado a 12 caracteres, `infra/herramientas/completar-secreto.ts`, función
  `huella()`— suficientes para confirmar en un registro que algo cambió, insuficientes
  para reconstruir qué.

Sin este paso, `pulumi up` crea los `Deployment` y los `Job` igual —solo referencian el
`Secret` por nombre, no dependen de que exista para que Pulumi los declare—, y los pods
se quedan en `Pending` con el `Secret` ausente en sus eventos hasta que alguien corra el
guion.

## 3. Cómo se rotan

### 3.1 Los roles de PostgreSQL: `rotar-clave.sh`

```bash
infra/secretos/rotar-clave.sh --ambiente stg --rol sgtm-app
# --rol admite: sgtm-app, sgtm-owner, keycloak-base, sgtm-respaldo, sgtm-monitor,
#               postgres-carga
```

Contra la base **en marcha**, sin reiniciar nada:

1. Genera un valor nuevo.
2. `ALTER ROLE <rol> PASSWORD :'nueva'` contra el motor, por `kubectl exec` — con
   sustitución seguía de variables de `psql` (el mismo patrón de
   `20-asignar-claves.sh`), nunca interpolado en el texto del SQL.
3. Actualiza **solo esa clave** en el `Secret`, con `kubectl patch --type=merge`: las
   demás que viven en el mismo objeto —`sgtm-<amb>-keycloak` guarda dos— no se tocan.
4. Si algún `Deployment` la lee como pod en marcha (`sgtm-app` → la aplicación,
   `keycloak-base` → Keycloak), lo reprograma con `kubectl rollout restart` para que
   las conexiones **nuevas** usen la clave nueva.

**Por qué no exige parar la base.** `ALTER ROLE ... PASSWORD` no cierra las sesiones que
ya estaban abiertas con la clave vieja — lo único que deja de funcionar es una conexión
**nueva** con la clave vieja. Es lo que demuestra, contra un motor real,
`infra/secretos/verificar-rotacion.sh`: abre una sesión como `sgtm_app`, rota la clave, y
comprueba que esa misma sesión sigue respondiendo mientras una conexión nueva con la
clave vieja falla y una con la clave nueva funciona. Corre en CI (trabajo `motor`, sin
necesitar el clúster: usa los mismos guiones de inicialización que
`verificar-el-motor.sh`, vía `lib-motor-local.sh`).

`sgtm-owner` es un caso más simple todavía: solo lo leen los dos Jobs, y un Job **nuevo**
ya lee el `Secret` actualizado al crearse — no hay ningún pod en marcha que reprogramar.
`postgres-carga` es el mismo caso: solo lo leen `publicar-parametros.sh` y
`publicar-cuadros.sh`, Jobs de un solo uso.

### 3.2 El administrador de Keycloak: procedimiento manual

No es una clave de PostgreSQL — `rotar-clave.sh` la rechaza explícitamente si se le
pide, con un mensaje que apunta aquí. `KC_BOOTSTRAP_ADMIN_PASSWORD` solo tiene efecto la
**primera vez** que Keycloak arranca sin que el usuario `admin` exista: una vez creado,
cambiar esa variable de entorno no cambia la clave real. Rotarla es un comando contra el
propio Keycloak, con `kcadm.sh` —la misma herramienta que ya usa
`infra/componentes/identidad/reconciliar-realm.sh`—:

```bash
kubectl -n sgtm-<amb> exec -i deployment/sgtm-<amb>-identidad -- /opt/keycloak/bin/kcadm.sh \
    set-password --realm master --username admin --new-password "$(openssl rand -base64 32)"
```

Y actualizar el `Secret` para que quede consistente (`kubectl patch`, la misma forma que
usa `rotar-clave.sh`). No hace falta reprogramar ningún pod: el cambio ya lo aplicó
`kcadm.sh` contra el proceso en marcha.

### 3.3 El superusuario de PostgreSQL: no se rota desde el nodo

Es la única excepción del inventario sin procedimiento automatizado, y a propósito.
Rotarlo exigiría autenticar contra el motor con el mismo superusuario que se está
cambiando a sí mismo, y el guion de inicialización solo lo asigna **una vez**, cuando el
volumen está vacío. Si algún día hace falta, el camino es una ventana de mantenimiento
documentada aparte —reconstruir el volumen o usar una conexión de mantenimiento fuera
de banda—, no una línea más en `rotar-clave.sh`.

### 3.4 Los secretos de arranque (§1.1)

`kubeconfig`: se regenera si el nodo se reaprovisiona o si la clave de despliegue
cambia (issue #157, #158). `backupAccessKeyId`/`backupSecretAccessKey`: se rotan desde
la consola del proveedor del almacenamiento de objetos, y el nuevo valor se pone con
`pulumi config set --secret`. `PULUMI_ACCESS_TOKEN` y `SSH_PRIVATE_KEY`: se regeneran
desde Pulumi Cloud y con un par de claves SSH nuevo respectivamente, y se actualizan en
`Settings → Secrets` de GitHub Actions.

## 4. Lo que no se negocia

### 4.1 Ningún secreto de la aplicación en el estado de Pulumi

`config.ts` no lee ni un secreto de los cinco de §1: `loadSettings()` solo pide
`kubeconfig` y las credenciales de respaldo. Un `generateRolePasswords: true` en
cualquier stack pone roja la configuración citando este mismo documento
(`checkInvariants`, `ADR-0011` §3).

### 4.2 Una clave por rol, comprobado

`completar-secreto.ts` lanza si generara el mismo valor dos veces en una corrida —con
`crypto.randomBytes(32)` eso es indistinguible de imposible, y la prueba lo fuerza con
un generador roto—. Y `verificar-claves-distintas.sh` lo comprueba contra un clúster
real: lee el valor de las cinco claves y exige que ninguna coincida con otra, dentro de
un ambiente y entre `stg` y `prod`.

### 4.3 Rotar es contra la base ya existente

Las claves de los roles del motor se asignan **una sola vez**, cuando el volumen está
vacío (`crear-roles.sql` + `20-asignar-claves.sh`). Cambiar el `Secret` de Kubernetes
**no cambia la clave del rol** — reiniciar el pod con otra variable no rota nada, porque
el guion de inicialización no vuelve a correr sobre un volumen que ya tiene datos. Rotar
de verdad es `rotar-clave.sh`, que hace el `ALTER ROLE` explícito. Está documentado
desde el compose (`despliegue/README.md`) y este issue existe porque se seguía
incumpliendo por intuición.

### 4.4 Nunca en un manifiesto, nunca en la imagen, nunca en la salida de CI

Los manifiestos solo referencian los `Secret` por nombre (`secretKeyRef`) — ninguno lleva
un valor. `bootstrap-secretos.sh` y `rotar-clave.sh` no imprimen ningún valor, solo
huellas. Y el escaneo de secretos (`.github/workflows/secretos.yml`, con `gitleaks`)
corre sobre **todo el repositorio**, no solo `infra/`, en cada PR y en cada integración a
`main`.

## 5. Cómo se demuestra que la verificación puede fallar

| Rotura | Qué se pone rojo |
|---|---|
| Meter una clave con forma de clave en un archivo versionado | `.github/workflows/secretos.yml`, trabajo «El repositorio no tiene secretos» |
| Quitar la muestra de `infra/verificaciones/secretos/muestras/`, o que gitleaks deje de reconocerla | El mismo workflow, trabajo «La muestra de mentira SE detecta» — si esto no falla, el otro trabajo no protege nada |
| Poner la misma clave para `sgtm_owner` y `sgtm_app` | CI, trabajo `secretos`: `verificar-claves-distintas.sh` la encuentra, ejecutado contra un clúster real (no simulado) |
| Que `completar-secreto.ts` genere un valor repetido | `verificaciones/completar-secreto.test.ts`, con un generador roto a propósito |
| Reintroducir `keycloakAdminPassword` en `SECRETOS_DE_ARRANQUE` | `verificaciones/secretos.test.ts`: las dos listas no pueden compartir una clave |
| Quitar el `ALTER ROLE` de la rotación | `verificar-rotacion.sh`: una conexión nueva con la clave vieja sigue funcionando, y el guion falla |
| Apuntar `keycloakSmtpHost` de `prod` a un buzón (`sgtm-prod-correo`, Mailpit), o dejar `keycloakSmtpAuth` en false | `config.test.ts`, «ADR-0012 — el relay SMTP»: `checkInvariants` lo rechaza citando `INF-03` §4 |
| Quitar del guion el `execute-actions-email` del alta declarativa | `despliegue.yml`, peldaño «3b»: el buzón Mailpit queda vacío y el paso se pone rojo |
| Quitar el `ALTER ROLE rol_carga_parametros LOGIN` de `20-asignar-claves.sh` (issue #387) | CI, trabajo `motor`: `verificar-el-motor.sh` falla nombrando el rol («rol_carga_parametros no puede conectarse») |

## 6. Lo que sigue sin verificarse, y por qué

**Rotar `sgtm_app` en `stg` de verdad, con el `Secret` real y el `rollout restart` del
`Deployment`.** `verificar-rotacion.sh` demuestra la mecánica de PostgreSQL —que
`ALTER ROLE` no cierra sesiones abiertas— contra un motor real, local o en CI. Lo que no
demuestra es el camino completo por `kubectl exec` + `kubectl patch` +
`kubectl rollout restart` contra un clúster que además tiene una aplicación real
sirviendo peticiones. Eso necesita el VPS, y es honesto decirlo así en vez de darlo por
probado.

## 7. Documentos relacionados

[`ADR-0011`](../30-arquitectura/adr/ADR-0011-infraestructura-como-codigo.md) §3 ·
[`INF-01`](arquitectura-de-infraestructura.md) · [`infra/README.md`](../../infra/README.md)
§«Los secretos que estos manifiestos leen y no crean» ·
[Rotar la clave de un rol](../B0-operacion/runbooks/rotar-la-clave-de-un-rol.md) — el
runbook de §3.1 ·
[`despliegue/README.md`](../../despliegue/README.md) — la misma regla en el entorno local
