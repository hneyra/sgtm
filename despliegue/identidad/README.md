# El realm de Keycloak

`realm-sgtm.json` es el emisor de identidad del SGTM, **versionado**. Un realm
configurado a mano en una pantalla de administración no es reproducible, no se ve
en un diff y no se puede volver a levantar en otra municipalidad: por eso está
aquí y por eso el contenedor arranca con `--import-realm`.

JSON no admite comentarios, así que las decisiones están en este archivo. Cada una
se puede comprobar abriendo el `.json`.

## Lo que emite, y por qué eso es todo el diseño

El backend no conoce usuarios. Lo único que le llega de una persona es un token
firmado, y de ese token solo lee **un** dato: el claim `municipalidad_id`
([ADR-0005](../../docs/30-arquitectura/adr/)). De ahí sale el `SET LOCAL` y de ahí
sale lo que Row Level Security deja ver. Así que este archivo decide, en la
práctica, qué datos ve cada persona del país.

```
usuario → atributo municipalidad_id → mapeador → claim del token → SET LOCAL → RLS
```

## Las cinco decisiones

### 1. `municipalidad_id` es un atributo declarado, no un campo suelto

Está en el perfil de usuario del realm (`kc.user.profile.config`) y no como
atributo libre. Eso le da dos propiedades que un atributo suelto no tiene:

| En el JSON | Qué impide |
|---|---|
| `"required": {"roles": ["admin"]}` | Keycloak **se niega a crear un usuario sin municipalidad**. La barrera vive en el emisor, no en una convención de quien da de alta |
| `"permissions": {"edit": ["admin"]}` | El usuario **no puede editarse su propia municipalidad** desde su página de cuenta. Si pudiera, se cambiaría de municipalidad él solo y el backend le creería: para el backend el token es la verdad |
| `"validations": {"pattern": "^[1-9][0-9]*$"}` | Un valor que no sea un identificador positivo. `MunicipalidadId` ya lo rechaza en Java; rechazarlo también aquí evita emitir un token que nace inútil |

La segunda es la que importa de verdad. Es el único punto de todo el sistema donde
una persona podría, sin explotar nada, concederse acceso al padrón de otra
municipalidad.

### 2. El claim va en el token de acceso y en ninguno más

`access.token.claim: true`, `id.token.claim: false`. El token de acceso es el
único que el backend valida; el de identidad describe al usuario para la interfaz
y no necesita saber de municipalidades. Una copia menos del dato es un sitio menos
del que puede salir.

`jsonType.label: long` lo emite como número. `TenantContextFilter` acepta número y
texto, así que el sistema no se rompe si algún día llega como cadena — pero lo que
se emite hoy es un número, y está escrito.

### 3. El cliente es público y **exige** PKCE

`sgtm-backoffice` es una aplicación de navegador: no hay dónde guardar un secreto
de cliente, así que es `publicClient`. Lo que sustituye al secreto es PKCE, y la
línea que lo hace obligatorio es `pkce.code.challenge.method: S256`.

Sin esa línea PKCE es *opcional*: un cliente que no lo mande obtiene su token
igual, y la protección contra el robo del código de autorización se queda en que
el frontend se acuerde de usarlo. El frontend lo usa
([`packages/api-client/src/sesion.ts`](../../frontend/packages/api-client/src/sesion.ts)),
y aun así el realm lo exige, porque una defensa que depende de que el cliente
coopere no es una defensa.

### 4. Tres flujos apagados

| Flujo | Por qué no |
|---|---|
| Implícito | Devuelve el token en la barra de direcciones: queda en el historial, en los registros del proxy y en el `Referer` |
| **Contraseña directa (ROPC)** | El usuario le daría su clave a la aplicación. Es exactamente lo que el flujo de código existe para evitar |
| Cuenta de servicio | Este cliente actúa siempre en nombre de una persona. Una cuenta de servicio no tiene municipalidad, y el backend la rechazaría |

**La verificación de CI habilita ROPC al vuelo** para poder pedir un token sin
abrir un navegador, y lo deja escrito en el propio paso. Que el repositorio no lo
traiga habilitado es la diferencia entre una instalación y un banco de pruebas.

### 5. Nadie se registra solo

`registrationAllowed: false`, `resetPasswordAllowed: false`. Las cuentas las crea
la municipalidad (RF-121). Un formulario de registro abierto en un emisor cuyo
único claim decide qué padrón se ve no tiene lectura benigna.

`bruteForceProtected: true` porque el emisor es el único sitio del sistema que ve
una contraseña, y por tanto el único que puede frenar la fuerza bruta contra ella.

## Lo que este realm todavía no hace

- **No declara audiencia.** Un token que este realm emita a cualquier cliente lo
  acepta el backend, porque la validación por omisión mira emisor y vencimiento, no
  `aud`. Hoy hay un solo cliente y el efecto es nulo; con dos deja de serlo. Hace
  falta un mapeador de audiencia aquí y un validador en
  [`SeguridadWeb`](../../backend/sgtm-plataforma/src/main/java/pe/gob/sgtm/plataforma/SeguridadWeb.java),
  y las dos mitades tienen que llegar juntas: media audiencia rechaza todos los
  tokens.
- **No tiene roles ni grupos.** Los permisos del SGTM no viven aquí: viven en la
  base, en `grupo`, `permiso` y `acceso`, y los comprueba `@RequiereAcceso` contra
  PostgreSQL. Duplicarlos en el token los pondría a divergir el primer día.
- **No lleva un solo usuario.** Los crea el alta de la municipalidad
  ([#120](https://github.com/hneyra/sgtm/issues/120)); un usuario versionado en el
  repositorio es una credencial versionada en el repositorio.
- **No exige múltiple factor.** Es una decisión de la municipalidad —tiene coste de
  operación— y no del despliegue.
- **`sslRequired: none`.** Es lo que permite la marcha blanca sobre HTTP plano. En
  una instalación de verdad va detrás de un proxy con TLS y esto pasa a `external`.
  Está aquí, en una línea, para que cambiarlo sea una línea.

## Cómo se levanta y cómo se mira

```bash
cd despliegue
docker compose up --build --detach --wait aplicacion
```

El realm se importa **una sola vez**, al crear la base de datos interna de
Keycloak. Cambiar este archivo y reiniciar el contenedor no vuelve a importarlo:
hay que borrar el contenedor de identidad (`docker compose rm -sf identidad`).

La consola de administración queda en `http://localhost:8081`, con `admin` y la
clave de `SGTM_CLAVE_ADMIN_IDENTIDAD`.

## La línea del `/etc/hosts`

```
127.0.0.1 identidad
```

Sin ella, el navegador no llega al emisor y **no hay forma de entrar**. El motivo
es que el emisor forma parte de lo que va firmado: cada token lleva su `iss`, y el
backend rechaza el que no coincida con `SGTM_OIDC_EMISOR`. Si el navegador pidiera
el token a `http://localhost:8081` y el backend esperara `http://identidad:8081`,
todo estaría bien configurado y nada funcionaría.

La alternativa —dos nombres para el mismo emisor— es peor: obliga a desactivar la
validación del emisor, que es justo la que impide que valga un token de otro realm.
