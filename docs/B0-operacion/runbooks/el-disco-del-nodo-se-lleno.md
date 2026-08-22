# Runbook — El disco del nodo se llenó

| Campo | Valor |
|---|---|
| Cuándo | Alerta `DiscoDelNodoAlto` (>80 % de uso), o `PostgreSQLCaido` sin que el pod esté en `CrashLoopBackOff` |
| Por qué importa más aquí que en otra parte | Un solo nodo: WAL, imágenes de contenedor y registros crecen todos sobre el mismo volumen (`INF-01` §1, «el escenario más probable de los tres») |
| Estado del ensayo | **No ensayado contra un disco real llenándose.** El razonamiento está verificado por partes — ver «Estado del ensayo» |

## Síntoma

La alerta `DiscoDelNodoAlto` llega (`infra/observabilidad/alertas.yml`: más del 80 % del
sistema de archivos raíz por 5 minutos), o PostgreSQL deja de aceptar escrituras sin que
el pod esté reiniciando. Es distinto de «el nodo se cayó» — aquí `ping` y SSH siguen
respondiendo.

## Precondiciones

1. Acceso SSH al VPS, o `kubectl` contra el clúster (si el disco está tan lleno que ni
   siquiera el API de k3s responde, tratar como **pérdida del nodo** — ver
   [Reconstruir el VPS desde cero](reconstruir-el-vps-desde-cero.md)).
2. Saber **qué está creciendo**, antes de borrar nada — los tres sospechosos habituales
   con un solo nodo, en orden de probabilidad:

   ```bash
   ssh <usuario>@<vps> 'du -sh /var/lib/rancher/k3s/agent/containerd/* \
     /var/lib/postgresql/data/pg_wal \
     /var/log/containers 2>/dev/null | sort -rh | head -20'
   ```

## Pasos

### 1. Si es el WAL retenido

El WAL solo se retiene sin subir cuando el almacenamiento de objetos externo no está
accesible ([`INF-08`](../../80-infraestructura/respaldo-y-recuperacion.md) §1). **No se
borra a mano**: borrar segmentos de WAL sin archivar es perder el RPO sin que nada lo
avise. Primero restablecer el acceso al destino:

```bash
kubectl -n sgtm-<amb> logs deployment/sgtm-<amb>-postgres -c postgres | grep -i "archive"
# busca el motivo del fallo: credenciales, red, o el bucket mismo
```

Restablecido el acceso, wal-g drena el WAL acumulado solo — no hace falta ningún paso
manual más. Confirmar con:

```bash
kubectl -n sgtm-<amb> exec deployment/sgtm-<amb>-postgres -c postgres -- \
  psql -U postgres -c \
  "SELECT count(*) FROM pg_stat_archiver WHERE failed_count > 0"
```

### 2. Si son imágenes de contenedor viejas

Cada liberación deja atrás la imagen anterior. `crictl` (el cliente de containerd que
usa k3s) puede purgar las que ningún pod referencia:

```bash
ssh <usuario>@<vps> 'sudo k3s crictl rmi --prune'
```

**Nunca** purgar la imagen que un pod está usando en este momento — `--prune` ya lo
respeta, un `rm` manual no.

### 3. Si son registros de contenedor

Sin agregador de registros todavía (`INF-09` §9), lo único que hay es lo que k3s retiene
en el nodo. Reducir la retención es aceptable como medida temporal — **documentar que se
hizo**, porque reduce cuánto se puede investigar después:

```bash
ssh <usuario>@<vps> 'sudo journalctl --vacuum-size=500M'
```

### 4. Si nada de lo anterior libera suficiente

El disco está genuinamente lleno de datos legítimos —el padrón creció—. Esto ya no es un
runbook de emergencia: es
[Mantenimiento del VPS](mantenimiento-del-vps.md) §«redimensionar el disco», con su
propia ventana anunciada.

## Cómo se comprueba que terminó bien

**No** «el uso del disco bajó del 80 %». Un disco con espacio libre y PostgreSQL que
sigue sin aceptar escrituras no está resuelto:

1. **PostgreSQL acepta una escritura de verdad**, con observación —no una lectura, la
   regla 10 exige observación en toda escritura—:

   ```bash
   kubectl -n sgtm-<amb> exec deployment/sgtm-<amb>-postgres -c postgres -- \
     psql -U sgtm_app -d sgtm -c \
     "SET LOCAL sgtm.municipalidad_id = '<id>'; \
      INSERT INTO auditoria_<ejercicio> (tabla, operacion, observacion, usuario) \
      VALUES ('runbook', 'VERIFICACION', 'comprobacion disco lleno', 'sistema')"
   ```

2. **El aislamiento se sostiene** — el mismo par de consultas que
   [Restaurar a un punto en el tiempo](restaurar-a-un-punto-en-el-tiempo.md#cómo-se-comprueba-que-terminó-bien)
   usa, porque liberar espacio purgando lo que sea no debería haber tocado RLS, y la
   forma de saberlo es comprobándolo, no asumiéndolo.

3. **La alerta `DiscoDelNodoAlto` deja de estar en `firing`** en la propia API de
   Alertmanager — es la confirmación de que la causa raíz, no solo el síntoma momentáneo,
   se resolvió.

## Si no sale bien

| Síntoma | Qué hacer |
|---|---|
| El disco se llena de nuevo en días | No es un incidente, es una tendencia. Ir directo a [Mantenimiento del VPS](mantenimiento-del-vps.md) para redimensionar, en vez de repetir este runbook cada semana |
| `pg_stat_archiver` sigue con `failed_count > 0` tras restablecer el acceso | El problema no era solo de red — revisar credenciales del almacenamiento de objetos (`backupAccessKeyId`/`backupSecretAccessKey`, `INF-06` §1.1) |
| `crictl rmi --prune` no libera nada | Las imágenes en uso son las que ocupan espacio — es señal de que hay demasiadas versiones desplegadas a la vez, no un problema de basura acumulada |
| El nodo entra en `DiskPressure` y empieza a desalojar pods | Ya no hay margen para diagnosticar con calma. Liberar espacio de la forma más rápida posible (purgar imágenes primero, es lo menos arriesgado) y tratar lo que sigue como si el nodo se hubiera perdido si no se estabiliza en minutos |

## Estado del ensayo

**No ensayado contra un disco real llenándose** — eso necesita un VPS con volumetría
real. Lo que sí está verificado, por partes:

- Que `archive_mode=on` y que el WAL se archiva de verdad: en cada PR
  (`INF-08` §5).
- Que la alerta `DiscoDelNodoAlto` llega a alguien cuando el umbral se cruza: el mismo
  mecanismo que `verificar-alertas.sh` demuestra para `PostgreSQLCaido`
  (`INF-09` §6) — la regla en sí no se ha ejercitado con un disco real al 80 %.
- Que `crictl rmi --prune` no toca una imagen en uso: es comportamiento documentado de
  containerd, no algo que este repositorio verifique.

## Documentos relacionados

[`INF-01`](../../80-infraestructura/arquitectura-de-infraestructura.md) §5 ·
[`INF-08`](../../80-infraestructura/respaldo-y-recuperacion.md) §1 ·
[`INF-09`](../../80-infraestructura/observabilidad-y-alertas.md) §5 (la regla
`DiscoDelNodoAlto`) · [Mantenimiento del VPS](mantenimiento-del-vps.md)
