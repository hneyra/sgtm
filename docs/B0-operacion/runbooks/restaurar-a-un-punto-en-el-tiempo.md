# Runbook — Restaurar a un punto en el tiempo

| Campo | Valor |
|---|---|
| Cuándo | Borrado accidental, corrupción de datos, o el primer paso de una reconstrucción completa |
| RTO objetivo | Parte del RTO de 4 horas de RNF-077 ([`INF-01`](../../80-infraestructura/arquitectura-de-infraestructura.md) §5) |
| RPO objetivo | 5 minutos (RNF-076) |
| Estado del ensayo | **El procedimiento se ensaya en cada PR** que toca `infra/`, contra un PostgreSQL real ([`INF-08`](../../80-infraestructura/respaldo-y-recuperacion.md) §5). Las dos comprobaciones de «Cómo se comprueba que terminó bien» ya se corrieron contra `stg` real, 2026-08-24 — con datos sintéticos, sin una restauración real de por medio. **No** se ha ensayado el PITR en sí contra `stg`: bloqueado en el proveedor de almacenamiento de objetos, no en D-01 (ver «Estado del ensayo» abajo) |

## Síntoma

Alguien borró filas que no debía, una migración corrompió datos, o hace falta volver el
padrón a como estaba antes de un instante conocido. **No** es el síntoma de «el nodo se
perdió entero» — para eso, primero [reconstruir el VPS](reconstruir-el-vps-desde-cero.md)
y usar este runbook como su paso 5.

## Precondiciones

1. **Un instante objetivo claro**, en UTC. «Antes de la escritura mala» no basta: hace
   falta el segundo. Si no se sabe, se busca en `auditoria_<ejercicio>` (regla 4 de
   `CLAUDE.md`: nada se borra, así que la escritura mala sigue ahí, con su fecha).
2. **Un respaldo base anterior al instante objetivo, y el WAL sucesivo, accesibles.**
   Se verifica **antes** de tocar nada:

   ```bash
   kubectl -n sgtm-<amb> exec deployment/sgtm-<amb>-postgres -c postgres -- \
     wal-g backup-list
   ```

   Si el último respaldo `EXITOSO` en la tabla `respaldo` (RF-126) tiene más de 26 horas,
   o no hay ninguno: **el problema no es este runbook, es que el respaldo no corrió** —
   eso es [`INF-08`](../../80-infraestructura/respaldo-y-recuperacion.md) §3, y hay que
   arreglar el `CronJob` antes de seguir. Restaurar desde un respaldo que no se sabe si
   es bueno no es restaurar: es adivinar. Esta precondición es la razón de que la alerta
   `RespaldoQueNoCorrio` apunte a este runbook.
3. **Una ventana de mantenimiento anunciada** (RNF-078): restaurar corta el servicio
   mientras dura.
4. La clave de cifrado de wal-g (`WALG_LIBSODIUM_KEY`) del `Secret`
   `sgtm-<amb>-respaldo`, y la **anterior** si el respaldo objetivo es más viejo que la
   última rotación (`INF-08` §4: rotar la clave no vuelve a cifrar lo ya escrito).

## Pasos

1. **Anunciar la ventana** y detener la aplicación para que no siga escribiendo sobre lo
   que se va a reemplazar:

   ```bash
   kubectl -n sgtm-<amb> scale deployment/sgtm-<amb>-aplicacion --replicas=0
   ```

2. **Confirmar el instante objetivo contra la tabla de auditoría** antes de destruir
   nada — es la última oportunidad de comprobar que el segundo es el correcto:

   ```bash
   kubectl -n sgtm-<amb> exec deployment/sgtm-<amb>-postgres -c postgres -- \
     psql -U sgtm_owner -d sgtm -c \
     "SELECT id, tabla, fecha_hora FROM auditoria_<ejercicio> \
      WHERE fecha_hora > '<instante-objetivo>' ORDER BY fecha_hora LIMIT 20"
   ```

3. **Detener PostgreSQL y preservar el volumen actual** sin borrarlo todavía — es la red
   de seguridad si el instante objetivo resulta ser el equivocado:

   ```bash
   kubectl -n sgtm-<amb> scale deployment/sgtm-<amb>-postgres --replicas=0
   kubectl -n sgtm-<amb> exec -it <pod-con-el-volumen-montado> -- \
     mv /var/lib/postgresql/data /var/lib/postgresql/data.antes-de-restaurar
   ```

4. **Restaurar el respaldo base y fijar el punto de recuperación.** El mecanismo exacto
   —`recovery_target_time`, `wal-g backup-fetch`, promoción— es el que
   [`respaldo/simulacro-de-restauracion.sh`](../../../infra/respaldo/simulacro-de-restauracion.sh)
   ya ejecuta paso a paso contra un motor real; este runbook reproduce esos mismos pasos
   contra el volumen del clúster, no contra uno efímero de CI:

   ```bash
   infra/respaldo/simulacro-de-restauracion.sh --ambiente <amb> \
     --instante-objetivo '<instante-objetivo>' --contra-cluster
   ```

   > **`--contra-cluster` no existe todavía.** El guion de hoy solo corre contra un motor
   > que él mismo levanta ([`INF-08`](../../80-infraestructura/respaldo-y-recuperacion.md)
   > §6). Adaptarlo para apuntar al volumen de un clúster real es trabajo pendiente de
   > este mismo runbook — ver «Estado del ensayo».

5. **Arrancar PostgreSQL** y confirmar que promociona (deja de estar en modo
   recuperación y admite escrituras):

   ```bash
   kubectl -n sgtm-<amb> scale deployment/sgtm-<amb>-postgres --replicas=1
   kubectl -n sgtm-<amb> exec deployment/sgtm-<amb>-postgres -c postgres -- \
     psql -U postgres -c "SELECT pg_is_in_recovery()"   # tiene que devolver f
   ```

6. **Reanudar la aplicación** solo después del paso 7 (la comprobación), no antes.

## Cómo se comprueba que terminó bien

**No** «la aplicación responde». Dos comprobaciones, contra el sistema restaurado y
conectando como `sgtm_app` — nunca como superusuario, que omite RLS
([`CLAUDE.md`](../../../CLAUDE.md) §«La prueba de aislamiento»):

1. **El aislamiento se sostiene.** Con dos municipalidades sembradas antes del instante
   objetivo, cada una ve solo la suya:

   ```bash
   kubectl -n sgtm-<amb> exec deployment/sgtm-<amb>-postgres -c postgres -- \
     psql -U sgtm_app -d sgtm -c \
     "SET LOCAL app.municipalidad_id = '<id-municipalidad-1>'; \
      SELECT count(*) FROM predio"
   # y de nuevo con el id de la municipalidad 2: el conteo tiene que cambiar
   ```

   > El GUC es `app.municipalidad_id`, no `sgtm.municipalidad_id` —
   > confirmado contra `V6__rls.sql` y el propio motor real (issue #158): con el
   > nombre equivocado, `sgtm_app` no ve el error de RLS, ve
   > `unrecognized configuration parameter`, antes de llegar siquiera a la política.

2. **La deuda de un contribuyente conocido sale con su fecha** (RNF-075), y **coincide
   al céntimo** con lo que se sabía que tenía a esa fecha antes del incidente — no un
   número plausible, el número exacto:

   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     "https://<dominio>/api/v1/consultas/deuda?codContribuyente=<codigo>&fechaDeCorte=<aaaa-mm-dd>"
   # la respuesta trae "actualizadoA" por cada concepto y el total tiene que cuadrar
   # con el registro previo — sin fechaDeCorte, se calcula a hoy
   ```

   > La ruta es `/api/v1/consultas/deuda`, con `codContribuyente` y `fechaDeCorte` como
   > parámetros de consulta — no `/api/v1/cuentacorriente/deuda/<id>` en la ruta, que no
   > existe (issue #158: la ruta original de este runbook nunca se ejecutó contra el
   > sistema real).

Si las dos pasan, se reanuda la aplicación (`replicas=1`) y se borra
`data.antes-de-restaurar` **solo después de que la ventanilla confirme que el padrón se
ve correcto**, no en el mismo paso.

## Si no sale bien

| Síntoma | Qué hacer |
|---|---|
| `pg_is_in_recovery()` sigue en `t` pasados varios minutos | El WAL no llegó hasta el `recovery_target_time`. Revisar que el respaldo base elegido sea **anterior** al instante objetivo, no posterior |
| El conteo de la comprobación 1 es igual para las dos municipalidades | RLS no quedó activa tras la restauración — **no reanudar la aplicación**. Revisar que las políticas de `V6__rls.sql` estén en el esquema restaurado antes de seguir |
| La cifra de la comprobación 2 no cuadra | El instante objetivo restauró de más o de menos. Volver al paso 3 (el volumen preservado sigue ahí), elegir otro instante y repetir — **no** intentar corregir la cifra a mano |
| El respaldo no se puede leer con la clave configurada | Probar con la clave **anterior** a la última rotación (`INF-08` §4). Si tampoco funciona, el respaldo está perdido: buscar uno más antiguo y aceptar la pérdida de RPO adicional, documentándola |

## Estado del ensayo

**Lo que sí está probado, contra un PostgreSQL real:** el ciclo entero —archivado,
respaldo base, cifrado, PITR, verificación, promoción— corre en cada PR que toca
`infra/`, y las seis formas de romperlo a propósito lo ponen en rojo
([`INF-08`](../../80-infraestructura/respaldo-y-recuperacion.md) §5.1).

**2026-08-24, contra `stg` real, sin una restauración de por medio** —el VPS ya existe;
lo que falta es la restauración en sí, no el sistema sobre el que correría—, se
ejecutaron las dos comprobaciones de arriba tal cual quedan escritas ahora:

1. **El aislamiento se sostiene**, con una segunda municipalidad sembrada a mano
   (`999999`, «Municipalidad de Ensayo (aislamiento #158)», nunca comiteada como
   infraestructura: es un `Job` de implantación de un solo uso, igual que
   `crear-usuario.sh` para los usuarios de Keycloak). `predio` dio 1 fila en la
   municipalidad 1 y 0 en la 2; lo mismo para `contribuyente`. Encontró además el bug
   del GUC de arriba: con `sgtm.municipalidad_id`, la comprobación ni siquiera llega a
   evaluar la política.

2. **La deuda con fecha, con una cadena sintética explícita** —un contribuyente, un
   predio, un `conjunto_parametros` sin sellar y un asiento `INSOLUTO`/`CARGO` de
   `1234.56`, todos con `usuario_registro`/`motivo` marcados «ensayo-158», nunca
   escritos por un caso de uso real—: `GET /api/v1/consultas/deuda` devolvió
   `total.importe: "1234.56"` con `fechaDeCorte` igual a la fecha del asiento, y `"0"`
   un día antes — la fecha exacta, no una aproximada, exactamente lo que
   `deudaActualizadaA(fecha)` promete (regla 9). El código de la municipalidad 2 no
   encontró ese contribuyente: sin fuga entre tenants, tampoco en este endpoint.
   Encontró de paso el bug de la ruta de arriba, y que `porContribuyente` resuelve las
   obligaciones existentes a través de `saldo_proyectado` —un índice, no la fuente de
   verdad (`ConsultarDeuda`)— antes de recalcular desde el libro: sin una fila ahí, la
   API no encuentra nada que recalcular aunque el asiento real exista.

   **Lo que esto demuestra y lo que no:** que la ruta completa —ledger, índice de
   descubrimiento, `deudaActualizadaA`, RLS— funciona de punta a punta con una cifra
   exacta y una fecha exacta. **No** demuestra que `1234.56` sea lo que un predio real
   debería pagar: no hay una sola regla de cálculo tributario implementada todavía
   (D-02a sigue abierta), y esta cifra se escribió a mano, nunca la calculó el sistema.
   La comprobación de verdad —número calculado antes del incidente contra número que
   sale después de restaurar— sigue sin poder correr hasta que exista ese cálculo.

**Lo que este runbook todavía no tiene:**

- La bandera `--contra-cluster` del paso 4, que hoy no existe: el guion solo restaura
  sobre un motor que él mismo levanta, no sobre el volumen de un `Deployment` en marcha.
- Ejecución completa contra `stg`, con datos anonimizados de volumetría real
  ([`INF-03`](../../80-infraestructura/ambientes.md) §2) — es donde saldría el RTO real,
  no el de 2 segundos con 4 filas que mide el simulacro de hoy.
- La restauración desde el almacenamiento de objetos externo, en vez del sistema de
  archivos local que usa el simulacro (`INF-08` §6): bloqueada en la decisión del
  proveedor de almacenamiento de objetos, sin la cual `sgtm:backupEndpoint` sigue
  siendo el marcador `s3.example.net` — no en D-01, que ya se cerró en su mitad de
  municipalidad piloto.
- Una comprobación 2 con una cifra real, calculada por el sistema: depende de D-02a,
  no de este runbook ni del VPS.

## Documentos relacionados

[`INF-08`](../../80-infraestructura/respaldo-y-recuperacion.md) ·
[`INF-03`](../../80-infraestructura/ambientes.md) §2 ·
[Reconstruir el VPS desde cero](reconstruir-el-vps-desde-cero.md) (paso 5 de ese runbook
es este) · [`infra/respaldo/simulacro-de-restauracion.sh`](../../../infra/respaldo/simulacro-de-restauracion.sh)
