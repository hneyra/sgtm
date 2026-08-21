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
| Administrador de Keycloak | `sgtm-<amb>-keycloak` · `clave-administrador` | El propio Keycloak (arranque), y el Job que reconcilia el realm | Anual |
| Rol de Keycloak en PostgreSQL | `sgtm-<amb>-keycloak` · `clave-base` | Keycloak, para conectarse a su propia base | Semestral |

Cinco entradas, cuatro `Secret` de Kubernetes —`sgtm-<amb>-keycloak` guarda dos
claves—, **cinco valores y ninguno repetido**. Es el criterio de aceptación del issue
dicho con precisión: no «roles distintos», sino «claves distintas, comprobado» —
`infra/verificaciones/secretos.test.ts` lo exige sobre los metadatos y
`infra/secretos/verificar-claves-distintas.sh` lo comprueba contra valores reales de un
clúster (CI, trabajo `secretos`).

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
| `PULUMI_ACCESS_TOKEN` | Secreto de GitHub Actions | Semestral |
| `SSH_PRIVATE_KEY` (clave de despliegue) | Secreto de GitHub Actions | Semestral |

Ninguno de estos cuatro abre el padrón de una municipalidad por sí solo: son lo que
Pulumi necesita para **crear** el mecanismo —el clúster, el `Namespace`, el destino de
respaldo—, no un dato del sistema. Es la distinción de `ADR-0011` §3, y `infra/
componentes/secretos.ts` la hace estructural: `SECRETOS_DE_ARRANQUE` y
`inventarioDeSecretos()` son dos listas, y una prueba (`verificaciones/secretos.
test.ts`) exige que ninguna clave aparezca en las dos.

**La clave del administrador de Keycloak estuvo aquí, y ya no.** El andamio original de
`infra/` (issue #146, antes de que este documento existiera) la leía como secreto de
arranque de Pulumi. Es un error de clasificación: `ADR-0011` §3 la nombra explícitamente
como secreto de la *aplicación*, de la misma familia que `sgtm_owner` y `sgtm_app`. Se
corrigió con este issue — `config.ts` ya no la pide, y vive solo en el `Secret` de
Kubernetes que genera `bootstrap-secretos.sh`.

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

### 3.1 Los tres roles de PostgreSQL: `rotar-clave.sh`

```bash
infra/secretos/rotar-clave.sh --ambiente stg --rol sgtm-app
# --rol admite: sgtm-app, sgtm-owner, keycloak-base
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
[`despliegue/README.md`](../../despliegue/README.md) — la misma regla en el entorno local
