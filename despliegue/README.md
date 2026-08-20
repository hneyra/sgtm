# Despliegue de la marcha blanca

Motor, identidad, migración, aplicación e interfaz. Es lo mínimo para que el
sistema **arranque y alguien pueda entrar**; hasta hace poco no existía nada de
esto, y no por grado de avance
([GOB-04 §1](../docs/00-gobierno/plan-de-marcha-blanca.md)).

```bash
cd despliegue
cp .env.ejemplo .env          # y poner claves generadas, una distinta por rol
docker compose up --build --wait aplicacion interfaz
./identidad/crear-usuario.sh jperez 'una-clave' 1     # usuario de la municipalidad 1
```

La interfaz queda en <http://localhost:8081> y Keycloak en <http://localhost:8180>.

## Las piezas y su orden

```
base ──(sana)──► migraciones ──(termina con éxito)──┐
                                                    ├──► aplicación ──(sana)──► interfaz
identidad ──(arrancada)─────────────────────────────┘
```

| Servicio | Rol con que se conecta | Vive |
|---|---|---|
| `base` | superusuario, solo dentro del contenedor | siempre |
| `identidad` | Keycloak, con su propio administrador | siempre |
| `migraciones` | `sgtm_owner` — **el único con DDL** | corre y termina |
| `aplicacion` | `sgtm_app` — sin DDL, sin `BYPASSRLS`, sin `DELETE`, propietaria de nada | siempre |
| `interfaz` | nginx: sirve la aplicación y reenvía `/api/v1` | siempre |

El orden no es una preferencia de arranque. Un esquema a medias con la aplicación
ya sirviendo peticiones es el estado que `depends_on:
service_completed_successfully` existe para impedir.

**Las credenciales de `sgtm_owner` no entran nunca en el contenedor de la
aplicación.** Por eso son dos imágenes distintas del mismo árbol de fuentes
([`backend/Dockerfile`](../backend/Dockerfile)) y no una con dos modos: un proceso
de larga vida expuesto en HTTP no puede tener DDL sobre el padrón de todas las
municipalidades (ARQ-03 §4).

## Qué hace cada pieza al arrancar por primera vez

1. **`base`** inicializa el volumen y ejecuta, en orden alfabético, los dos
   guiones montados en `docker-entrypoint-initdb.d`:
   `crear-roles.sql` —montado desde el módulo del esquema, no copiado— crea los
   cuatro roles **sin `LOGIN` y sin clave**, y luego
   `20-asignar-claves.sh` les asigna `LOGIN` y clave desde el `.env`.
   Los roles no pueden ir en una migración: una política de `V6__rls.sql` los
   nombra, y un rol no puede crearse a sí mismo.
2. **`migraciones`** comprueba el ambiente y aplica lo que falte, como
   `sgtm_owner`. Antes de migrar se niega si faltan los cuatro roles, y se niega
   si quien migra es superusuario o tiene `BYPASSRLS`: lo que la prueba de
   aislamiento demuestra, lo demuestra sobre objetos creados por un `sgtm_owner`
   sin privilegios de más.
3. **`identidad`** importa el realm y queda emitiendo. La aplicación **no** la
   espera, y no es un descuido: con `jwk-set-uri` configurado, el validador se
   construye sin descubrimiento y las claves se piden la primera vez que llega un
   token. Quien sí tiene que esperarla es quien vaya a pedir uno.
4. **`aplicacion`** arranca con `spring.flyway.enabled: false` —no migra, no
   puede— y publica una sola cosa sin identidad: `/actuator/health`.
5. **`interfaz`** sirve los archivos estáticos y reenvía `/api/v1` al backend, así
   que el navegador nunca habla con él directamente y no hay CORS que configurar.

Las claves se asignan **una sola vez**, cuando el volumen está vacío. Para
rotarlas hay que hacerlo contra la base ya existente, no reiniciando el
contenedor.

## La identidad

El realm está versionado en [`identidad/realm-sgtm.json`](identidad/realm-sgtm.json)
y se importa al arrancar: un realm configurado a mano en una pantalla no es
reproducible. Fija los dos clientes, el PKCE obligatorio y **el mapeador que pone
`municipalidad_id` en el token**, que es el claim del que sale el `SET LOCAL` y con
él la separación entre municipalidades (ADR-0005).

**Lo que el realm no trae es ni un usuario ni una clave.** Un realm versionado con
usuarios es la forma más cómoda de que una contraseña acabe en producción; las
personas las crea `identidad/crear-usuario.sh`, con las claves de quien provisiona.

Un detalle que cuesta una tarde si se descubre por las malas: **el emisor es una
identidad, no una dirección de red**. El navegador llega a Keycloak por su nombre
público y el backend por el interno de la red del compose. Por eso `issuer-uri`
—lo que se compara con el `iss` del token— es el público, y `jwk-set-uri` —de dónde
se traen las claves— es el interno.

## Lo que todavía no hay

- **No hay ninguna municipalidad dentro.** Sin fila en `municipalidad` no hay
  `municipalidad_id` que poner en ningún token:
  [#120](https://github.com/hneyra/sgtm/issues/120).
- **Un usuario recién creado no puede hacer nada todavía**, y es correcto: el token
  vale, el claim se lee, y el guardia de acceso responde `SIN_PRIVILEGIO` porque no
  hay municipalidad ni usuario en las tablas de la aplicación. Eso es
  [#120](https://github.com/hneyra/sgtm/issues/120).
- **Esto no es una instalación de producción.** Un solo nodo, sin copias de
  seguridad programadas, sin TLS y con los puertos publicados en claro. Keycloak
  corre en `start-dev`, que guarda su base en el propio contenedor. Para la marcha
  blanca, delante va un proxy con TLS.

## Cómo se verifica

`.github/workflows/despliegue.yml` **levanta** esta instalación en CI y le hace
preguntas al sistema en marcha. La central es la **escalera de identidad**, donde
cada peldaño responde con su código del catálogo — y el código es lo que hace la
aserción precisa, porque dice *hasta dónde* llegó la petición:

| Petición | Respuesta |
|---|---|
| sin token | `401 NO_AUTENTICADO` |
| con algo que no es un token | `401 NO_AUTENTICADO` |
| con un token de otro emisor | `401 NO_AUTENTICADO` |
| con token del realm, **sin** el claim | `403 SIN_MUNICIPALIDAD` |
| con token del realm y **con** el claim | `403 SIN_PRIVILEGIO` |

El último peldaño es el que importa: `SIN_PRIVILEGIO` significa que el token se
validó, que el claim se leyó y que la petición llegó hasta el guardia de acceso.

Y la que da valor al resto: **las credenciales que el contenedor de la aplicación
tiene de verdad no pueden crear una tabla**. Se demuestra que puede fallar
cambiando en `compose.yaml` el `SGTM_DB_USUARIO` por `sgtm_owner`: el trabajo se
pone rojo. Lee las credenciales del contenedor en marcha, no las que el compose
debería tener.
