# Runbook — Liberar una versión, y revertirla

| Campo | Valor |
|---|---|
| Cuándo | Cada semana, o cuando un PR a `main` publica una versión nueva |
| Límite de reversión | Menos de 15 minutos, sin `pulumi up` (`ADR-0011` §5) |
| Estado del ensayo | **El mecanismo está ensayado contra un clúster real** (efímero, `kind`, en CI) en cada `push` a `main`. No está ensayado contra el `Deployment` real de `prod` — ver «Estado del ensayo» |

## Síntoma

No es una falla: es la operación de rutina que reemplaza «un despliegue es
`pulumi up`». Se usa este runbook siempre que haya que mover qué versión de la aplicación
corre, o volver a la anterior porque la nueva trae un defecto.

## Precondiciones

1. **Las tres imágenes ya están publicadas**, etiquetadas con el `sha` del commit —
   `publicar-imagenes.yml` lo hace en cada `push` a `main`. Confirmar que el `job`
   `aplicacion-y-migrador` de ese flujo terminó en verde para el commit que se quiere
   liberar.
2. **Si la versión trae migraciones de esquema**, el Job de migración con esa versión
   tiene que correr **antes** que el `Deployment` (paso 2, abajo). Al revés, la
   aplicación arranca contra un esquema que no tiene todavía.
3. Acceso al clúster (el mismo túnel SSH de CI, o `kubectl` ya configurado contra `stg`
   o `prod`).

## Pasos

### 1. Si hay migraciones, primero el Job

```bash
cd infra
yarn manifiestos --ambiente <amb> --componente migracion | kubectl apply -f -
kubectl -n sgtm-<amb> wait --for=condition=complete job/sgtm-<amb>-migracion-<sufijo> --timeout=300s
```

El nombre del Job lleva la versión (`sufijoDeVersion()` en
[`Migracion.ts`](../../../infra/componentes/Migracion.ts)): una versión nueva crea un Job
nuevo, y volver a aplicar la misma no hace nada — el migrador es idempotente. Si el Job
falla, ir a [La migración falló a mitad](la-migracion-fallo-a-mitad.md) **antes** de
seguir con el paso 2: liberar la imagen nueva contra un esquema a medias es el estado que
todo este orden existe para impedir.

### 2. Mover la etiqueta de la imagen

**La etiqueta no vive en el estado de Pulumi** (`ADR-0011` §5: el campo `image` lleva
`ignoreChanges`), así que esto es `kubectl`, nunca `pulumi up`:

```bash
kubectl -n sgtm-<amb> set image deployment/sgtm-<amb>-aplicacion \
  aplicacion=ghcr.io/hneyra/sgtm-aplicacion:<sha>
kubectl -n sgtm-<amb> rollout status deployment/sgtm-<amb>-aplicacion
```

Y lo mismo para la interfaz, con su imagen propia por ambiente
(`sgtm-interfaz:<amb>-<sha>` — dos imágenes porque Vite resuelve el emisor de identidad
al compilar, `publicar-imagenes.yml`):

```bash
kubectl -n sgtm-<amb> set image deployment/sgtm-<amb>-interfaz \
  interfaz=ghcr.io/hneyra/sgtm-interfaz:<amb>-<sha>
kubectl -n sgtm-<amb> rollout status deployment/sgtm-<amb>-interfaz
```

### 3. Si algo sale mal: revertir

Sin `pulumi up`, en segundos:

```bash
kubectl -n sgtm-<amb> rollout undo deployment/sgtm-<amb>-aplicacion
kubectl -n sgtm-<amb> rollout status deployment/sgtm-<amb>-aplicacion
```

`rollout undo` vuelve al `ReplicaSet` anterior completo — no hace falta recordar cuál
era la imagen vieja, Kubernetes ya la tiene en su historial de revisiones.

> **Si la versión revertida traía una migración aditiva**, el esquema se queda con la
> columna o tabla nueva y la aplicación vieja simplemente no la usa — es lo que RNF-073
> exige de toda migración («reversible o aditiva»). Revertir el esquema mismo **no**
> forma parte de este runbook: una migración que borra datos para «deshacerse» no pasa
> la regla 4 de `CLAUDE.md`.

## Cómo se comprueba que terminó bien

**No** «el `Deployment` está `Ready`». Dos comprobaciones, después de liberar o de
revertir:

1. **La versión que corre es la que se dijo que corre** — leído del clúster, nunca del
   archivo de Pulumi:

   ```bash
   kubectl -n sgtm-<amb> get deployment sgtm-<amb>-aplicacion \
     -o jsonpath='{.spec.template.spec.containers[0].image}'
   ```

2. **Una petición con un token real llega hasta datos filtrados por municipalidad**, no
   solo que `/actuator/health` devuelva `200` — un `Deployment` sano y una aplicación que
   perdió el contexto de tenant devuelven el mismo código:

   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     https://<dominio>/api/v1/cuentacorriente/deuda/<contribuyente-conocido>
   # tiene que devolver la deuda de ESE contribuyente, con su fecha (RNF-075) —
   # no un 200 vacío ni la de otra municipalidad
   ```

## Si no sale bien

| Síntoma | Qué hacer |
|---|---|
| `rollout status` no termina | `kubectl -n sgtm-<amb> describe pod <pod-nuevo>` — casi siempre `ImagePullBackOff` (la etiqueta no existe en el registro) o una sonda que no pasa |
| El Job de migración del paso 1 falla | [La migración falló a mitad](la-migracion-fallo-a-mitad.md) |
| Tras revertir, la comprobación 2 sigue mal | El problema no era la versión de la aplicación. Revisar Keycloak ([runbook](keycloak-no-responde.md)) o el motor de datos antes de volver a liberar nada |
| La reversión tarda más de 15 minutos | Eso significa que algo más está interviniendo — un `pulumi up` concurrente, o el clúster bajo presión de recursos. Ver [Mantenimiento del VPS](mantenimiento-del-vps.md) §diagnóstico |

## Estado del ensayo

**El mecanismo — no el `Deployment` real, que todavía no existe en `prod` — está
ensayado contra un clúster real en cada `push` a `main`**: el `job`
`demostrar-liberacion-y-reversion` de
[`publicar-imagenes.yml`](../../../.github/workflows/publicar-imagenes.yml) crea un
`Deployment` desechable en un clúster `kind` efímero, libera la imagen real recién
publicada con `kubectl set image`, la revierte con `kubectl rollout undo`, y **cronometra
las dos operaciones** — el límite es 900 s (15 min) y en la práctica tardan segundos.
Un centinela que intercepta cualquier invocación a `pulumi` confirma que ningún paso lo
usó.

Lo que ese job **no** prueba, porque no puede: que el `Deployment` sea el real de
`sgtm-<amb>-aplicacion` (bloqueado por #152, que todavía no crea ese recurso en un
clúster de verdad) y que el registro sea el de `prod` con tráfico real detrás. El
mecanismo — la parte que este ADR decidió que fuera independiente de Pulumi — ya se
demostró que funciona; lo que falta es correrlo sobre el recurso de verdad, el día que
exista.

## Documentos relacionados

[`ADR-0011`](../../30-arquitectura/adr/ADR-0011-infraestructura-como-codigo.md) §5, §6 ·
[`infra/README.md` §«Liberar una versión nueva»](../../../infra/README.md#liberar-una-versión-nueva) ·
[.github/workflows/publicar-imagenes.yml](../../../.github/workflows/publicar-imagenes.yml) ·
[La migración falló a mitad](la-migracion-fallo-a-mitad.md)
