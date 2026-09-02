# DEV-03 — Pruebas

| Campo | Valor |
|---|---|
| Versión | 1.0 |
| Fecha | 2026-08-20 |
| Documento de origen | [CAL-01 — Estrategia de pruebas](../A0-calidad/estrategia-de-pruebas.md) |

## 1. Lo que hay que pasar antes de un PR

```bash
cd backend
./gradlew build                   # compila + Spotless + Checkstyle + NullAway + pruebas
./gradlew verificarArquitectura   # ArchUnit, escáner de fuentes y Spring Modulith
./gradlew verificarAislamiento    # aislamiento multi-tenant. Requiere PostgreSQL

cd ../frontend
yarn verificar                    # contrato, lint, tipos y pruebas
yarn comprobar-compilaciones      # el juego de datos no llega a producción, y el presupuesto
yarn e2e                          # los seis caminos completos en un navegador
```

Es exactamente lo que corre CI, en pasos separados, para que el nombre del paso ya diga qué barrera
cayó: [`backend.yml`](../../.github/workflows/backend.yml),
[`frontend.yml`](../../.github/workflows/frontend.yml) y
[`despliegue.yml`](../../.github/workflows/despliegue.yml).

## 2. Qué prueba qué

| Nivel | Dónde | Necesita |
|---|---|---|
| Objetos de valor y reglas puras | `sgtm-dominio-compartido`, y las reglas cuando existan | Nada. Sin base, sin reloj, sin Spring |
| Persistencia y **aislamiento** | `sgtm-esquema`, `sgtm-plataforma`, `sgtm-catastro`, `sgtm-seguridad`, … | **PostgreSQL real** |
| Arquitectura | `sgtm-aplicacion` | Nada |
| Interfaz | `frontend/**/*.test.ts(x)` | Nada |
| Caminos completos | `frontend/e2e/` | Un Chromium |
| La instalación entera | `.github/workflows/despliegue.yml` | Docker; hoy solo en CI |

**Prohibida la base en memoria.** H2 no tiene Row Level Security, así que una prueba de
persistencia sobre H2 pasaría en verde sin verificar lo único que aquí importa de verdad
(CAL-01 §3.2).

## 3. Correr una sola prueba

### Backend

```bash
./gradlew :sgtm-catastro:test  --tests '*ViaRepositoryJdbcTest*'
./gradlew :sgtm-esquema:test   --tests 'pe.gob.sgtm.esquema.AislamientoMultiTenantTest'
./gradlew :sgtm-aplicacion:test --tests '*ArquitecturaTest' --info
./gradlew :sgtm-catastro:test  --tests '*ViaRepositoryJdbcTest*' --rerun   # ignora «UP-TO-DATE»
```

`--rerun` importa más de lo que parece: Gradle no vuelve a ejecutar una prueba cuyas entradas no
cambiaron, y eso se confunde con «pasó otra vez».

### Interfaz

```bash
yarn test                                             # todas
yarn test packages/dominio/src/dinero.test.ts         # un archivo
yarn test -t 'sin observacion no se guarda'           # por nombre
yarn test:watch                                       # mientras editas
```

## 4. Sin Docker

Por omisión las pruebas de persistencia levantan un contenedor con Testcontainers. Sin Docker hay
**una salida documentada, y ninguna que omita la prueba**:

```bash
./gradlew verificarAislamiento \
  -Dsgtm.pruebas.postgres.url=jdbc:postgresql://localhost:5432/postgres \
  -Dsgtm.pruebas.postgres.usuario=postgres \
  -Dsgtm.pruebas.postgres.clave=…
```

- El usuario tiene que ser **superusuario**: la prueba crea los cuatro roles, les asigna su clave y
  crea una base nueva por corrida.
- **La base es de cada tarea; los roles son del clúster.** Desde #698 la clave del rol se deriva del
  clúster en vez de sortearse, y el provisionamiento se serializa con un candado de asesoramiento
  del propio motor, así que dos módulos en paralelo sobre el mismo motor ya no se pisan y
  `--max-workers=1` dejó de hacer falta. Lo que sigue pisando es una corrida con **otro código** o
  con **otra credencial de superusuario** —y ahí el fallo nombra la causa, en vez de salir como
  `password authentication failed`—.
- Sirven también las variables `SGTM_PRUEBAS_POSTGRES_URL`, `…_USUARIO`, `…_CLAVE`, y
  `-Dsgtm.pruebas.postgres.imagen` para cambiar la imagen de Testcontainers.

**Sin motor, las pruebas fallan; no se saltan.** Una prueba bloqueante que se omite a sí misma deja
el build en verde sin haber verificado nada.

## 5. Los caminos completos

```bash
npx playwright install chromium      # la primera vez
yarn e2e
```

Recorre en Chromium los tres que más cuestan si fallan (FRO-03 §6):

| Camino | Qué exige |
|---|---|
| Cobro en caja | Se completa **sin tocar el ratón** (RNF-082): la prueba solo escribe y pulsa teclas |
| Consulta del portal | Cabe en un viewport de 360 px, sin desplazamiento horizontal |
| Impresión de un reporte | Una hoja A4 vertical, con sus dos líneas de firma y sin la interfaz (RNF-084) |

Corren contra la aplicación **compilada** y su proxy de datos: Playwright levanta
`yarn build && yarn preview --port 4173` por su cuenta. Con un Chromium ya instalado,
`SGTM_CHROMIUM=/ruta/al/binario` evita la descarga.

## 6. La parte que no se puede saltar: demostrar que la verificación muerde

**Cada verificación bloqueante lleva su contraparte que demuestra que puede fallar.** No es una
buena práctica opcional: una regla que no puede fallar no protege nada, y hay precedentes de
verificaciones en verde que no verificaban nada.

| Verificación | Su contraparte | Dónde vive |
|---|---|---|
| Reglas de ArchUnit | Una clase de muestra que viola cada regla | `backend/sgtm-aplicacion/src/test/java/pe/gob/sgtm/verificaciones/muestras/` |
| Escáner del código fuente | Muestras con `SET SESSION`, `DELETE`, literales tributarios | idem |
| Reglas de ESLint | Una muestra por prohibición, lintada **desde la prueba** | `frontend/verificaciones/muestras/` y `reglas-de-eslint.test.ts` |
| Aislamiento del esquema | Mutar el DDL: quitar `WITH CHECK`, conceder un privilegio sobre una partición | Se hace a mano, y se anota en el PR |
| Guardia del pool | Una prueba gemela **sin** guardia, que provoca la fuga de verdad | `sgtm-plataforma` |

Si agregas una regla, agrega también lo que la viola, y comprueba que se pone rojo:

```bash
# 1 · Rompe la regla a propósito (o añade tu muestra)
# 2 · Comprueba que la verificación la detecta
./gradlew verificarArquitectura     # tiene que fallar
yarn test verificaciones/reglas-de-eslint.test.ts
# 3 · Deshaz la rotura y comprueba que vuelve a verde
```

En el PR se escribe **qué se rompió y qué se puso rojo**. La tabla de `CLAUDE.md` —«lo verificado
hasta hoy»— está hecha de esas frases, y una fila sin su demostración no debería entrar.

## 7. Cuando algo falla y no es tu código

Mira primero [DEV-05](solucion-de-problemas.md): la mitad de los rojos locales son el entorno
—dependencias a medio instalar, versión de Node, ausencia de Docker— y no el cambio que acabas de
escribir.

## 8. Documentos relacionados

[CAL-01 — Estrategia de pruebas](../A0-calidad/estrategia-de-pruebas.md) ·
[DEV-02 — Ejecutar y depurar](ejecutar-y-depurar.md) ·
[`backend/README.md`](../../backend/README.md) §«Pruebas que necesitan PostgreSQL»
