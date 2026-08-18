# ADR-0009 — React con Vite y yarn workspaces, una sola aplicación por ahora

**Estado:** Aceptado
**Fecha:** 2026-08-18

## Contexto

El manual describe un cliente de escritorio Windows con doce módulos y 134 opciones. La
reimplementación es web, y el diseño de referencia ya existe: un prototipo navegable con las 134
pantallas y el design system Juris PE
([`design/`](../../../design/design_handoff_sgtm_web/README.md)).

Hay dos preguntas que responder antes de escribir la primera pantalla:

1. **Con qué se construye.**
2. **Cuántas aplicaciones son.** El SRTM, del que este proyecto hereda arquitectura, arranca con
   dos —back-office y portal del contribuyente— porque son productos con usuarios opuestos: el
   funcionario trabaja ocho horas al día y quiere densidad y teclado; el contribuyente entra una
   vez al año desde un móvil con red mala.

La segunda no es obvia aquí. El prototipo del SGTM describe **un shell** de funcionario, y el
flujo público aparece como **una opción de las 134** (`portal`, módulo Consultas): un descriptor
de pantalla con su hero, su consulta por documento y sus cinco pasos.

## Decisión

**Monorepo con yarn workspaces, React con TypeScript y Vite, paquetes compartidos, y una sola
aplicación mientras el flujo público sea una pantalla.**

```
frontend/
├── package.json              # workspaces
├── apps/
│   └── backoffice/           # SPA de funcionarios: 12 módulos, 134 opciones
└── packages/
    ├── design-system/        # Tokens Juris PE y componentes base (FRO-02)
    ├── dominio/              # Importe, Fecha, Estado y su formateo
    └── api-client/           # Cliente HTTP tipado
```

`yarn` con **workspaces**, que es lo que hace viable el monorepo, igual que en el SRTM.

### Elecciones técnicas

| Necesidad | Elección | Motivo |
|---|---|---|
| Empaquetado | **Vite** | Arranque y recompilación rápidos |
| Lenguaje | **TypeScript estricto**, con `noUncheckedIndexedAccess` | Los tipos del dominio tributario son la primera línea de defensa |
| Estado del servidor | **TanStack Query** | Caché, revalidación y estados de carga sin escribirlos a mano |
| Estado del cliente | `useState` y contexto; **sin Redux** | Casi todo el estado es del servidor |
| Enrutado | **React Router** | Una ruta por opción del menú |
| Formularios | **React Hook Form + Zod** | Las fichas del manual son formularios extensos por secciones |
| Tablas | **TanStack Table** | Padrones de miles de filas, con teclado (RNF-082) |
| Estilos | **CSS con los tokens de Juris PE** | El design system ya está decidido por el prototipo; un framework de utilidades solo estorbaría |
| Cliente HTTP | Derivado de **OpenAPI** | Un cambio de contrato debe romper la compilación, no la producción |
| Pruebas | **Vitest + Testing Library**; **Playwright** para extremo a extremo | CAL-01 |

### Una aplicación, con la separación aplazada y con criterio escrito

Construir hoy una segunda aplicación para una sola pantalla sería estructura sin contenido. La
separación se hace el día que se cumpla cualquiera de estas tres condiciones, y no antes:

1. El flujo público pasa de una pantalla a un recorrido con sesión propia.
2. El contribuyente se autentica contra un realm distinto del de los funcionarios (ADR-0005).
3. El paquete del portal empieza a arrastrar código que solo usa el back-office.

El coste de aplazarla es bajo **porque los workspaces existen desde el principio**: `apps/portal`
será un directorio nuevo que consume los mismos tres paquetes, no una reescritura. Ese es el
motivo real de montar workspaces para una sola aplicación, y conviene decirlo en vez de fingir que
es por elegancia.

### Sin renderizado en servidor

La aplicación es una SPA. Sin Next.js y sin renderizado en servidor: añadiría un tiempo de
ejecución Node que hay que desplegar, monitorear y actualizar, y el back-office —que es el 99 % de
las pantallas— no lo necesita en absoluto.

**Esta decisión se reabre si el portal crece**: una consulta pública de deuda que debe cargar en
una red mala es el caso donde el renderizado en servidor gana, y es exactamente el caso que la
condición 1 de la separación describe.

### El contexto de municipalidad viene del token

El frontend **nunca envía `municipalidadId`**. El backend lo toma del claim `municipalidad_id`
(ADR-0002, ADR-0005). Un selector de municipalidad cambia el token, no un parámetro. Consecuencia
directa: **un defecto en el frontend no puede provocar una fuga entre municipalidades**, porque no
tiene con qué pedirla.

### Las reglas del proyecto se verifican, no se recuerdan

Igual que ARQ-04 en el backend, las prohibiciones del frontend que un linter puede comprobar están
como reglas de ESLint, **cada una con su muestra que la viola** y una prueba que exige que muerda
(FRO-04 §9). Sin eso, una regla escrita en un documento dura seis meses.

## Consecuencias

**Positivas**

- Una sola aplicación que construir y desplegar mientras el alcance sea el del manual.
- El día de la separación no cuesta una reescritura: los paquetes compartidos ya están fuera.
- Un cambio en un tipo del dominio o en el contrato rompe la compilación de inmediato.
- Las reglas de dinero, aislamiento e idioma dejan de depender de la memoria de quien escribe.

**Negativas / costos aceptados**

- Workspaces para una sola aplicación es ceremonia hasta que llegue la segunda. Se acepta a
  sabiendas, con el criterio de separación escrito arriba.
- Sin renderizado en servidor, si el portal crece habrá que reabrir esta decisión.
- Los tipos de la API se escriben a mano hasta que se enchufe la generación desde OpenAPI. Es una
  deuda declarada (FRO-01 §8), no un descuido.

## Alternativas consideradas

- **Dos aplicaciones desde el primer día**, como el SRTM. Descartada por ahora: el prototipo no
  las pide y una de las dos tendría una pantalla. Reconocida como el destino probable.
- **Una aplicación sin workspaces**, con todo en `src/`. Descartada: haría de la separación futura
  una reescritura, y deja los tipos del dominio mezclados con la interfaz.
- **Next.js con renderizado en servidor.** Descartada por costo de operación frente a un beneficio
  que hoy afecta a una pantalla.
- **Angular.** Descartada por coherencia con el SRTM, del que se hereda el resto de la
  arquitectura.

## Enlaces

- [`FRO-01`](../../60-frontend/arquitectura-frontend.md) · [`FRO-02`](../../60-frontend/design-system.md)
  · [`FRO-03`](../../60-frontend/mapa-de-pantallas.md) · [`FRO-04`](../../60-frontend/estandares-de-codigo-frontend.md)
- [`ADR-0002`](ADR-0002-estrategia-multi-tenant.md) · [`ADR-0005`](ADR-0005-identidad-y-acceso.md)
