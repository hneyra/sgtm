# Runbook — Rotar la clave de un rol de base de datos

| Campo | Valor |
|---|---|
| Cuándo | Trimestral (`sgtm_app`: semestral, ver inventario), o de inmediato tras un incidente |
| Roles que cubre | `sgtm-app`, `sgtm-owner`, `keycloak-base` — el administrador de Keycloak y el superusuario son procedimientos aparte, ver «Si no sale bien» |
| Estado del ensayo | **La mecánica de PostgreSQL está ensayada contra un motor real**, en CI. El camino completo por `kubectl exec`/`kubectl patch`/`kubectl rollout restart` contra un clúster real no lo está — ver «Estado del ensayo» |

## Síntoma

No es una falla: es mantenimiento programado (inventario completo en
[`INF-06`](../../80-infraestructura/gestion-de-secretos.md) §1), o la respuesta a un
incidente donde una clave pudo quedar expuesta.

## Precondiciones

1. **El rol es uno de los tres que `rotar-clave.sh` acepta**: `sgtm-app`, `sgtm-owner`,
   `keycloak-base`. Si es el administrador de Keycloak o el superusuario de PostgreSQL,
   este no es el runbook — ver «Si no sale bien».
2. Acceso `kubectl` al ambiente, con permiso para `exec` sobre el pod de PostgreSQL y
   `patch` sobre el `Secret`.
3. **No hace falta ventana de mantenimiento.** `ALTER ROLE ... PASSWORD` no cierra
   sesiones abiertas — es el punto entero del procedimiento (`INF-06` §3.1).

## Pasos

```bash
infra/secretos/rotar-clave.sh --ambiente <amb> --rol sgtm-app
```

El guion, contra la base **en marcha**:

1. Genera un valor nuevo (32 bytes al azar).
2. `ALTER ROLE <rol> PASSWORD :'nueva'` por `kubectl exec`, con sustitución segura de
   variables de `psql` — nunca interpolado en el texto del SQL.
3. Actualiza **solo esa clave** en el `Secret`, con `kubectl patch --type=merge`: si el
   `Secret` guarda más de una clave (`sgtm-<amb>-keycloak` guarda dos), las demás no se
   tocan.
4. Si algún `Deployment` la lee como pod en marcha (`sgtm-app` → la aplicación,
   `keycloak-base` → Keycloak), lo reprograma con `kubectl rollout restart` para que las
   conexiones **nuevas** usen la clave nueva. `sgtm-owner` no reprograma nada: solo lo
   leen los dos Jobs, y un Job nuevo ya lee el `Secret` actualizado al crearse.

No imprime ningún valor — solo una huella (`sha256` cortado a 12 caracteres) para
confirmar en un registro que algo cambió.

## Cómo se comprueba que terminó bien

**No** «`kubectl rollout restart` terminó sin error». Tres comprobaciones:

1. **Una conexión nueva con la clave vieja falla, y una con la nueva funciona** — es la
   comprobación que hace `infra/secretos/verificar-rotacion.sh` contra un motor real, y
   se repite aquí a mano si hay dudas. **Desde dentro del clúster** — el puerto 5432
   nunca se publica (`INF-01` §1.4), así que la conexión de prueba se hace con un pod
   efímero en la misma red, nunca contra un `<host>` externo:

   ```bash
   kubectl -n sgtm-<amb> run verificar-rotacion --rm -it --restart=Never \
     --image=postgres:16 --env="PGPASSWORD=<clave-vieja>" -- \
     psql -h sgtm-<amb>-postgres -U sgtm_app -d sgtm -c 'SELECT 1'   # falla

   kubectl -n sgtm-<amb> run verificar-rotacion --rm -it --restart=Never \
     --image=postgres:16 --env="PGPASSWORD=<clave-nueva>" -- \
     psql -h sgtm-<amb>-postgres -U sgtm_app -d sgtm -c 'SELECT 1'   # funciona
   ```

2. **Una sesión que ya estaba abierta con la clave vieja sigue respondiendo** —
   confirma que la rotación no cortó a nadie en medio de una operación:

   ```bash
   kubectl -n sgtm-<amb> logs deployment/sgtm-<amb>-aplicacion --tail=50 | grep -i "28P01"
   # no tiene que aparecer ninguna línea nueva de autenticación fallida
   ```

3. **El aislamiento se sostiene tras el `rollout restart`** — un pod nuevo con una
   configuración distinta es exactamente el tipo de cambio que podría, por accidente,
   levantar la aplicación con las credenciales equivocadas (`sgtm_owner` en vez de
   `sgtm_app`, que es lo que la comprobación 7 de `despliegue.yml` vigila):

   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     https://<dominio>/api/v1/cuentacorriente/deuda/<contribuyente-conocido>
   # tiene que devolver la deuda de ESA municipalidad, con su fecha — no otra
   ```

## Si no sale bien

| Síntoma | Qué hacer |
|---|---|
| El rol pedido es `superusuario` o `administrador de keycloak` | `rotar-clave.sh` los rechaza a propósito. El superusuario no se rota desde el nodo (`INF-06` §3.3: exigiría autenticar con el mismo rol que se está cambiando); el administrador de Keycloak es `kcadm.sh set-password` contra el propio Keycloak, documentado en `INF-06` §3.2 |
| `ALTER ROLE` falla con `permission denied` | El guion no se está ejecutando con una credencial que pueda alterar roles. Revisar que el `kubectl exec` esté contra el pod correcto y con el usuario correcto |
| El `rollout restart` no arranca el pod nuevo | `kubectl -n sgtm-<amb> describe pod` — si es `CrashLoopBackOff` por autenticación, el `Secret` no se actualizó antes del reinicio. Repetir el paso 3 del guion (`kubectl patch`) y reintentar el `rollout restart` |
| La comprobación 2 encuentra líneas `28P01` nuevas | Algo reinició una conexión con la clave vieja **antes** de que el `Secret` se propagara. Revisar que no haya un segundo proceso (una réplica manual, un `kubectl exec` de otra persona) usando la clave vieja en paralelo |

## Estado del ensayo

**Ensayado, contra un motor real:** `infra/secretos/verificar-rotacion.sh` abre una
sesión como `sgtm_app`, rota la clave, y comprueba las tres cosas de arriba —contra un
PostgreSQL real, local o en CI, usando los mismos guiones de inicialización que
`verificar-el-motor.sh` (`INF-06` §3.1). Es lo que demuestra que `ALTER ROLE` no cierra
sesiones abiertas, que es el hecho que sostiene todo este runbook.

**Lo que no está ensayado:** el camino completo por `kubectl exec` + `kubectl patch` +
`kubectl rollout restart` contra un clúster real con una aplicación real sirviendo
peticiones — eso necesita el VPS, y `INF-06` §6 ya lo dice así en vez de darlo por
probado.

## Documentos relacionados

[`INF-06`](../../80-infraestructura/gestion-de-secretos.md) §3 ·
[`infra/secretos/rotar-clave.sh`](../../../infra/secretos/rotar-clave.sh) ·
[`infra/secretos/verificar-rotacion.sh`](../../../infra/secretos/verificar-rotacion.sh)
