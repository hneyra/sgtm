# Runbook — Abrir la consola de administración de Keycloak

| Campo | Valor |
|---|---|
| Cuándo | Crear o dar de baja personas, asignar roles, revisar sesiones — administración corriente de identidad |
| Qué cubre | El acceso a la consola. Crear el usuario y su `municipalidad_id` está en «Pasos» §3 |
| Estado del ensayo | **El acceso está ensayado contra el Keycloak real de `prod`.** Lo que no se ensaya en CI es que `KC_HOSTNAME_ADMIN` no estorbe a `kcadm` — ver «Estado del ensayo» |

## Síntoma

No es una falla: es administración corriente. Si lo que pasa es que **nadie puede
entrar**, este no es el runbook — ese es [Keycloak no responde](keycloak-no-responde.md).

## Precondiciones

1. **Acceso `kubectl` al ambiente**, con permiso para leer `Secret` y abrir
   `port-forward`. Desde fuera del nodo eso va por el túnel SSH al 6443
   (`INF-01` §1.4).
2. **`KC_HOSTNAME_ADMIN` desplegado.** Lo fija `infra/componentes/Identidad.ts` y llega
   con `pulumi up`. Si no está, el paso 2 termina en el login del SGTM en vez de en la
   consola — ver «Si no sale bien».
3. **El puerto local tiene que ser 8180.** No es preferencia: la consola construye sus
   enlaces desde `KC_HOSTNAME_ADMIN`, así que con otro puerto carga y se rompe al
   navegar. El número vive en `PUERTO_DE_LA_CONSOLA`, en `Identidad.ts`.

## Pasos

### 1. La clave del administrador

```bash
kubectl -n sgtm-<amb> get secret sgtm-<amb>-keycloak \
  -o jsonpath='{.data.clave-administrador}' | base64 -d; echo
```

El usuario es `admin` (`KC_BOOTSTRAP_ADMIN_USERNAME`). **La clave no se pega en un chat,
un ticket ni un mensaje**: se lee cuando se necesita y se descarta. Rotarla es un
procedimiento aparte — ver [Rotar la clave de un rol](rotar-la-clave-de-un-rol.md), «Si
no sale bien».

### 2. El túnel, y la consola

```bash
kubectl -n sgtm-<amb> port-forward svc/sgtm-<amb>-identidad 8180:8080
```

Con eso abierto, en el navegador:

```
http://localhost:8180/keycloak/admin
```

Se entra con `admin` y la clave del paso 1.

> **La consola no está publicada, y no debe estarlo.** La `IngressRoute` la excluye con
> `!PathPrefix(/keycloak/admin)`. El túnel es el único camino, a propósito: una consola
> de administración de identidad expuesta a internet es la superficie de ataque más
> valiosa del sistema entero.

### 3. Crear una persona

Dos mitades que tienen que casar, o el usuario entra y el sistema no lo reconoce:

| Mitad | Dónde vive | Qué la une |
|---|---|---|
| La identidad | Keycloak | `username` |
| La fila | Tabla `usuario` | `usuario.cuenta` |

En la consola, con el realm **`sgtm`** seleccionado (no `master`):

1. *Users* → *Add user*.
2. `Username` **exactamente igual** a `usuario.cuenta` de la fila que ya existe.
3. `Email`, `First name` y `Last name` son **obligatorios**. Keycloak no da el perfil por
   completo sin los tres, y sin perfil completo la persona no puede iniciar sesión aunque
   exista y tenga clave.
4. Pestaña *Attributes*: `municipalidad_id` con el id de su municipalidad. **Sin él, el
   token sale sin el claim de `ADR-0005`, el filtro no puede fijar el contexto de tenant
   y toda petición recibe 403 sin llegar a ningún controlador.**
5. Pestaña *Credentials* → *Set password*, con *Temporary* según corresponda.

El `municipalidad_id` sale de la base:

```bash
kubectl -n sgtm-<amb> exec deploy/sgtm-<amb>-postgres -c postgres -- \
  psql -U postgres -d sgtm -c 'select id, ubigeo, nombre from municipalidad order by ubigeo;'
```

> **El realm versionado no trae personas, y es deliberado** (`despliegue/identidad/crear-usuario.sh`):
> «un realm que trae usuarios con contraseña es la forma más cómoda de que esa contraseña
> acabe en producción». El realm fija la estructura; las personas las crea quien
> provisiona, con las claves de su gestor de secretos.

## Cómo se comprueba que terminó bien

**No basta con que la consola cargue.** Carga igual sobre un Keycloak que dejó de emitir
tokens que la aplicación acepta. Las tres, contra el sistema real:

**1 · El emisor público no se movió.** Es lo único que garantiza que los tokens siguen
validando; `KC_HOSTNAME_ADMIN` no debe haberlo tocado.

```bash
curl -s https://<dominio>/keycloak/realms/sgtm/.well-known/openid-configuration \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["issuer"])'
```

Tiene que imprimir `https://<dominio>/keycloak/realms/sgtm`. Si imprime `localhost`,
`KC_HOSTNAME_ADMIN` se puso donde iba `KC_HOSTNAME`: revertir de inmediato.

**2 · La persona creada puede iniciar sesión de verdad.** En un navegador, desde el
dominio público, hasta ver el sistema — no hasta el formulario. Un usuario sin
`municipalidad_id` llega al formulario, lo pasa, y **recibe 403 en la primera petición**.

**3 · La consola sigue sin existir desde internet.**

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://<dominio>/keycloak/admin/master/console/
```

Devuelve **200 con el SPA del SGTM**, no la consola: la petición cae a la ruta de la
interfaz porque `/keycloak/admin` está excluido del enrutado de identidad. Si alguna vez
devuelve la consola de Keycloak, la exclusión se rompió y es un incidente.

## Si no sale bien

### `localhost:8180` redirige a `https://<dominio>/keycloak/admin/...` y aparece el login del SGTM

`KC_HOSTNAME_ADMIN` no está desplegado. `KC_HOSTNAME_STRICT=true` hace que Keycloak
construya todas sus URLs absolutas contra `KC_HOSTNAME` sin mirar por dónde llegó la
petición, así que responde un 302 al dominio público — y ahí, excluida del enrutado, la
petición cae al SPA.

Comprobarlo:

```bash
kubectl -n sgtm-<amb> get deploy sgtm-<amb>-identidad \
  -o jsonpath='{range .spec.template.spec.containers[0].env[*]}{.name}={.value}{"\n"}{end}' \
  | grep HOSTNAME
```

Si falta, lo correcto es desplegarlo (`pulumi up`). Como salida temporal:

```bash
kubectl -n sgtm-<amb> set env deployment/sgtm-<amb>-identidad \
  KC_HOSTNAME_ADMIN=http://localhost:8180/keycloak
kubectl -n sgtm-<amb> rollout status deployment/sgtm-<amb>-identidad --timeout=180s
```

Dos avisos: **reinicia Keycloak** —una réplica, `Recreate`: hay cerca de un minuto en que
nadie puede iniciar sesión—, y es **deriva manual**, que el siguiente `pulumi up` borra
en silencio (`ADR-0011` §6). Para revertirla antes, el mismo comando con `KC_HOSTNAME_ADMIN-`.

### La consola carga pero se rompe al navegar

El `port-forward` está en un puerto distinto de `PUERTO_DE_LA_CONSOLA`. Ciérralo y
reábrelo en 8180.

### No se puede abrir un navegador contra ese ambiente

`kcadm` hace lo mismo sin consola, hablando con Keycloak por `localhost` **dentro del
pod** — que es como reconcilia el realm `infra/componentes/identidad/reconciliar-realm.sh`:

```bash
POD=$(kubectl -n sgtm-<amb> get pod -l app=sgtm-<amb>-identidad -o jsonpath='{.items[0].metadata.name}')
KC=/opt/keycloak/bin/kcadm.sh

kubectl -n sgtm-<amb> exec -it $POD -- $KC config credentials \
  --server http://localhost:8080/keycloak --realm master --user admin

kubectl -n sgtm-<amb> exec -it $POD -- $KC create users -r sgtm \
  -s username=<cuenta> -s enabled=true -s emailVerified=true \
  -s email=<correo> -s firstName=<nombre> -s lastName=<apellido> \
  -s 'attributes.municipalidad_id=["<id>"]'

kubectl -n sgtm-<amb> exec -it $POD -- $KC set-password -r sgtm \
  --username <cuenta> --new-password '<clave>'
```

La clave se omite en `config credentials` **a propósito**: kcadm la pide por teclado y así
no queda en el historial del shell. La sesión vive en el sistema de archivos del pod, de
modo que los tres comandos van seguidos y contra **el mismo pod** — por eso `$POD` se fija
una vez.

## Estado del ensayo

**Ensayado contra el Keycloak real de `prod`:** el 302 al dominio público con su caída al
SPA (así se encontró), el acceso a la consola por el túnel con `KC_HOSTNAME_ADMIN`
puesto, y que el emisor público no se mueve.

**No ensayado en CI:** que `KC_HOSTNAME_ADMIN` no estorbe a `kcadm` contra la URL interna.
Ningún trabajo de CI levanta Keycloak con su realm — los `kind` de `infra.yml` validan
esquema de Kubernetes, no arrancan identidad. La evidencia de que no estorba es que
`reconciliar-realm.sh` ya funciona con `KC_HOSTNAME` apuntando al dominio público y
`KC_SERVIDOR` a la URL interna, que es la misma clase de separación; pero es un argumento,
no una ejecución. **La forma de convertirlo en ejecución es volver a lanzar el Job del
realm** con la variable puesta y verlo terminar en verde.

## Documentos relacionados

[`ADR-0005`](../../30-arquitectura/adr/ADR-0005-identidad-y-acceso.md) (el claim
`municipalidad_id`) · [`INF-06`](../../80-infraestructura/gestion-de-secretos.md) §1 (el
inventario, y por qué un valor no se transcribe) ·
[Keycloak no responde](keycloak-no-responde.md) ·
[Rotar la clave de un rol](rotar-la-clave-de-un-rol.md)
