# ADR-0012 — Usuarios y grupos de Keycloak declarativos, sin clave en git

**Estado:** Aceptado
**Fecha:** 2026-08-27

## Contexto

[`ADR-0005`](ADR-0005-identidad-y-acceso.md) separó autenticación (OIDC, en Keycloak) de
autorización (el modelo del manual, en la base). El realm quedó **como código**
([`despliegue/identidad/realm-sgtm.json`](../../../despliegue/identidad/realm-sgtm.json), issue
#151): fija los clientes, el PKCE obligatorio y el mapeador que pone `municipalidad_id` en el
token. Lo que el realm **no** trae, a propósito, es «ni un usuario ni una clave»: un realm
versionado con contraseñas es la forma más cómoda de que una contraseña acabe en producción.

El hueco: las personas se creaban con
[`despliegue/identidad/crear-usuario.sh`](../../../despliegue/identidad/crear-usuario.sh)
`<usuario> <clave> <municipio>` — **un paso manual, no versionado, con la clave escrita a mano
por quien provisiona**. En el clúster, el Job que reconcilia el realm (`Identidad.ts`) aplica
realm + perfil + clientes con `partialImport OVERWRITE` y **nunca toca usuarios**. No había
ningún artefacto en el repositorio que dijera *qué personas y qué grupos* tiene una
municipalidad, ni forma de reproducirlos.

Esto choca con que el producto es multi-municipal y con
[`ADR-0011`](ADR-0011-infraestructura-como-codigo.md): si el clúster se reconstruye desde cero,
los usuarios de la municipalidad se recrean a mano, uno por uno, recordando sus atributos.

## Decisión

**El alta de usuarios y grupos de una municipalidad es declarativa y reconciliada, igual que el
realm. La primera clave no existe en git: la fija el usuario en su primer acceso, con un enlace
de un solo uso que Keycloak le envía por correo (`UPDATE_PASSWORD`).**

### 1. Fuente versionada, sin credenciales

Un archivo por municipalidad,
[`despliegue/identidad/municipalidades/<ubigeo>.json`](../../../despliegue/identidad/municipalidades/README.md),
con el ubigeo, el `municipalidadId`, el nombre del grupo y la lista de usuarios (cuenta, nombre,
apellido, correo, cuál es el administrador). **Sin `credentials`, sin `password`, sin
`enabled:false`.** Es el mismo formato que comparten el compose y el clúster, como
`realm-sgtm.json`.

El `municipalidadId` es **numérico** —el claim es `jsonType.label: "long"` y se usa como
`::bigint` en RLS— y lo asigna la implantación en la base. Va en el archivo: el operador lo copia
una vez del log `Municipalidad <ubigeo> lista ... id <n>`, y una verificación cruza que coincida
con la fila y con el atributo en Keycloak (cruce a tres bandas, en `despliegue.yml`).

### 2. La clave: enlace por correo, reseteo forzado

Un usuario nuevo se crea `enabled`, **sin credenciales**, con `requiredActions=["UPDATE_PASSWORD"]`.
El guion dispara `execute-actions-email` con `UPDATE_PASSWORD`: Keycloak envía un enlace de un
solo uso a su correo, y la persona **fija su clave al entrar**. Nadie —ni el operador, ni CI, ni
un log— llega a ver una clave.

Exige SMTP configurado en el realm. El servidor y el remitente no son secretos (van en claro en
`Pulumi.<stack>.yaml`); el usuario y la clave del relay, si hace falta, viven en el `Secret`
`sgtm-<amb>-smtp` y **no** los genera `bootstrap-secretos.sh` —los emite el proveedor del relay
([`INF-06`](../../80-infraestructura/gestion-de-secretos.md) §1.2)—. En `stg` el relay es un
buzón Mailpit del propio clúster; en `prod` es un relay de verdad y externo, y `config.ts`
rechaza que `keycloakSmtpHost` apunte a un buzón (`INF-03` §4). Fallback sin SMTP: fijar una
clave temporal a mano con `kcadm set-password --temporary`.

### 3. Reconciliación, como el realm

[`despliegue/identidad/reconciliar-identidades.sh`](../../../despliegue/identidad/reconciliar-identidades.sh)
—el mismo guion en el compose y en el Job del clúster— crea el grupo y los usuarios que falten,
pone el atributo `municipalidad_id`, afilia al grupo, y **nunca borra ni toca la clave o las
acciones pendientes de un usuario que ya existía**. Termina con una comprobación: cada usuario
declarado existe, está `enabled`, tiene el atributo con el valor del archivo y está en su grupo;
si no, sale en rojo. `Identidad.ts` deriva el TSV que el Job lee (la imagen de Keycloak no trae
con qué parsear JSON) y la derivación está cubierta por `componentes.test.ts`. El nombre del Job
lleva la huella del contenido: un cambio en un archivo de `municipalidades/` crea un Job nuevo y
llega al clúster.

### 4. Fuente única con la implantación

El usuario marcado `administrador: true` es el que la implantación da de alta como primer
administrador. `Identidad.ts` exige que su `cuenta` sea la misma que `sgtm:administrador` del
stack; en el compose, `datos-de-implantacion.sh <ubigeo>` deriva `SGTM_ADMINISTRADOR` del
archivo. Así la cuenta no puede divergir entre Keycloak y la fila de `usuario` —que es lo único
que une las dos mitades (ADR-0005)—.

## Consecuencias

**Positivas**

- Reconstruir el clúster recrea las personas y el grupo de la municipalidad sin un paso manual
  que alguien recuerde.
- Ninguna clave en git, y ninguna clave que el operador teclee o pegue: la exposición es un
  enlace de un solo uso que caduca.
- El conjunto de usuarios de una municipalidad se revisa en un diff.
- La cuenta del administrador no puede divergir entre Keycloak y la base.

**Negativas / costos aceptados**

- **Depende de SMTP.** Sin relay, el alta queda a medias (usuario sin clave) y el despliegue lo
  dice. En `prod` el relay es un prerrequisito operativo, como el VPS: no se fabrica en un PR.
- **Dos derivadores del TSV** —`Identidad.ts` para el clúster, el python del guion para el
  compose—, porque la imagen de Keycloak no trae con qué parsear JSON. La trampa es que se
  separen; lo limita que los dos validan lo mismo y `componentes.test.ts` compara.
- **El `municipalidadId` se copia a mano** del log de implantación al archivo. Un número
  equivocado lo caza el cruce a tres bandas de `despliegue.yml`, no antes.
- **Una municipalidad por stack, por ahora.** `Identidad.ts` reconcilia la del `sgtm:ubigeo`
  implantado. Gestionar varias a la vez es trabajo posterior.

## Alternativas consideradas

- **Usuarios en el realm versionado, con `partialImport`.** Es lo que el issue #151 dejó
  preparado para clientes. Se descarta para personas: `partialImport OVERWRITE` sobre un usuario
  lo borra y lo recrea —pierde la clave—, y `SKIP` no reconcilia atributos. Y un realm con
  usuarios es el camino corto a una contraseña versionada.
- **Clave aleatoria temporal, entregada por un `Secret` efímero.** Funciona sin SMTP, pero deja
  una clave real —aunque temporal— en un `Secret` que alguien lee y tiene que acordarse de
  borrar. El enlace por correo no deja clave en ningún sitio.
- **El id de municipalidad resuelto por el Job consultando PostgreSQL.** Evita copiar el número,
  pero mete una dependencia de la base en un Job de Keycloak. Se prefirió el número en el archivo
  con verificación.
- **Que `ImplantarMunicipalidad` cree también la identidad en Keycloak.** Tiene el id en la mano,
  pero cruza la separación backend/identidad que el repositorio mantiene a propósito (el realm
  fija la estructura; las personas las crea quien provisiona).
- **Grupos de Keycloak que alimenten el claim.** El mapeador actual es de atributo de usuario;
  un atributo de grupo no se expone sin otro mapeador. El grupo queda como contenedor
  organizativo y el claim sigue saliendo del atributo por usuario, sin tocar el mapeador.

## Enlaces

- [`ADR-0005`](ADR-0005-identidad-y-acceso.md) — OIDC para autenticar ·
  [`ADR-0011`](ADR-0011-infraestructura-como-codigo.md) §3, §5 — la frontera con los secretos y
  con el flujo de liberación
- [`INF-06`](../../80-infraestructura/gestion-de-secretos.md) §1.2 — el `Secret` `sgtm-<amb>-smtp`
- [`despliegue/identidad/README.md`](../../../despliegue/identidad/README.md) ·
  [`despliegue/identidad/municipalidades/README.md`](../../../despliegue/identidad/municipalidades/README.md)
- `ImplantarMunicipalidad` — el otro lado del alta: la fila de `usuario`, el grupo del dominio y
  los permisos
