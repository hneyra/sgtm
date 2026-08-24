# Runbook — Reconstruir el VPS desde cero

| Campo | Valor |
|---|---|
| Cuándo | Pérdida total del nodo: el proveedor lo destruye, el disco no arranca, el VPS se cancela por error |
| RTO objetivo | 4 horas (RNF-077) |
| Estado del ensayo | **Ejecutado en su totalidad, 2026-08-24 —en dos VPS distintos.** Pasos 3–5 contra el VPS real de `stg` (Contabo): secreto de arranque, `pulumi up` del stack completo, y el PITR en sí —359s, medidos, con `--contra-cluster`—. Pasos 1–2 contra una VPS nueva de un proveedor distinto (AWS EC2), levantada solo para esto y ya destruida: aprovisionamiento, `k3s` nativo, `cortafuegos.sh` en un sistema operativo recién instalado, y el stack completo desplegado y sano encima. Catorce defectos de infraestructura, dos de documentación y un piso de memoria confirmado, en el camino. Ver «Estado del ensayo» |

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

**2026-08-24. Primer ensayo real, contra el VPS de `stg` (`vmd194233`, k3d).** El VPS ya
existía; lo que se reconstruyó desde cero fue su clúster —el propio operador lo destruyó
y lo volvió a crear— y sobre eso corrieron los pasos 3 y 4: actualizar el secreto de
arranque en Pulumi y `pulumi up` del stack completo, contra el clúster real, sin
Docker local para las pruebas de aislamiento (`-Dsgtm.pruebas.postgres.url` no aplicó
aquí porque el motor de la prueba fue el propio clúster). Los pasos 1 y 2 —VPS nuevo
desde el proveedor, cortafuegos de un sistema operativo recién instalado— **no se
ensayaron**: el sistema operativo del VPS no se tocó, solo su carga de Kubernetes. Ese
sigue siendo el hueco más grande del ensayo.

Lo que sí se ensayó, de punta a punta, fue reconstruir el stack entero sobre un clúster
vacío. Y ejecutarlo — no revisarlo — encontró **once defectos reales** que ninguna
revisión de código había visto, seis documentados aparte
(`infra: seis defectos reales...`, commit `803359e`) y cinco más en esta misma sesión:

| # | Defecto | Cómo se encontró | Commit |
|---|---|---|---|
| 7 | El Job de migración se conecta a postgres apenas arranca la JVM, sin reintento: pierde la carrera contra la propagación de la `NetworkPolicy` de un pod recién creado y agota su `backoffLimit` sin correr una sola migración | Reproducido a mano: la misma conexión sin espera falla, con `sleep 3` antes funciona siempre | `c3ddcbf` |
| 8 | La comprobación del mapeador `municipalidad_id` del realm usaba `kcadm --fields 'protocolMappers(name,config)'`, que nunca proyecta el `config` anidado: el Job fallaba siempre, con el mapeador correctamente puesto | `get clients/<id>` sin filtrar sí trae el `config`; con `--fields`, siempre vacío | `c3ddcbf` |
| 9 | `sgtm_app` no tenía `SELECT` sobre `flyway_schema_history` (V7 la dejó fuera a propósito, por no ser tabla de negocio); el contenedor de espera de `implantacion` la consulta con esas credenciales y esperaba en bucle algo que nunca iba a poder ver | `implantacion` llevaba 4 h en `Init:0/1` con la migración ya terminada hacía 3 h | `c3ddcbf` + migración `V21` |
| 10 | `psql --command`/`-c` no interpola `:'var'` en este cliente: las tres consultas del `CronJob` de respaldo (abrir la fila `EN_CURSO`, cerrarla `EXITOSO`/`FALLIDO`) llegaban a Postgres con el token literal — `syntax error at or near ":"`, siempre, en cualquier corrida | Reproducido a mano: `--command` no interpola, el mismo `-v` por `stdin` (heredoc) sí | `998fc78` |
| 11 | El binario oficial de wal-g está enlazado contra glibc; `postgres:16.4-alpine` es musl. El motor llevaba desde su primer WAL sin poder archivar ninguno (`sh: /opt/wal-g/wal-g: not found`, exit 127, cada `archive_timeout`), y el `CronJob` de respaldo fallaba en `backup-push` por lo mismo. **Afecta igual a `prod`**: usa la misma imagen | Logs del motor real, siete intentos idénticos del Job de migración con el mismo síntoma de fondo | `e83f1e4` |
| 14 | Contra un S3 real, sin `AWS_REGION`: el SDK firma cada petición con la región incluida, y su ausencia no da un error de permisos — da uno de firma que no dice cuál es la región correcta | `variablesWalg` solo tenía `AWS_ENDPOINT`; se agregó `backupRegion` como valor obligatorio de configuración | pendiente |
| 15 | `backup-push` con `PGDATABASE` sin fijar: libpq usa el nombre del usuario como base por omisión, y `sgtm_respaldo` no es una base — `database "sgtm_respaldo" does not exist`. El primer intento de arreglo fue peor: `PGDATABASE=sgtm` conectó, pero `sgtm_respaldo` no tiene `CONNECT` ahí **a propósito** (`40-rol-de-respaldo.sh`: `pg_backup_start`/`stop` son del clúster entero, no de una base) — `permission denied for database "sgtm"` | Reproducido a mano, dos veces, hasta dar con `PGDATABASE=postgres` | pendiente |
| 16 | `respaldo-base` sin `runAsUser`: hereda root, pero `capabilities.drop: ["ALL"]` le quita `CAP_DAC_OVERRIDE`, y PGDATA se monta en modo `0700` — root sin esa capacidad no lo puede leer (`PgControl file not found... permission denied`). Fijar `runAsUser: 70` (el dueño) rompió a su vez el primer paso del guion, que instala `gcompat` con `apk add` y necesita escribir la base de paquetes de la imagen, propiedad de root: `Unable to lock database: Permission denied`. La salida es una tercera: seguir como root, pero devolverle solo `CAP_DAC_READ_SEARCH` —lectura, no `CAP_DAC_OVERRIDE`, que además dejaría escribir | Reproducido a mano, tres veces, hasta dar con la capacidad exacta | pendiente |

Los defectos 7–11 se corrigieron, se aplicaron contra el clúster real con `pulumi up`, y
se confirmaron ahí mismo — no solo en las pruebas. El estado al cerrar esa sesión: los 9
`Deployment` sanos, los 3 `Job` (`migracion`, `implantacion`, `realm`) en `Complete`, el
`CronJob` de respaldo escribiendo bien sus filas de auditoría, y wal-g ejecutando de
verdad (se ve corriendo bajo el cargador de `gcompat`, en vez de morir al instante) — pero
contra el marcador de posición `s3.example.net`, así que sin poder confirmar que un
respaldo *llegue* a destino.

**2026-08-24, más tarde el mismo día: se decidió el proveedor — AWS S3.** Los buckets
`sgtm-stg-respaldos` y `sgtm-prod-respaldos` se crearon (`us-east-1`, acceso público
bloqueado, cifrado por omisión) y se conectaron con las credenciales que ya estaban en
`GitHub Secrets`. Conectar un S3 real —no un marcador, no un simulacro— sacó a la luz los
defectos 14–16, los tres corregidos y confirmados contra el bucket real:

- **Archivado continuo**: 35 segmentos de WAL, confirmados con `aws s3 ls`, no solo con
  `pg_stat_archiver`.
- **Respaldo base**: `Respaldo #6 EXITOSO` en la tabla `respaldo`, con `base_*_backup_stop_sentinel.json`
  confirmado en el bucket — las filas `FALLIDO` #1–5 de los intentos anteriores **no se
  borraron**, quedan como el rastro honesto de lo que costó llegar ahí (regla 4).

Con esto, el bloqueo del defecto 11 queda cerrado: ya hay un extremo real, y un respaldo
—continuo y base— *llega* a destino. Lo que sigue sin poder cerrarse no es la conexión al
almacenamiento, es la restauración en sí — ver «Lo que queda pendiente» abajo.

**La escalera de identidad, contra el sistema real, con los cuatro peldaños en el
código que le corresponden:**

| Petición | Esperado | Obtenido |
|---|---|---|
| Sin token | `401` | `401` |
| Token de otro emisor (realm `master`, no `sgtm`) | `401` | `401` |
| Token del realm, sin el claim `municipalidad_id` | `403 SIN_MUNICIPALIDAD` | `403`, `"codigo":"SIN_MUNICIPALIDAD"` |
| El administrador, en lo suyo (`GET /api/v1/seguridad/auditoria`) | `200` | `200`, 26 filas reales de la propia implantación |

Los cuatro contra `GET /api/v1/seguridad/auditoria?ejercicio=2026`, por
`kubectl port-forward` directo al Service (sin tocar DNS ni ingreso, siguiendo el paso 6
del procedimiento). Los dos usuarios de Keycloak que hicieron falta —`administrador` con
`municipalidad_id=1`, y `sin-municipalidad` sin el atributo, solo para este peldaño— no
los siembra ningún manifiesto: se crean con
[`despliegue/identidad/crear-usuario.sh`](../../../despliegue/identidad/crear-usuario.sh),
adaptado de `docker compose exec` a `kcadm` contra el clúster. Quedan en el realm de
`stg` para el próximo ensayo.

**El aislamiento sostenido y la deuda con fecha** —las dos comprobaciones que
[Restaurar a un punto en el tiempo](restaurar-a-un-punto-en-el-tiempo.md) exige— también
se corrieron, 2026-08-24, sin una restauración real de por medio (el detalle completo y
sus dos hallazgos —un GUC mal documentado, una ruta que nunca se ejecutó— quedan en el
«Estado del ensayo» de ese runbook, no repetidos aquí). Sembraron una segunda
municipalidad de un solo uso (`999999`) y una cadena sintética de deuda, marcadas las dos
como ensayo en cada campo de trazabilidad: no son datos reales, y `es_demostracion=true`
en `stg` lo confirma en cualquier documento que las toque.

**2026-08-24, más tarde el mismo día: el paso 5, restaurar a un punto en el tiempo, de
verdad.** `simulacro-de-restauracion.sh --contra-cluster` ahora existe
([`infra/respaldo/contra-cluster.sh`](../../../infra/respaldo/contra-cluster.sh)) y se
ejecutó contra `stg` real: apagó el `Deployment` en marcha, preservó `PGDATA` sin
borrarla, restauró el último respaldo base desde AWS S3 en un pod temporal, y dejó que
el motor —con el mismo `command`/`args` que ya tenía— entrara en recuperación solo hasta
un instante objetivo real. **359 segundos**, desde apagar el `Deployment` hasta que la
reproducción del WAL llegó de verdad al objetivo (`pg_get_wal_replay_pause_state() =
'paused'`, no solo el socket respondiendo). Promovido, con una escritura real después.
El detalle completo —qué se escribió, qué se comprobó, qué queda sin limpiar a
propósito— vive en el «Estado del ensayo» de
[Restaurar a un punto en el tiempo](restaurar-a-un-punto-en-el-tiempo.md#estado-del-ensayo),
no repetido aquí.

**2026-08-24, más tarde el mismo día: los pasos 1–2, contra una VPS nueva de verdad.**
El VPS de `stg` (Contabo) es infraestructura en uso: destruirlo para ensayar «el
proveedor lo destruye» habría sido destruir lo que ya sostiene el resto de este
ensayo. En su lugar, una VPS aparte —AWS EC2, otro proveedor, levantada solo para
esto y destruida al terminar— para probar exactamente lo que el clúster k3d de los
pasos 3–5 no podía: el sistema operativo y el proveedor, no lo que corre encima.

1. **Un VPS nuevo, con k3s.** Ubuntu 24.04 LTS recién instalada; `curl -sfL
   https://get.k3s.io | sudo sh -` instaló k3s **nativo** —no k3d— sin nada que
   ajustar. El kubeconfig, con el `server` reescrito, funcionó igual que documenta
   `infra/README.md`.

2. **El cortafuegos, antes que nada más.** `cortafuegos.sh` corrió por primera vez
   contra un sistema operativo que nunca había tenido `ufw` — «Rules updated» de
   principio a fin, sin un solo ajuste. Confirmado **desde fuera**, como exige el
   propio guion: `22` abierto, `80`/`443` abiertos a nivel de cortafuegos —rechazados
   solo porque nada escuchaba ahí todavía, no bloqueados: la diferencia entre
   `Connection refused` y un `timeout` es exactamente esa—, y `5432`/`6443`/`10250`
   genuinamente cerrados (`timeout`, sin respuesta).

   **El piso de memoria, confirmado aparte:** el primer intento, en una instancia de
   4 GB, se quedó con la mitad del stack en `Pending` por `Insufficient memory` antes
   de programar `interfaz` — 4 GB no alcanza. Con 16 GB, el mismo despliegue entró
   con margen. El detalle vive en
   [`arquitectura-de-infraestructura.md`](../../80-infraestructura/arquitectura-de-infraestructura.md#2-dimensionamiento-inicial)
   §2, no repetido aquí.

3. **El stack completo, desplegado y sano.** No con `pulumi up`: Pulumi exige que el
   nombre del stack sea literalmente `stg` o `prod` (`config.ts` lo valida), y los
   dos ya apuntan a sus VPS reales — commandeer esa identidad, aunque fuera
   temporalmente, se descartó por el riesgo frente al beneficio, dado que `pulumi up`
   reconstruyendo desde cero ya se había demostrado extensamente en los pasos 3–5.
   En su lugar, los mismos 69 objetos que emite `yarn manifiestos --ambiente stg`,
   aplicados con `kubectl apply` directo, más `bootstrap-secretos.sh` y las dos
   piezas que en un `pulumi up` real pone `index.ts` —el `Secret` de credenciales de
   S3, y el de `ghcr-pull` que en este ensayo no salía de ningún manifiesto—. Resultó
   en los 9 `Deployment` sanos, los 3 `Job` completados, y `GET /actuator/health`
   respondiendo `200`. Reprodujo, de paso, el mismo hallazgo ya conocido de la imagen
   del migrador pineada sin la migración `V21` (issue #158, ya documentado arriba):
   el mismo `GRANT` de emergencia lo resolvió aquí también.

**Lo que esto no reemplaza:** el VPS de `stg` real (Contabo) nunca se destruyó ni se
reconstruyó — sigue siendo el mismo desde que existe. Lo que se demostró es que el
*procedimiento* —aprovisionar, cerrar el cortafuegos, desplegar el stack— funciona
contra un proveedor y un sistema operativo genuinamente nuevos, no que se ejecutó
sobre la VPS que de verdad sostiene `stg`. Es la misma distinción que ya hacía este
runbook sobre el clúster k3d: ensayar perder el nodo dentro del nodo que se pierde no
es ensayarlo.

Con esto, los ocho runbooks están escritos y **el de reconstrucción, ejecutado en su
totalidad** — el único criterio de aceptación de #158 que queda abierto es el que
depende de D-02a (una cifra de deuda real), que no es trabajo de este runbook.

Lo que ya estaba verificado antes de este ensayo, en piezas, sin VPS real:

| Pieza del procedimiento | Cómo se verifica |
|---|---|
| `bootstrap-secretos.sh` genera las cinco claves sin repetir ninguna | 14 pruebas, sin clúster (`INF-06` §1) |
| El ciclo de respaldo y restauración (paso 5) | En cada PR, contra un motor real (`INF-08` §5) |
| El manifiesto completo del clúster | 49 pruebas, sin Pulumi ni nodo (`infra/verificaciones/`) |
| El motor arranca con los roles y privilegios correctos | `verificar-el-motor.sh`, contra un motor real |
| Que ningún paso de la liberación invoque Pulumi | Job `demostrar-liberacion-y-reversion`, contra un clúster `kind` efímero |

## Documentos relacionados

[`INF-01`](../../80-infraestructura/arquitectura-de-infraestructura.md) §1, §5, §7 ·
[`infra/README.md` §«Cómo llegar a un VPS real»](../../../infra/README.md#cómo-llegar-a-un-vps-real) ·
[Restaurar a un punto en el tiempo](restaurar-a-un-punto-en-el-tiempo.md) ·
[`ADR-0011`](../../30-arquitectura/adr/ADR-0011-infraestructura-como-codigo.md) ·
[Decisiones abiertas](../../00-gobierno/decisiones-abiertas.md) — D-01
