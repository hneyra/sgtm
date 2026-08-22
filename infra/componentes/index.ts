import { commonLabels, namespaceName, type Invariants } from "../config";
import { manifiestosDeAplicacion } from "./Aplicacion";
import { manifiestosDeBaseDeDatos } from "./BaseDeDatos";
import { manifiestosDeIdentidad } from "./Identidad";
import { manifiestosDeIngreso } from "./Ingreso";
import { manifiestosDeObservabilidad } from "./Observabilidad";
import { manifiestosDeMigracion } from "./Migracion";
import { manifiestosDeRespaldo } from "./Respaldo";
import { clasesDePrioridad } from "./convenciones";
import type { Manifiesto, Namespace } from "./tipos";

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

  return [
    espacio,
    ...clasesDePrioridad(environment),
    ...manifiestosDeBaseDeDatos({
      environment,
      namespace,
      image: s.database.image,
      storageSize: s.database.storageSize,
      backup: {
        endpoint: s.backup.endpoint,
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
  ];
}

export * from "./tipos";
