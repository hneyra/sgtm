# Despliegue de la marcha blanca

Motor, migración, identidad y aplicación. Es lo mínimo para que el sistema
**arranque y alguien pueda entrar**; hasta hace poco no existía, y no por grado de
avance ([GOB-04 §1](../docs/00-gobierno/plan-de-marcha-blanca.md)).

```bash
cd despliegue
cp .env.ejemplo .env                       # y poner claves generadas, una distinta por rol
echo "127.0.0.1 identidad" | sudo tee -a /etc/hosts   # una vez. Ver abajo por qué
docker compose up --build --wait aplicacion
curl http://localhost:8080/actuator/health
```

## Las cuatro piezas y su orden

```
base ──(sana)──► migraciones ──(termina con éxito)──┐
                                                    ├──► aplicación
identidad ──(sana)─────────────────────────────────-┘
```

| Servicio | Rol con que se conecta | Vive |
|---|---|---|
| `base` | superusuario, solo dentro del contenedor | siempre |
| `migraciones` | `sgtm_owner` — **el único con DDL** | corre y termina |
| `identidad` | Keycloak, con su propio administrador | siempre |
| `aplicacion` | `sgtm_app` — sin DDL, sin `BYPASSRLS`, sin `DELETE`, propietaria de nada | siempre |

`identidad` no depende de la base ni de las migraciones: emite tokens y no sabe
nada del padrón. Lo que sí importa de él es **cómo se llama**, y tiene su propio
apartado más abajo.

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
3. **`identidad`** importa [`identidad/realm-sgtm.json`](identidad/README.md) y
   queda listo para emitir tokens. El realm trae un cliente público con **PKCE
   obligatorio** y el mapeador que pone `municipalidad_id` en el token, que es el
   único dato que el backend lee de una persona. La importación ocurre **una sola
   vez**, al crear el volumen: cambiar el archivo y reiniciar no basta.
4. **`aplicacion`** arranca con `spring.flyway.enabled: false` —no migra, no
   puede— y publica una sola cosa sin identidad: `/actuator/health`. Todo lo demás
   exige un token que `identidad` haya firmado.

Las claves se asignan **una sola vez**, cuando el volumen está vacío. Para
rotarlas hay que hacerlo contra la base ya existente, no reiniciando el
contenedor.

## `identidad` se llama igual dentro y fuera, y eso no es casualidad

```
127.0.0.1 identidad
```

Esa línea en `/etc/hosts` es lo que separa una instalación que funciona de una que
está bien configurada y no deja entrar a nadie.

El motivo: **el emisor va firmado dentro de cada token.** Keycloak pone su propia
dirección en el claim `iss`, y el backend rechaza el token cuyo `iss` no coincida
con `SGTM_OIDC_EMISOR`. Eso es lo que impide que valga un token de otro realm, y
tiene el precio de que el navegador y el backend tengan que nombrar al emisor
igual: `http://identidad:8081`. Dentro de la red de contenedores lo resuelve
Docker; fuera, esa línea.

La alternativa —dos nombres para el mismo emisor— exige desactivar la validación
del emisor, que es exactamente la barrera que se quiere. CI añade la misma línea
en un paso, y por eso la comprobación 7 puede existir.

## Lo que todavía no hay

- **No hay ninguna municipalidad dentro.** Se puede pedir un token y el backend lo
  acepta, pero detrás no hay padrón, ni permisos, ni primer administrador:
  [#120](https://github.com/hneyra/sgtm/issues/120). Hoy una petición autenticada
  se detiene en la autorización, no en la identidad — y la comprobación 6 de CI
  verifica justamente esa frontera.
- **El realm no valida audiencia.** Un token que este emisor dé a cualquier cliente
  lo acepta el backend. Con un solo cliente da igual; con dos, no. Está escrito en
  [`identidad/README.md`](identidad/README.md) y en `SeguridadWeb` para que sea una
  decisión y no un olvido.
- **Esto no es una instalación de producción.** Un solo nodo, sin copias de
  seguridad programadas, sin TLS —el realm va con `sslRequired: none`— y con los
  puertos publicados en claro. Para la marcha blanca, delante va un proxy con TLS.

## Cómo se verifica

`.github/workflows/despliegue.yml` **levanta** esta instalación en CI y le hace
ocho preguntas al sistema en marcha:

| # | Pregunta | Se demuestra que puede fallar |
|---|---|---|
| 1 | ¿Están aplicadas todas las migraciones del repositorio? | Un `locations` mal escrito deja la base a medias sin que nada falle |
| 2 | ¿Responde la sonda, y sin publicar detalles? | Poniendo `show-details: always` |
| 3 | ¿Se atiende alguna ruta sin identidad, y el 401 lleva su código? | Quitando el punto de entrada propio: el cuerpo se vacía |
| 4 | ¿Pueden las credenciales **reales** del contenedor crear una tabla? | Cambiando `SGTM_DB_USUARIO` por `sgtm_owner` |
| 5 | ¿Deja el realm crear un usuario sin municipalidad? | Quitando `"required"` del atributo en el realm |
| 6 | ¿Entra un token pedido al Keycloak de verdad? | Rompiendo el mapeador: llega sin claim y sale 403 |
| 7 | ¿Entra un token de **otro realm** del mismo Keycloak? | Cambiando `issuer-uri` por `jwk-set-uri` en el backend |
| 8 | Sin `SGTM_OIDC_EMISOR`, ¿arranca la aplicación? | Poniéndole un valor por omisión al marcador: arranca, se queda viva y el paso se agota |

La 4 es la que da valor a las tres primeras: lee las credenciales del contenedor en
marcha, no las que el compose debería tener, así que no hay forma de pasarla dándole
al proceso más privilegios de los declarados.

La 6 y la 7 son las que dan valor a las de identidad, y hay una diferencia que
conviene entender: la 7 crea un realm hermano en el **mismo** Keycloak y con el
mismo administrador. Es el escenario realista —quien puede crear un realm puede
firmar tokens impecables— y lo único que los separa del padrón es el `iss`.
