# DEV-04 — Tareas frecuentes

| Campo | Valor |
|---|---|
| Versión | 1.0 |
| Fecha | 2026-08-20 |

Recetario. Cada receta dice **qué comando**, y lo que hay que mirar antes de darla por hecha.

## 1. Agregar una tabla o cambiar el esquema

```bash
# 1 · Escribir la migración. El siguiente número libre, y nombre en español:
#     backend/sgtm-esquema/src/main/resources/db/migration/V19__lo_que_hace.sql
# 2 · Aplicarla y comprobar que el aislamiento sigue en pie
cd backend && ./gradlew verificarAislamiento
```

Lo que la prueba de aislamiento te va a exigir, y conviene saber **antes** de escribir el DDL:

| Si la tabla… | Entonces |
|---|---|
| Lleva `municipalidad_id NOT NULL` | La prueba le exige RLS **sola**. No hay que declararla en ningún sitio |
| No lo lleva | Hay que clasificarla como catálogo o como exenta **en el código de la prueba**, y eso se ve en el diff |
| Es una **partición** | Repetir el bloque de RLS explícita de `V6__rls.sql` y **no concederle ningún privilegio** |

Tres cosas más que no son opinión (DAT-01 §0):

- **Búsqueda por prefijo como rango**, con `~>=~` / `~<~`. Bajo RLS un `LIKE 'prefijo%'` no llega
  nunca al índice, porque `textlike` no es *leakproof* y PostgreSQL no lo evalúa antes de la
  política. El síntoma es un `Seq Scan` sobre todo el padrón.
- **Toda clave foránea nueva sobre una tabla con RLS va `NOT VALID`**: validarla es una consulta, y
  el migrador no tiene contexto de tenant. `NOT VALID` sigue comprobando cada `INSERT`.
- **Los tipos y longitudes salen de `../srtm/docs/40-datos/ddl/esquema-verificado.sql`.** Nunca
  `numeric(15,2)` suelto donde hay dominio (`dinero`, `monto_calc`, `alicuota`, `porcentaje`,
  `area_m2`, `ejercicio`).

Y el índice: **todo índice selectivo empieza por `municipalidad_id`** (RNF-064), porque la política
RLS añade esa condición a cada consulta.

## 2. Cambiar el contrato de la API

**`sgtm-v1.yaml` tampoco se edita a mano**: sale de `docs/50-api/generar-openapi.mjs`, que lo deriva
de los `endpoint` del prototipo. Lo que el prototipo no puede saber —un filtro que solo tiene el
backend, una respuesta 307, la descripción que solo se conoce al implementar la operación— se
declara en las tablas del generador, no en el archivo.

```bash
# 1 · Editar docs/50-api/generar-openapi.mjs (la operación, sus parámetros, su descripción)
# 2 · Regenerar el contrato
node docs/50-api/generar-openapi.mjs
# 3 · Regenerar los tipos de la interfaz
cd frontend && yarn generar-operaciones
# 4 · Comprobar que todo lo que usaba lo viejo se rompió a propósito
yarn typecheck
```

`packages/api-client/src/operaciones.generado.ts` **no se edita a mano**. `yarn verificar` corre
`yarn comprobar-operaciones`, que regenera y compara: si el archivo y el contrato no cuadran, el
build se pone rojo antes que el navegador. Y del contrato hacia arriba hace lo mismo
`node docs/50-api/generar-openapi.mjs --comprobar`, que corre en CI: durante quince issues el YAML
se afinó a mano aplicándole solo el diff aditivo del generador, y regenerarlo en limpio llegó a
borrar 519 líneas y dos operaciones enteras sin que nada se pusiera rojo (#312).

Del otro lado, `ContratoDeApiTest` compara el contrato con las rutas que el backend publica, en las
**dos** direcciones: una ruta sin contrato y un contrato sin ruta son los dos un fallo.

## 3. Regenerar el catálogo de pantallas

```bash
cd frontend && yarn portar-catalogo
```

Lee los cinco archivos declarativos del prototipo (`design/sgtm-data-{1..5}.js`) y los parte en
estructura —`apps/backoffice/src/catalogo/`— y valor —`packages/api-mock/src/`—. Los archivos
`.generado.ts` no se editan a mano; si algo hay que cambiar, se cambia el guion o el prototipo.

## 4. Agregar una regla que el proyecto haga cumplir

**Una regla sin su muestra no protege nada.** Las dos mitades entran en el mismo PR.

```bash
# Backend: la regla en verificaciones/, la muestra en verificaciones/muestras/
cd backend && ./gradlew verificarArquitectura      # con la muestra: rojo

# Interfaz: la regla en eslint.config.js, la muestra en verificaciones/muestras/
cd frontend && yarn test verificaciones/reglas-de-eslint.test.ts
```

Las muestras del frontend se lintan **desde la prueba**, no desde `yarn lint`: violan las reglas a
propósito y tienen que quedar fuera del lint normal.

## 5. Escribir una pantalla que guarde algo

Antes de escribir el formulario, tres cosas que el lint no te va a dejar saltarte:

| Regla | Cómo se cumple |
|---|---|
| Toda modificación exige **observación del usuario** | El camino de escritura vive en `useEscritura`, que pide la observación antes de habilitar la acción. **`useMutation` fuera de ahí no pasa el lint** |
| Solo viajan los campos declarados | El cuerpo lleva la observación y **solo** los campos que la opción lista en `pantallas/escrituras.ts` |
| Ninguna petición por `fetch` suelto | Todas pasan por `solicitar()` de `@sgtm/api-client` |

Y una que aplica a toda cifra que muestres: **no existe «la deuda»**, existe
`deudaActualizadaA(fecha)`, y toda cifra mostrada indica su fecha (RNF-075). La interfaz **no hace
aritmética con importes**: los totales llegan calculados del servidor.

## 6. Crear usuarios para probar

```bash
cd despliegue
./identidad/crear-usuario.sh jperez 'una-clave' 1     # usuario de la municipalidad 1
./identidad/crear-usuario.sh nadie   'otra-clave'     # SIN municipalidad: sirve para el 403
```

Es idempotente: si el usuario existe, le actualiza clave y atributo. El correo, el nombre y el
apellido salen de `SGTM_CORREO`, `SGTM_NOMBRE` y `SGTM_APELLIDO`; **Keycloak exige los tres** y sin
perfil completo el usuario no inicia sesión aunque exista y tenga clave.

El usuario sin municipalidad no es un accidente útil: es la forma de comprobar que un token sin el
claim recibe `403 SIN_MUNICIPALIDAD` y **no llega a ningún controlador**.

## 7. Empezar la base desde cero

```bash
cd despliegue
docker compose down --volumes      # ⚠ BORRA los datos y los vuelve a crear al levantar
docker compose up --build --wait aplicacion interfaz
```

Es lo que hay que hacer cuando quieres que se vuelvan a ejecutar los guiones de inicialización del
motor —los que crean los cuatro roles y les asignan las claves del `.env`—: **se ejecutan una sola
vez, cuando el volumen está vacío**. Cambiar una clave en el `.env` y reiniciar el contenedor no la
cambia en la base.

## 8. Formato y estilo

```bash
cd backend  && ./gradlew spotlessApply     # arregla el formato en vez de solo reprocharlo
cd frontend && yarn format                 # Prettier, mismo trato
```

Si el build se queja del formato, no lo pelees. Lo que **no** arregla el formateador, porque no es
formato, son los **identificadores con tilde**: `alicuota`, nunca `alícuota`. Checkstyle lo revisa
en el backend y ESLint en el frontend.

## 9. Antes de abrir el PR

```bash
cd backend  && ./gradlew build verificarArquitectura verificarAislamiento
cd frontend && yarn verificar && yarn comprobar-compilaciones && yarn e2e
```

En el cuerpo del PR, además de qué hace:

- [ ] **Qué se rompió para demostrar que la verificación muerde**, y qué se puso rojo.
- [ ] Si tocaste el esquema: qué tablas nuevas hay y cómo quedaron clasificadas.
- [ ] Si tocaste el contrato: que los tipos regenerados están en el commit.
- [ ] Si una decisión abierta te bloqueó, cuál (`D-0x`) y qué hiciste mientras tanto.

Mensajes de commit, comentarios y pruebas **en español**; los identificadores técnicos, en inglés.

## 10. Documentos relacionados

[DEV-03 — Pruebas](pruebas.md) ·
[DAT-01 — Modelo lógico-físico](../40-datos/modelo-logico-fisico.md) §0 ·
[ARQ — Estándares del backend](../30-arquitectura/estandares-de-codigo-backend.md) ·
[FRO — Estándares del frontend](../60-frontend/estandares-de-codigo-frontend.md)
