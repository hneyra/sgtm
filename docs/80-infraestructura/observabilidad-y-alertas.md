# INF-09 — Observabilidad y alertas

| Campo | Valor |
|---|---|
| Versión | 0.1 |
| Fecha | 2026-08-21 |
| Estado | Borrador |
| Decisión de origen | issue #156 |
| Depende de | #152 — la aplicación desplegada en el clúster |

Saber qué está pasando en el VPS **antes** de que lo cuente el funcionario de ventanilla
por teléfono. Métricas, registros —vía `kubectl logs`, no hay agregador de registros
todavía—, tableros y —la parte que se olvida— alertas que **le lleguen a alguien**.

## 1. Autoalojado, no Grafana Cloud

El issue dejaba la decisión abierta, con su costo escrito: *«Grafana Cloud —como hace
`../iaac`— o una pila propia en el nodo. La decisión se escribe con su costo: una pila
propia consume del mismo VPS que atiende a la municipalidad.»*

| | Grafana Cloud (`../iaac`) | Autoalojado (lo elegido) |
|---|---|---|
| Se verifica en CI sin una cuenta de pago | No | Sí, contra un `kind` real |
| Las métricas y los registros salen del VPS | Sí | No |
| Las alertas dependen de un servicio externo | Sí | No |
| Costo | Plan de Grafana Cloud | CPU y memoria del mismo VPS |

Es la misma decisión que ya tomaron PostgreSQL y Keycloak dentro del clúster
(`ADR-0011`): lo que se pierde es la comodidad de una plantilla de grafana.com; lo que
se gana es poder demostrar, en un PR de cualquiera, que el sistema entero —regla,
evaluación, entrega— funciona, sin depender de credenciales que este repositorio no
puede fabricar.

## 2. Las piezas, y por qué cada una

| Pieza | Rol | Por qué existe |
|---|---|---|
| **Prometheus** | Scrapea, evalúa las reglas, guarda 15 días | El corazón: todo lo demás lee de aquí o escribe aquí |
| **Alertmanager** | Enruta las alertas activas al receptor configurado | Sin él, una regla en rojo es un gráfico, no un aviso |
| **`postgres-exporter`** | Sidecar del motor, con `sgtm_monitor` | Métricas de PostgreSQL: conexiones, locks, filas leídas/escritas |
| **node-exporter** | CPU, memoria, disco, PSI del nodo | El único componente con `hostNetwork`/`hostPID`: ve el nodo, no un contenedor |
| **kube-state-metrics** | Estado de los objetos de Kubernetes | El único componente con RBAC propio (ver §3) |
| **Grafana** | Tableros | Nunca en una `IngressRoute` — igual que la consola de Keycloak |
| **Traefik** (reconfigurado) | Vencimiento de certificados | `metrics.prometheus.entryPoint` en `Ingreso.ts`; no es un componente nuevo |

Objetivos **estáticos**, no descubrimiento por el API de Kubernetes: el conjunto de
cosas que scrapear es conocido y pequeño —un VPS—, así que Prometheus no necesita una
cuenta de servicio con permiso de lectura sobre el clúster entero. `Observabilidad.ts`
tiene el detalle completo de cada pieza.

## 3. kube-state-metrics: el único RBAC de todo `infra/`

Es, por definición, el único componente que necesita hablar con el API de
Kubernetes —su trabajo es convertir el estado de los objetos en métricas—. Su
`ClusterRole` está acotado a lo que las reglas y el tablero realmente usan:

```
pods, nodes, persistentvolumeclaims, deployments, jobs, cronjobs — solo list/watch
```

Nunca `secrets` ni `configmaps`, y nunca un verbo de escritura. `componentes.test.ts`
lo fija como invariante: pedirle a esta lista un privilegio de más se pone rojo.

## 4. `sgtm_monitor`, y por qué no es un componente aparte

`postgres-exporter` vive en el **mismo pod** que PostgreSQL (`BaseDeDatos.ts`), no en un
`Deployment` propio: comparte la red del pod y se conecta por `localhost`. Usa
`sgtm_monitor` —creado por
[`inicializacion/50-rol-de-monitoreo.sh`](../../infra/componentes/inicializacion/50-rol-de-monitoreo.sh)—,
con `pg_monitor`, el rol predefinido de PostgreSQL desde la versión 10: da `SELECT`
sobre las vistas de estadísticas, nada de DDL y nada de las tablas del padrón. Nunca el
superusuario, nunca `sgtm_owner`.

## 5. Diez reglas, evaluadas cada 30 segundos

[`observabilidad/alertas.yml`](../../infra/observabilidad/alertas.yml) — estático,
compartido entre `stg` y `prod`: los `job` que nombra (`aplicacion`, `postgres`,
`node`, ...) no llevan el nombre del ambiente, así que la misma regla sirve para los
dos.

| Regla | Qué dispara |
|---|---|
| `PostgreSQLCaido` | `pg_up == 0` por 2 minutos |
| `JobDeMigracionFallido` | Un Job de migración terminó en `Failed` |
| `RespaldoQueNoCorrio` | A las 08:00 UTC, ningún respaldo `EXITOSO` en las últimas 26 horas (issue #155, RNF-079) |
| `PodEnCrashLoopBackOff` | Un pod reinicia en bucle |
| `PodNoListo` | Un pod corriendo lleva 10 minutos sin pasar sus sondas |
| `CPUDelNodoAlta` / `MemoriaDelNodoAlta` | Promedio de 5 minutos por encima de 80 %/85 % |
| `DiscoDelNodoAlto` | Disco raíz por encima del 80 % — modo de falla de primera clase con un solo nodo (`INF-01`) |
| `CertificadoPorExpirar` | Menos de 14 días para que venza un certificado TLS |
| `PresionDeCPUDelNodo` | PSI de CPU sostenida — la señal del incidente de `../iaac` del 2026-05-29, que el promedio de 5 minutos no alcanza a ver antes de que las sondas expiren |

## 6. Sin receptor, la regla se evalúa y nadie se entera — y eso se demuestra

Es la frase que gobierna todo el diseño de Alertmanager: *«una regla que no notifica a
nadie no es una alerta, es un gráfico»*. `config.ts` lo hace una invariante: **`prod`
exige `alertWebhookUrl`**, con el mismo mensaje citando el incidente de `../iaac` —
reglas evaluándose durante meses sin destino, y una caída que nadie vio.

Sin el valor, Alertmanager enruta a `null-receiver`: la alerta se evalúa, aparece en la
propia API de Alertmanager, y no sale ningún aviso. Es un estado real, no un accidente
—`stg` arranca así a propósito, porque es lo que permite demostrar la diferencia entre
«la regla está roja» y «alguien se enteró»—.

[`observabilidad/verificar-alertas.sh`](../../infra/observabilidad/verificar-alertas.sh)
lo prueba contra un clúster real, en CI, en cada PR: apaga PostgreSQL, espera a que
`PostgreSQLCaido` llegue a `firing` (el `for: 2m` real, no acortado), y comprueba **dos
cosas** contra el mismo evento —sin cablear el receptor, un receptor de prueba recibe
cero peticiones; cableado, recibe la alerta—.

## 7. Los tableros, y cómo se sabe que no dicen «No data»

Un solo tablero —[`resumen-operativo.json`](../../infra/observabilidad/dashboards/resumen-operativo.json)—,
con una fila por área: JVM y Spring Boot, PostgreSQL, el nodo, los pods. Provisionado
como archivo, no importado por ID de grafana.com: no necesita salir a internet al
arrancar.

[`observabilidad/verificar-tableros.sh`](../../infra/observabilidad/verificar-tableros.sh)
extrae la expresión de cada panel y la ejecuta contra un Prometheus real, en CI. Falla
nombrando el panel si alguna vuelve vacía. PostgreSQL, el nodo y los pods los miden
exportadores reales; los dos paneles de la aplicación —sin imagen publicable desde este
repositorio— se comprueban contra un exportador **sintético** que sirve los mismos
nombres de métrica que Micrometer publicaría. Se dice así, sin adornarlo: la aplicación
real no se ha probado aquí, solo el mecanismo que la leería.

## 8. Las métricas no son públicas

`/actuator/prometheus` responde sin token —igual que `/actuator/health`—, y lo que lo
mantiene fuera de alcance **no es la cadena de seguridad de Spring**: es que ninguna
`IngressRoute` enruta ahí. `Ingreso.ts` reenvía `/api/v1` al servicio de la aplicación y
todo lo demás va a la interfaz, que no conoce `/actuator/*`; Prometheus llega por la red
interna del clúster. Es el mismo modelo que protege el puerto de PostgreSQL: de red, no
de aplicación. El docstring de `SeguridadWeb.java` lo dice con todas sus letras, para
que nadie publique esa ruta sin saber la consecuencia.

Grafana **nunca** está en una `IngressRoute` —como la consola de administración de
Keycloak (issue #153)—: se administra por el mismo túnel SSH que ya usa CI.

## 9. Lo que sigue sin verificarse, y por qué

| Sin verificar | Qué haría falta |
|---|---|
| El tablero de la aplicación, con la aplicación real | Una imagen publicada. El exportador sintético prueba el mecanismo, no el dato |
| Que la notificación llegue a un canal real —Slack, correo, PagerDuty— | El `alertWebhookUrl` de `Pulumi.prod.yaml` es un receptor de ejemplo; el real se decide con el patrocinador |
| Registros centralizados y buscables sin `kubectl logs` | Un agregador (Loki u otro). Fuera del alcance mínimo de este issue |
| El presupuesto de recursos de seis pods más en un VPS de un solo nodo | Medición real, cuando exista el VPS (`INF-01` §2 sigue en estimaciones) |

## 10. Documentos relacionados

[`INF-01`](arquitectura-de-infraestructura.md) §4 (prioridades y presión de memoria) ·
[`INF-08`](respaldo-y-recuperacion.md) (la regla `RespaldoQueNoCorrio` lee su
`CronJob`) · [`ADR-0011`](../30-arquitectura/adr/ADR-0011-infraestructura-como-codigo.md) ·
[`infra/README.md`](../../infra/README.md)
