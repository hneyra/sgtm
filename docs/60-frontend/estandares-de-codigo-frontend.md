# FRO-04 — Estándares de código del frontend

**Objetivo:** toda prohibición que pueda expresarse como verificación automática **se expresa
así**. Una prohibición que solo vive en un documento se incumple en seis meses.

Es el mismo objetivo de [ARQ-04](../30-arquitectura/estandares-de-codigo-backend.md) en el
backend, y se cumple igual: cada regla tiene **una muestra que la viola**, y una prueba que exige
que la regla la detecte.

## 1. Estructura de un módulo

```
modulos/tesoreria/
├── paginas/                  # Una por opción del menú
│   ├── CobroEnCaja.tsx
│   └── ArqueoDeCaja.tsx
├── componentes/              # Solo de este módulo
├── hooks/
│   └── useDeudaActualizada.ts
├── tipos.ts
└── index.ts                  # Interfaz pública del módulo
```

**Regla:** un módulo importa de otro **solo por su `index.ts`**. Alcanzar un archivo interno de
otro módulo es un defecto — el equivalente frontend de la regla que Spring Modulith hace cumplir
en el backend. Un componente que usan dos módulos sube a `packages/design-system`.

## 2. Nomenclatura

Coherente con la regla de idioma del proyecto (CLAUDE.md, heredada del `ADR-0004` del SRTM):
dominio en español, técnica en inglés, **sin tildes en identificadores**. En el backend lo revisa
Checkstyle; aquí, ESLint.

| Elemento | Convención | Ejemplo |
|---|---|---|
| Componentes | `PascalCase`, sustantivo del dominio | `FichaDePredio`, `TablaDeDeuda` |
| Hooks | `use` + concepto en español | `useDeudaActualizada`, `usePapeleta` |
| Tipos del dominio | Español, sin tildes | `Contribuyente`, `Predio`, `Autovaluo` |
| Props | `<Componente>Props` | `FichaDePredioProps` |
| Archivos de utilidad | `camelCase` | `formatearImporte.ts` |
| Constantes | `SCREAMING_SNAKE_CASE` | `TIPOS_DE_DOCUMENTO` |
| Pruebas | Junto al archivo, `.test.tsx` | |

Los términos del glosario mandan: **`alicuota`, nunca `tasa`** para un porcentaje — `tasa` es un
tipo de tributo del manual. Y `contribuyente`, no «usuario» ni «cliente».

## 3. TypeScript

```json
{ "strict": true, "noUncheckedIndexedAccess": true, "noImplicitOverride": true }
```

| Regla | Motivo |
|---|---|
| **`any` prohibido.** Si no se conoce el tipo, `unknown` y se estrecha | |
| Los tipos de la API **se generarán desde OpenAPI**, no a mano | Un cambio de contrato debe romper la compilación (pendiente, FRO-01 §8) |
| Los tipos del dominio viven en `packages/dominio` | |
| Uniones discriminadas para estados | Hace imposible representar un estado inválido |
| `as` solo con justificación en comentario | |

## 4. Importes: las tres reglas que no se rompen

1. **Un importe es `string`, nunca `number`.** `0.1 + 0.2 !== 0.3`; en deuda pública eso es
   inaceptable (RNF-055, regla 1 de CLAUDE.md).
2. **La interfaz no hace aritmética con importes** (RNF-083). Ni sumas, ni porcentajes, ni
   totales. Si hace falta un total, lo entrega el backend. Sumar «solo para mostrar» produce una
   cifra que el backend no puede sustentar.
3. **Todo importe se muestra con su fecha de cálculo** (RNF-075, regla 9). No existe «la deuda».

```tsx
// prohibido
const total = cuotas.reduce((a, c) => a + Number(c.monto), 0);

// correcto: el backend lo calcula, y la cifra dice a qué fecha
const { data } = useDeudaActualizada(contribuyenteId);
<Importe valor={data.total} fechaCalculo={data.fechaCalculo} />
```

## 5. Estado

| Tipo de estado | Herramienta |
|---|---|
| Datos del servidor | **TanStack Query.** Nunca en `useState` |
| Estado de interfaz local | `useState` |
| Estado de formulario | React Hook Form |
| Estado global | Solo sesión y preferencias (densidad, acento, recientes) |

1. **Prohibido copiar datos del servidor a `useState`.** Produce dos fuentes de verdad.
2. **Al cambiar de municipalidad activa se invalida toda la caché** (FRO-01 §4).
3. Claves de consulta jerárquicas: `['predio', id, 'deuda']`, para invalidar por prefijo.
4. **Las mutaciones que asientan deuda, registran un pago o emiten un valor llevan
   `Idempotency-Key` y no se reintentan solas.**

La regla 4 es la más importante de esta sección: TanStack Query reintenta consultas por omisión,
lo cual está bien para lecturas y es peligroso para escrituras. **Un reintento automático de un
cobro es un cobro doble**, y el manual prohíbe borrar el pago que sobra (regla 4 de CLAUDE.md).

## 6. Observación obligatoria

Regla 10 de CLAUDE.md, y es una regla de interfaz tanto como de backend: **toda modificación de
datos exige una observación del usuario; sin observación no se guarda** (RNF-052).

En el frontend eso significa que el formulario de cualquier operación que modifique datos incluye
el campo de observación, que el envío se deshabilita mientras esté vacío, y que el mensaje de
error del backend por observación faltante nunca debería llegar a verse. Si se ve, es un defecto
del formulario.

**El camino de escritura es uno solo —`useEscritura`— y lo que puede mandar cada opción está
declarado campo a campo** en `pantallas/escrituras.ts`. Lo que no está declarado no viaja y ni
siquiera se puede escribir en el formulario: es lo que impide que una contraseña acabe en el
estado de React cuando el backend no la pide. Desde #320 la declaración cubre tres formas:

| Forma | Qué declara | Ejemplo |
|---|---|---|
| `campos` | Un campo plano, con su nombre en el cuerpo | `documentoOrigen` |
| `tablas` | Una **lista de filas**, con su lista blanca por columna | los pisos de una ficha |
| `tablas` + `unica` | Un **bloque** que el backend declara como objeto, no lista | el `titular` de un alta |
| `tablas` + `plana` | Una fila **elegida en la tabla** que el backend declara en el cuerpo plano | la cuota de una baja de deuda |

La tabla existe porque media docena de formularios del manual son una tabla, y sin ella cada uno
tenía que armar su cuerpo entero a mano con `cuerpo` —la salida de emergencia—, y entonces la
lista blanca deja de decir qué puede escribir esa pantalla. `exigir` completa el cuadro: lo que
además de la observación hace falta para poder guardar, dicho como el motivo por el que todavía no
se puede, en vez de dejar pulsar y contestar con un 422 a algo que la pantalla ya sabía. Recibe el
borrador **y las filas**: sin ellas una opción no podía exigir «al menos un piso» ni «el titular
necesita su documento», porque eso no está en el borrador plano.

**La lista blanca muerde al escribir, no solo al enviar, y también por columna.** Las dos barreras
protegen de cosas distintas: la de escritura evita que el valor exista en el estado de React, y la
del envío evita que viaje si alguien un día rellena el borrador por otro camino. Estaban
desparejadas —un campo no declarado no entraba, pero una **columna** no declarada de una fila sí—,
y esa mitad que faltaba es exactamente la que la lista blanca vino a impedir. Se comprobó quitando
la guarda: la batería entera seguía en verde, así que la prueba tampoco existía. Ahora existe, en
`pantallas/escritura.test.tsx`.

Dos detalles del cuerpo que se resuelven ahí y en ningún otro sitio: la resolución de un campo
declarado usa `Object.hasOwn` —indexar resuelve por la cadena de prototipos, y un campo llamado
`constructor` producía un «declarado» que nadie declaró—, y **lo que se escribe viaja recortado**:
un campo de solo espacios es no haber escrito nada, no un campo lleno que el backend rechaza.

Y el motivo por el que la acción está apagada **se pinta**, no se pone en un `title`: un `title`
sobre un botón `disabled` no existe ni para el teclado —no se puede enfocar— ni para el lector de
pantalla. `useEscritura` expone `motivo`, que es `exigir` más «falta la observación»; lo dibuja
`BarraDeAcciones`, con `role="status"` y referenciado desde el botón con `aria-describedby`.

**Una opción con verbo de escritura y sin declaración no escribe, y lo dice** (#332). Antes «mandaba
solo su observación», que en un cobro o una transferencia no es guardar nada: el operador rellenaba
catorce campos, pulsaba la primaria y el backend la rechazaba —o no la rechazaba nadie, porque no
existe—. La negación por omisión se conserva; lo que cambia es que ahora hay **tres estados** y no
dos, y `pantallas/actos.ts` distingue los dos que faltaban leyendo lo que ya se sabe:

| Estado | Cuándo | Qué pide a quien lo lee |
|---|---|---|
| Puede guardar | la opción está en `ESCRITURAS` | la observación, y lo que `exigir` añada |
| `sin-declaracion` | su operación escribe en el contrato, y no está declarada | trabajo, del que escribe el sistema |
| `sin-backend` | su operación es de lectura, o no está en el contrato | paciencia |

## 7. Accesibilidad

| Regla | Verificación |
|---|---|
| HTML semántico antes que `div` con `role` | Revisión |
| Todo control con etiqueta asociada | `eslint-plugin-jsx-a11y` |
| Errores vinculados con `aria-describedby` | Automática |
| Foco visible siempre | `base.css` |
| Sin `tabIndex` positivo | ESLint, con muestra |
| Sin información solo por color | Revisión, y el tipo `Estado` lo empuja |
| Operación de caja completa con teclado | RNF-082; pruebas de interacción |

## 8. Pruebas

| Nivel | Herramienta | Qué se prueba |
|---|---|---|
| Unidad y componente | Vitest + Testing Library | Comportamiento observable, no implementación |
| Reglas del proyecto | Vitest sobre ESLint | Que cada prohibición muerde (§9) |
| Extremo a extremo | Playwright | Cobro, declaración y consulta del portal (pendiente) |

Se consulta por rol y texto accesible (`getByRole`, `getByLabelText`), no por clase CSS. Una
prueba que se rompe al cambiar una clase no prueba comportamiento.

## 9. Las prohibiciones, y dónde se verifican

Nueve prohibiciones, nueve reglas de ESLint, nueve muestras que las violan. La prueba
`frontend/verificaciones/reglas-de-eslint.test.ts` linta cada muestra y **exige que la regla la
señale**; si alguien borra una regla, la prueba se pone roja.

| # | Prohibición | Origen | Muestra |
|---|---|---|---|
| 1 | Aritmética con importes | RNF-083 | `aritmetica-con-importes.ts` |
| 2 | Importe convertido a `number` | RNF-055, regla 1 | `importe-como-number.ts` |
| 3 | `municipalidadId` en el frontend | Regla 2, ARQ-03 §3.1 | `municipalidad-en-el-cliente.ts` |
| 4 | Token en `localStorage` o `sessionStorage` | FRO-01 §5 | `token-en-almacenamiento.ts` |
| 5 | Identificador con tilde o eñe | Idioma (CLAUDE.md) | `identificador-con-tilde.ts` |
| 6 | `tasa` donde va `alicuota` | Regla 8 | `tasa-en-vez-de-alicuota.ts` |
| 7 | `any` explícito | §3 | `any-explicito.ts` |
| 8 | `<Importe>` sin `fechaCalculo` | RNF-075, regla 9 | `importe-sin-fecha.tsx` |
| 9 | `tabIndex` positivo | §7 | `tabindex-positivo.tsx` |

**Al agregar una prohibición, se agrega también la muestra que la viola.** Es la misma exigencia
que el backend hace en `verificaciones/muestras/`: una regla que no puede fallar no protege nada.

Se demostró que muerden: al quitar la regla 5 de `eslint.config.js`, la prueba correspondiente se
pone roja; al devolverla, vuelve a verde.

Prohibiciones que **todavía no se verifican solas** y viven solo aquí:

- Datos del servidor copiados a `useState` (§5).
- Reintento automático de una mutación que asienta (§5).
- Alcanzar un archivo interno de otro módulo (§1).
- Texto codificado en el componente en lugar de venir del backend o del catálogo (RNF-080).
- Modificación sin campo de observación (§6).

## 10. Herramientas

| Verificación | Comando | Bloqueante |
|---|---|---|
| Formato | `yarn format` (Prettier) | Sí |
| Estilo y reglas | `yarn lint` | Sí |
| Tipos | `yarn typecheck` | Sí |
| Pruebas, incluidas las reglas | `yarn test` | Sí |
| Todo junto | `yarn verificar` | Sí |

Igual que en el backend: si el build se queja del formato, no se pelea — `yarn format`.

## 11. Documentos relacionados

[`arquitectura-frontend.md`](arquitectura-frontend.md) (FRO-01) ·
[`design-system.md`](design-system.md) (FRO-02) ·
[`../30-arquitectura/estandares-de-codigo-backend.md`](../30-arquitectura/estandares-de-codigo-backend.md)
(ARQ-04)
