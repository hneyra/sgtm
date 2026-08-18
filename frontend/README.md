# Frontend del SGTM

**El espacio de trabajo está montado; la interfaz no está construida.** Esta iteración deja el
terreno preparado —workspaces, paquetes compartidos, reglas verificadas— para que la siguiente
implemente las 134 pantallas del manual sin discutir antes cada convención. Es el mismo orden que
siguió el backend: primero las barreras, después el negocio.

## Arrancar

```bash
cd frontend
yarn install
yarn dev            # http://localhost:5173
```

Requiere Node 22 o superior. `yarn dev` levanta la aplicación con Vite; hoy muestra un marcador de
posición, no una interfaz.

| Comando          | Qué hace                                                       |
| ---------------- | -------------------------------------------------------------- |
| `yarn verificar` | Lint, tipos y pruebas. **Lo que hay que pasar antes de un PR** |
| `yarn lint`      | ESLint, con las prohibiciones del proyecto                     |
| `yarn typecheck` | `tsc --build`, en modo estricto                                |
| `yarn test`      | Vitest: dominio, cliente HTTP y las reglas                     |
| `yarn format`    | Prettier. Si el build se queja del formato, no lo pelees       |
| `yarn build`     | Construye la aplicación                                        |

## Estructura

```
frontend/
├── apps/
│   └── backoffice/      Los 12 módulos del manual. Un directorio por módulo, no por tipo de archivo
├── packages/
│   ├── design-system/   Tokens de Juris PE y estilos base (FRO-02)
│   ├── dominio/         Importe, Fecha, Estado y su formateo
│   └── api-client/      Cliente HTTP tipado
└── verificaciones/      Las reglas del proyecto, con una muestra que viola cada una
```

Una sola aplicación, no dos: en el SGTM el flujo público es **una** de las 134 opciones, no un
producto aparte. Los workspaces existen igualmente para que separar `apps/portal` el día que haga
falta no sea una reescritura — el criterio para hacerlo está en
[`ADR-0009`](../docs/30-arquitectura/adr/ADR-0009-plataforma-frontend.md).

## Qué hay en cada paquete

**`@sgtm/dominio`** — `Importe` es `string`, `Fecha` es una fecha sin hora, y `formatearImporte`
trabaja sobre el texto sin convertirlo nunca a `number`. **No existe una función de sumar, y su
ausencia es intencional**: la interfaz no hace aritmética con importes (RNF-083).

**`@sgtm/api-client`** — el token vive en memoria; ninguna firma acepta `municipalidadId`; las
mutaciones que asientan llevan `Idempotency-Key` y no se reintentan solas. Las 134 operaciones del
contrato no están aquí: cada una llega con su pantalla.

**`@sgtm/design-system`** — los tokens de Juris PE copiados de `design/ds/tokens/`, más un reset,
foco visible y estilos de impresión A4 (RNF-084). **Sin componentes todavía.**

## Las reglas que este código hace cumplir

Las de [CLAUDE.md](../CLAUDE.md) que tocan a la interfaz, con la regla de ESLint que las verifica y
la muestra que las viola:

| Regla                                           | Muestra que la viola                                 |
| ----------------------------------------------- | ---------------------------------------------------- |
| La interfaz no hace aritmética con importes     | `verificaciones/muestras/aritmetica-con-importes.ts` |
| Un importe es texto, nunca `number`             | `importe-como-number.ts`                             |
| El frontend jamás envía `municipalidadId`       | `municipalidad-en-el-cliente.ts`                     |
| El token vive en memoria                        | `token-en-almacenamiento.ts`                         |
| Sin tildes en identificadores                   | `identificador-con-tilde.ts`                         |
| `alicuota`, nunca `tasa`, para un porcentaje    | `tasa-en-vez-de-alicuota.ts`                         |
| Todo importe se muestra con su fecha de cálculo | `importe-sin-fecha.tsx`                              |
| `any` prohibido · sin `tabIndex` positivo       | `any-explicito.ts` · `tabindex-positivo.tsx`         |

`verificaciones/reglas-de-eslint.test.ts` linta cada muestra y **exige que la regla la señale**.
Se comprobó que puede fallar: al quitar la regla de tildes, esa prueba se pone roja; al devolverla,
vuelve a verde. Una regla que no puede fallar no protege nada.

**Al agregar una prohibición, agrega también la muestra que la viola.**

## Lo siguiente

Implementar la interfaz a partir de
[`design/design_handoff_sgtm_web/README.md`](../design/design_handoff_sgtm_web/README.md), en el
orden de [FRO-03 §7](../docs/60-frontend/mapa-de-pantallas.md): shell y navegación, el catálogo de
las 134 pantallas portado a datos tipados con **un** renderizador, las diez plantillas de
contenido, y la conexión al backend opción por opción a medida que cada operación exista.

**No se escriben 134 pantallas a mano.** El prototipo las declara como datos; portarlas como datos
es lo que decide el coste de todo lo demás.

## Lo que todavía no está

- Los tipos de la API se escriben a mano; falta generarlos desde
  [`sgtm-v1.yaml`](../docs/50-api/openapi/sgtm-v1.yaml).
- No hay autenticación real: falta el flujo con PKCE contra el proveedor OIDC (ADR-0005).
- No hay pruebas de extremo a extremo (Playwright) ni presupuesto de tamaño de paquete en CI.
- Las tres familias tipográficas se cargan de Google Fonts; para una red mala conviene autoalojarlas.

## Documentación

[FRO-01 arquitectura](../docs/60-frontend/arquitectura-frontend.md) ·
[FRO-02 design system](../docs/60-frontend/design-system.md) ·
[FRO-03 mapa de pantallas](../docs/60-frontend/mapa-de-pantallas.md) ·
[FRO-04 estándares](../docs/60-frontend/estandares-de-codigo-frontend.md) ·
[ADR-0009](../docs/30-arquitectura/adr/ADR-0009-plataforma-frontend.md)
