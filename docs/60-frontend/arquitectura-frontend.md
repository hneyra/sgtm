# FRO-01 — Arquitectura frontend

**Decisión de origen:** [`ADR-0009`](../30-arquitectura/adr/ADR-0009-plataforma-frontend.md)
**RNF:** RNF-075, RNF-080 a RNF-084

## 0. Qué existe hoy

El espacio de trabajo, no la interfaz. `frontend/` monta yarn workspaces, los tres paquetes
compartidos, el andamio de la aplicación y las verificaciones que hacen cumplir las reglas del
proyecto. **Ninguna de las 134 pantallas está implementada, y es deliberado**: es el mismo orden
que siguió el backend, que construyó las barreras de aislamiento antes que el primer caso de uso.

| | Estado |
|---|---|
| `frontend/packages/dominio` | Importe, Fecha, Estado y su formateo — **con pruebas** |
| `frontend/packages/api-client` | Cliente HTTP: token en memoria, `Idempotency-Key` — **con pruebas** |
| `frontend/packages/design-system` | Tokens de Juris PE y estilos base. **Sin componentes todavía** |
| `frontend/apps/backoffice` | Arranca y monta un marcador de posición. **Sin interfaz** |
| `frontend/verificaciones` | Nueve prohibiciones, cada una con su muestra que la viola |

La interfaz se implementa en la siguiente iteración, a partir de
[`design/design_handoff_sgtm_web/README.md`](../../design/design_handoff_sgtm_web/README.md) y de
[`mapa-de-pantallas.md`](mapa-de-pantallas.md) (FRO-03).

## 1. Una aplicación, con la separación del portal aplazada

El SRTM parte de dos aplicaciones desde el primer día —back-office y portal del contribuyente—
porque son dos productos con usuarios opuestos. El SGTM **arranca con una sola**, y no por
descuido:

- El prototipo describe **un shell** con doce módulos y 134 opciones, todas de funcionario.
- El flujo público es **una opción de las 134** (`portal`, en el módulo Consultas,
  `GET /api/v1/portal/deuda`): un descriptor de pantalla, no una aplicación.

Construir hoy una segunda aplicación para una pantalla sería estructura sin contenido. Lo que sí
se conserva es la posibilidad de separarla sin reescribir nada: los workspaces ya existen, los
paquetes compartidos ya están fuera de la aplicación, y `apps/portal` es un directorio nuevo el
día que el flujo público crezca.

**Cuándo separar** (cualquiera de las tres basta):

1. El flujo público pasa de una pantalla a un recorrido con sesión propia.
2. El contribuyente se autentica contra un realm distinto del de los funcionarios (ADR-0005).
3. El peso del paquete del portal empieza a depender de código que solo usa el back-office.

Mientras ninguna se cumpla, una aplicación es la respuesta honesta.

## 2. Estructura del monorepo

```
frontend/
├── package.json                 # yarn workspaces
├── eslint.config.js             # las prohibiciones que un linter puede verificar
├── apps/
│   └── backoffice/
│       ├── src/
│       │   ├── modulos/         # Un directorio por módulo del manual
│       │   │   ├── catastro/
│       │   │   ├── tesoreria/
│       │   │   └── …            # los doce
│       │   ├── app/             # Shell, rutas, sesión
│       │   └── main.tsx
│       └── vite.config.ts
├── packages/
│   ├── design-system/           # Tokens Juris PE y componentes base (FRO-02)
│   ├── dominio/                 # Importe, Fecha, Estado y su formateo
│   └── api-client/              # Cliente HTTP tipado
└── verificaciones/
    ├── reglas-de-eslint.test.ts # exige que cada regla muerda
    └── muestras/                # una violación por prohibición
```

**Regla de organización:** dentro de la aplicación se agrupa **por módulo del manual**, no por
tipo de archivo. Quien trabaja en Tesorería encuentra todo lo de Tesorería en un directorio, en
lugar de recorrer `components/`, `hooks/` y `services/`. Los doce módulos son los del catálogo
([NEG-03](../10-negocio/catalogo-de-opciones.md)), con los mismos nombres.

**Regla de los paquetes compartidos:** un componente que usan dos módulos sube a
`packages/design-system`. Un módulo importa de otro **solo por su `index.ts`** — el equivalente
frontend de la regla de Spring Modulith en el backend.

## 3. Elecciones técnicas

| Necesidad | Elección | Nota |
|---|---|---|
| Empaquetado | Vite | |
| Lenguaje | TypeScript en **modo estricto**, con `noUncheckedIndexedAccess` | Los tipos del dominio tributario son la primera defensa |
| Estado del servidor | TanStack Query | |
| Estado del cliente | `useState` y contexto | **Sin Redux**: casi todo el estado es del servidor |
| Enrutado | React Router | Una ruta por opción del menú |
| Formularios | React Hook Form + Zod | Las declaraciones y las fichas del manual son formularios extensos por secciones |
| Tablas de alto volumen | TanStack Table | Padrones y carteras, con teclado (RNF-082) |
| Estilos | CSS con los tokens de Juris PE | Sin framework de utilidades: el design system ya está decidido |
| Cliente HTTP | Derivado de `docs/50-api/openapi/sgtm-v1.yaml` | Un cambio de contrato debe romper la compilación, no la producción |
| Pruebas | Vitest + Testing Library; Playwright para extremo a extremo | |

Las tres últimas filas están decididas pero **no implementadas**: ver §8.

## 4. El contexto de municipalidad nunca sale del frontend

> **El frontend jamás envía `municipalidadId`.** El backend lo toma del claim `municipalidad_id`
> del token validado (regla 2 de CLAUDE.md, [ARQ-03 §3.1](../30-arquitectura/estrategia-multitenant.md)).

Consecuencias en el código:

1. **Ninguna firma de `@sgtm/api-client` acepta `municipalidadId`.** Si apareciera en el contrato,
   sería un defecto del contrato, no del frontend.
2. Un selector de municipalidad para quien tenga acceso a varias **cambia el token**, no un
   parámetro. Implica reautenticación silenciosa.
3. Al cambiar de municipalidad activa, **se invalida toda la caché**. Mostrar datos de la
   municipalidad anterior es una fuga percibida por el usuario aunque el backend esté correcto.

El punto 3 es el fácil de olvidar, y produce un síntoma alarmante en una demostración.

Lo verifica una regla de ESLint sobre el identificador `municipalidadId`, con su muestra en
`verificaciones/muestras/municipalidad-en-el-cliente.ts`.

## 5. Autenticación

| Aspecto | Regla |
|---|---|
| Flujo | Authorization Code con PKCE (ADR-0005) |
| Almacenamiento del token | **En memoria.** Nunca `localStorage` ni `sessionStorage` |
| Renovación | Silenciosa, con refresh token en cookie `HttpOnly` |
| Expiración durante el trabajo | Se avisa antes de expirar y se renueva **sin perder el formulario en curso** |
| Cierre de sesión | Limpia la caché de TanStack Query y el estado en memoria |

La expiración importa más de lo que parece: el manual describe fichas y declaraciones que se
llenan en varios minutos. Perder una por expiración de sesión es un defecto de usabilidad grave.

`guardarToken` en `@sgtm/api-client` mantiene el token en una variable del módulo; la prohibición
de `localStorage` está como regla de ESLint, con su muestra.

## 6. Importes y fechas

Reflejo en el cliente de las reglas 1 y 9 de CLAUDE.md.

| Regla | Motivo |
|---|---|
| Los importes llegan como **cadena decimal**, no como número | `number` es punto flotante y pierde céntimos (RNF-055) |
| El frontend **no hace aritmética con importes** | Todo total viene calculado del backend (RNF-083) |
| Toda cifra de deuda se muestra con su **fecha de cálculo** | No existe «la deuda»: existe la deuda a una fecha (RNF-075) |
| Formato de moneda: `S/ 1 240,50`, con espacio fino de millares | ⚠ Confirmar la convención de separadores con Rentas |
| Las fechas tributarias se tratan como fecha, sin hora ni zona | Un vencimiento no tiene hora |

`packages/dominio/src/dinero.ts` formatea y **no suma**: la ausencia de una función de sumar es
intencional, y quien la eche de menos está a punto de romper RNF-083.

## 7. Manejo de errores

| Situación | Presentación |
|---|---|
| Error de validación | Junto al campo, en lenguaje claro |
| Error de negocio (Problem Details) | Mensaje del backend, que ya viene en lenguaje del dominio |
| Sin permiso | Se explica que falta permiso, sin revelar qué hay detrás |
| Error inesperado | Mensaje genérico más identificador de traza para soporte |

Los mensajes vienen del backend ya redactados en castellano (RNF-080) y `ProblemaDeApi` **no los
reescribe**. Los estados de carga, vacío y error no están diseñados en el prototipo: se resuelven
con el esqueleto de carga del design system y un mensaje centrado entre hairlines.

## 8. Lo que todavía no está

- **Los tipos de la API se escriben a mano.** Falta generar el cliente desde
  [`sgtm-v1.yaml`](../50-api/openapi/sgtm-v1.yaml) para que un cambio de contrato rompa la
  compilación. El contrato ya existe; falta enchufar la generación al build.
- **No hay autenticación real.** El flujo con PKCE contra el proveedor OIDC (ADR-0005) sustituirá
  al `guardarToken` manual.
- **No hay servidor de datos de ejemplo.** El SRTM tiene uno; aquí el catálogo del prototipo trae
  filas de muestra en sus propios descriptores, así que la interfaz puede construirse antes de
  decidirlo. Si la iteración de interfaz lo necesita, se añade como workspace.
- **No hay pruebas de extremo a extremo.** Playwright, para la caja y la consulta del portal.
- **No hay presupuesto de tamaño de paquete en CI.**
- **Las tres familias tipográficas se cargan de Google Fonts.** Para una municipalidad con red
  mala conviene autoalojar los `woff2` (FRO-02 §4).

## 9. Documentos relacionados

[`design-system.md`](design-system.md) (FRO-02) · [`mapa-de-pantallas.md`](mapa-de-pantallas.md)
(FRO-03) · [`estandares-de-codigo-frontend.md`](estandares-de-codigo-frontend.md) (FRO-04) ·
[`ADR-0009`](../30-arquitectura/adr/ADR-0009-plataforma-frontend.md)
