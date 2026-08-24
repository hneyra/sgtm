# Runbook — La migración falló a mitad

| Campo | Valor |
|---|---|
| Cuándo | El Job de migración o de implantación quedó en `Failed`, y la aplicación no arranca (se queda esperando el esquema, por diseño — ver «Por qué la aplicación no arranca sola») |
| Alerta relacionada | `JobDeMigracionFallido` |
| Estado del ensayo | La idempotencia del migrador y de la implantación está probada. El procedimiento de diagnóstico de este runbook, contra un `Job` real y fallido, no está ensayado — ver «Estado del ensayo» |

## Síntoma

`kubectl get pods` muestra la aplicación en `Init` indefinidamente, o el pod de espera
(`espera-migracion` / `espera-implantacion`, [`Migracion.ts`](../../../infra/componentes/Migracion.ts))
no pasa nunca. La alerta `JobDeMigracionFallido` confirma que el Job mismo terminó en
`Failed`, no solo que va lento.

## Por qué la aplicación no arranca sola

Es intencional, no un síntoma más: el pod de espera consulta la base —no el estado del
Job en el API de Kubernetes— porque «el Job dice completado» y «el esquema está aplicado»
son afirmaciones distintas
([`Migracion.ts`](../../../infra/componentes/Migracion.ts), javadoc de cabecera). La
aplicación sirviendo peticiones sobre un esquema a medias es el estado que este diseño
existe para impedir.

## Precondiciones

1. Acceso `kubectl` al ambiente.
2. **No reintentar el Job a ciegas.** El nombre del Job lleva la versión —un Job es
   inmutable en Kubernetes—, así que hay que entender **por qué** falló antes de decidir
   si corresponde: reintentar la misma versión (el Job es idempotente, correrlo de nuevo
   no aplica dos veces lo que ya aplicó), corregir y liberar una versión nueva, o
   revertir.

## Pasos

### 1. Diagnosticar cuál de los dos Jobs falló, y por qué

```bash
kubectl -n sgtm-<amb> get jobs -l app.kubernetes.io/component=migracion
kubectl -n sgtm-<amb> logs job/sgtm-<amb>-migracion-<sufijo>
```

Las causas más comunes, distinguibles por el mensaje:

| Mensaje | Causa | Qué hacer |
|---|---|---|
| `Checksum mismatch for migration` | Alguien editó un archivo `V*.sql` ya aplicado | **Nunca** editar una migración aplicada. Crear una `V` nueva que corrija; no tocar la existente |
| `must not be superuser` / `must not have BYPASSRLS` | El migrador se está conectando con la credencial equivocada | El `Secret` del Job no es el de `sgtm_owner`, o `sgtm_owner` quedó mal creado. Revisar `20-asignar-claves.sh` |
| Faltan los cuatro roles | La base es nueva y `crear-roles.sql` no corrió antes que la migración | Revisar el orden de inicialización de `base` — la migración se niega a correr sin los cuatro roles, a propósito |
| Un error de sintaxis SQL o de restricción violada | Un defecto real de la migración | No es un runbook de operación: es un defecto de código. Revertir a la versión anterior (§3) y arreglar en un PR |

### 2. Si la causa está resuelta, reintentar la misma versión

El migrador y la implantación son idempotentes — lo que ya se aplicó no se repite:

```bash
kubectl -n sgtm-<amb> delete job sgtm-<amb>-migracion-<sufijo>
yarn manifiestos --ambiente <amb> --componente migracion | kubectl apply -f -
kubectl -n sgtm-<amb> wait --for=condition=complete job/sgtm-<amb>-migracion-<sufijo> --timeout=300s
```

### 3. Si la causa es un defecto de la migración misma, revertir

Volver a la versión anterior de la aplicación con
[Liberar una versión, y revertirla](liberar-una-version-y-revertirla.md). **La migración
que ya se aplicó parcialmente no se deshace sola** — RNF-073 exige que toda migración sea
reversible o aditiva, así que la corrección correcta es una migración nueva que arregle
lo que quedó a medias, no un `DROP` contra lo que el Job alcanzó a crear.

## Cómo se comprueba que terminó bien

**No** «el Job dice `Completed`». Es precisamente la distinción que
[`Migracion.ts`](../../../infra/componentes/Migracion.ts) ya hace: el Job completado y el
esquema aplicado no son lo mismo.

1. **`flyway_schema_history` no tiene ninguna fila fallida**, y la última corresponde a
   la migración esperada:

   ```bash
   kubectl -n sgtm-<amb> exec deployment/sgtm-<amb>-postgres -c postgres -- \
     psql -U sgtm_owner -d sgtm -c \
     "SELECT version, success FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 5"
   ```

2. **La aplicación arranca y el aislamiento se sostiene** sobre el esquema recién
   aplicado — no basta con que la migración haya corrido, hace falta que las políticas
   de RLS de la migración sigan separando a las municipalidades:

   ```bash
   kubectl -n sgtm-<amb> rollout status deployment/sgtm-<amb>-aplicacion
   # y las dos consultas de aislamiento de "Restaurar a un punto en el tiempo"
   ```

3. **Si la migración tocaba una tabla existente**, la deuda de un contribuyente conocido
   sigue saliendo con su fecha (RNF-075) y con el mismo total que antes — una migración
   de esquema no debería cambiar una cifra de negocio.

## Si no sale bien

| Síntoma | Qué hacer |
|---|---|
| El reintento del paso 2 vuelve a fallar con el mismo mensaje | La causa no estaba resuelta — volver al paso 1, no seguir reintentando |
| `flyway_schema_history` tiene una fila con `success = false` que nadie limpia | Flyway se niega a aplicar nada más hasta que se resuelva manualmente — es deliberado, no un error del guion. Requiere decidir con criterio de negocio si la migración parcial se completa o se revierte, no un comando genérico |
| La implantación (no la migración) es la que falló | Mismo procedimiento, contra `esperaDeImplantacion` — pero revisar además que `SGTM_ADMINISTRADOR` coincida con un usuario que exista en Keycloak, que es la causa más común de que la implantación por sí sola falle |
| Tras revertir la aplicación, el esquema sigue con la migración a medias | Es el estado esperado (RNF-073: aditiva). No afecta a la versión anterior si esta no usa las columnas nuevas. Documentar y corregir con una migración nueva en el siguiente PR |

## Estado del ensayo

**Ensayado:** que el migrador y la implantación son idempotentes, con su prueba
correspondiente; que el migrador se niega a correr como superusuario o con `BYPASSRLS`
(el trabajo `motor`, contra un PostgreSQL real); que el pod de espera consulta la base y
no el estado del Job.

**No ensayado:** el procedimiento de diagnóstico de este runbook contra un Job realmente
fallido en un clúster real — hoy se prueba que el mecanismo de espera funciona, no que
alguien, siguiendo estos pasos, resuelve un fallo real en el tiempo esperado.

## Documentos relacionados

[`infra/componentes/Migracion.ts`](../../../infra/componentes/Migracion.ts) ·
[`INF-01`](../../80-infraestructura/arquitectura-de-infraestructura.md) §4.1
(`verificarAislamiento` no se ejecuta contra un motor en servicio — mismo principio: los
roles son del clúster) · [Liberar una versión, y revertirla](liberar-una-version-y-revertirla.md)
