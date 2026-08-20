# Despliegue de la marcha blanca

Motor, migración y aplicación, en ese orden. Es lo mínimo para que el sistema
**arranque**; hasta ahora no existía, y no por grado de avance
([GOB-04 §1](../docs/00-gobierno/plan-de-marcha-blanca.md)).

```bash
cd despliegue
cp .env.ejemplo .env          # y poner claves generadas, una distinta por rol
docker compose up --build --wait aplicacion
curl http://localhost:8080/actuator/health
```

## Las tres piezas y su orden

```
base ──(sana)──► migraciones ──(termina con éxito)──► aplicación
```

| Servicio | Rol con que se conecta | Vive |
|---|---|---|
| `base` | superusuario, solo dentro del contenedor | siempre |
| `migraciones` | `sgtm_owner` — **el único con DDL** | corre y termina |
| `aplicacion` | `sgtm_app` — sin DDL, sin `BYPASSRLS`, sin `DELETE`, propietaria de nada | siempre |

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
3. **`aplicacion`** arranca con `spring.flyway.enabled: false` —no migra, no
   puede— y publica una sola cosa sin identidad: `/actuator/health`.

Las claves se asignan **una sola vez**, cuando el volumen está vacío. Para
rotarlas hay que hacerlo contra la base ya existente, no reiniciando el
contenedor.

## Lo que todavía no hay

- **No se puede iniciar sesión.** No hay emisor de identidad, así que la cadena de
  seguridad niega todo lo que no sea la sonda de vida — deliberadamente, y ahora
  escrito en el código en vez de ocurrir por omisión
  ([`SeguridadWeb`](../backend/sgtm-plataforma/src/main/java/pe/gob/sgtm/plataforma/SeguridadWeb.java)).
  Keycloak, el realm y el claim `municipalidad_id` son
  [#119](https://github.com/hneyra/sgtm/issues/119); el frontend entra ahí, con el
  emisor al que apuntar.
- **No hay ninguna municipalidad dentro.** Sin fila en `municipalidad` no hay
  `municipalidad_id` que poner en ningún token:
  [#120](https://github.com/hneyra/sgtm/issues/120).
- **Esto no es una instalación de producción.** Un solo nodo, sin copias de
  seguridad programadas, sin TLS y con el puerto de la aplicación publicado en
  claro. Para la marcha blanca, delante va un proxy con TLS.

## Cómo se verifica

`.github/workflows/despliegue.yml` **levanta** esta instalación en CI y le hace
cuatro preguntas al sistema en marcha: que estén aplicadas todas las migraciones
del repositorio, que la sonda responda sin publicar detalles, que ninguna ruta de
la API se atienda sin identidad, y que **las credenciales que el contenedor de la
aplicación tiene de verdad no puedan crear una tabla**.

La cuarta es la que da valor al resto, y se demuestra que puede fallar cambiando
en `compose.yaml` el `SGTM_DB_USUARIO` de la aplicación por `sgtm_owner`: el
trabajo se pone rojo. Lee las credenciales del contenedor en marcha, no las que el
compose debería tener.
