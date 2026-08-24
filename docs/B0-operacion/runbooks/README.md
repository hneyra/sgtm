# B0 — Runbooks de operación

| Campo | Valor |
|---|---|
| Decisión de origen | issue #158, parte de #159 |
| Depende de | #155 (respaldo y su simulacro) · #156 (observabilidad y alertas) |

Un runbook por cada cosa que va a pasar, escrito **antes** de que pase. Se escriben para
quien está solo un sábado — no para quien los escribió — y por eso cada uno lleva pasos
copiables, con el nombre real de cada recurso, y no «revisar la configuración».

La carpeta homónima del SRTM (`docs/B0-operacion/runbooks/`) existe y está vacía: es el
precedente que este issue existe para no repetir.

## Los ocho

| Runbook | Cuándo |
|---|---|
| [Restaurar a un punto en el tiempo](restaurar-a-un-punto-en-el-tiempo.md) | Borrado accidental, corrupción, desastre |
| [Reconstruir el VPS desde cero](reconstruir-el-vps-desde-cero.md) | Pérdida total del nodo |
| [Liberar una versión, y revertirla](liberar-una-version-y-revertirla.md) | Cada semana |
| [Rotar la clave de un rol de base de datos](rotar-la-clave-de-un-rol.md) | Trimestral o tras un incidente |
| [El disco del nodo se llenó](el-disco-del-nodo-se-lleno.md) | Cuando llega la alerta del 80 % |
| [Keycloak no responde](keycloak-no-responde.md) | Nadie puede entrar; quien está dentro sigue hasta que expire su token |
| [La migración falló a mitad](la-migracion-fallo-a-mitad.md) | El Job quedó rojo y la aplicación no arranca |
| [Mantenimiento del VPS](mantenimiento-del-vps.md) | Actualización del sistema, reinicio del nodo, presión de CPU/memoria/disco, certificado por vencer |

## La misma estructura, siempre

Cada runbook tiene las mismas cinco secciones, en el mismo orden: **Síntoma**,
**Precondiciones**, **Pasos**, **Cómo se comprueba que terminó bien**, **Si no sale
bien**. Quien ya conoce uno sabe dónde buscar en cualquier otro.

## Lo que no se negocia en «cómo se comprueba que terminó bien»

**Ninguna comprobación de este documento es «el servicio responde».** Responde también
un sistema restaurado a medias, sin políticas de RLS activas, o con Keycloak emitiendo
tokens que nadie valida contra el emisor correcto. Cada runbook comprueba, contra el
sistema real:

1. **Que el aislamiento se sostiene** — `sgtm_app` ve una municipalidad, no todas. Es la
   misma afirmación que `verificarAislamiento` hace en CI, aplicada al sistema que acaba
   de recuperarse, no a un contenedor de prueba.
2. **Que la deuda de un contribuyente sale con su fecha** (RNF-075) — no un número
   suelto: un número con la fecha a la que está actualizado, que es lo único que
   distingue una cifra correcta de una que parece correcta.

Un runbook que solo comprueba un código 200 puede darse por terminado sobre un sistema
que ya perdió el aislamiento entre municipalidades, y nadie lo notaría hasta la primera
petición cruzada.

## Estado del ensayo, honesto

**El runbook de reconstrucción no está ensayado.** Ensayarlo — la única forma de que un
RTO deje de ser una aspiración — exige un VPS real, y hoy no existe ninguno: los cinco
pasos de [`infra/README.md` §«Cómo llegar a un VPS real»](../../../infra/README.md#cómo-llegar-a-un-vps-real)
siguen sin darse, bloqueados por que D-01 (municipalidad piloto) sigue abierta
([`decisiones-abiertas.md`](../../00-gobierno/decisiones-abiertas.md)). Cada runbook dice,
en su propia sección de estado, qué parte de su procedimiento **sí** se ejecuta hoy
contra un sistema real — y cuál no, y por qué. Escribir el procedimiento y marcarlo como
ensayado sin haberlo corrido sería exactamente el precedente del SRTM que este issue
existe para no repetir, solo que con una carpeta llena en vez de vacía.

## Documentos relacionados

[`INF-01`](../../80-infraestructura/arquitectura-de-infraestructura.md) §5 (la tabla de
escenarios de falla que remite aquí) · [`INF-03`](../../80-infraestructura/ambientes.md)
§2 (dónde se ensaya la restauración) ·
[`INF-08`](../../80-infraestructura/respaldo-y-recuperacion.md) ·
[`INF-09`](../../80-infraestructura/observabilidad-y-alertas.md) (cada alerta apunta a
uno de estos runbooks en su propia anotación) ·
[`INF-11`](../../80-infraestructura/entorno-local-de-desarrollo.md) · [`infra/README.md`](../../../infra/README.md)
