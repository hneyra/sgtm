# Runbook — Mantenimiento del VPS

| Campo | Valor |
|---|---|
| Cuándo | Actualización del sistema operativo, reinicio del nodo, redimensionar disco/CPU/memoria, aplicar la reserva de recursos del nodo, renovación de certificado que no se resolvió sola |
| Regla que gobierna todo esto | RNF-078: **toda ventana se anuncia antes de abrirse** — con un solo nodo no hay a dónde mover la carga mientras dura |
| Estado del ensayo | No ensayado contra un VPS real — ver «Estado del ensayo» |

## Síntoma

No siempre es una falla: puede ser una actualización planeada. También es el destino de
varias alertas que, por sí solas, no dicen qué hacer — este runbook empieza por un
diagnóstico que las distingue.

### Diagnóstico por alerta

| Alerta | Qué significa | Acción |
|---|---|---|
| `CPUDelNodoAlta` / `MemoriaDelNodoAlta` | Promedio de 5 minutos por encima del umbral — sostenido, no un pico | §1 si es una carga identificable y legítima (una emisión, una carga masiva); redimensionar (§3) si es una tendencia |
| `PresionDeCPUDelNodo` | PSI sostenido — satura **antes** de que el promedio de 5 minutos lo vea; es la señal que precede a un `CrashLoopBackOff` por sondas que expiran | Igual que arriba, pero más urgente: actuar antes de que aparezcan pods muertos |
| `PodEnCrashLoopBackOff` | Un pod específico reinicia en bucle | `kubectl describe pod` primero — si el motivo es memoria (`OOMKilled`) o CPU, es síntoma de presión del nodo y este runbook aplica; si es otra cosa (una migración fallida, Keycloak), ir al runbook específico |
| `PodNoListo` | Un pod corriendo lleva 10 minutos sin pasar sus sondas | Mismo diagnóstico que `CrashLoopBackOff`: revisar si es presión de recursos o una falla propia del componente |
| `CertificadoPorExpirar` | Menos de 14 días para el vencimiento TLS | §4 |
| `DiscoDelNodoAlto` | **No es este runbook** | [El disco del nodo se llenó](el-disco-del-nodo-se-lleno.md) — con la salvedad de que si el disco se llena de forma recurrente, la salida es §3 de aquí |

## Precondiciones

1. **La ventana está anunciada**, con quien atiende ventanilla sabiendo que el sistema
   no va a responder durante ese tiempo (RNF-078).
2. Acceso SSH al VPS y `kubectl` contra el clúster.
3. Fuera de las ventanas de vencimiento tributario
   ([`INF-03`](../../80-infraestructura/ambientes.md) §5: «la regla que más fricción
   genera y la que más protege»).

## Pasos

### 1. Verificar que la carga alta es legítima antes de tocar nada

```bash
kubectl top pods -n sgtm-<amb>
kubectl top nodes
```

Si hay un `CronJob` de `lote` corriendo fuera de su ventana declarada (02:00 hora de
Perú, [`INF-01`](../../80-infraestructura/arquitectura-de-infraestructura.md) §2), o una
carga masiva a mano, eso puede bastar como explicación sin que haga falta redimensionar
nada — esperar a que termine y confirmar que baja.

### 2. Reiniciar el nodo (actualización de kernel, mantenimiento del proveedor)

Sin réplica que promover, esto **es** la ventana de indisponibilidad
(`ADR-0011` «Negativas»):

```bash
ssh <usuario>@<vps> 'sudo reboot'
# esperar, y confirmar que k3s vuelve:
kubectl -n sgtm-<amb> get pods -w
```

k3s reprograma los pods al volver. El único que necesita revisión aparte es PostgreSQL
—`strategy: Recreate` en su `Deployment` es lo que impide que un segundo pod intente
montar el mismo volumen `ReadWriteOnce` y se quede colgado (`INF-01` §4)—.

### 3. Redimensionar disco, CPU o memoria

Depende del proveedor del VPS — el paso que este repositorio no puede automatizar. Tras
el cambio, si el proveedor exige reinicio, es el mismo procedimiento del paso 2.

### 4. Aplicar la reserva de CPU/memoria del nodo (`kube-reserved`/`system-reserved`)

**Reinicia k3s**, es decir, corta el API server unos segundos —va en su propia ventana,
no mezclada con un `pulumi up` que además cambie otra cosa
([`INF-01`](../../80-infraestructura/arquitectura-de-infraestructura.md) §4—:

```bash
ssh <usuario>@<vps> 'sudo systemctl restart k3s'
```

Es la reserva que existe para que una ráfaga de la aplicación no deje sin CPU al kubelet
—el incidente concreto que `../iaac` ya sufrió (`INF-01` §2)—.

### 5. Certificado que no renovó solo

Let's Encrypt renueva con el desafío HTTP-01, que necesita el puerto 80 abierto y
Traefik sirviendo. Si `CertificadoPorExpirar` sigue activa pasadas 24 horas:

```bash
kubectl -n sgtm-<amb> logs deployment/traefik | grep -i acme
```

Las causas más probables: el puerto 80 dejó de estar abierto (revisar
[`cortafuegos.sh`](../../../infra/vps/cortafuegos.sh) del VPS), o el DNS del dominio dejó
de apuntar al nodo actual.

## Cómo se comprueba que terminó bien

**No** «`kubectl get nodes` muestra `Ready`». Un nodo listo con RLS caída o con Keycloak
emitiendo contra el realm equivocado también se ve `Ready`:

1. **El aislamiento se sostiene** tras el reinicio o el cambio — las dos consultas de
   [Restaurar a un punto en el tiempo](restaurar-a-un-punto-en-el-tiempo.md#cómo-se-comprueba-que-terminó-bien).
2. **La deuda de un contribuyente conocido sale con su fecha**, con el mismo total que
   antes de la ventana — un reinicio no debería haber cambiado ninguna cifra.
3. **Las alertas que motivaron la ventana volvieron a estado normal** en Alertmanager —
   no solo que dejaron de aparecer en el resumen, sino que la serie en Prometheus
   muestra el valor bajo el umbral, no solo silenciada.

## Si no sale bien

| Síntoma | Qué hacer |
|---|---|
| PostgreSQL no vuelve tras el reinicio del paso 2 | Revisar que el `Deployment` use `strategy: Recreate` y no `RollingUpdate` — con el segundo, un pod nuevo compite por el mismo volumen y se cuelga sin decir por qué |
| `systemctl restart k3s` del paso 4 no vuelve a responder | El API server puede tardar más de lo esperado en un nodo con recursos ya ajustados de más. Esperar 2-3 minutos antes de tratarlo como pérdida del nodo |
| El certificado sigue sin renovar tras confirmar el puerto 80 y el DNS | Revisar la cuota de Let's Encrypt (rate limit) — si se agotó reintentando, hay que esperar la ventana del proveedor, no seguir reintentando |
| La presión de CPU/memoria vuelve enseguida tras redimensionar | El dimensionamiento de [`INF-01`](../../80-infraestructura/arquitectura-de-infraestructura.md) §2 son estimaciones, no mediciones (bloqueado por D-01). Documentar la volumetría real encontrada — es exactamente el dato que falta para corregir esas estimaciones |

## Estado del ensayo

**No ensayado contra un VPS real.** Todo lo que sostiene la mecánica de este runbook está
verificado por partes, contra un `kind` real o contra manifiestos:

- Que `RollingUpdate` sobre el volumen de la base se pone rojo en la auditoría de
  manifiestos, sin necesitar un clúster (`infra/verificaciones/`, 49 pruebas).
- Que las convenciones de sondas, límites y prioridad de `INF-01` §4 son invariantes que
  `auditoria.ts` exige sobre cada manifiesto antes de aplicarlo.
- Que la alerta `PresionDeCPUDelNodo` está escrita con el mismo umbral que el incidente
  real de `../iaac` que la motivó.

Lo que falta: aplicar la reserva de nodo y confirmar que el API server vuelve dentro de
un tiempo razonable, y redimensionar un disco de verdad bajo escritura activa — ninguno
de los dos se puede ensayar sin el VPS.

## Documentos relacionados

[`INF-01`](../../80-infraestructura/arquitectura-de-infraestructura.md) §2, §4 ·
[`ADR-0011`](../../30-arquitectura/adr/ADR-0011-infraestructura-como-codigo.md)
«Negativas» · [`INF-09`](../../80-infraestructura/observabilidad-y-alertas.md) §5 ·
[El disco del nodo se llenó](el-disco-del-nodo-se-lleno.md)
