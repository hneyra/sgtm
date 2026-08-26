import { commonLabels, namespaceName, type Invariants } from "../config";
import { manifiestosDeAplicacion } from "./Aplicacion";
import { manifiestosDeBaseDeDatos } from "./BaseDeDatos";
import { manifiestosDeIdentidad } from "./Identidad";
import { manifiestosDeIngreso } from "./Ingreso";
import { manifiestosDeObservabilidad } from "./Observabilidad";
import { manifiestosDeMigracion } from "./Migracion";
import { manifiestosDeRed } from "./Red";
import { manifiestosDeRespaldo } from "./Respaldo";
import { clasesDePrioridad, secretoDelRegistro } from "./convenciones";
import { contenedoresDe, podsDe, type Manifiesto, type Namespace } from "./tipos";

/**
 * Le cuelga la credencial del registro privado a los pods que tiran de el, y solo a
 * esos (issue #252).
 *
 * **Derivado de la imagen, nunca escrito a mano.** Hoy son cinco pods —los dos Jobs del
 * arranque, la aplicacion, la interfaz y el CronJob de lote— y nueve tiran de registros
 * publicos. Repartir `imagePullSecrets` a mano por los componentes funciona hasta que
 * alguien agrega el sexto pod privado y no se acuerda; entonces el sintoma es un
 * `ImagePullBackOff` en el despliegue, que es tarde y lejos. Aqui se calcula de lo unico
 * que no se puede falsear: de donde sale la imagen.
 *
 * `auditoria.ts` cierra el circulo por los dos lados: un pod privado sin la credencial
 * es un incumplimiento, y un pod publico que la lleva tambien —una credencial de mas es
 * una credencial que alguien puede usar.
 */
function conCredencialDelRegistro(
  manifiestos: Manifiesto[],
  environment: Invariants["environment"],
  repositorioPrivado: string,
): Manifiesto[] {
  const credencial = [{ name: secretoDelRegistro(environment) }];
  for (const m of manifiestos) {
    for (const { pod } of podsDe(m)) {
      const privado = contenedoresDe(pod).some((c) => c.image.startsWith(`${repositorioPrivado}/`));
      if (privado) pod.imagePullSecrets = credencial;
    }
  }
  return manifiestos;
}

/**
 * Los cinco componentes de la fase B, mas el respaldo de la fase C (issue #155),
 * compuestos en el orden en que arrancan.
 *
 * Una funcion, sin Pulumi dentro. `index.ts` la llama, audita lo que devuelve y lo
 * aplica; las pruebas la llaman y leen el resultado. Es lo que permite que `yarn
 * verificar` diga algo cierto sobre el despliegue **sin** token, sin tunel y sin VPS.
 */
export function construirManifiestos(s: Invariants): Manifiesto[] {
  const environment = s.environment;
  const namespace = namespaceName(environment);
  const version = s.application.bootstrapVersion;

  const espacio: Namespace = {
    apiVersion: "v1",
    kind: "Namespace",
    metadata: { name: namespace, labels: commonLabels(environment, "namespace") },
  };

  const sistema: Manifiesto[] = [
    espacio,
    ...clasesDePrioridad(environment),
    ...manifiestosDeBaseDeDatos({
      environment,
      namespace,
      image: s.database.image,
      storageSize: s.database.storageSize,
      backup: {
        endpoint: s.backup.endpoint,
        region: s.backup.region,
        bucket: s.backup.bucket,
        walArchiveTimeoutSeconds: s.backup.walArchiveTimeoutSeconds,
      },
    }),
    ...manifiestosDeRespaldo({
      environment,
      namespace,
      postgresImage: s.database.image,
      backup: {
        endpoint: s.backup.endpoint,
        region: s.backup.region,
        bucket: s.backup.bucket,
      },
      alertWebhookUrl: s.backup.alertWebhookUrl,
    }),
    ...manifiestosDeMigracion({
      environment,
      namespace,
      imageRepository: s.application.imageRepository,
      version,
      postgresImage: s.database.image,
      implantacion: {
        ubigeo: s.implantacion.ubigeo,
        nombre: s.implantacion.nombre,
        tipo: s.implantacion.tipo,
        administrador: s.implantacion.administrador,
        nombreDelAdministrador: s.implantacion.nombreDelAdministrador,
        esDemostracion: s.application.isDemonstration,
      },
    }),
    ...manifiestosDeIdentidad({
      environment,
      namespace,
      image: s.identity.image,
      realm: s.identity.realm,
      domain: s.ingress.domain,
      // El cliente de verificacion existe donde se siembran usuarios de prueba, y en
      // ningun otro sitio: es lo que hace posible pedir un token sin navegador.
      clienteDeVerificacion: s.identity.seedTestUsers,
    }),
    ...manifiestosDeAplicacion({
      environment,
      namespace,
      imageRepository: s.application.imageRepository,
      version,
      postgresImage: s.database.image,
      webReplicas: s.application.webReplicas,
      domain: s.ingress.domain,
      realm: s.identity.realm,
    }),
    ...manifiestosDeIngreso({
      environment,
      namespace,
      domain: s.ingress.domain,
      acmeEmail: s.ingress.acmeEmail,
      acmeStaging: s.ingress.acmeStaging,
    }),
    ...manifiestosDeObservabilidad({
      environment,
      namespace,
      alertWebhookUrl: s.observability.alertWebhookUrl,
    }),
    // Al final, a proposito (issue #157): `denegar-todo` selecciona TODOS los
    // pods de arriba por igual, y aplicarla despues no cambia nada —Kubernetes
    // no tiene «orden de aplicacion», las politicas se unen— pero deja el
    // manifiesto en el orden en que se razona: primero lo que corre, despues lo
    // que decide con quien puede hablar.
    ...manifiestosDeRed({ environment, namespace }),
  ];

  // La credencial del registro se cuelga al final, sobre los manifiestos ya armados:
  // los componentes no saben —ni tienen que saber— si su registro pide autenticacion.
  return conCredencialDelRegistro(sistema, environment, s.application.imageRepository);
}

export * from "./tipos";
