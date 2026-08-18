# Frontend del SGTM

**Las 134 pantallas del manual están implementadas, y ninguna habla todavía con el backend real.**
Doce módulos, 134 opciones, un renderizador y un catálogo portado del prototipo. Los datos llegan
por HTTP desde un **proxy que simula la API**; el día que Spring Boot sirva las operaciones, se
apaga el proxy y la interfaz no se entera ([ADR-0010](../docs/30-arquitectura/adr/ADR-0010-catalogo-portado-y-proxy-de-datos.md)).

## Arrancar

```bash
cd frontend
yarn install
yarn dev            # http://localhost:5173
```

Requiere Node 22 o superior.

| Comando                    | Qué hace                                                       |
| -------------------------- | -------------------------------------------------------------- |
| `yarn verificar`           | Lint, tipos y pruebas. **Lo que hay que pasar antes de un PR** |
| `yarn lint`                | ESLint, con las prohibiciones del proyecto                     |
| `yarn typecheck`           | `tsc --build`, en modo estricto                                |
| `yarn test`                | Vitest: dominio, cliente, proxy, catálogo, shell y las 134     |
| `yarn format`              | Prettier. Si el build se queja del formato, no lo pelees       |
| `yarn build`               | Construye la aplicación                                        |
| `yarn portar-catalogo`     | Regenera el catálogo desde `design/`                           |
| `yarn generar-operaciones` | Regenera los tipos de la API desde el contrato                 |

## El catálogo se porta; no se escriben 134 pantallas

`scripts/portar-catalogo.mjs` lee los cinco archivos declarativos del prototipo
(`design/sgtm-data-{1..5}.js`) y los parte en dos, que es **la decisión que sostiene todo lo
demás**:

```
estructura → apps/backoffice/src/catalogo/     qué campos, qué columnas, qué pestañas
valor      → packages/api-mock/src/            qué dice cada campo, qué filas trae la tabla
```

La estructura la sabe la interfaz sin preguntar. El valor se **pide por HTTP** a la operación que
cada pantalla declara —`GET /api/v1/catastro/fichas`— con el mismo cliente que hablará con Spring
Boot. Por eso la pantalla se dibuja entera antes de que llegue la respuesta, y por eso conectar el
backend no es reescribir nada.

Los archivos generados llevan `.generado.ts` en el nombre y **no se editan a mano**: se regeneran.

## El contrato manda sobre los tipos

Los tipos de las 134 operaciones **no se escriben**: los genera `scripts/generar-operaciones.mjs`
desde [`sgtm-v1.yaml`](../docs/50-api/openapi/sgtm-v1.yaml) hacia
`packages/api-client/src/operaciones.generado.ts`. `yarn verificar` regenera y compara, así que el
contrato y la interfaz no pueden divergir en silencio:

```bash
yarn generar-operaciones      # escribe operaciones.generado.ts
yarn comprobar-operaciones    # falla si no cuadra con el yaml (lo corre `yarn verificar`)
```

Un campo renombrado en el `yaml` renombra la propiedad generada, y el código escrito contra el
nombre viejo **deja de compilar**. Se comprobó renombrando `codRefCatastral` de verdad y
compilando con `tsc`: el error es `'codRefCatastral' does not exist in type
'{ readonly renombrado: string; }'`.

El generador además **rechaza el contrato** antes de generar nada si viola una regla del proyecto:
un parámetro o campo de municipalidad (regla 2), un importe declarado como número (regla 1,
RNF-055) o una respuesta con cifras de deuda sin `fechaCalculo` (regla 9, RNF-075). Cada guarda
tiene su contrato de muestra que la viola en `verificaciones/generador-de-operaciones.test.ts`.

**Lo que el generador no inventa:** los esquemas de cuerpo y respuesta. El contrato de hoy declara
verbo, ruta y parámetros; el esquema de cada recurso se escribe cuando su backend existe, y hasta
entonces la respuesta se tipa como `CuerpoSinEsquema`, que es exactamente lo que el `yaml` dice.

## La pantalla se usa: registro en la ruta, búsqueda en la URL

`GET /api/v1/rentas/vehiculos/{placa}` se pedía con la cadena `ejemplo`, así que la pantalla
parecía funcionar mientras mostraba un registro que no era de nadie. Ya no: **sin placa no hay
petición**, y quien la trae es la ruta.

```
/rentas-registro/vehiculos                 la pantalla, esperando un registro
/rentas-registro/vehiculos/ABC-123         la ficha de esa placa, y su enlace se comparte
/catastro/calles?nombreDeCalle=SANTA+ROSA&orden=nombre&pagina=2
```

**Todo el estado de la búsqueda vive en la URL** (FRO-04 §5): los filtros, el orden y la página.
Recargar no lo pierde, el botón «atrás» funciona, y quien atiende en ventanilla puede pegar el
enlace de lo que está mirando. Lo único que se queda en el componente es el borrador de lo que se
está escribiendo y aún no se ha buscado.

| Qué                 | Dónde vive                    | Qué viaja                                 |
| ------------------- | ----------------------------- | ----------------------------------------- |
| El registro abierto | `/:modulo/:opcion/:codigo`    | Siempre: es el parámetro de la ruta       |
| Filtros             | `?nombreDeCalle=…`            | Solo si el contrato declara ese parámetro |
| Orden y página      | `?orden=…&sentido=…&pagina=…` | Solo si el contrato los declara           |

**Filtrar, ordenar y paginar son del servidor.** Ordenar en el cliente una página de un padrón de
cientos de miles de filas ordena media tabla y miente. Por eso la cabecera pide otro orden y el
paginador aparece **solo cuando la respuesta trae paginación**: cuántas filas hay solo lo sabe
quien las tiene.

Para que eso pueda viajar, el contrato declara ahora **los filtros de cada pantalla** y —en las de
lectura con tabla— `pagina`, `tamano`, `orden` y `sentido`. Los nombres los calculan dos
generadores en árboles distintos, y una prueba exige que coincidan.

**Buscar por el identificador abre el registro**: si la búsqueda trae un valor para el parámetro de
la ruta —`placa` en vehículos—, la pantalla navega a esa ficha. Donde el catálogo no dice cuál de
los filtros es el identificador, el registro se abre por URL hasta que su módulo lo decida; y las
filas de la tabla **no** enlazan a ninguna ficha, porque de las quince pantallas que abren registro
y traen tabla, la primera columna es ese registro en una.

## La puerta lateral: una opción con operación propia

Las 134 pantallas piden la misma forma —`DatosDePantalla`— porque comparten renderizador. Fue la
decisión correcta para dibujarlas todas, pero **no sobrevive al backend real**: una ficha catastral
versionada, un cobro de caja y un padrón paginado no son la misma respuesta.

Así que junto a `useDatosDePantalla` hay un camino por opción, y las dos conviven:

```
operación tipada (del contrato) → leer → adaptar → los mismos bloques
```

| Pieza        | Qué hace                                                              | Dónde vive               |
| ------------ | --------------------------------------------------------------------- | ------------------------ |
| `parametros` | De dónde salen los valores de la petición: ruta y consulta            | La conexión de la opción |
| `leer`       | **La frontera.** Valida el cuerpo que el contrato todavía no describe | La conexión de la opción |
| `adaptar`    | Traduce el recurso del dominio a lo que dibujan los bloques. **Puro** | La conexión de la opción |

`leer` es lo único que cambia el día que el backend sirva su recurso de verdad: el adaptador ya
trabaja sobre el dominio, no sobre el transporte.

La primera conectada es el **panel de recaudación** (`pantallas/inicio/recaudacion.ts`). Su
ejercicio sale de la URL y **entra en la clave de cache**: `['operacion', 'inicio', { ejercicio }]`.
Con la clave vieja —`['pantalla', id]`— consultar 2026 y después 2025 devolvería lo primero, que en
ventanilla no es un problema de rendimiento sino mostrar cifras de un año como si fueran de otro.

Un adaptador que pierda la `fechaCalculo` **no compila**: `DatosDePantalla` la exige, y
`verificaciones/muestras/adaptador-sin-fecha.ts` lo demuestra compilando con `tsc`.

## El proxy de datos

`@sgtm/api-mock` sustituye `fetch` e intercepta lo que cuelga de `/api/v1`. Responde las 134
operaciones del contrato con los datos de ejemplo del prototipo, con latencia simulada para que los
estados de carga se vean, y devuelve `ProblemDetails` con 404 a lo que no existe.

```bash
# Contra el backend real, el día que exista:
VITE_SGTM_PROXY_DE_DATOS=false SGTM_API=http://localhost:8080 yarn dev
```

Con la bandera apagada el empaquetador descarta la rama entera: el juego de datos **no se compila
en producción**. Se comprobó midiendo las dos compilaciones.

**Lo que el proxy no hace, a propósito:** no filtra, no ordena, no pagina, no valida y no persiste.
Fingir la semántica de `?uso=Comercio` sería inventar un comportamiento que el backend no ha
decidido, y la interfaz acabaría construida contra esa invención.

## Estructura

```
frontend/
├── apps/backoffice/src/
│   ├── app/             Shell, cabecera, barra lateral de dos niveles, paleta de comandos
│   ├── catalogo/        Las 134 pantallas como datos tipados (generado)
│   ├── pantallas/       El renderizador, sus diez bloques y las opciones conectadas
│   │   └── inicio/      Primera opción con operación tipada y adaptador propios
│   └── estilos/         Shell y bloques, con los tokens de Juris PE
├── packages/
│   ├── design-system/   Tokens y los componentes que usan las pantallas
│   ├── dominio/         Importe, Fecha, Estado y su formateo
│   ├── api-client/      Cliente HTTP tipado y el contrato de datos de una pantalla
│   └── api-mock/        El proxy de datos (generado + 130 líneas de encaminamiento)
├── scripts/             El portador del catálogo y el generador de operaciones
└── verificaciones/      Las reglas del proyecto, con una muestra que viola cada una
```

**Los directorios por módulo aparecen cuando una opción necesita código propio, y no antes**, que
es la diferencia deliberada con [FRO-01 §2](../docs/60-frontend/arquitectura-frontend.md): las 134
pantallas son un catálogo y un renderizador, así que `modulos/catastro/` vacío no sirve a nadie. El
primero en aparecer ha sido `pantallas/inicio/`, con la conexión del panel de recaudación.

## Las diez plantillas de contenido

Un renderizador compone, en el orden de [FRO-03 §5](../docs/60-frontend/mapa-de-pantallas.md), los
bloques que declare cada descriptor: descripción, panel de indicadores, portal ciudadano, filtros,
tabla, totales, pestañas, formulario por secciones, hoja de reporte y barra de acciones.

## Las reglas que este código hace cumplir

| Regla                                           | Muestra que la viola                                 |
| ----------------------------------------------- | ---------------------------------------------------- |
| La interfaz no hace aritmética con importes     | `verificaciones/muestras/aritmetica-con-importes.ts` |
| Un importe es texto, nunca `number`             | `importe-como-number.ts`                             |
| El frontend jamás envía `municipalidadId`       | `municipalidad-en-el-cliente.ts`                     |
| El token vive en memoria                        | `token-en-almacenamiento.ts`                         |
| **Nada de `fetch` fuera de `@sgtm/api-client`** | `fetch-directo.ts`                                   |
| Sin tildes en identificadores                   | `identificador-con-tilde.ts`                         |
| `alicuota`, nunca `tasa`, para un porcentaje    | `tasa-en-vez-de-alicuota.ts`                         |
| Todo importe se muestra con su fecha de cálculo | `importe-sin-fecha.tsx`                              |
| `any` prohibido · sin `tabIndex` positivo       | `any-explicito.ts` · `tabindex-positivo.tsx`         |

`verificaciones/reglas-de-eslint.test.ts` linta cada muestra y **exige que la regla la señale**. Se
comprobó que la nueva puede fallar: al quitar la regla de `fetch`, su prueba se pone roja; al
devolverla, vuelve a verde.

La prohibición de `fetch` es la que sostiene el proxy: mientras todas las peticiones pasen por
`solicitar()`, cambiar el proxy por el backend es apagar una bandera.

La regla del almacenamiento **se estrechó** a lo que FRO-01 §5 prohíbe de verdad —guardar
credenciales— porque FRO-03 §3 pide persistir las cinco opciones recientes en `localStorage`, y lo
dice en la misma frase en que excluye el token.

## Qué se verificó, y cómo

| Verificación                            | Cómo                                                                    | Resultado                     |
| --------------------------------------- | ----------------------------------------------------------------------- | ----------------------------- |
| Las 134 pantallas se dibujan            | `todas-las-pantallas.test.tsx` monta cada una y comprueba su título     | 134 en verde                  |
| Las 134 en un navegador de verdad       | Chromium recorriendo las 134 rutas                                      | 0 errores de página, 0 de API |
| El proxy responde el contrato           | 10 pruebas: rutas, verbos, parámetros, 404, instalación                 | En verde                      |
| El catálogo está completo               | 17 pruebas: 12 módulos, 134 opciones, bloques, rutas y endpoints únicos | En verde                      |
| El juego de datos no llega a producción | Dos compilaciones, con y sin la bandera                                 | 145 KB menos, chunk ausente   |
| Las reglas de ESLint muerden            | Quitando la de `fetch`: su prueba se pone roja                          | Muerde                        |

## Lo que todavía no está

- **Ninguna operación va contra el backend real**, porque el backend aún no sirve ninguna: la
  opción conectada pide su operación tipada, y hoy la contesta el proxy. Es el paso 4 de FRO-03 §7
  y se hace opción por opción.
- **Ninguna acción escribe.** Toda modificación exige observación del usuario (RNF-052) y ese campo
  se conecta junto con su operación; un botón que guardara sin ella sería un defecto.
- No hay autenticación real: falta el flujo con PKCE contra el proveedor OIDC (ADR-0005).
- No hay pruebas de extremo a extremo (Playwright) ni presupuesto de tamaño de paquete en CI. El
  paquete son 149 KB comprimidos, casi todos catálogo: falta partirlo por ruta.
- Las tres familias tipográficas se cargan de Google Fonts; para una red mala conviene autoalojarlas.
- Las tres pantallas que [FRO-03 §6](../docs/60-frontend/mapa-de-pantallas.md) marca —caja, portal
  y reportes— **no están validadas con usuarios reales**. Es un pendiente declarado.

## Documentación

[FRO-01 arquitectura](../docs/60-frontend/arquitectura-frontend.md) ·
[FRO-02 design system](../docs/60-frontend/design-system.md) ·
[FRO-03 mapa de pantallas](../docs/60-frontend/mapa-de-pantallas.md) ·
[FRO-04 estándares](../docs/60-frontend/estandares-de-codigo-frontend.md) ·
[ADR-0009](../docs/30-arquitectura/adr/ADR-0009-plataforma-frontend.md) ·
[ADR-0010](../docs/30-arquitectura/adr/ADR-0010-catalogo-portado-y-proxy-de-datos.md)
