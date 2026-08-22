# Runbook — Reconstruir el VPS desde cero

| Campo | Valor |
|---|---|
| Cuándo | Pérdida total del nodo: el proveedor lo destruye, el disco no arranca, el VPS se cancela por error |
| RTO objetivo | 4 horas (RNF-077) |
| Estado del ensayo | **No ejecutado.** Este runbook describe el procedimiento; no está cronometrado contra un VPS real. Ver «Estado del ensayo» |

## Síntoma

El nodo no responde a `ping` ni a SSH, y no vuelve. Se distingue de «el disco se llenó»
(ese runbook primero) y de «el pod de PostgreSQL murió» (se repone solo,
[`INF-01`](../../80-infraestructura/arquitectura-de-infraestructura.md) §5) en que aquí
**no hay nada a lo que conectarse**: ni el API de k3s por el túnel SSH, ni el propio SSH.

## Precondiciones

1. **Acceso a los cuatro secretos de GitHub Actions** (`PULUMI_ACCESS_TOKEN`,
   `SSH_PRIVATE_KEY`, `VPS_USER`, `VPS_HOST`) o a quien pueda regenerarlos —
   [`infra/README.md` §«Cómo llegar a un VPS real»](../../../infra/README.md#cómo-llegar-a-un-vps-real)
   pasos 3 y 4.
2. **Un respaldo reciente y accesible fuera del VPS** (el punto de todo `INF-01` §1.3):
   el archivado de WAL y los respaldos base viven en almacenamiento de objetos externo,
   así que perder el nodo no se lleva el respaldo con él. Verificarlo es el paso 1 de
   [Restaurar a un punto en el tiempo](restaurar-a-un-punto-en-el-tiempo.md).
3. **Acceso a la cuenta del proveedor del VPS**, para levantar uno nuevo.
4. **Una ventana de indisponibilidad ya anunciada** — no hay forma de que esta
   reconstrucción sea transparente (RNF-078, `ADR-0011` «Negativas»).

## Pasos

### 1. Un VPS nuevo, con k3s

Fuera del alcance de este repositorio — es trabajo contra la cuenta del proveedor, no
algo que un manifiesto pueda automatizar. El resultado que hace falta es el kubeconfig
del nodo nuevo, con el `server` apuntado al bucle local
([`INF-01`](../../80-infraestructura/arquitectura-de-infraestructura.md) §1.4):

```bash
# En el VPS nuevo, tras instalar k3s:
sudo cat /etc/rancher/k3s/k3s.yaml | \
  sed 's#server: https://127.0.0.1:6443#server: https://localhost:6443#' \
  > k3s-nuevo.yaml
```

### 2. El cortafuegos, antes que nada más

```bash
scp infra/vps/cortafuegos.sh <usuario>@<vps-nuevo>:
ssh <usuario>@<vps-nuevo> 'sudo ./cortafuegos.sh'
```

Se corre **antes** de exponer ningún servicio: es lo que deja 6443, 10250 y 5432 fuera
del alcance de internet ([`infra/vps/cortafuegos.sh`](../../../infra/vps/cortafuegos.sh)).

### 3. Actualizar el kubeconfig en Pulumi Cloud

El VPS nuevo tiene una IP y una huella SSH distintas. Actualizar el secreto **de
arranque** — nunca un secreto de la aplicación, que sigue viviendo en el clúster nuevo
una vez que exista ([`INF-06`](../../80-infraestructura/gestion-de-secretos.md) §1.1):

```bash
cd infra
pulumi config set --secret kubeconfig "$(cat k3s-nuevo.yaml)" --stack <amb>
```

También la clave SSH de despliegue, si el VPS nuevo no reconoce la anterior
(`infra/README.md` paso 3): un par nuevo, la pública en su propia línea de
`authorized_keys`, y `SSH_PRIVATE_KEY` actualizado en `Settings → Secrets` de GitHub.

### 4. Aplicar el stack completo

```bash
infra/secretos/bootstrap-secretos.sh --ambiente <amb>   # antes de pulumi up, siempre
cd infra && pulumi up --stack <amb>
```

`bootstrap-secretos.sh` genera las cinco claves de la aplicación sin que nadie las
teclee ([`INF-06`](../../80-infraestructura/gestion-de-secretos.md) §2); `pulumi up`
crea el clúster entero desde `index.ts` — el mismo artefacto que ya corría, no uno
reconstruido a mano.

### 5. Restaurar el padrón

Ir a [Restaurar a un punto en el tiempo](restaurar-a-un-punto-en-el-tiempo.md) completo,
con el instante objetivo **el más reciente posible** — aquí no hay un instante malo que
evitar, solo minimizar cuánto se pierde dentro del RPO de 5 minutos.

### 6. Verificar antes de apuntar el DNS

No mover el DNS todavía. Con el clúster nuevo sirviendo en su IP, correr la
comprobación completa de la sección de abajo **contra la IP directa** (o un dominio de
prueba), antes de que un solo contribuyente real llegue a él.

### 7. Apuntar el DNS

Cambiar el registro A/AAAA del dominio de `prod` a la IP del VPS nuevo. La propagación
no es instantánea: el TTL del registro decide cuánto tarda en verse desde todas partes.

## Cómo se comprueba que terminó bien

Además de las dos comprobaciones de [Restaurar a un punto en el
tiempo](restaurar-a-un-punto-en-el-tiempo.md#cómo-se-comprueba-que-terminó-bien)
(aislamiento sostenido, deuda con fecha), específicas de una reconstrucción completa:

1. **El cortafuegos responde lo que tiene que responder, y nada más — desde fuera**:

   ```bash
   nmap -Pn -p 22,80,443,5432,6443,10250 <vps-nuevo>
   # abiertos: 22, 80, 443. Cerrados: 5432, 6443, 10250
   ```

   Comprobarlo **desde dentro** del VPS no demuestra nada:
   [`cortafuegos.sh`](../../../infra/vps/cortafuegos.sh) lo dice en su propia salida.

2. **La escalera de identidad completa responde con el código correcto en cada peldaño**
   — la misma que verifica `despliegue.yml`, contra el sistema real:

   | Petición | Respuesta esperada |
   |---|---|
   | Sin token | `401 NO_AUTENTICADO` |
   | Token de otro emisor | `401 NO_AUTENTICADO` |
   | Token del realm, sin el claim | `403 SIN_MUNICIPALIDAD` |
   | El administrador, en lo suyo | `200` |

   El último peldaño es el que importa: confirma que Keycloak emite, el backend valida,
   el claim se lee, la municipalidad está implantada y los permisos existen — no solo
   que algo responde en el puerto 443.

3. **El respaldo del clúster nuevo ya está corriendo** — no basta con que el padrón se
   haya restaurado una vez; el `CronJob` diario y el archivado continuo tienen que
   quedar activos, o el sistema reconstruido nace ya sin RPO:

   ```bash
   kubectl -n sgtm-<amb> get cronjob sgtm-<amb>-respaldo
   kubectl -n sgtm-<amb> exec deployment/sgtm-<amb>-postgres -c postgres -- \
     psql -U postgres -c "SHOW archive_mode"   # tiene que ser "on"
   ```

## Si no sale bien

| Síntoma | Qué hacer |
|---|---|
| `pulumi up` falla con un recurso ya existente | El stack de Pulumi cree que el clúster anterior sigue ahí. `pulumi refresh --stack <amb>` antes de reintentar |
| El túnel SSH del paso 3 no conecta | La clave pública nueva no llegó a `authorized_keys` del VPS, o el cortafuegos del paso 2 no dejó pasar el 22. Revisar en ese orden |
| La escalera de identidad se queda en `403 SIN_MUNICIPALIDAD` | El Job de implantación no corrió o falló — ir a [La migración falló a mitad](la-migracion-fallo-a-mitad.md), que cubre también la implantación |
| `nmap` muestra 5432 o 6443 abiertos | `cortafuegos.sh` no se ejecutó, o se ejecutó antes de que `ufw` estuviera instalado. Repetir el paso 2 antes de seguir — con esos puertos abiertos, no hay reconstrucción que valga |

## Estado del ensayo

**Este es el runbook que el issue #158 exige ensayar, y no está ensayado.** La razón es
concreta, no una omisión: los cinco pasos de
[`infra/README.md` §«Cómo llegar a un VPS real»](../../../infra/README.md#cómo-llegar-a-un-vps-real)
siguen sin darse — no hay VPS, no hay stacks de Pulumi inicializados contra un proveedor
real, no hay clave SSH de despliegue, no hay secretos de GitHub Actions, no hay
*environment* `prod` con aprobación. Los cuatro trabajos de `infra.yml` que hablan con un
clúster real se omiten con un aviso en cada corrida, no en rojo, mientras falte
cualquiera de esas credenciales — es una decisión ya tomada (`ADR-0011` §6), no un
defecto de este runbook.

Lo que **sí** está verificado hoy, en piezas, contra sistemas reales:

| Pieza del procedimiento | Cómo se verifica hoy |
|---|---|
| El cortafuegos deja exactamente 22/80/443 | El propio guion documenta la comprobación con `nmap`, pero no hay VPS contra el que correrla en CI |
| `bootstrap-secretos.sh` genera las cinco claves sin repetir ninguna | 14 pruebas, sin clúster (`INF-06` §1) |
| El ciclo de respaldo y restauración (paso 5) | En cada PR, contra un motor real (`INF-08` §5) |
| El manifiesto completo del clúster | 49 pruebas, sin Pulumi ni nodo (`infra/verificaciones/`) |
| El motor arranca con los roles y privilegios correctos | `verificar-el-motor.sh`, contra un motor real |
| Que ningún paso de la liberación invoque Pulumi | Job `demostrar-liberacion-y-reversion`, contra un clúster `kind` efímero |

Lo que falta, y solo un VPS real lo da: **el procedimiento entero, de punta a punta,
cronometrado.** El día que exista `stg`, correr este runbook contra él, con el tiempo
real anotado aquí mismo — con fecha, duración y lo que salió mal la primera vez, que es
el criterio de aceptación del issue #158 y el que distingue un runbook ensayado de uno
que solo se escribió.

## Documentos relacionados

[`INF-01`](../../80-infraestructura/arquitectura-de-infraestructura.md) §1, §5, §7 ·
[`infra/README.md` §«Cómo llegar a un VPS real»](../../../infra/README.md#cómo-llegar-a-un-vps-real) ·
[Restaurar a un punto en el tiempo](restaurar-a-un-punto-en-el-tiempo.md) ·
[`ADR-0011`](../../30-arquitectura/adr/ADR-0011-infraestructura-como-codigo.md) ·
[Decisiones abiertas](../../00-gobierno/decisiones-abiertas.md) — D-01
