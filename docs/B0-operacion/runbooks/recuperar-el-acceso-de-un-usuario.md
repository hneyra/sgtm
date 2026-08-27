# Runbook — Recuperar el acceso de un usuario (no le llegó el correo)

| Campo | Valor |
|---|---|
| Cuándo | Un usuario dado de alta con el flujo declarativo (ADR-0012) no puede entrar porque no tiene clave: **el ambiente no tiene relay SMTP** (Opción B — hoy `prod`, y entonces esto es el procedimiento **normal**, no una falla), o lo tiene pero **el correo nunca llegó** o **el enlace caducó** |
| Qué cubre | Fijarle una clave temporal a mano (siempre funciona), o —si hay relay— reenviar el enlace. En los dos casos la clave la termina eligiendo el usuario |
| Qué **no** cubre | «Nadie puede entrar» → [Keycloak no responde](keycloak-no-responde.md). Un usuario **ya establecido** que olvidó su clave usa el enlace «¿Olvidó su contraseña?» de la pantalla de acceso (`resetPasswordAllowed` está activo) |
| Estado del ensayo | El reenvío y el `set-password --temporary` se ejercitan en CI en el peldaño **3b** de `despliegue.yml`, contra el Keycloak del compose con un buzón Mailpit. Contra el `prod` real, no |

## Síntoma

El alta declarativa (`reconciliar-identidades.sh`) creó al usuario **sin credenciales** y
con `UPDATE_PASSWORD` pendiente (ADR-0012). Falta que el usuario fije su clave, y no ha
podido porque:

- **el ambiente no declara `keycloakSmtpHost`** (Opción B): el Job pasó `SIN_CORREO=1` y no
  se envió ningún enlace — es lo que pasa hoy en `prod`, y este runbook es cómo se le da
  acceso a cada persona; o
- **hay relay pero el correo no llegó** — SMTP mal configurado, filtrado, dirección
  equivocada, o el enlace ya caducó.

La cuenta **existe y está `enabled`**; lo único que falta es la clave.

## Precondiciones

1. **Acceso a Keycloak como administrador.** En el clúster, `kubectl` al ambiente con
   permiso de `exec` sobre el `Deployment` de identidad (desde fuera del nodo, por el
   túnel SSH al 6443, `INF-01` §1.4). En la marcha blanca, `docker compose` en
   `despliegue/`.
2. **La `cuenta` del usuario** (su `username`, el mismo `usuario.cuenta` de la fila).
3. **Para reenviar el correo:** que el `smtpServer` del realm apunte a un relay que
   funcione. Si el problema de origen fue ése, arréglalo primero —`Secret`
   `sgtm-<amb>-smtp` en `prod` (`INF-06` §1.2), o el servicio `correo` en el compose— y
   comprueba con el paso 3 que ya sale.

## Pasos

Fija primero cómo se invoca `kcadm`, según dónde estés:

```bash
# --- En el clúster ---
NS=sgtm-<amb>
POD=$(kubectl -n $NS get pod -l app=$NS-identidad -o jsonpath='{.items[0].metadata.name}')
kc() { kubectl -n $NS exec -i "$POD" -- /opt/keycloak/bin/kcadm.sh "$@"; }
SERVIDOR=http://localhost:8080/keycloak
CLAVE_ADMIN=$(kubectl -n $NS get secret $NS-keycloak -o jsonpath='{.data.clave-administrador}' | base64 -d)

# --- En la marcha blanca (compose, en despliegue/) ---
kc() { docker compose exec -T identidad /opt/keycloak/bin/kcadm.sh "$@"; }
SERVIDOR=http://localhost:8080
CLAVE_ADMIN="$SGTM_CLAVE_KEYCLOAK"   # del .env
```

### 1. Sesión de administración y estado del usuario

```bash
kc config credentials --server "$SERVIDOR" --realm master --user admin --password "$CLAVE_ADMIN"

# El usuario ENTERO —sin `--fields`: kcadm devuelve `attributes` y `requiredActions`
# vacios cuando se filtran por campo (el mismo defecto que anota reconciliar-realm.sh).
kc get users -r sgtm -q username=<cuenta> -q exact=true
```

Mira tres cosas en la salida:

- `"enabled" : true` — si es `false`, esto no es este runbook: la cuenta está
  deshabilitada a propósito.
- `"requiredActions" : [ "UPDATE_PASSWORD" ]` — lo esperado. Si está vacío y **no** hay
  bloque `"credentials"`, el usuario quedó sin forma de entrar y sin acción pendiente:
  el paso 2B lo arregla y vuelve a poner la acción.
- `"attributes" : { "municipalidad_id" : [ "<n>" ] }` — tiene que estar. Sin el atributo,
  aunque fije la clave, toda petición recibirá 403 `SIN_MUNICIPALIDAD` (`ADR-0005`); eso
  se corrige volviendo a correr `reconciliar-identidades.sh`, no aquí.

Guarda el `id` para los pasos siguientes:

```bash
UID=$(kc get users -r sgtm -q username=<cuenta> -q exact=true --fields id --format csv --noquotes | tr -d '\r' | sed -n 1p)
```

### 2A. Reenviar el enlace por correo (el camino normal)

Con SMTP ya funcionando:

```bash
kc update "users/$UID/execute-actions-email" -r sgtm -b '["UPDATE_PASSWORD"]'
```

- El enlace anterior queda invalidado: solo vale el último.
- Para darle más margen que el de por omisión, añade la vigencia en segundos —p. ej. 12
  horas—: `kc update "users/$UID/execute-actions-email" -r sgtm -q lifespan=43200 -b '["UPDATE_PASSWORD"]'`.
- No se genera ninguna clave: el usuario la elige al abrir el enlace.

### 2B. Fijar una clave temporal a mano (sin SMTP, o urgente)

```bash
kc set-password -r sgtm --username <cuenta> --new-password '<temporal-larga-y-al-azar>' --temporary
```

- `--temporary` marca la clave como caducada: Keycloak **exige** cambiarla en el primer
  acceso (añade `UPDATE_PASSWORD` solo). Si en el paso 1 viste las acciones vacías,
  confírmalo: `kc update "users/$UID" -r sgtm -s 'requiredActions=["UPDATE_PASSWORD"]'`.
- **La clave temporal se entrega fuera de banda** —en persona, por un canal distinto del
  correo que falló— y no se escribe en un ticket ni en un chat. Es de un solo uso: el
  usuario la cambia y deja de valer.
- Genera algo que no se pueda adivinar: `openssl rand -base64 18`.

## Cómo se comprueba que terminó bien

**No basta con «el comando salió sin error».**

**Si fue 2A —reenvío—:** el correo llegó. En el compose se ve en el buzón
(`http://localhost:8025`, o `curl -s http://localhost:8025/api/v1/messages`); en `prod`,
lo confirma el propio usuario. Al abrir el enlace, Keycloak le pide una clave nueva y,
tras ponerla, entra al sistema **desde el dominio público, hasta ver una pantalla** —no
hasta el formulario—.

**Si fue 2B —clave temporal—:** un intento de token con la temporal **no** devuelve un
`access_token`, sino que Keycloak responde que hay que actualizar la contraseña:

```bash
curl -s --data 'grant_type=password&client_id=sgtm-backoffice&username=<cuenta>&password=<temporal>' \
  https://<dominio>/keycloak/realms/sgtm/protocol/openid-connect/token
# -> {"error":"invalid_grant","error_description":"Account is not fully set up"}
```

Es lo correcto: la clave es válida pero está caducada. El usuario la cambia en el
navegador y **a partir de ahí** el mismo `grant` con la clave nueva sí devuelve token, y
con el claim `municipalidad_id` dentro:

```bash
curl -s --data 'grant_type=password&client_id=sgtm-backoffice&username=<cuenta>&password=<nueva>' \
  https://<dominio>/keycloak/realms/sgtm/protocol/openid-connect/token \
  | python3 -c 'import json,sys,base64; t=json.load(sys.stdin)["access_token"].split(".")[1]; print(json.loads(base64.urlsafe_b64decode(t+"==")).get("municipalidad_id"))'
```

Tiene que imprimir el id de su municipalidad, no `None`.

## Si no sale bien

### El reenvío (2A) da error 500 o el correo no llega

SMTP no está resuelto. Comprueba el `smtpServer` del realm y el relay:

```bash
kc get realms/sgtm --fields smtpServer
```

En `prod`, el `host`/`port`/`from` salen de `Pulumi.<stack>.yaml` y el `usuario`/`clave`
del `Secret` `sgtm-<amb>-smtp`, que **no** lo genera `bootstrap-secretos.sh` (`INF-06`
§1.2): si falta, hay que crearlo. En el compose, que el servicio `correo` esté arriba.
Mientras tanto, usa 2B.

### Al entrar, «Account is not fully set up» y no aparece el formulario de clave

Al usuario le falta un dato obligatorio del perfil —correo, nombre o apellido—. Míralo en
el paso 1 y complétalo con `kc update "users/$UID" -r sgtm -s firstName=<n> -s lastName=<a> -s email=<c>`;
la fuente de verdad es su `municipalidades/<ubigeo>.json`, así que corrígelo **también
ahí** o el siguiente `reconciliar-identidades.sh` lo revierte.

### Fijaste la clave temporal y entra sin que le pida cambiarla

`--temporary` no se aplicó (versión de kcadm, o un `-s temporary=false` colado). Vuelve a
correr el `set-password` con `--temporary` y confirma `requiredActions` con el `kc update`
del paso 2B.

### `municipalidad_id` sale `None` en el token

El atributo no está en el usuario. No se arregla aquí: corre `reconciliar-identidades.sh`
(que lo pone desde el archivo versionado) y repite la comprobación.

## Documentos relacionados

[`ADR-0012`](../../30-arquitectura/adr/ADR-0012-usuarios-y-grupos-declarativos.md) (el
alta declarativa y el enlace por correo) ·
[`ADR-0005`](../../30-arquitectura/adr/ADR-0005-identidad-y-acceso.md) (el claim
`municipalidad_id`) · [`INF-06`](../../80-infraestructura/gestion-de-secretos.md) §1.2 (el
`Secret` `sgtm-<amb>-smtp`) ·
[Abrir la consola de administración de Keycloak](abrir-la-consola-de-keycloak.md) ·
[`despliegue/identidad/README.md`](../../../despliegue/identidad/README.md)
