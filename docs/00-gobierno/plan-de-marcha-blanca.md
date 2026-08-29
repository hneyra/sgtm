# GOB-04 — Plan de marcha blanca del impuesto predial

**Estado:** propuesta, pendiente de aprobación.
**Alcance decidido:** padrón y determinación, **sin cobranza**.
**Emisor de identidad decidido:** Keycloak.
**D-02a: cerrada el 2026-08-25** ([#200](https://github.com/hneyra/sgtm/issues/200)). El paquete E-3 de [#116](https://github.com/hneyra/sgtm/issues/116) terminó, y el mecanismo de carga existe entero. Lo que sigue deteniendo los importes es otra cosa, y está en §5.

> **Vigencia (2026-08-29).** Esta pasada actualiza lo que el plan decía de **D-02a**, que se cerró.
> §1 y §2 siguen describiendo el repositorio del día en que se escribió: los cuatro hechos de §1
> (M-1…M-4) están resueltos —`SeguridadWeb`, `backend/Dockerfile` y `despliegue/compose.yaml`,
> `ImplantarMunicipalidad`— y las ondas avanzaron muy por encima de lo que §2 recoge. Refrescarlos
> es otro trabajo, y se ve que hace falta.

Este documento no reordena la [hoja de ruta del backend (#58)](https://github.com/hneyra/sgtm/issues/58):
la recorta a lo que una marcha blanca del predial necesita, y **añade lo que la hoja de ruta no
tiene porque nunca fue un problema de negocio** — que el sistema se pueda desplegar, que alguien
pueda entrar y que exista una municipalidad dentro.

---

## 1. Lo primero: hoy no hay nada que desplegar

No es una opinión sobre el grado de avance. Son cuatro hechos comprobables en el repositorio, y
cada uno por separado impide arrancar el sistema para que lo use una persona:

| # | Hecho | Dónde se comprueba | Consecuencia |
|---|---|---|---|
| **M-1** | **No hay `SecurityFilterChain` ni `issuer-uri`.** `spring-boot-starter-oauth2-resource-server` está en el classpath, pero nada configura un emisor y ningún `@Bean` define la cadena de filtros | `backend/sgtm-plataforma/build.gradle.kts:26` y `application.yaml` entero; `grep -rn SecurityFilterChain backend --include=*.java` no devuelve nada en `main` | Sin `Jwt` en el `SecurityContextHolder`, `TenantContextFilter` deja pasar **siempre sin contexto**. Toda consulta falla por falta de contexto de tenant, que es el comportamiento correcto y también un sistema inservible |
| **M-2** | **Nadie ejecuta las migraciones.** `spring.flyway.enabled: false`, a propósito y bien: la aplicación se conecta como `sgtm_app`, que no tiene DDL | `application.yaml`, `spring.flyway.enabled` | Las quince migraciones y `db/roles/crear-roles.sql` existen y **no hay proceso que las aplique**. Base vacía |
| **M-3** | **No hay imagen ni forma de arrancar.** Ni `Dockerfile`, ni `compose`, ni manifiestos | `find . -iname '*docker*' -o -iname '*compose*'` → solo `.github` | El artefacto único de ADR-0003, en perfiles `web` y `batch`, no está empaquetado en ninguna parte |
| **M-4** | **No hay forma de dar de alta una municipalidad.** `municipalidad` la escribe solo `sgtm_owner`, y no existe endpoint, tarea ni procedimiento que la cree, ni que siembre el primer administrador | `V1__nucleo_y_catastro.sql:35-46`; `SembradorDeAccesos` existe y **nadie lo invoca** | Sin fila en `municipalidad` no hay `municipalidad_id` que poner en ningún token. El sistema no tiene dentro |

Los cuatro comparten una causa: la hoja de ruta se ordenó por dependencia **entre contextos de
negocio**, y la implantación no es un contexto de negocio. Que aparezcan justo ahora, cuando hay
fecha, es lo normal; que no tengan issue, no.

## 2. Qué hay hecho, verificado contra el repositorio

| Onda | Estado |
|---|---|
| **Onda 0** — cimientos | Cerrada: #4 #5 #6 #7 #8 |
| **Onda 1** — padrón | Cerrada **salvo #17**: #9 #12 #13 (seguridad), #10 #14 (parámetros), #11 #15 (contribuyentes), #16 #18 #19 #20 (catastro), #55 (documentos) |
| **Onda 2** — libro y determinación | Solo #21 (el libro de asientos). Abiertos #22 #23 #24 #25 y los siete de rentas #26…#32 |
| **Frontend** | Onda 0 cerrada (#61…#69). De las 134 pantallas, **dibujadas las 134**; conectadas las de seguridad y el catálogo vial. Abiertos #70…#81 |

Es decir: **el padrón está construido y la determinación no está empezada.** El alcance elegido
—padrón y determinación, sin cobranza— cae justo en esa frontera.

## 3. Los cinco issues que faltaban, ya creados

Salen de §1, más el marcado de la instalación de demostración que el paquete E-6 de #116 ya había
identificado. Ninguno depende de D-02.

| Issue | Qué entrega | Cómo se demuestra que su verificación puede fallar |
|---|---|---|
| **[#118](https://github.com/hneyra/sgtm/issues/118) · Empaquetado y despliegue** | `Dockerfile` del artefacto único; `compose` de marcha blanca con PostgreSQL, Keycloak y el backend; **paso de migración separado**, que corre como `sgtm_owner` y termina antes de que arranque la aplicación; `crear-roles.sql` en el arranque del motor | Dando a `sgtm_app` las credenciales de `sgtm_owner` en el compose: la comprobación de que la aplicación **no** puede hacer DDL se pone roja |
| **[#119](https://github.com/hneyra/sgtm/issues/119) · Identidad con Keycloak** | `SecurityFilterChain` explícita, `issuer-uri`, realm exportado y versionado con el claim `municipalidad_id`, y el frontend apuntando a él (el PKCE de #65 ya está) | Tres roturas: quitar la cadena de filtros, emitir un token sin el claim, y emitir uno firmado por otro realm. Las tres tienen que dar 401 o 403 y ninguna llegar al controlador |
| **[#120](https://github.com/hneyra/sgtm/issues/120) · Implantación de una municipalidad** | Procedimiento en perfil `batch` que da de alta la municipalidad, siembra los 134 accesos con `SembradorDeAccesos`, crea el primer administrador y fija el ejercicio de trabajo. Idempotente | Ejecutándolo dos veces: la segunda no duplica accesos ni crea un segundo administrador. Y quitando la guarda del último administrador, que #12 ya demostró que muerde |
| **[#121](https://github.com/hneyra/sgtm/issues/121) · Carga inicial de vías, sectores y manzanas** | Importación masiva desde archivo de los catálogos territoriales de #16, con su rechazo por fila y su observación | Con un archivo donde una fila viola la unicidad: se rechaza esa fila, se informa cuál, y las demás entran |
| **[#122](https://github.com/hneyra/sgtm/issues/122) · Instalación de demostración** | `municipalidad.es_demostracion` en migración —el hecho vive en la base, no en configuración—; todo documento emitido bajo ese tenant sale marcado | Emitiendo un documento bajo el tenant de demostración sin la marca: la comprobación de reimpresión idéntica de #55 lo detecta |

**#122 es lo que hace honesta una marcha blanca**: mientras ningún conjunto del ejercicio esté
sellado con cifras reales, cualquier importe que el sistema muestre sale de parámetros de prueba.
Cerrar D-02a no cambió eso —firmar la transcripción no es cargar el dato, y dos de los tres cuadros
todavía no se pueden publicar (§5)—. Que el documento lo diga por escrito es la diferencia entre una
prueba y un valor que alguien puede intentar cobrar.

## 4. La secuencia

Cada fila es un PR. El orden está fijado por dependencia real, no por comodidad.

| # | PR | Issues | Depende de |
|---|---|---|---|
| 1 | Este plan, y los cinco issues creados (#118…#122) | — | — |
| 2 | Empaquetado, migración como `sgtm_owner` y compose | **#118** | — |
| 3 | Identidad con Keycloak, de punta a punta | **#119** | 2 |
| 4 | Implantación de una municipalidad, y la marca de demostración | **#120**, **#122** | 3 |
| 5 | Carga inicial de catálogos territoriales | **#121** | 4 |
| 6 | Tablas de valuación: estructura, con la dimensión que falta | **#17** | 4 |
| 7 | `deudaActualizadaA(fecha)` | **#22** | — |
| 8 | Saldo proyectado, y altas y bajas de deuda | **#23**, **#24** | 7 |
| 9 | Beneficios y exoneraciones con vigencia | **#27** | 4 |
| 10 | Declaración jurada: HR, PU y PR | **#28** | 6 |
| 11 | Transferencias de predio | **#29** | 10 |
| 12 | Determinación del predial: **estructura, sin una sola cifra** | **#30** (mitad) | 6, 7, 9, 10 |
| 13 | El corpus de casos, con la columna `esperado` en blanco | **E-5** de #116 | 12 |
| 14 | Consultas: estado de cuenta y deuda por contribuyente | **#25** (parte) | 8, 12 |
| 15 | Frontend: conectar las 12 opciones de catastro | **#71** | 5 |
| 16 | Frontend: conectar las opciones del predial en rentas | **#73** (parte) | 12 |
| 17 | Frontend: conectar las consultas | **#72** (parte) | 14 |

Los PR 2 a 5 no tocan negocio y desbloquean todo lo demás. Los PR 6 a 14 son la mitad
«estructura» de la que habla el paquete E-2 de #116: **ningún criterio de aceptación nombra un
importe**. Los tres últimos hacen visible lo construido.

### En paralelo, y sin esperar a ningún PR

**E-3 de #116 — transcribir y firmar D-02a: hecho el 2026-08-25** ([#200](https://github.com/hneyra/sgtm/issues/200)).
Un archivo por norma en [`docs/10-negocio/valores-normativos/`](../10-negocio/valores-normativos/),
con norma, artículo, fecha de publicación, ejercicios que rige, **transcriptor y verificador
distintos**, y estado. Y ya no es solo papel: `PublicarParametros` publica los valores sueltos,
`PublicarCuadros` un cuadro entero desde el manifiesto del corpus, y `AbrirConjuntoDeParametros`
([#247](https://github.com/hneyra/sgtm/issues/247) §2) abre, compone y sella.

**Lo que sigue en paralelo es lo que quedó detrás de la firma**, y es trabajo, no decisión: la
segunda firma del cuadro de valores unitarios y las tres regiones que le faltan (H-14), la dimensión
de uso de la tabla de depreciación (H-15) —`PublicarCuadros` la rechaza a propósito, para que no se
cargue una de las cuatro y se descarten tres en silencio— y el `% actualización` de D-11, el único
de los cuatro factores que sigue sin fuente identificada.

El PR 13 sirve exactamente a eso: el corpus corre con un conjunto de parámetros vacío y recoge los
`ParametroAusente`, así que **el inventario de lo que falta deja de escribirse a mano**.

## 5. Lo que la marcha blanca no va a poder hacer

Conviene que esté escrito antes, y no descubrirlo el día de la demostración:

- **No determinará importes correctos**, y no es un defecto del código. D-02a está cerrada, pero
  **ningún conjunto del ejercicio está sellado con cifras reales**: faltan dos de los tres cuadros
  —valores unitarios (H-14) y depreciación (H-15) de
  [GOB-03](plan-de-desbloqueo-D-02.md)— y el `% actualización` de D-11, que multiplica sobre
  importes y por eso omitirlo **no es neutro**. Mientras tanto el sistema calcula con parámetros de
  prueba. Por eso [#122](https://github.com/hneyra/sgtm/issues/122).
- **No cobrará.** Fue la decisión de alcance: caja, recibos y cierre de caja (#33, #34, #36) quedan
  fuera, y con ellos la emisión de valores (#37, #38).
- **No emitirá HR ni PU con validez.** La generación de documentos existe (#55) y la determinación
  los producirá, pero un documento emitido bajo el tenant de demostración sale marcado como tal.
- **No hay migración desde SQL Server** (D-04): el padrón de la marcha blanca se carga por [#121](https://github.com/hneyra/sgtm/issues/121) y por
  el registro manual de las opciones del módulo de rentas.

## 6. Qué la da por terminada

- [ ] `./gradlew build verificarAislamiento verificarArquitectura` y `yarn verificar` en verde, y
      la marcha blanca levantada con un solo comando desde el repositorio limpio.
- [ ] Un usuario entra con su clave, ve solo las opciones de su perfil, registra un contribuyente,
      registra un predio con su ficha catastral, y consulta su determinación.
- [ ] Ese recorrido está como prueba de extremo a extremo, no como acta de una demostración.
- [ ] Todo documento que salga lleva la marca de demostración, y hay una prueba que se pone roja si
      se le quita.
- [ ] Los cinco issues nuevos están cerrados, y los de la mitad «estructura» enumeran las filas del
      corpus que entregan.

## 7. Referencias

- [#58 — Hoja de ruta del backend](https://github.com/hneyra/sgtm/issues/58), de la que esto es un recorte.
- [#116 — Plan de desbloqueo de D-02](https://github.com/hneyra/sgtm/issues/116), paquetes E-3, E-5 y E-6.
- [GOB-02 — Decisiones abiertas](decisiones-abiertas.md): D-06 y D-11 (D-02a, D-03c y D-12 ya se cerraron).
- [ARQ-03 — Estrategia multi-tenant](../30-arquitectura/estrategia-multitenant.md) §4, que es por qué la aplicación no migra.
- [ADR-0003 — Monolito modular](../30-arquitectura/adr/ADR-0003-monolito-modular.md): un artefacto, dos perfiles.
