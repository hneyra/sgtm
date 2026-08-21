import { commonLabels, resourceName, type Environment } from "../config";
import { DIRECTORIO_DE_DATOS } from "./BaseDeDatos";
import {
  BASE_DEL_PADRON,
  CLAVES,
  RECURSOS,
  contenedorDeDescargaDeWalg,
  montajeDeWalg,
  nombreDePrioridad,
  secretoDeCredencialesDeRespaldo,
  secretos,
  servicioDeBaseDeDatos,
  variablesWalg,
  volumenDeDatos,
  volumenDeWalg,
  WALG_BINARIO,
} from "./convenciones";
import type { CronJob, Manifiesto } from "./tipos";

/**
 * El respaldo base periodico, fuera del VPS (issue #155).
 *
 * El archivado continuo de WAL vive en `BaseDeDatos.ts`, porque `archive_command` es
 * un argumento del propio proceso `postgres`. Lo que falta para que el respaldo sea
 * completo es un respaldo BASE periodico —sin uno, restaurar significa reproducir
 * cada segundo de WAL desde el principio de los tiempos— y eso es un `CronJob`, no
 * el motor: un proceso aparte que se ejecuta, termina, y no vuelve a correr hasta la
 * proxima vez.
 *
 * ## Por que `sgtm_owner`, y no solo `sgtm_respaldo`, en este CronJob
 *
 * `V8__respaldo.sql` (RF-126) ya declara qué escribe el estado del respaldo:
 * `sgtm_owner`, «como el proceso de despliegue». Este CronJob **es** ese proceso, asi
 * que usa la misma credencial que los dos Jobs de `Migracion.ts` para dejar
 * registrado el resultado en la tabla `respaldo` — es lo que hace que RF-126 («Consultar
 * el estado de las copias de seguridad») muestre algo real y no una pantalla vacia.
 *
 * Eso significa que la excepcion de `auditoria.ts` a «`sgtm_owner` solo en los dos
 * Jobs» crece en uno: el `CronJob` de respaldo. Sigue siendo estrecha y nombrada —
 * `COMPONENTES_CON_ACCESO_A_OWNER` en `auditoria.ts`—, no una regla que se abre para
 * cualquier `CronJob` futuro. El de `lote` en `Aplicacion.ts` sigue prohibido.
 *
 * ## Por que NO es el mismo credential que hace el respaldo
 *
 * El respaldo en si —`pg_backup_start`/`pg_backup_stop`— lo hace `sgtm_respaldo`, el
 * rol de `40-rol-de-respaldo.sh`, no `sgtm_owner`. Dos credenciales, dos proposito:
 * una para lo que wal-g necesita del motor, otra para lo que RF-126 necesita de la
 * tabla. Ninguna de las dos es DDL sobre el padron.
 *
 * ## El volumen, de solo lectura
 *
 * Este `CronJob` monta el MISMO `PersistentVolumeClaim` que `BaseDeDatos.ts` —mismo
 * nombre, misma ruta— pero con `readOnly: true`. wal-g lee `PGDATA` directamente del
 * disco; no necesita, y por tanto no tiene, permiso de escritura sobre los datos del
 * motor. Con `ReadWriteOnce` y un solo nodo, los dos pods —el motor y este `Job`—
 * conviven en el mismo nodo, que es el unico que hay.
 *
 * ## El aviso de fallo, sin salir del cluster
 *
 * Si `ALERT_WEBHOOK_URL` esta configurado (`backupAlertWebhookUrl` del stack), el
 * guion hace un POST minimo por `/dev/tcp` de bash —la imagen de PostgreSQL no trae
 * `curl` ni `wget`, se purgan al construirla—. Solo admite `http://`, nunca
 * `https://`: el receptor vive DENTRO del cluster (el Alertmanager de issue #156,
 * o lo que haga sus veces), igual que `jwksInterno` en `convenciones.ts`. Sin la
 * variable, el fallo sigue quedando en la tabla `respaldo` y en el estado del propio
 * `CronJob` — nunca silencioso, solo sin empujon activo hasta que #156 exista.
 */

export interface RespaldoArgs {
  environment: Environment;
  namespace: string;
  /** Imagen de PostgreSQL: la usa este contenedor, por su `psql`. */
  postgresImage: string;
  backup: {
    endpoint: string;
    bucket: string;
  };
  /** Ver «El aviso de fallo» arriba. `undefined` = sin aviso activo todavia. */
  alertWebhookUrl?: string;
}

/** Cuantos respaldos base se conservan. Con WAL continuo entre ellos, define la ventana de PITR real. */
export const RETENCION_DE_RESPALDOS_BASE = 7;

/**
 * 06:00 UTC = 01:00 en Peru (UTC-5, todo el año). Antes de la ventana de `lote` de
 * `Aplicacion.ts` (07:00 UTC): las dos tareas compitiendo por CPU en un solo nodo
 * serian exactamente el problema que `INF-01` §2 documenta para la emision masiva.
 */
export const VENTANA_DE_RESPALDO = "0 6 * * *";

export function manifiestosDeRespaldo(args: RespaldoArgs): Manifiesto[] {
  const { environment, namespace, postgresImage, backup, alertWebhookUrl } = args;
  const nombre = resourceName(environment, "respaldo");
  const etiquetas = commonLabels(environment, "respaldo");
  const secreto = secretos(environment);
  const credenciales = secretoDeCredencialesDeRespaldo(environment);

  const guion = [
    "set -uo pipefail",
    "",
    "# 1. Se registra ANTES de intentar nada: si el pod muere a mitad, la fila que",
    "#    se queda en EN_CURSO es la pista de que algo no termino, no un silencio.",
    'respaldoId=$(PGUSER=sgtm_owner PGPASSWORD="$CLAVE_OWNER" psql --host="$PGHOST" ' +
      `--dbname=${BASE_DEL_PADRON} --quiet --tuples-only --no-align \\`,
    '    -v destino="$DESTINO" ' +
      '--command "INSERT INTO respaldo (inicio, resultado, destino) VALUES (now(), \'EN_CURSO\', :\'destino\') RETURNING id")',
    'if [ -z "$respaldoId" ]; then',
    '    echo "FALLO: no se pudo registrar el inicio en la tabla respaldo (RF-126)." >&2',
    "    exit 1",
    "fi",
    'echo "Respaldo #$respaldoId iniciado hacia $DESTINO."',
    "",
    "# 2. El respaldo en si. sgtm_respaldo, nunca sgtm_owner ni el superusuario.",
    `if PGUSER=sgtm_respaldo PGPASSWORD="$CLAVE_RESPALDO" "${WALG_BINARIO}" backup-push "$PGDATA_RESPALDO" ` +
      "> /tmp/walg.log 2>&1; then",
    `    PGUSER=sgtm_respaldo PGPASSWORD="$CLAVE_RESPALDO" "${WALG_BINARIO}" delete retain "$RETENCION" ` +
      "--confirm >> /tmp/walg.log 2>&1 || true",
    '    PGUSER=sgtm_owner PGPASSWORD="$CLAVE_OWNER" psql --host="$PGHOST" ' +
      `--dbname=${BASE_DEL_PADRON} --quiet -v id="$respaldoId" \\`,
    "        --command \"UPDATE respaldo SET fin = now(), resultado = 'EXITOSO' WHERE id = :id\"",
    '    echo "Respaldo #$respaldoId EXITOSO."',
    "else",
    "    detalle=$(tail -c 480 /tmp/walg.log | tr '\\n' ' ' | tr -d \"'\")",
    '    PGUSER=sgtm_owner PGPASSWORD="$CLAVE_OWNER" psql --host="$PGHOST" ' +
      `--dbname=${BASE_DEL_PADRON} --quiet -v id="$respaldoId" -v detalle="$detalle" \\`,
    "        --command \"UPDATE respaldo SET fin = now(), resultado = 'FALLIDO', detalle = :'detalle' WHERE id = :id\"",
    '    echo "FALLO: el respaldo #$respaldoId no se completo. Detalle: $detalle" >&2',
    "",
    "    # Aviso por /dev/tcp: ver la nota de por que, en el docstring de Respaldo.ts.",
    '    if [ -n "${ALERT_WEBHOOK_URL:-}" ]; then',
    '        case "$ALERT_WEBHOOK_URL" in',
    "            http://*)",
    '                sinEsquema=${ALERT_WEBHOOK_URL#http://}',
    '                anfitrionYPuerto=${sinEsquema%%/*}',
    '                if [ "$anfitrionYPuerto" = "$sinEsquema" ]; then ruta=/; else ruta=/${sinEsquema#*/}; fi',
    '                anfitrion=${anfitrionYPuerto%%:*}',
    '                if [ "$anfitrionYPuerto" = "$anfitrion" ]; then puerto=80; else puerto=${anfitrionYPuerto#*:}; fi',
    '                cuerpo="{\\"texto\\":\\"Respaldo de PostgreSQL ($AMBIENTE) FALLIDO (#$respaldoId): $detalle\\"}"',
    '                longitud=${#cuerpo}',
    '                if exec 3<>"/dev/tcp/$anfitrion/$puerto" 2>/dev/null; then',
    "                    { printf 'POST %s HTTP/1.1\\r\\n' \"$ruta\"; " +
      "printf 'Host: %s\\r\\n' \"$anfitrion\"; " +
      "printf 'Content-Type: application/json\\r\\n'; " +
      "printf 'Content-Length: %s\\r\\n' \"$longitud\"; " +
      "printf 'Connection: close\\r\\n\\r\\n'; " +
      'printf \'%s\' "$cuerpo"; } >&3',
    "                    timeout 5 cat <&3 >/dev/null 2>&1 || true",
    "                    exec 3>&- 3<&- 2>/dev/null || true",
    '                    echo "  Aviso enviado a $ALERT_WEBHOOK_URL."',
    "                else",
    '                    echo "  (no se pudo conectar a $anfitrion:$puerto para avisar)" >&2',
    "                fi",
    "                ;;",
    "            *)",
    '                echo "  ALERT_WEBHOOK_URL no empieza por http://: no se envia (ver docstring de Respaldo.ts)." >&2',
    "                ;;",
    "        esac",
    "    fi",
    "",
    "    exit 1",
    "fi",
  ].join("\n");

  const respaldo: CronJob = {
    apiVersion: "batch/v1",
    kind: "CronJob",
    metadata: { name: nombre, namespace, labels: etiquetas },
    spec: {
      schedule: VENTANA_DE_RESPALDO,
      // Nunca dos respaldos a la vez: el segundo encontraria al primero a mitad de
      // `pg_backup_start`/`pg_backup_stop` sobre el mismo motor.
      concurrencyPolicy: "Forbid",
      successfulJobsHistoryLimit: 3,
      failedJobsHistoryLimit: 5,
      jobTemplate: {
        spec: {
          // Sin reintento automatico: un respaldo a medias que se reintenta puede
          // dejar `pg_backup_start` sin su `pg_backup_stop`. Mejor un fallo visible
          // -fila FALLIDA, CronJob en rojo- que un reintento silencioso.
          backoffLimit: 0,
          template: {
            metadata: { labels: { ...etiquetas, app: nombre } },
            spec: {
              restartPolicy: "Never",
              priorityClassName: nombreDePrioridad(environment, "lote"),
              initContainers: [contenedorDeDescargaDeWalg()],
              containers: [
                {
                  name: "respaldo-base",
                  image: postgresImage,
                  command: ["/bin/bash", "-c"],
                  args: [guion],
                  env: [
                    { name: "PGHOST", value: servicioDeBaseDeDatos(environment) },
                    { name: "AMBIENTE", value: environment },
                    { name: "DESTINO", value: `s3://${backup.bucket}` },
                    { name: "RETENCION", value: String(RETENCION_DE_RESPALDOS_BASE) },
                    { name: "PGDATA_RESPALDO", value: DIRECTORIO_DE_DATOS },
                    {
                      name: "CLAVE_RESPALDO",
                      valueFrom: { secretKeyRef: { name: secreto.respaldo, key: CLAVES.respaldo } },
                    },
                    {
                      name: "CLAVE_OWNER",
                      valueFrom: { secretKeyRef: { name: secreto.owner, key: CLAVES.owner } },
                    },
                    ...variablesWalg({ backup, credenciales, secretoDeRespaldo: secreto.respaldo }),
                    ...(alertWebhookUrl === undefined
                      ? []
                      : [{ name: "ALERT_WEBHOOK_URL", value: alertWebhookUrl }]),
                  ],
                  resources: RECURSOS.auxiliar,
                  volumeMounts: [
                    // Solo lectura: wal-g lee PGDATA, nunca lo modifica.
                    { name: "datos", mountPath: "/var/lib/postgresql/data", readOnly: true },
                    montajeDeWalg(),
                  ],
                },
              ],
              volumes: [
                {
                  name: "datos",
                  persistentVolumeClaim: { claimName: volumenDeDatos(environment) },
                },
                volumenDeWalg(),
              ],
            },
          },
        },
      },
    },
  };

  return [respaldo];
}
