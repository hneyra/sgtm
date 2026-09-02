# DEV-05 — Cuando algo no arranca

| Campo | Valor |
|---|---|
| Versión | 1.0 |
| Fecha | 2026-08-20 |

Los rojos que ya nos costaron una tarde. Están aquí porque **el síntoma no se parece a la causa**;
si el mensaje de error dijera lo que pasa, no haría falta escribirlo.

## 1. `Cannot find module '@playwright/test'` al correr `yarn verificar`

```
e2e/caja-con-teclado.spec.ts(1,30): error TS2307: Cannot find module '@playwright/test'
playwright.config.ts(1,39): error TS2307: Cannot find module '@playwright/test'
```

**Causa:** `node_modules` a medio instalar. `yarn verificar` corre `tsc --build`, que compila
también `e2e/` y `playwright.config.ts`, así que una dependencia de desarrollo ausente sale como un
error de tipos y parece un problema del código.

**Salida:**

```bash
cd frontend && yarn install
```

Ocurrió en esta máquina el 2026-08-20 y se arregló en menos de un segundo: el paquete no estaba
enlazado, aunque `.yarn-integrity` existiera.

## 2. 22 pruebas de la interfaz fallan con `localStorage` indefinido

```
TypeError: Cannot read properties of undefined (reading 'length')
 ❯ packages/api-client/src/cliente.test.ts:121:32
     expect(window.localStorage.length).toBe(0);
```

**Causa:** la versión de Node. Con **Node 26** fallan 22 pruebas —las de sesión, permisos y token—
porque `window.localStorage` llega `undefined` bajo jsdom. **CI corre Node 22 y está en verde**
(`frontend.yml` fija `node-version: '22'`).

**Salida:** usar Node 22, que es la versión que el proyecto verifica. No está comprobado que 24 o
25 sirvan; lo comprobado es 22 en CI y 26 fallando.

> Si `yarn test` te falla justo en esas pruebas y no tocaste la sesión, mira `node --version` antes
> de mirar el diff.

## 3. Las pruebas de persistencia fallan sin decir que falta Docker

**Causa:** no hay motor de base de datos. Y es deliberado que **fallen en vez de omitirse**: una
prueba bloqueante que se salta a sí misma deja el build en verde sin haber verificado nada.

**Salida:** levantar Docker, o apuntar a un PostgreSQL existente
([DEV-03 §4](pruebas.md)). Mientras tanto, lo que sí corre sin motor:

```bash
cd backend && ./gradlew verificarArquitectura
```

## 4. «otra corrida de pruebas … le puso otra clave» con un PostgreSQL externo

**Causa:** hay otra corrida usando el mismo clúster. Cada módulo de prueba crea su propia base,
pero **los roles son del clúster, no de la base**, y quien provisiona reescribe sus claves.

Desde #698 dos tareas de la **misma** corrida ya no se pisan —la clave se deriva del clúster y el
provisionamiento se serializa con un candado del propio motor—, así que si este mensaje sale, al
otro lado hay una corrida con **otro código** (una rama anterior a #698) o con **otra credencial de
superusuario**.

**Salida:** esperar a que la otra corrida termine, levantar un motor propio, o usar Testcontainers
—donde el problema no existe, porque cada módulo levanta el suyo—.

Si lo que sale es el `password authentication failed` pelado y no este mensaje, quien lo produjo no
pasó por el arnés: mira quién más tiene abierta una sesión contra ese motor.

## 5. Una consulta devuelve **dos** municipalidades

**Causa, casi siempre:** estás conectado como superusuario. Un superusuario **omite Row Level
Security incluso con `FORCE ROW LEVEL SECURITY`**, y una prueba escrita sobre esa conexión pasa en
verde sin verificar nada.

**Salida:** conectarse como `sgtm_app` ([DEV-02 §4](ejecutar-y-depurar.md)). Si con `sgtm_app`
siguen saliendo dos, entonces sí es un defecto y es de los graves.

## 6. Una consulta falla con «no se encontró el parámetro app.municipalidad_id»

**No es un defecto: es la barrera funcionando.** Una consulta **sin contexto de municipalidad
falla**; no devuelve vacío ni devuelve todo (RNF-032). En la aplicación el contexto lo fija el
filtro del token; en `psql` lo fijas tú, dentro de una transacción:

```sql
BEGIN;
SELECT set_config('app.municipalidad_id', '1', true);
-- tu consulta
COMMIT;
```

`SET LOCAL`, jamás `SET SESSION`: `SET SESSION` sobrevive al retorno de la conexión al pool y
contamina la petición de otra municipalidad.

## 7. Todo devuelve `401` y el mensaje no dice por qué

**Causa:** el emisor. `issuer-uri` se compara con el `iss` del token, y **el emisor es una
identidad, no una dirección de red**: el navegador llega a Keycloak por su nombre público y el
backend por el interno de la red del compose. Con dos nombres distintos, la firma es válida, el
emisor no cuadra, y el 401 no explica nada.

**Salida:** `SGTM_OIDC_EMISOR` es el **público** —el mismo que ve el navegador—, y `SGTM_OIDC_JWKS`
—de dónde se traen las claves— el **interno**. Para ver qué trae el token:

```bash
printf '%s' "$TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | python3 -m json.tool
```

## 8. `403 SIN_MUNICIPALIDAD` con un usuario que sí existe

**Causa:** al usuario de Keycloak le falta el atributo del que sale el claim `municipalidad_id`.

**Salida:** `./identidad/crear-usuario.sh jperez 'su-clave' 1` — es idempotente y se lo pone.

Y si el error es `403 SIN_PRIVILEGIO`, no es lo mismo y es buena señal: el token se validó, el
claim se leyó y la petición llegó hasta el guardia de acceso. Le falta el permiso, que la
implantación solo otorga sobre las once opciones de seguridad.

## 9. El backend no arranca y no dice nada útil

**Causa:** falta `SGTM_OIDC_EMISOR` en el perfil `web`. **No tiene valor por omisión, y eso es la
decisión**: un proceso que atiende peticiones sin poder validar un token responde a la sonda, se
declara sano y no atiende a nadie.

**Salida:** ponerla. Si no quieres levantar Keycloak, trabaja contra el proxy de datos
([DEV-01 §2 A](entorno-local.md)).

## 10. La interfaz queda «unhealthy» con nginx sirviendo perfectamente

**Causa:** la sonda usaba `localhost`. El guion de arranque de la imagen solo añade el
`listen [::]:8080` cuando la configuración es la suya, y esta no lo es, así que nginx escucha
**solo en IPv4**; `wget` resuelve `::1` primero, no encuentra a nadie, y el contenedor se queda
«unhealthy» para siempre.

**Salida:** ya está resuelto en `compose.yaml` con `127.0.0.1`. Está aquí porque el síntoma
—contenedor enfermo, servicio sano— hace perder una hora buscando en el sitio equivocado.

## 11. Cambié el `.env` y no pasa nada

Dos causas distintas, y las dos son ciertas a la vez:

| Qué cambiaste | Por qué no se nota |
|---|---|
| Una **clave** de la base | Los guiones de inicialización corren **una sola vez**, con el volumen vacío. Rotar una clave es contra la base existente, no reiniciando el contenedor |
| El **emisor** o cualquier `VITE_*` | Vite las resuelve **al compilar**: hay que reconstruir la imagen de la interfaz |

**Salida:** para lo primero, `docker compose down --volumes` si estás en desarrollo y no te importa
perder los datos. Para lo segundo, `docker compose up --build interfaz`.

## 12. Checkstyle se queja de un identificador

**Causa:** una tilde. `alicuota`, nunca `alícuota`. Es fácil de incumplir con el teclado en español
y por eso hay una regla que lo revisa.

Y si la queja es de **formato**, no la pelees: `./gradlew spotlessApply`. Checkstyle no revisa
formato a propósito, para no discutir con el formateador.

## 13. Una prueba «pasa» y no la ejecutaste

**Causa:** Gradle no vuelve a ejecutar una tarea cuyas entradas no cambiaron. Un `UP-TO-DATE` se
lee igual que un verde.

**Salida:**

```bash
./gradlew :sgtm-catastro:test --tests '*ViaRepositoryJdbcTest*' --rerun
```

## 14. Lo que no está aquí

Si el rojo no aparece en esta lista y no es tu cambio, mira los informes antes de repetir el
comando: `backend/<modulo>/build/reports/tests/test/index.html` y, en CI, los artefactos de la
corrida. Cuando encuentres la causa, **agrega la fila**: este documento vale exactamente lo que
alguien haya escrito en él después de perder la tarde.

## 15. Documentos relacionados

[DEV-01 — Entorno local](entorno-local.md) ·
[DEV-02 — Ejecutar y depurar](ejecutar-y-depurar.md) ·
[DEV-03 — Pruebas](pruebas.md)
